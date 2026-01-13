# Force Grab Mage Staff Interaction System

## Overview

Implement a "force grab" interaction system for first-person mode that allows the player to:
1. **Tap** to show quick info about targeted entities
2. **Hold** to open a radial circle menu around the reticle for contextual actions
3. **Force Pull** minions with spring physics to carry/fling them
4. **Draw building foundations** on open ground with grid-snapped laser

## Design Decisions

Based on user requirements:
- **Input**: Left mouse click (tap for info, hold for circle menu)
- **Menu rendering**: 2D HUD overlay (HTML/CSS for crisp, readable UI)
- **Force Pull physics**: Hybrid spring/damper system (smooth but physically plausible)
- **Ground drawing**: Grid-snapped (cleaner building foundations)

## Architecture

### New Files to Create

```
src/
├── lib/
│   ├── interaction/
│   │   ├── index.ts                    # Barrel export
│   │   ├── StaffInteractionController.ts  # Main controller coordinating all interactions
│   │   ├── TargetingSystem.ts          # Raycasting, target detection, highlight
│   │   ├── ForceGrabController.ts      # Spring physics for grabbed entities
│   │   └── FoundationDrawer.ts         # Grid-snapped ground drawing
│   └── effects/
│       └── StaffBeam.ts                # Visual beam from staff to target
├── components/
│   └── ui/
│       ├── RadialMenu.tsx              # Circle menu component
│       ├── QuickInfo.tsx               # Tooltip for tap interaction
│       └── FoundationOverlay.tsx       # Drawing progress UI
├── types/
│   └── interaction.ts                  # Interaction types
```

### Modified Files

```
src/
├── components/
│   ├── SimpleScene.tsx                 # Integrate interaction system
│   └── ui/FirstPersonHUD.tsx           # Add radial menu mounting point
├── lib/
│   └── FirstPersonHands.ts             # Add "aiming" and "grabbing" animations
├── store/
│   └── gameStore.ts                    # Add interaction state
```

---

## Phase 1: Targeting System

### 1.1 Create Interaction Types (`src/types/interaction.ts`)

```typescript
export type TargetType = 'minion' | 'building' | 'ground' | 'none';

export interface Target {
  type: TargetType;
  id: string | null;          // Entity ID if applicable
  position: THREE.Vector3;    // World position of hit
  normal: THREE.Vector3;      // Surface normal
  distance: number;           // Distance from camera
  entity?: {                  // Entity-specific data
    name?: string;
    state?: string;
    buildingType?: string;
  };
}

export type InteractionMode =
  | 'idle'           // No interaction
  | 'aiming'         // Holding but not locked yet
  | 'menu'           // Circle menu open
  | 'grabbing'       // Force pulling an entity
  | 'drawing';       // Drawing on ground

export interface InteractionState {
  mode: InteractionMode;
  target: Target | null;
  holdStartTime: number | null;
  selectedMenuOption: string | null;
  grabbedEntityId: string | null;
}
```

### 1.2 Targeting System (`src/lib/interaction/TargetingSystem.ts`)

Responsibilities:
- Continuous raycasting from camera center in first-person mode
- Detect and prioritize targets: minions > buildings > ground
- Provide visual feedback (highlight shader/outline)
- Track current target for other systems

```typescript
export class TargetingSystem {
  private raycaster: THREE.Raycaster;
  private camera: THREE.PerspectiveCamera;
  private minionMeshes: THREE.Object3D[];
  private buildingMeshes: THREE.Object3D[];
  private groundMesh: THREE.Mesh;

  private currentTarget: Target | null = null;
  private highlightMaterial: THREE.ShaderMaterial; // Outline/glow

  constructor(camera: THREE.PerspectiveCamera);

  registerMinionMesh(id: string, mesh: THREE.Object3D): void;
  registerBuildingMesh(id: string, mesh: THREE.Object3D): void;
  setGroundMesh(mesh: THREE.Mesh): void;

  update(): Target | null;  // Returns current target
  getTarget(): Target | null;

  setHighlightEnabled(enabled: boolean): void;
  dispose(): void;
}
```

Key implementation details:
- Raycast from camera position in camera forward direction
- Priority order: check minion meshes first, then buildings, then ground
- Max range: ~50 units (adjustable)
- Highlight: add emissive boost or outline effect to targeted mesh

---

## Phase 2: Radial Menu System

### 2.1 Radial Menu Component (`src/components/ui/RadialMenu.tsx`)

A 2D HTML/CSS overlay that:
- Renders segments in a circle around screen center
- Highlights segment based on cursor offset from center
- Supports different action sets per target type
- Animates open/close with scale + opacity

```typescript
interface RadialMenuProps {
  visible: boolean;
  options: MenuOption[];
  selectedIndex: number | null;
  onSelect: (option: MenuOption) => void;
  onCancel: () => void;
}

interface MenuOption {
  id: string;
  label: string;
  icon: string;        // Emoji or icon class
  description: string;
  disabled?: boolean;
}
```

Menu configurations by target type:

**Minion Menu:**
```typescript
const MINION_MENU_OPTIONS: MenuOption[] = [
  { id: 'chat', label: 'Chat', icon: '💬', description: 'Start conversation' },
  { id: 'quest', label: 'Send on Quest', icon: '📜', description: 'Assign a task' },
  { id: 'grab', label: 'Force Pull', icon: '🤚', description: 'Grab and carry' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];
```

**Building Menu:**
```typescript
const BUILDING_MENU_OPTIONS: MenuOption[] = [
  { id: 'status', label: 'Status', icon: '📊', description: 'View building status' },
  { id: 'workers', label: 'Workers', icon: '👷', description: 'List assigned minions' },
  { id: 'aesthetic', label: 'Aesthetic', icon: '🎨', description: 'Change appearance' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];
```

**Ground Menu (triggers drawing mode):**
```typescript
const GROUND_MENU_OPTIONS: MenuOption[] = [
  { id: 'build', label: 'New Building', icon: '🏗️', description: 'Draw foundation' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];
```

### 2.2 Menu Selection Logic

When menu is open:
1. Lock camera rotation (disable mouse look)
2. Track cursor position relative to screen center
3. Calculate angle from center to determine selected segment
4. Dead zone in center (radius ~50px) = no selection
5. Release click to confirm selection, or move to cancel segment

```typescript
function getSelectedSegment(
  cursorX: number,
  cursorY: number,
  centerX: number,
  centerY: number,
  options: MenuOption[]
): number | null {
  const dx = cursorX - centerX;
  const dy = cursorY - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < DEAD_ZONE_RADIUS) return null;

  const angle = Math.atan2(dy, dx);
  const segmentAngle = (Math.PI * 2) / options.length;
  const index = Math.floor((angle + Math.PI + segmentAngle / 2) / segmentAngle) % options.length;

  return index;
}
```

---

## Phase 3: Quick Info Tooltip

### 3.1 Quick Info Component (`src/components/ui/QuickInfo.tsx`)

A small tooltip that appears on tap (< 200ms click):
- Shows entity name and brief status
- Appears near reticle, offset to not obscure target
- Auto-dismisses after 2 seconds

```typescript
interface QuickInfoProps {
  visible: boolean;
  target: Target | null;
  position: { x: number; y: number }; // Screen coords
}

// Content based on target type
function getQuickInfoContent(target: Target): { title: string; subtitle: string } {
  switch (target.type) {
    case 'minion':
      return {
        title: target.entity?.name || 'Minion',
        subtitle: target.entity?.state || 'Idle',
      };
    case 'building':
      return {
        title: target.entity?.name || 'Building',
        subtitle: target.entity?.buildingType || 'Unknown',
      };
    case 'ground':
      return {
        title: 'Open Ground',
        subtitle: 'Hold to build',
      };
    default:
      return { title: '', subtitle: '' };
  }
}
```

---

## Phase 4: Force Pull / Grab System

### 4.1 Force Grab Controller (`src/lib/interaction/ForceGrabController.ts`)

Implements hybrid spring physics for smooth, physically-plausible grabbing:

```typescript
interface SpringConfig {
  stiffness: number;      // Spring constant (higher = snappier)
  damping: number;        // Damping ratio (0-1, higher = less oscillation)
  mass: number;           // Virtual mass of grabbed object
  maxVelocity: number;    // Clamp to prevent explosion
}

export class ForceGrabController {
  private config: SpringConfig;
  private targetPosition: THREE.Vector3;  // Where we want entity to be
  private currentVelocity: THREE.Vector3; // Current velocity
  private grabbedMesh: THREE.Object3D | null;
  private isActive: boolean;

  constructor(config?: Partial<SpringConfig>);

  // Start grabbing an entity
  grab(mesh: THREE.Object3D): void;

  // Update target position (called every frame from cursor/camera)
  setTargetPosition(position: THREE.Vector3): void;

  // Release with optional throw velocity
  release(throwVelocity?: THREE.Vector3): void;

  // Physics update (call in animation loop)
  update(deltaTime: number): void;

  // Get current position for rendering
  getPosition(): THREE.Vector3;

  isGrabbing(): boolean;

  dispose(): void;
}
```

Spring physics implementation:
```typescript
update(deltaTime: number): void {
  if (!this.grabbedMesh || !this.isActive) return;

  const currentPos = this.grabbedMesh.position;
  const displacement = this.targetPosition.clone().sub(currentPos);

  // Spring force: F = -k * x
  const springForce = displacement.multiplyScalar(this.config.stiffness);

  // Damping force: F = -c * v
  const dampingForce = this.currentVelocity.clone()
    .multiplyScalar(-this.config.damping * 2 * Math.sqrt(this.config.stiffness * this.config.mass));

  // Total acceleration: a = F / m
  const acceleration = springForce.add(dampingForce).divideScalar(this.config.mass);

  // Integrate velocity
  this.currentVelocity.add(acceleration.multiplyScalar(deltaTime));

  // Clamp velocity
  if (this.currentVelocity.length() > this.config.maxVelocity) {
    this.currentVelocity.normalize().multiplyScalar(this.config.maxVelocity);
  }

  // Integrate position
  currentPos.add(this.currentVelocity.clone().multiplyScalar(deltaTime));
}
```

### 4.2 Grab Target Position Calculation

The target position follows the staff's "aim point" at a fixed distance:

```typescript
function calculateGrabTargetPosition(
  camera: THREE.PerspectiveCamera,
  grabDistance: number = 3  // Distance from camera to hold entity
): THREE.Vector3 {
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  return camera.position.clone().add(direction.multiplyScalar(grabDistance));
}
```

### 4.3 Minion Grab Animation

When grabbed, minion should:
1. Play "surprised" reaction (existing ReactionIndicator)
2. Rotate to face camera
3. Arms/legs could dangle (stretch animation via animator)
4. On release, play landing/tumble animation

---

## Phase 5: Staff Visual Effects

### 5.1 Staff Beam Effect (`src/lib/effects/StaffBeam.ts`)

Visual beam from staff gem to target:

```typescript
export class StaffBeam {
  private line: THREE.Line;
  private material: THREE.LineBasicMaterial;
  private particles: THREE.Points; // Optional particle trail

  constructor();

  // Set beam endpoints
  setEndpoints(staffTip: THREE.Vector3, target: THREE.Vector3): void;

  // Different visual states
  setMode(mode: 'aiming' | 'grabbing' | 'drawing'): void;

  setVisible(visible: boolean): void;

  update(deltaTime: number): void;

  dispose(): void;
}
```

Beam appearance:
- **Aiming**: Thin, dim purple line (subtle targeting indicator)
- **Grabbing**: Thick, glowing purple/gold beam with particles
- **Drawing**: Bright blue/white beam projecting to ground

### 5.2 Staff Animation States

Extend `FirstPersonHands.ts` with new states:

```typescript
export type StaffState = 'idle' | 'aiming' | 'charging' | 'grabbing' | 'drawing';

class FirstPersonHands {
  // Existing methods...

  // New: Set interaction state for animation
  setStaffState(state: StaffState): void;

  // New: Get the world position of the staff gem (for beam origin)
  getGemWorldPosition(camera: THREE.Camera): THREE.Vector3;
}
```

Animation changes per state:
- **Aiming**: Staff tilts forward slightly, gem glows brighter
- **Charging**: Staff vibrates, gem pulses faster (during hold before menu)
- **Grabbing**: Staff held forward firmly, gem bright constant glow
- **Drawing**: Staff points down at ground, gem projects light cone

---

## Phase 6: Foundation Drawing System

### 6.1 Foundation Drawer (`src/lib/interaction/FoundationDrawer.ts`)

Grid-snapped drawing system for building foundations:

```typescript
interface GridConfig {
  cellSize: number;       // Size of each grid cell (1 = 1 unit)
  minSize: number;        // Minimum foundation size (e.g., 3x3)
  maxSize: number;        // Maximum foundation size (e.g., 10x10)
  snapThreshold: number;  // Distance to snap to grid line
}

interface DrawnFoundation {
  cells: THREE.Vector2[]; // Grid cells that make up the foundation
  bounds: {
    min: THREE.Vector2;
    max: THREE.Vector2;
  };
  area: number;
  isComplete: boolean;    // True if path closed into a shape
}

export class FoundationDrawer {
  private config: GridConfig;
  private currentPath: THREE.Vector2[];
  private gridHelper: THREE.GridHelper;
  private pathLine: THREE.Line;
  private isDrawing: boolean;

  constructor(config?: Partial<GridConfig>);

  // Start drawing at a grid-snapped position
  startDrawing(worldPosition: THREE.Vector3): void;

  // Update current draw position (called as player looks around)
  updatePosition(worldPosition: THREE.Vector3): void;

  // Finish drawing and return foundation data
  finishDrawing(): DrawnFoundation | null;

  // Cancel drawing
  cancelDrawing(): void;

  // Check if path forms a closed shape
  isPathClosed(): boolean;

  // Get preview mesh for rendering
  getPreviewMesh(): THREE.Group;

  update(deltaTime: number): void;

  dispose(): void;
}
```

Grid snapping logic:
```typescript
function snapToGrid(position: THREE.Vector3, cellSize: number): THREE.Vector2 {
  return new THREE.Vector2(
    Math.round(position.x / cellSize) * cellSize,
    Math.round(position.z / cellSize) * cellSize
  );
}
```

Drawing completion detection:
```typescript
isPathClosed(): boolean {
  if (this.currentPath.length < 4) return false;

  const start = this.currentPath[0];
  const end = this.currentPath[this.currentPath.length - 1];

  return start.distanceTo(end) < this.config.snapThreshold;
}
```

### 6.2 Foundation Overlay UI (`src/components/ui/FoundationOverlay.tsx`)

Shows drawing progress and instructions:

```typescript
interface FoundationOverlayProps {
  visible: boolean;
  cellsDrawn: number;
  isClosing: boolean;     // Near start point
  canComplete: boolean;   // Meets minimum size
}
```

---

## Phase 7: Main Controller Integration

### 7.1 Staff Interaction Controller (`src/lib/interaction/StaffInteractionController.ts`)

Orchestrates all interaction systems:

```typescript
export class StaffInteractionController {
  private targetingSystem: TargetingSystem;
  private forceGrabController: ForceGrabController;
  private foundationDrawer: FoundationDrawer;
  private staffBeam: StaffBeam;

  private state: InteractionState;
  private holdThreshold: number = 200; // ms before opening menu

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene
  );

  // Input handlers (called from SimpleScene)
  handleMouseDown(event: MouseEvent): void;
  handleMouseUp(event: MouseEvent): void;
  handleMouseMove(event: MouseEvent): void;

  // Update (called in animation loop)
  update(deltaTime: number): void;

  // Register targetable entities
  registerMinion(id: string, mesh: THREE.Object3D, data: MinionData): void;
  registerBuilding(id: string, mesh: THREE.Object3D, data: BuildingData): void;
  setGround(mesh: THREE.Mesh): void;

  // State getters for UI
  getState(): InteractionState;
  getCurrentTarget(): Target | null;
  getMenuOptions(): MenuOption[] | null;

  // Action handlers (called from RadialMenu selection)
  executeAction(actionId: string): void;

  // Callbacks
  onMinionChat?: (minionId: string) => void;
  onMinionQuest?: (minionId: string) => void;
  onBuildingStatus?: (buildingId: string) => void;
  onFoundationComplete?: (foundation: DrawnFoundation) => void;

  dispose(): void;
}
```

State machine transitions:
```
idle --> (mousedown + target) --> aiming
aiming --> (hold > threshold) --> menu
aiming --> (mouseup < threshold) --> idle (show quick info)
menu --> (select grab) --> grabbing
menu --> (select build on ground) --> drawing
menu --> (select cancel / escape) --> idle
grabbing --> (mouseup) --> idle
drawing --> (path closed) --> idle (foundation complete)
```

---

## Phase 8: SimpleScene Integration

### 8.1 Changes to SimpleScene.tsx

Add interaction system initialization:

```typescript
// New refs
const interactionControllerRef = useRef<StaffInteractionController | null>(null);

// In setup effect
const interactionController = new StaffInteractionController(
  cameraController.getPerspCamera(),
  scene
);
interactionControllerRef.current = interactionController;

// Register entities as they're created
minionsRef.current.forEach((data, id) => {
  interactionController.registerMinion(id, data.instance.mesh, {
    name: minions.find(m => m.id === id)?.name,
    state: minions.find(m => m.id === id)?.state,
  });
});

// In first person input handling
function handleFirstPersonMouseDown(event: MouseEvent) {
  if (isFirstPersonRef.current) {
    interactionController.handleMouseDown(event);
  }
}

// In animation loop (first person section)
if (isFirstPersonRef.current) {
  interactionController.update(deltaTime);
}
```

### 8.2 HUD Integration

Update GameLayout to include interaction UI:

```typescript
// In GameLayout.tsx
const interactionState = useInteractionState(); // New hook/store selector

return (
  <>
    {/* Existing UI */}

    {/* Interaction UI (first person only) */}
    {cameraMode === 'firstPerson' && (
      <>
        <QuickInfo
          visible={interactionState.showQuickInfo}
          target={interactionState.target}
        />
        <RadialMenu
          visible={interactionState.mode === 'menu'}
          options={interactionState.menuOptions}
          selectedIndex={interactionState.selectedMenuIndex}
          onSelect={handleMenuSelect}
          onCancel={handleMenuCancel}
        />
        <FoundationOverlay
          visible={interactionState.mode === 'drawing'}
          {...foundationState}
        />
      </>
    )}
  </>
);
```

---

## Phase 9: Game Store Updates

### 9.1 Add Interaction State to Store

```typescript
// In gameStore.ts
interface GameStore {
  // Existing state...

  // Interaction state
  interactionMode: InteractionMode;
  interactionTarget: Target | null;
  grabbedMinionId: string | null;

  // Actions
  setInteractionMode: (mode: InteractionMode) => void;
  setInteractionTarget: (target: Target | null) => void;
  setGrabbedMinion: (minionId: string | null) => void;
}
```

---

## Implementation Order

### Sprint 1: Foundation (Core targeting and basic UI)
1. Create `src/types/interaction.ts`
2. Implement `TargetingSystem.ts`
3. Create `QuickInfo.tsx` component
4. Integrate targeting into SimpleScene (first person only)
5. Test: Tap shows quick info for minions/buildings/ground

### Sprint 2: Radial Menu
1. Create `RadialMenu.tsx` component with CSS animations
2. Implement menu selection logic (cursor angle detection)
3. Add hold detection to trigger menu
4. Lock camera when menu open
5. Test: Hold opens menu, cursor selects segments

### Sprint 3: Force Grab
1. Implement `ForceGrabController.ts` with spring physics
2. Create `StaffBeam.ts` visual effect
3. Add grab animation states to `FirstPersonHands.ts`
4. Wire up grab action from menu
5. Test: Can grab, carry, and throw minions

### Sprint 4: Foundation Drawing
1. Implement `FoundationDrawer.ts` with grid snapping
2. Create `FoundationOverlay.tsx` component
3. Add drawing beam effect to `StaffBeam.ts`
4. Wire up drawing action from ground menu
5. Test: Can draw closed shapes on ground

### Sprint 5: Polish and Integration
1. Create `StaffInteractionController.ts` to orchestrate
2. Connect all action callbacks (chat, quest, status, etc.)
3. Add visual/audio feedback (particles, sounds)
4. Handle edge cases (target lost, entity dies, etc.)
5. Performance optimization

---

## Testing Checklist

- [ ] Tap on minion shows quick info
- [ ] Tap on building shows quick info
- [ ] Tap on ground shows "Hold to build" info
- [ ] Hold on minion opens 4-segment menu
- [ ] Hold on building opens 4-segment menu
- [ ] Hold on ground opens 2-segment menu
- [ ] Menu segments highlight on cursor hover
- [ ] Dead zone in menu center (no selection)
- [ ] Cancel segment or escape closes menu
- [ ] Force Pull grabs minion with spring physics
- [ ] Grabbed minion follows camera smoothly
- [ ] Release throws minion with velocity
- [ ] Minion lands and recovers animation
- [ ] Ground drawing snaps to grid
- [ ] Path closes when returning to start
- [ ] Completed foundation triggers project menu
- [ ] Staff beam visible during interactions
- [ ] Staff animations match interaction state
- [ ] No performance regression in first person
- [ ] All interactions work with camera rotation

---

## Open Questions / Future Considerations

1. **Sound effects**: Should there be audio feedback? (pull whoosh, menu open, etc.)
2. **Minion reactions**: How should minions react while being carried?
3. **Building interior**: Can we interact with things inside buildings?
4. **Multi-select**: Could we grab multiple minions at once?
5. **Undo foundation**: Can we erase drawn foundations before confirming?
