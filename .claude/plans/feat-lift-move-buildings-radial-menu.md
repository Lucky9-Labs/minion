# Implementation Plan: Lift and Move Buildings from Radial Menu

## Overview

Add the ability to lift and move buildings using the radial menu's existing "Move" action, leveraging the grid mechanism from FoundationDrawer for placement. Buildings lift as a whole unit, display a purple ghost preview at the target location, and animate to the new position on commit.

## Current State

- **Radial Menu**: Already has "Move" option defined for buildings (`src/types/interaction.ts:57`)
- **Grid System**: FoundationDrawer exists with 1-unit cells (`src/lib/interaction/FoundationDrawer.ts`)
- **BuildingGrabController**: Exists but not integrated (`src/lib/interaction/BuildingGrabController.ts`)
- **Missing**: No `case 'move':` handler in `StaffInteractionController.executeAction()`

## User Requirements

1. **Grid**: Use FoundationDrawer's 1-unit grid system
2. **Preview**: Purple transparent mesh showing building footprint at target position
3. **Validation**: Allow free placement anywhere on valid map (no collision checking)
4. **Lift Animation**: Whole building rises into the air (simplified from floor-by-floor)
5. **Grid Visibility**: Full grid, localized around cursor (especially in first-person mode)
6. **Controls**: Click to place, right-click/ESC to cancel (return to original position)
7. **Commit Animation**: Building animates from lifted position to new location

---

## Implementation Steps

### Phase 1: Core Infrastructure

#### 1.1 Create BuildingMoveController
**File**: `src/lib/interaction/BuildingMoveController.ts` (new file)

A specialized controller for building movement that combines lifting, preview, and grid placement.

```typescript
interface BuildingMoveState {
  buildingId: string;
  buildingMesh: THREE.Object3D;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  footprint: { width: number; depth: number };
  phase: 'lifting' | 'moving' | 'committing' | 'cancelling';
}
```

**Responsibilities**:
- Store reference to building being moved and its original position
- Calculate building footprint from mesh bounds
- Manage lift/drop animations
- Coordinate with grid system for target position
- Handle commit and cancel flows

**Key Methods**:
- `startMove(buildingId: string, buildingMesh: THREE.Object3D): void`
- `updateTargetPosition(worldPos: THREE.Vector3): void`
- `commit(): { buildingId: string; newPosition: { x: number; z: number } }`
- `cancel(): void`
- `update(deltaTime: number): void` - Animation tick
- `dispose(): void`

#### 1.2 Create BuildingGhostPreview
**File**: `src/lib/interaction/BuildingGhostPreview.ts` (new file)

Renders the purple transparent mesh showing where the building will be placed.

**Responsibilities**:
- Create transparent purple box matching building footprint
- Update position to follow snapped grid position
- Show/hide based on move state
- Cleanup on dispose

**Implementation**:
- Use `THREE.BoxGeometry` with building's bounding box dimensions
- Material: `MeshBasicMaterial` with purple color (`0x8b5cf6`), opacity 0.4, transparent
- Add subtle wireframe outline for clarity

#### 1.3 Extend FoundationDrawer for Move Mode
**File**: `src/lib/interaction/FoundationDrawer.ts` (modify)

Add a "move mode" that shows localized grid around cursor instead of full selection grid.

**New Methods**:
- `enterMoveMode(cursorWorldPos: THREE.Vector3, gridRadius: number): void`
- `updateMoveGrid(cursorWorldPos: THREE.Vector3): void` - Recenter grid around cursor
- `exitMoveMode(): void`
- `getSnappedPosition(worldPos: THREE.Vector3): THREE.Vector3`

**Changes**:
- Add `mode: 'drawing' | 'moving'` state
- In move mode: show ~15x15 cell grid centered on cursor
- Grid cells are display-only (no selection in move mode)
- Grid follows cursor as it moves (recreate cells when cursor moves significantly)

---

### Phase 2: Integration with Interaction System

#### 2.1 Add 'moving' Mode to Interaction Types
**File**: `src/types/interaction.ts` (modify)

```typescript
// Line 21-27: Add 'moving' to InteractionMode
export type InteractionMode =
  | 'idle'
  | 'aiming'
  | 'menu'
  | 'grabbing'
  | 'drawing'
  | 'moving';  // <-- Add this
```

#### 2.2 Add Move Callbacks
**File**: `src/types/interaction.ts` (modify)

```typescript
// In StaffInteractionCallbacks interface
export interface StaffInteractionCallbacks {
  // ... existing callbacks
  onBuildingMoveStart?: (buildingId: string) => void;
  onBuildingMoveCommit?: (buildingId: string, newPosition: { x: number; z: number }) => void;
  onBuildingMoveCancel?: (buildingId: string) => void;
}
```

#### 2.3 Handle 'move' Action in StaffInteractionController
**File**: `src/lib/interaction/StaffInteractionController.ts` (modify)

In `executeAction()` method (around line 517-531), add case for 'move':

```typescript
case 'move': {
  if (this.currentTarget?.type === 'building' && this.currentTarget.id) {
    const buildingMesh = this.projectBuildingsRef?.get(this.currentTarget.id);
    if (buildingMesh) {
      this.startBuildingMove(this.currentTarget.id, buildingMesh);
    }
  }
  break;
}
```

**New Methods in StaffInteractionController**:
- `startBuildingMove(buildingId: string, buildingMesh: THREE.Object3D): void`
  - Instantiate BuildingMoveController
  - Instantiate BuildingGhostPreview
  - Put FoundationDrawer into move mode
  - Set mode to 'moving'
  - Start lift animation

- `updateBuildingMove(deltaTime: number): void`
  - Called from main update loop when mode === 'moving'
  - Raycast to ground for cursor position
  - Update BuildingMoveController target position
  - Update ghost preview position
  - Update localized grid position

- `commitBuildingMove(): void`
  - Called on left click during 'moving' mode
  - Trigger commit animation
  - Call callback with new position
  - Cleanup and return to 'idle'

- `cancelBuildingMove(): void`
  - Called on right-click or ESC during 'moving' mode
  - Trigger return animation
  - Call cancel callback
  - Cleanup and return to 'idle'

#### 2.4 Update Input Handling
**File**: `src/lib/interaction/StaffInteractionController.ts` (modify)

In `handleMouseDown()` and `handleMouseUp()`:
- When mode === 'moving' and left click → commit move
- When mode === 'moving' and right click → cancel move

In `handleKeyDown()`:
- When mode === 'moving' and ESC → cancel move

---

### Phase 3: Scene Integration

#### 3.1 Wire Up Callbacks in SimpleScene
**File**: `src/components/SimpleScene.tsx` (modify)

Add building move callbacks (around line 904-976):

```typescript
onBuildingMoveStart: (buildingId: string) => {
  // Optional: Could disable other interactions, show UI indicator
  console.log('Building move started:', buildingId);
},

onBuildingMoveCommit: (buildingId: string, newPosition: { x: number; z: number }) => {
  // Update store with new position
  useProjectStore.getState().updateBuildingPosition(buildingId, newPosition);
},

onBuildingMoveCancel: (buildingId: string) => {
  // Building returns to original position (handled by animation)
  console.log('Building move cancelled:', buildingId);
},
```

#### 3.2 Update Building Rendering for Animation
**File**: `src/components/Building.tsx` or individual building files (modify)

Buildings need to support position animation during move:
- Option A: Controller directly manipulates mesh position (preferred)
- Option B: Add `animatedPosition` prop that overrides stored position

Since BuildingMoveController has direct mesh reference, Option A is cleaner.

---

### Phase 4: Animations

#### 4.1 Lift Animation
**File**: `src/lib/interaction/BuildingMoveController.ts`

When move starts:
1. Store original Y position
2. Over ~0.3-0.5 seconds, lerp building Y position up by 2-3 units
3. Add subtle "wobble" or "float" effect while lifted (optional)

```typescript
private animateLift(deltaTime: number): void {
  const liftHeight = 2.5;
  const liftSpeed = 5; // units per second

  if (this.currentLiftHeight < liftHeight) {
    this.currentLiftHeight = Math.min(
      this.currentLiftHeight + deltaTime * liftSpeed,
      liftHeight
    );
    this.buildingMesh.position.y = this.originalPosition.y + this.currentLiftHeight;
  }
}
```

#### 4.2 Follow Animation (during moving)
While in 'moving' phase:
- Ghost preview snaps instantly to grid position
- Building mesh stays lifted at cursor's last position (or follows loosely)
- Grid recenters around cursor

#### 4.3 Commit Animation
When player commits:
1. Calculate path from current lifted position to target ground position
2. Animate building along path over ~0.5-0.8 seconds
3. "Land" animation - slight overshoot down then settle
4. Once complete, update store and cleanup

```typescript
private animateCommit(deltaTime: number): boolean {
  const moveSpeed = 8;
  const direction = this.targetPosition.clone().sub(this.buildingMesh.position);
  const distance = direction.length();

  if (distance < 0.1) {
    this.buildingMesh.position.copy(this.targetPosition);
    return true; // Animation complete
  }

  direction.normalize();
  const moveAmount = Math.min(deltaTime * moveSpeed, distance);
  this.buildingMesh.position.add(direction.multiplyScalar(moveAmount));
  return false;
}
```

#### 4.4 Cancel Animation
When player cancels:
1. Animate building back to original position
2. Lower back to ground
3. Cleanup without updating store

---

### Phase 5: Grid Localization

#### 5.1 Localized Grid in FoundationDrawer
**File**: `src/lib/interaction/FoundationDrawer.ts` (modify)

Add move mode with localized grid:

```typescript
private moveGridRadius = 7; // 15x15 grid (7 cells each direction)
private moveGridCenter: THREE.Vector3 | null = null;

enterMoveMode(centerPos: THREE.Vector3): void {
  this.mode = 'moving';
  this.moveGridCenter = centerPos.clone();
  this.createLocalizedGrid(centerPos);
}

private createLocalizedGrid(center: THREE.Vector3): void {
  this.clearCells();

  const snappedX = Math.round(center.x / this.cellSize) * this.cellSize;
  const snappedZ = Math.round(center.z / this.cellSize) * this.cellSize;

  for (let dx = -this.moveGridRadius; dx <= this.moveGridRadius; dx++) {
    for (let dz = -this.moveGridRadius; dz <= this.moveGridRadius; dz++) {
      const x = snappedX + dx * this.cellSize;
      const z = snappedZ + dz * this.cellSize;
      this.createCell(x, z);
    }
  }
}

updateMoveGrid(cursorPos: THREE.Vector3): void {
  if (!this.moveGridCenter) return;

  const distance = cursorPos.distanceTo(this.moveGridCenter);
  if (distance > this.cellSize * 3) {
    // Recenter grid when cursor moves significantly
    this.moveGridCenter.copy(cursorPos);
    this.createLocalizedGrid(cursorPos);
  }
}
```

#### 5.2 Visual Distinction for Move Grid
- Same purple color scheme as selection grid
- All cells at base opacity (0.2) - no selection highlighting
- Grid helper (lines) shown for reference
- Hovered cell (under ghost preview) highlighted slightly (0.3 opacity)

---

### Phase 6: UI Feedback

#### 6.1 Update InteractionHUD for Moving Mode
**File**: `src/components/ui/InteractionHUD.tsx` (modify)

When mode === 'moving', show helpful text:
- "Click to place • Right-click to cancel"
- Building name being moved
- Current grid position (optional)

#### 6.2 Cursor Feedback
Consider changing cursor or showing visual indicator that building can be placed.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/interaction/BuildingMoveController.ts` | **NEW** | Core move logic, animations |
| `src/lib/interaction/BuildingGhostPreview.ts` | **NEW** | Purple preview mesh |
| `src/types/interaction.ts` | Modify | Add 'moving' mode, callbacks |
| `src/lib/interaction/FoundationDrawer.ts` | Modify | Add move mode, localized grid |
| `src/lib/interaction/StaffInteractionController.ts` | Modify | Handle 'move' action, coordinate controllers |
| `src/components/SimpleScene.tsx` | Modify | Wire up move callbacks to store |
| `src/components/ui/InteractionHUD.tsx` | Modify | Show move mode instructions |

---

## Testing Checklist

- [ ] Select building → Hold → Radial menu appears with "Move" option
- [ ] Select "Move" → Building lifts off ground with animation
- [ ] Moving cursor → Grid appears localized around cursor
- [ ] Moving cursor → Purple ghost preview follows, snapped to grid
- [ ] Grid follows cursor when moved far enough
- [ ] Left click → Building animates to new position, lands
- [ ] Right click during move → Building returns to original position
- [ ] ESC during move → Building returns to original position
- [ ] Store updated with new position after commit
- [ ] Building persists at new position after page refresh
- [ ] Works in first-person mode with localized grid

---

## Future Enhancements (Out of Scope)

- Floor-by-floor disassembly animation (requires mesh refactoring)
- Collision detection with other buildings
- Rotation during move
- Multi-building selection and move
- Undo/redo for moves
