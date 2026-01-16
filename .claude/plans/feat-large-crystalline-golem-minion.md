# Implementation Plan: Large Crystalline Golem Minion

## Overview

Create a new Golem minion type that is visually distinct from existing minions (Scout, Scribe, Artificer). The Golem is a massive crystalline/rocky creature (5x+ larger) with floating hands, a tiny head on a huge torso, and stump legs. Players can click to enter first-person mode inside the Golem, experiencing heavy stompy camera movement.

### Design Specifications
- **Size**: 5x+ larger than standard minions
- **Texture**: Gray/brown rocky base with orange/blue crystal accents
- **Head**: Tiny sphere with a crystal "eye" (orange/blue glow)
- **Torso**: Massive, angular, rocky body
- **Hands**: Large floating rocky hands (following existing floating hand pattern)
- **Legs**: Simple stumpy pillars
- **System**: Independent of minion type system (Scout/Scribe/Artificer), follows same pathfinding behavior
- **First-Person**: Click to enter, heavy bob + screen shake on movement

---

## Phase 1: Type Definitions & Store Integration

### 1.1 Extend Type System (`src/types/game.ts`)

Add Golem as a separate entity type alongside Minion:

```typescript
// New Golem interface (separate from Minion)
export interface Golem {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  state: GolemState;
  targetPosition?: { x: number; y: number; z: number };
}

export type GolemState = 'idle' | 'traveling' | 'stomping';
```

**Files to modify:**
- `src/types/game.ts` - Add Golem interface and GolemState type

### 1.2 Store Integration (`src/store/gameStore.ts`)

Add Golem state management:

```typescript
// New store slice
golems: Golem[];
selectedGolemId: string | null;
possessedGolemId: string | null; // For first-person mode

// New actions
addGolem: (golem: Golem) => void;
removeGolem: (id: string) => void;
updateGolemPosition: (id: string, position: Position) => void;
selectGolem: (id: string | null) => void;
possessGolem: (id: string | null) => void; // Enter/exit first-person
```

**Files to modify:**
- `src/store/gameStore.ts` - Add golems slice with actions

---

## Phase 2: Golem Visual Rendering

### 2.1 Create GolemEntity Component (`src/components/GolemEntity.tsx`)

Build the 3D Golem mesh with procedural geometry:

**Body Structure:**
```
Scale Factor: ~5x standard minion

Torso (Massive):
- BoxGeometry or custom angular rock shape
- Size: ~1.5w x 2.0h x 1.0d (scaled)
- Material: meshStandardMaterial
  - color: #5c5247 (gray-brown rock)
  - roughness: 0.95
  - metalness: 0.1

Crystal Accents (on torso):
- Multiple IcosahedronGeometry crystals embedded in surface
- Colors: #ff6b35 (orange), #4da6ff (blue)
- emissive with low intensity glow
- Random rotation for organic placement

Head (Tiny):
- SphereGeometry, radius ~0.15 (relative to body scale)
- Positioned high on torso
- Single crystal "eye":
  - SphereGeometry inner orb
  - Glow effect (emissive + PointLight)
  - Color cycle between orange/blue

Floating Hands (Large):
- Similar to existing minion hands but 5x scale
- Rocky texture matching torso
- Crystal knuckle accents
- Float offset: ~0.8 units from body sides
- Gentle bob animation when idle

Stump Legs:
- CylinderGeometry or BoxGeometry
- Short, thick pillars
- Slight taper toward ground
- No knee articulation needed
```

**Materials:**
```typescript
const rockMaterial = new MeshStandardMaterial({
  color: 0x5c5247,
  roughness: 0.95,
  metalness: 0.1,
});

const crystalMaterial = new MeshStandardMaterial({
  color: 0xff6b35, // or 0x4da6ff
  emissive: 0xff6b35,
  emissiveIntensity: 0.4,
  roughness: 0.3,
  metalness: 0.2,
});
```

**Files to create:**
- `src/components/GolemEntity.tsx` - Main Golem 3D component

### 2.2 Golem Animation System

**Idle Animation:**
- Minimal sway (it's heavy)
- Subtle hand float bob
- Crystal eye slow pulse
- Occasional "settling" micro-movements

**Traveling Animation:**
- Heavy stomping motion (legs alternate)
- Body rock side-to-side
- Hands swing with momentum
- Ground impact timing markers (for camera shake sync)

**Selection Indicators:**
- Large ring at base (scaled appropriately)
- State indicator above tiny head

**Files to modify:**
- `src/components/GolemEntity.tsx` - Add animation logic in useFrame

---

## Phase 3: First-Person Golem Mode

### 3.1 Golem First-Person Hands (`src/lib/GolemFirstPersonHands.ts`)

Create viewmodel for Golem's rocky hands:

**Design:**
```
Two floating hands visible in first-person view:
- Left hand: Lower-left of screen
- Right hand: Lower-right of screen

Hand Geometry:
- BoxGeometry base (blocky, angular)
- Additional box segments for fingers (3 chunky fingers + thumb)
- Crystal accents on knuckles (small icosahedrons)

Materials:
- Same rock material as third-person body
- Crystal accents match body crystals

Positioning:
- Left: (-0.5, -0.5, -0.8)
- Right: (0.5, -0.5, -0.8)
- Slight rotation inward (hands facing each other)
```

**Animation:**
- Idle: Very subtle float/bob
- Moving: Heavier swing matching stomp rhythm
- Simple implementation (no complex effects per user request)

**Files to create:**
- `src/lib/GolemFirstPersonHands.ts` - Viewmodel hands class

### 3.2 Stompy Camera Controller (`src/lib/camera/GolemCameraController.ts`)

Extend existing camera system for Golem possession:

**Configuration:**
```typescript
const GOLEM_CAMERA_CONFIG = {
  // Eye height scaled to golem size
  eyeHeight: 8.0, // Much higher than normal (1.6)

  // Movement (same as standard but feels slower due to scale)
  moveSpeed: 3.0, // Slower than normal (5.0)

  // Stompy effects
  stompBobIntensity: 0.15, // Exaggerated vertical bob
  stompBobFrequency: 1.2, // Slower frequency (heavy steps)
  screenShakeIntensity: 0.02, // Subtle shake on step impact
  screenShakeDecay: 0.9, // Quick falloff

  // Step timing
  stepDuration: 0.6, // Seconds per step (slower than human)
};
```

**Stomp Animation Logic:**
```typescript
// In update loop when moving:
const stepPhase = (time * stompBobFrequency) % 1;

// Vertical bob follows step cycle
const bobOffset = Math.sin(stepPhase * Math.PI * 2) * stompBobIntensity;

// Screen shake on step impact (stepPhase near 0 or 0.5)
if (stepPhase < 0.1 || (stepPhase > 0.45 && stepPhase < 0.55)) {
  applyScreenShake(screenShakeIntensity);
}

// Apply to camera
camera.position.y = baseHeight + bobOffset;
camera.rotation.z += currentShake.roll;
camera.rotation.x += currentShake.pitch;
```

**Files to create:**
- `src/lib/camera/GolemCameraController.ts` - Stompy camera logic

### 3.3 Possession System Integration

**Click to Enter:**
1. Player clicks Golem in isometric view
2. If already selected, second click triggers possession
3. Camera transitions smoothly to first-person inside Golem
4. UI updates to show "Exit Golem" option
5. Golem hands viewmodel renders

**Exit Mechanism:**
- Press ESC or click "Exit" button
- Camera transitions back to isometric
- Golem returns to selectable state

**Files to modify:**
- `src/components/GolemEntity.tsx` - Add click handler for possession
- `src/lib/camera/CameraController.ts` - Add golem possession mode
- `src/store/gameStore.ts` - Track possessedGolemId

---

## Phase 4: Scene Integration

### 4.1 Render Golems in Scene (`src/components/Scene.tsx`)

Add Golem rendering alongside minions:

```tsx
// In Scene.tsx
const { golems, possessedGolemId } = useGameStore();

{golems.map((golem) => (
  <GolemEntity
    key={golem.id}
    golem={golem}
    isPossessed={golem.id === possessedGolemId}
  />
))}
```

**Files to modify:**
- `src/components/Scene.tsx` - Add GolemEntity rendering

### 4.2 Conditional Viewmodel Rendering

When possessed, render Golem hands instead of wizard staff:

```tsx
// In first-person render logic
{possessedGolemId ? (
  <GolemFirstPersonHands />
) : (
  <FirstPersonHands /> // Existing wizard staff
)}
```

**Files to modify:**
- Wherever FirstPersonHands is currently rendered (likely Scene or a dedicated FP component)

---

## Phase 5: Pathfinding & Movement

### 5.1 Golem Navigation

Golems use the same pathfinding system as minions but:
- Larger collision radius
- Slower movement speed
- Same NavGrid system

**Implementation:**
- Reuse existing Pathfinder class
- Adjust parameters for Golem scale
- Movement lerp factor reduced (slower interpolation)

**Files to modify:**
- `src/lib/questSimulation.ts` or equivalent movement logic - Support Golem movement

---

## Phase 6: UI Integration

### 6.1 Golem Selection UI

Add Golem-specific UI when selected (not possessed):

- Name display
- State indicator
- "Enter Golem" button (alternative to double-click)

**Files to modify/create:**
- `src/components/ui/GolemPanel.tsx` - New panel for Golem info/controls

### 6.2 Possession HUD

Minimal HUD when inside Golem:

- "Exit" button (top-right or ESC hint)
- Optional: Golem status indicator

**Files to modify:**
- `src/components/GameLayout.tsx` - Conditional HUD based on possession state

---

## Implementation Order

1. **Phase 1**: Types and store (foundation)
2. **Phase 2**: GolemEntity visual (get it rendering)
3. **Phase 4.1**: Scene integration (see it in world)
4. **Phase 5**: Basic movement (make it walk)
5. **Phase 3**: First-person mode (enter the golem)
6. **Phase 4.2**: Viewmodel hands
7. **Phase 6**: UI polish

---

## Files Summary

### New Files
- `src/types/game.ts` - Extended (Golem interface)
- `src/components/GolemEntity.tsx` - Main 3D component
- `src/lib/GolemFirstPersonHands.ts` - Viewmodel hands
- `src/lib/camera/GolemCameraController.ts` - Stompy camera
- `src/components/ui/GolemPanel.tsx` - Selection UI

### Modified Files
- `src/store/gameStore.ts` - Golem state management
- `src/components/Scene.tsx` - Render golems
- `src/lib/camera/CameraController.ts` - Possession mode integration
- `src/components/GameLayout.tsx` - Possession HUD

---

## Testing Checklist

- [ ] Golem renders in isometric view at correct scale (5x+)
- [ ] Rocky texture with orange/blue crystal accents visible
- [ ] Tiny head with glowing crystal eye
- [ ] Floating hands animate correctly
- [ ] Click selection works
- [ ] Double-click (or button) enters first-person
- [ ] First-person camera at correct height
- [ ] Stompy bob effect when moving
- [ ] Screen shake on step impacts
- [ ] Rocky hands visible in first-person
- [ ] ESC exits possession mode
- [ ] Camera transitions smoothly in/out
- [ ] Golem follows pathfinding (same as minions)
- [ ] No Z-fighting or visual glitches
