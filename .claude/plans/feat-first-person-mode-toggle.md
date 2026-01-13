# First-Person Mode Implementation Plan

## Overview
Add a first-person camera mode that lets the user "become" the mage/wizard and explore the world using WASD movement and mouse look controls. Toggle via keyboard shortcut with visible hands/staff in the viewport and a minimal HUD.

## User Requirements
- **Spawn Location**: Wherever the wizard currently is
- **UI Behavior**: Minimal HUD (hide main panels, show essential info only)
- **Player Body**: Visible hands/staff in first-person view
- **Toggle Method**: Keyboard shortcut (Tab or V)

---

## Architecture Overview

### Current Camera System
The `CameraController` class manages transitions between `isometric` and `conversation` modes using:
- Orthographic camera for isometric view
- Perspective camera for conversation view
- Eased transitions with spring arm collision avoidance

### Proposed Architecture
Extend `CameraController` to support a third mode: `firstPerson`. Create a dedicated `FirstPersonController` class to handle movement physics, mouse look, and pointer lock.

```
CameraController (extended)
├── isometric mode (existing)
├── conversation mode (existing)
└── firstPerson mode (new)
    └── FirstPersonController (new class)
        ├── WASD movement with physics
        ├── Mouse look with pointer lock
        ├── Collision detection
        └── Terrain following
```

---

## Implementation Steps

### Phase 1: Core First-Person Controller

#### 1.1 Create `FirstPersonController.ts`
**File**: `src/lib/camera/FirstPersonController.ts`

```typescript
export interface FirstPersonConfig {
  moveSpeed: number;           // Units per second (default: 6)
  sprintMultiplier: number;    // Sprint speed multiplier (default: 1.6)
  mouseSensitivity: number;    // Radians per pixel (default: 0.002)
  eyeHeight: number;           // Camera height above ground (default: 1.6)
  acceleration: number;        // Movement acceleration (default: 20)
  deceleration: number;        // Friction/drag (default: 15)
}

export class FirstPersonController {
  // State
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private yaw: number;   // Horizontal rotation
  private pitch: number; // Vertical rotation (clamped ±85°)

  // Input state
  private keys: { forward: boolean; back: boolean; left: boolean; right: boolean; sprint: boolean };
  private mouseDelta: { x: number; y: number };

  // Methods
  constructor(config?: Partial<FirstPersonConfig>);
  update(deltaTime: number, terrainBuilder: ContinuousTerrainBuilder, collisionMeshes: THREE.Mesh[]): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;
  handleMouseMove(event: MouseEvent): void;
  setPosition(position: THREE.Vector3, yaw?: number): void;
  getPosition(): THREE.Vector3;
  getRotation(): { yaw: number; pitch: number };
  getCameraMatrix(): THREE.Matrix4;
}
```

**Key Features**:
- Smooth acceleration/deceleration (not instant velocity changes)
- Mouse look with pitch clamped to prevent gimbal lock (±85°)
- Ground following using terrain height
- Basic collision response against terrain edges and buildings

#### 1.2 Create Input State Manager
**Embed in FirstPersonController or create `InputManager.ts`**

Track continuous input state for smooth movement:
```typescript
// Key bindings
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
};
```

---

### Phase 2: Camera Controller Integration

#### 2.1 Extend CameraMode Type
**File**: `src/lib/camera/CameraController.ts`

```typescript
export type CameraMode = 'isometric' | 'conversation' | 'firstPerson';
```

#### 2.2 Add First-Person Methods to CameraController

```typescript
// New methods
enterFirstPerson(wizardPosition: THREE.Vector3, wizardRotation: number): void;
exitFirstPerson(returnTarget?: THREE.Vector3): void;
updateFirstPerson(deltaTime: number): boolean;

// New properties
private firstPersonController: FirstPersonController;
```

#### 2.3 Handle Transitions
- **Isometric → First-Person**: Smooth dolly into wizard position
- **First-Person → Isometric**: Smooth pull-out to overhead view
- Block first-person during conversation mode

---

### Phase 3: Scene Integration

#### 3.1 Modify `SimpleScene.tsx`

**Add input event listeners**:
```typescript
// In the useEffect setup
const handleKeyDown = (e: KeyboardEvent) => {
  if (cameraController.getMode() === 'firstPerson') {
    firstPersonController.handleKeyDown(e);
  }
  // Toggle key (Tab)
  if (e.code === 'Tab' && !conversation.active) {
    e.preventDefault();
    toggleFirstPersonMode();
  }
};

const handleKeyUp = (e: KeyboardEvent) => { ... };

const handleMouseMove = (e: MouseEvent) => {
  if (document.pointerLockElement === canvas && cameraController.getMode() === 'firstPerson') {
    firstPersonController.handleMouseMove(e);
  }
};
```

**Add pointer lock handling**:
```typescript
const requestPointerLock = () => {
  containerRef.current?.requestPointerLock();
};

const exitPointerLock = () => {
  document.exitPointerLock();
};
```

#### 3.2 Sync Wizard Position
When in first-person mode, the wizard mesh should follow the camera:
```typescript
// In animation loop
if (cameraMode === 'firstPerson') {
  const fpPosition = firstPersonController.getPosition();
  wizardRef.current.mesh.position.set(fpPosition.x, fpPosition.y - eyeHeight, fpPosition.z);
  wizardRef.current.mesh.rotation.y = firstPersonController.getRotation().yaw;

  // Update walking animation based on velocity
  const isMoving = firstPersonController.getVelocity().length() > 0.1;
  wizardRef.current.animator.update(deltaTime, elapsedTime, isMoving);
}
```

---

### Phase 4: Visible Hands/Staff

#### 4.1 Create First-Person Hands Model
**File**: `src/components/FirstPersonHands.tsx` or embed in scene

**Approach**: Create a simple staff/hands mesh that attaches to the camera and sways with movement.

```typescript
// Viewmodel setup
const handsGroup = new THREE.Group();
handsGroup.position.set(0.3, -0.3, -0.5); // Right side, below, in front of camera

// Staff mesh (simple cylinder + orb)
const staffGeometry = new THREE.CylinderGeometry(0.02, 0.025, 1.2, 8);
const staffMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
const staff = new THREE.Mesh(staffGeometry, staffMaterial);
staff.rotation.x = Math.PI / 6; // Angled forward

// Crystal/orb at top
const orbGeometry = new THREE.SphereGeometry(0.08, 16, 16);
const orbMaterial = new THREE.MeshStandardMaterial({
  color: 0x6366f1,
  emissive: 0x3730a3,
  emissiveIntensity: 0.5
});
const orb = new THREE.Mesh(orbGeometry, orbMaterial);
```

#### 4.2 Add View Bobbing
Subtle camera bob when moving for immersion:
```typescript
const bobAmount = isMoving ? Math.sin(elapsedTime * 10) * 0.03 : 0;
camera.position.y += bobAmount;
```

#### 4.3 Add Hand Sway
Staff sways opposite to camera movement:
```typescript
const swayX = -mouseDelta.x * 0.001;
const swayY = -mouseDelta.y * 0.001;
handsGroup.rotation.y = THREE.MathUtils.lerp(handsGroup.rotation.y, swayX, 0.1);
handsGroup.rotation.x = THREE.MathUtils.lerp(handsGroup.rotation.x, swayY + Math.PI / 6, 0.1);
```

---

### Phase 5: Minimal HUD

#### 5.1 Create FirstPersonHUD Component
**File**: `src/components/ui/FirstPersonHUD.tsx`

```tsx
export function FirstPersonHUD({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1 h-1 bg-white/50 rounded-full" />
      </div>

      {/* Controls hint (bottom center, fades after 3s) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        WASD to move • Mouse to look • Tab to exit
      </div>

      {/* Optional: Compass or mini-map could go here */}
    </div>
  );
}
```

#### 5.2 Modify GameLayout.tsx
Hide main panels when in first-person mode:
```tsx
const isFirstPerson = cameraMode === 'firstPerson';

return (
  <div>
    {!isFirstPerson && <MinionPanel />}
    {!isFirstPerson && <QuestPanel />}
    {!isFirstPerson && <VaultPanel />}
    <FirstPersonHUD visible={isFirstPerson} />
  </div>
);
```

---

### Phase 6: Collision & Physics

#### 6.1 Terrain Following
```typescript
update(deltaTime: number, terrain: ContinuousTerrainBuilder) {
  // Get ground height at current position
  const groundHeight = terrain.getHeightAt(this.position.x, this.position.z);

  // Snap to ground (no jumping for now)
  this.position.y = groundHeight + this.config.eyeHeight;
}
```

#### 6.2 Building Collision
Use existing collision meshes from `collisionMeshesRef`:
```typescript
private checkCollision(newPosition: THREE.Vector3): boolean {
  // Simple AABB or sphere collision against building bounds
  for (const mesh of this.collisionMeshes) {
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.containsPoint(newPosition)) {
      return true; // Collision detected
    }
  }
  return false;
}
```

#### 6.3 Movement with Collision Response
```typescript
// Attempt move, slide along walls if blocked
const desiredPosition = this.position.clone().add(velocity.clone().multiplyScalar(deltaTime));

if (!this.checkCollision(desiredPosition)) {
  this.position.copy(desiredPosition);
} else {
  // Try X-only movement
  const xOnly = new THREE.Vector3(desiredPosition.x, this.position.y, this.position.z);
  if (!this.checkCollision(xOnly)) {
    this.position.x = desiredPosition.x;
  }
  // Try Z-only movement
  const zOnly = new THREE.Vector3(this.position.x, this.position.y, desiredPosition.z);
  if (!this.checkCollision(zOnly)) {
    this.position.z = desiredPosition.z;
  }
}
```

---

### Phase 7: Polish & Edge Cases

#### 7.1 Disable First-Person During Conversation
```typescript
// In toggle handler
if (conversation.active) {
  return; // Don't allow first-person during conversation
}
```

#### 7.2 Handle Pointer Lock Loss
```typescript
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && cameraMode === 'firstPerson') {
    // Pointer lock was released (e.g., user pressed Escape)
    exitFirstPersonMode();
  }
});
```

#### 7.3 Preserve Wizard Position on Exit
When exiting first-person, update the wizard's stored position so they stay where you walked to.

#### 7.4 Disable OrbitControls in First-Person
```typescript
if (cameraMode === 'firstPerson') {
  orbitControls.enabled = false;
} else {
  orbitControls.enabled = true;
}
```

---

## File Changes Summary

### New Files
1. `src/lib/camera/FirstPersonController.ts` - Core FP movement/look logic
2. `src/components/ui/FirstPersonHUD.tsx` - Minimal HUD overlay
3. `src/lib/FirstPersonHands.ts` - Viewmodel staff/hands (or inline in scene)

### Modified Files
1. `src/lib/camera/CameraController.ts` - Add `firstPerson` mode, transitions
2. `src/components/SimpleScene.tsx` - Input handling, pointer lock, wizard sync
3. `src/components/GameLayout.tsx` - Conditional panel visibility, HUD integration
4. `src/types/game.ts` - Add `CameraMode` type if needed in store

---

## Technical Considerations

### Performance
- First-person collision checks run every frame; keep them simple (AABB, not raycasting)
- Viewmodel hands should be low-poly
- Consider separate render layer for hands to avoid clipping into world geometry

### Browser Compatibility
- Pointer Lock API is well-supported but Safari has quirks
- Fallback: Show cursor and use click-drag for look if pointer lock fails

### State Management
- Camera mode could optionally be added to Zustand store for UI reactivity
- Wizard position updates should persist to store when exiting first-person

---

## Testing Checklist

- [ ] Tab toggles into first-person from isometric view
- [ ] WASD moves in correct directions relative to camera facing
- [ ] Mouse look is smooth without gimbal lock
- [ ] Cannot walk through cottage walls
- [ ] Cannot walk off terrain edges (or handles gracefully)
- [ ] Staff/hands visible and sway naturally
- [ ] UI panels hidden, minimal HUD shown
- [ ] Tab or Escape exits first-person mode
- [ ] Wizard position is preserved after exiting
- [ ] Cannot enter first-person during conversation
- [ ] Day/night cycle and lighting work correctly
- [ ] Smooth transition animations in/out of mode
