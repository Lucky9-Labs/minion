# Feature: Minion Collision Trigger for Project Buildings

## Overview
When a minion is thrown and collides with a project building, it should:
1. Detect the collision and stop the throw physics
2. Queue/show a conversation dialog asking for instructions
3. On instruction submission: path the minion to the building's scaffolding
4. On dialog dismiss: return minion to idle state

## Architecture Decisions

### Collision Detection
- Reuse the same raycast-based targeting system used in first-person mode
- Check thrown minion position against registered project building meshes
- Identify project buildings via `userData.isProjectBuilding === true`
- Use bounding sphere pre-check for performance, then precise raycast

### Dialog System
- Reuse existing `ConversationPanel` for RPG-style dialog
- Queue multiple collision dialogs (one at a time)
- Open-ended text input for instructions
- Dismiss without instructions → minion returns to idle

### Pathing
- Use `ElevatedPathfinder.findPathFromGround()` to path to scaffolding
- Minion walks from landing position to scaffold stairs, then up to platform

---

## Implementation Plan

### Phase 1: Collision Detection System

#### 1.1 Create Collision Detection Utility
**File:** `src/lib/interaction/ThrownMinionCollision.ts` (new)

```typescript
interface CollisionResult {
  hit: boolean;
  buildingId: string | null;
  projectId: string | null;
  hitPoint: THREE.Vector3 | null;
}
```

- Create `ThrownMinionCollisionDetector` class
- Accept `projectBuildingsRef` map in constructor
- Method: `checkCollision(position: Vector3, velocity: Vector3, radius: number): CollisionResult`
  - Broad phase: bounding sphere check against all project buildings
  - Narrow phase: raycast in velocity direction against building meshes
  - Return hit building info if collision detected

#### 1.2 Integrate into Thrown Minion Physics Loop
**File:** `src/components/SimpleScene.tsx` (~line 1771)

- Import collision detector
- Create collision detector instance with `projectBuildingsRef`
- In the `thrownMinionsRef.current.forEach()` loop:
  - After position update, before ground collision check
  - Call `checkCollision(newPosition, velocity, minionRadius)`
  - If collision detected:
    - Stop throw physics (remove from `thrownMinionsRef`)
    - Queue collision event for dialog system
    - Set minion state to 'conversing' temporarily

---

### Phase 2: Dialog Queue System

#### 2.1 Add Collision Dialog Queue to Store
**File:** `src/store/gameStore.ts`

Add new state:
```typescript
interface CollisionDialogEntry {
  minionId: string;
  projectId: string;
  buildingId: string;
  landingPosition: { x: number; y: number; z: number };
}

// In GameState:
collisionDialogQueue: CollisionDialogEntry[];
```

Add actions:
- `queueCollisionDialog(entry: CollisionDialogEntry)` - add to queue
- `dequeueCollisionDialog()` - remove first item, return it
- `peekCollisionDialog()` - get first item without removing
- `clearCollisionDialogForMinion(minionId: string)` - remove specific minion's entry

#### 2.2 Create Collision Dialog Component
**File:** `src/components/ui/CollisionInstructionDialog.tsx` (new)

- Show when `collisionDialogQueue.length > 0` and no active conversation
- Display:
  - Minion name/avatar
  - Building/project name
  - Text: "I've arrived at [Building]. What would you like me to work on?"
  - Open-ended text input field
  - "Assign Task" button (submit)
  - "Cancel" button (dismiss)
- On submit:
  - Call store action to assign minion to building with instructions
  - Dequeue dialog
  - Trigger pathing to scaffolding
- On cancel:
  - Return minion to idle state
  - Dequeue dialog

#### 2.3 Integrate Dialog into GameLayout
**File:** `src/components/GameLayout.tsx`

- Import `CollisionInstructionDialog`
- Render dialog when queue is non-empty
- Ensure it doesn't conflict with existing ConversationPanel

---

### Phase 3: Minion Assignment & Pathing

#### 3.1 Extend Building Assignment
**File:** `src/types/game.ts`

Extend `BuildingAssignment` interface:
```typescript
interface BuildingAssignment {
  projectId: string;
  prNumber?: number;
  scaffoldPosition?: { x: number; y: number; z: number };
  instructions?: string;  // NEW: user-provided instructions
  assignedAt?: number;    // NEW: timestamp
}
```

#### 3.2 Add Assignment Action with Pathing
**File:** `src/store/gameStore.ts`

Extend `assignMinionToBuilding` action:
- Accept `instructions` parameter
- Store instructions in assignment
- Set minion state to 'traveling' (will path to scaffolding)

#### 3.3 Implement Pathing to Scaffolding
**File:** `src/components/SimpleScene.tsx`

In the minion animation loop, handle new assignment pathing:
- Detect when minion has `buildingAssignment` but isn't at scaffold yet
- Use `ElevatedPathfinder.findPathFromGround()` to get path
- Store path waypoints on minion data
- Lerp minion along path waypoints
- When minion reaches scaffolding:
  - Update state to 'working'
  - Position on scaffold platform

#### 3.4 Create Path Following System
**File:** `src/lib/navigation/PathFollower.ts` (new)

```typescript
interface PathFollowState {
  path: ElevatedNavPoint[];
  currentWaypointIndex: number;
  progress: number; // 0-1 between waypoints
}
```

- Track path following state per minion
- Method: `updatePathFollow(delta: number, speed: number): Vector3` - returns new position
- Method: `isPathComplete(): boolean`
- Integrate with minion movement in SimpleScene

---

### Phase 4: State Transitions & Edge Cases

#### 4.1 Handle Dialog Dismiss
**File:** `src/store/gameStore.ts`

Add action `dismissCollisionDialog(minionId: string)`:
- Remove from queue
- Set minion state back to 'idle'
- Clear any temporary assignment

#### 4.2 Handle Multiple Throws
- Queue system naturally handles this
- Each collision adds to queue
- Dialogs process one at a time

#### 4.3 Handle Minion Already Assigned
- If thrown minion already has assignment, collision should:
  - Option A: Override with new assignment (ask confirmation?)
  - Option B: Ignore collision, continue to original destination
  - **Recommendation:** Show dialog, let user decide (new instructions override)

---

## File Changes Summary

### New Files
1. `src/lib/interaction/ThrownMinionCollision.ts` - Collision detection
2. `src/components/ui/CollisionInstructionDialog.tsx` - Dialog UI
3. `src/lib/navigation/PathFollower.ts` - Path following utility

### Modified Files
1. `src/store/gameStore.ts` - Add collision dialog queue and actions
2. `src/types/game.ts` - Extend BuildingAssignment type
3. `src/components/SimpleScene.tsx` - Integrate collision detection and pathing
4. `src/components/GameLayout.tsx` - Render collision dialog

---

## Data Flow

```
[Throw Minion]
    ↓
[Physics Loop detects collision with project building]
    ↓
[Stop throw, queue CollisionDialogEntry]
    ↓
[CollisionInstructionDialog shows (first in queue)]
    ↓
[User enters instructions] ──OR── [User dismisses]
    ↓                                    ↓
[assignMinionToBuilding()]         [Minion → idle]
    ↓
[Minion state → 'traveling']
    ↓
[PathFollower guides to scaffolding]
    ↓
[Minion reaches scaffold → state 'working']
```

---

## Testing Scenarios

1. **Basic collision**: Throw minion at building → dialog appears → submit → minion paths to scaffolding
2. **Dialog dismiss**: Throw → dialog → cancel → minion stays at landing spot, idle
3. **Multiple throws**: Throw 3 minions rapidly → 3 dialogs queue → resolve one by one
4. **Non-project building**: Throw at tower/village building → no collision trigger (passes through or bounces)
5. **Already assigned minion**: Throw assigned minion at different building → dialog for new assignment

---

## Open Questions Resolved

| Question | Decision |
|----------|----------|
| Collision method | Raycast against project building meshes (same as first-person targeting) |
| Dialog style | Reuse ConversationPanel RPG style, open-ended text input |
| Path destination | Scaffolding platform via ElevatedPathfinder |
| Which buildings | Project buildings only (`userData.isProjectBuilding`) |
| On dismiss | Minion returns to idle at landing position |
| Multiple dialogs | Queue system, one at a time |
