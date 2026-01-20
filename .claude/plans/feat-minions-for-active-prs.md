# Feature Plan: Minions on Active PR Scaffolding

## Overview
Implement automatic assignment of minions to building scaffolding for active PRs/worktrees. Each active PR gets one minion working on its corresponding scaffolding floor. When a PR closes, its minion is automatically unassigned and returns to idle state.

**Key Constraint**: Scaffolding floors are already generated based on active PR count, so we map minions 1:1 to those floors.

---

## Architecture Decisions

### 1. Data Flow
- **Source of Truth**: Active worktrees/PRs from the file system (via `/api/scan` endpoint)
- **Persistence**: Zustand store with localStorage (minion assignments are persistent)
- **Update Trigger**: Auto-detect on app load + periodic polling for PR changes
- **Position Assignment**: One minion per scaffolding floor (floor 0 = first PR, floor 1 = second PR, etc.)

### 2. Minion Lifecycle (Reuse Priority)
1. **Initialization**: On app load, scan for active PRs/worktrees
2. **Assignment Strategy**:
   - Count active PRs needed
   - Count available idle minions
   - **REUSE idle minions first** (match to PR floors)
   - **ONLY CREATE new minions** if `idle_minion_count < active_pr_count`
3. **Working State**: Assigned minions in "working" state on scaffolding
4. **On PR Close**: Detect via polling, unassign minion, return to idle (back in pool for reuse)
5. **Persistence**: All assignments saved to localStorage

### 3. Coordinate System for Scaffolding Positions
- **Reference**: Existing `Scaffolding.tsx` component generates geometric layout
- **Position Calculation**:
  - Floor `n` is at Y-height: `baseHeight + n * floorHeight`
  - Minions positioned on the front platform of their floor
  - X-spread: Distribute minions across floor width (center + offsets)
  - Z-position: Front platform (negative Z value from center)

---

## Implementation Steps

### Phase 1: Data Structures & Store Extensions

#### 1.1 Update `types/game.ts`
- Add `ActivePRAssignment` type to track PR → Minion mappings:
  ```typescript
  export interface ActivePRAssignment {
    prNumber: number;
    minionId: string;
    scaffoldFloor: number;        // 0-based floor index
    assignedAt: number;           // timestamp
  }
  ```
- Extend `GameState` to include:
  ```typescript
  activeScaffoldingAssignments: ActivePRAssignment[];
  ```

#### 1.2 Extend `store/gameStore.ts`
Add store actions:
- `assignMinionsToScaffolding(assignments: ActivePRAssignment[])` - Batch assign minions
- `unassignMinionFromScaffolding(minionId: string)` - Remove minion from scaffolding
- `getScaffoldPositionForFloor(floor: number, baseHeight: number, buildingWidth: number, buildingDepth: number): {x, y, z}` - Calculate position
- `syncActiveAssignments(activePRNumbers: number[])` - Compare current assignments with active PRs, unassign missing ones
- `getAssignmentsForProject(projectId: string): ActivePRAssignment[]` - Query assignments by project

#### 1.3 Utilities: `lib/scaffoldingPositions.ts` (new)
Helper functions to calculate minion positions on scaffolding:
```typescript
export function calculateScaffoldPosition(
  floor: number,
  minionIndexOnFloor: number,
  baseHeight: number,
  floorHeight: number,
  buildingWidth: number,
  buildingDepth: number,
  offset: number = 0.3
): { x: number; y: number; z: number }

export function calculateMinionsForFloor(prCount: number): number
  // Returns how many minions can fit on a floor (capped at reasonable number)
```

---

### Phase 2: Active PR Detection & Sync

#### 2.1 Create `lib/activePRScanner.ts` (new)
Responsibilities:
- Read project worktrees from file system
- Filter for active worktrees with linked PRs
- Return list of active PR numbers
- Compare with previous scan to detect PR closures

```typescript
export interface ActivePRScanResult {
  projectId: string;
  activePRNumbers: number[];
  timestamp: number;
}

export async function scanActiveWorkingPRs(projectPath: string): Promise<ActivePRScanResult>
  // Uses existing /api/scan endpoint or direct file system access
```

#### 2.2 Create `hooks/useActiveAssignments.ts` (new)
React hook to:
- Initialize assignments on app load (via Zustand action)
- Detect changes in active PRs
- Sync assignments when PRs open/close
- Handle minion lifecycle

```typescript
export function useActiveAssignments(projectId: string): {
  assignments: ActivePRAssignment[];
  isLoading: boolean;
  lastSyncTime: number;
}
```

---

### Phase 3: UI Integration

#### 3.1 Modify Building Components
Update building rendering components to:
- Accept `activeAssignments: ActivePRAssignment[]` prop
- Pass assignment info to `Scaffolding` component
- Render minions at calculated scaffold positions

#### 3.2 Enhance `components/ScaffoldWorker.tsx`
Currently renders hardcoded goblin worker. Enhance to:
- Accept optional `minionId` prop
- Look up minion from Zustand store
- Use minion's actual name, appearance (skin, role color)
- Fall back to hardcoded goblin if no minion (for preview)
- Keep existing animations (walk, hammer, look)

---

### Phase 4: Minion Assignment Logic (Reuse Priority)

#### 4.1 Minion Assignment Algorithm
```
On PR change:
  activePRCount = number of open PRs
  idleMinions = minions with no buildingAssignment

  if idleMinions.length >= activePRCount:
    // REUSE IDLE MINIONS (preferred)
    assignments = idleMinions.slice(0, activePRCount)
      .map((minion, floor) => ({prNumber, minionId, floor}))
  else:
    // REUSE ALL IDLE + CREATE NEW (only when necessary)
    assignments = idleMinions
      .map((minion, floor) => ({prNumber: openPRs[floor], minionId, floor}))
    newMinionsNeeded = activePRCount - idleMinions.length
    for i in range(newMinionsNeeded):
      newMinion = recruitMinion("Artificer" + counter, 'artificer', ['methodical'])
      assignments.push({prNumber: openPRs[floor], minionId: newMinion.id, floor})

  persist(assignments)
```

#### 4.2 Store State Changes
When PRs change:
1. Get current active PR numbers
2. Get current assignments and idle minion pool
3. Apply reuse algorithm (reuse idle → create only if needed)
4. Unassign minions for closed PRs (add back to idle pool)
5. Update store and persist to localStorage

---

### Phase 5: Integration Points

#### 5.1 Game Initialization (`app/page.tsx` or `components/GameLayout.tsx`)
- Call sync function on component mount
- Set up periodic polling (e.g., every 30 seconds)
- Handle edge cases (game loads while PRs are closed, etc.)

#### 5.2 Responsive Updates
- Listen to store changes via Zustand subscribers
- Update minion positions when assignments change
- Animate transitions (minions moving to/from scaffolding)

---

## Data Structures Summary

### New/Modified Types
```typescript
// types/game.ts
export interface ActivePRAssignment {
  prNumber: number;
  minionId: string;
  scaffoldFloor: number;
  assignedAt: number;
}

// Extended GameState
export interface GameState {
  // ... existing fields
  activeScaffoldingAssignments: ActivePRAssignment[];
}
```

### New Store Actions (gameStore.ts)
- `assignMinionsToScaffolding(assignments)`
- `unassignMinionFromScaffolding(minionId)`
- `syncActiveAssignments(activePRNumbers)`
- `getScaffoldPositionForFloor(floor, baseHeight, width, depth)`
- `getAssignmentsForProject(projectId)`

---

## File Changes Summary

### New Files
1. `src/lib/scaffoldingPositions.ts` - Position calculation utilities
2. `src/lib/activePRScanner.ts` - Active PR detection
3. `src/hooks/useActiveAssignments.ts` - React hook for assignments
4. `.claude/plans/feat-minions-for-active-prs.md` - This plan

### Modified Files
1. `src/types/game.ts` - Add `ActivePRAssignment` type, extend `GameState`
2. `src/store/gameStore.ts` - Add assignment actions and queries with reuse logic
3. `src/components/ScaffoldWorker.tsx` - **ENHANCE** to connect to minion store data (name, appearance)
4. `src/components/buildings/*.tsx` - Pass minion assignment data to ScaffoldWorker
5. `src/app/page.tsx` or `src/components/GameLayout.tsx` - Initialize assignments on load

### Already Exists
- `src/components/ScaffoldWorker.tsx` - Already renders workers with animation, needs enhancement to use real minion data

---

## Position Calculation Details

Given:
- `floor: number` - Scaffold floor index (0-based)
- `baseHeight: number` - Y-position of ground level
- `floorHeight: number` - Height between floors (default: 2)
- `buildingWidth: number` - Building dimension
- `buildingDepth: number` - Building dimension
- `offset: number` - Scaffolding offset from building edge (default: 0.3)

Calculate:
```
y = baseHeight + floor * floorHeight + floorHeight - 0.3  // Standing on platform
x = center + minion_spread_offset                          // Distributed across front
z = -(buildingDepth / 2 + offset + 0.5)                   // Front platform position
```

For multiple minions on same floor (if needed):
- Space them evenly across the front platform width
- Or use simple offset pattern (e.g., x += minion_index * 0.5)

---

## Testing Considerations

1. **Initialization**: App loads with no active PRs → no assignments
2. **Single PR**: One active PR → one minion on floor 0
3. **Multiple PRs**: Three active PRs → three minions on floors 0, 1, 2
4. **PR Closure**: Close a PR → minion unassigned, returns to idle
5. **Persistence**: Reload app → assignments restored from localStorage
6. **Reuse**: Unassigned minion reassigned to new PR → correct floor position

---

## Estimated Scope
- **Store Logic** (gameStore.ts): Add 5-6 store actions with minion reuse algorithm
- **Store Types** (types/game.ts): Add `ActivePRAssignment` type
- **Position Calculation**: 1 utility file (scaffoldingPositions.ts)
- **PR Detection**: 1 utility file (activePRScanner.ts)
- **React Hook**: 1 file (useActiveAssignments.ts)
- **UI Enhancement**: Enhance ScaffoldWorker.tsx to use minion store data
- **Integration**: Updates to CottageBuilding.tsx and entry point
- **Total**: ~7-8 new/modified files, **moderate effort** (foundation is in place)

### Implementation Priority
1. **Phase 1** - Store types & reuse algorithm (critical path)
2. **Phase 2** - Active PR scanner & detection
3. **Phase 4** - Store actions for minion assignment/reuse
4. **Phase 3** - React hook & UI integration
5. **Phase 5** - Game initialization

---

## Open Questions & Future Considerations

1. **Periodic Polling Interval**: How often should we check for PR changes? (suggested: 30-60 seconds)
2. **Max Minions Per Floor**: Should we limit minions on a single floor? (suggested: 1 per floor initially, expand later)
3. **Animation**: Should minions animate walking to/from scaffolding? (scope: out of initial implementation)
4. **Visual Feedback**: Should PR number be displayed above minions? (scope: future UI enhancement)
5. **Minion Selection**: When reassigning, which idle minion gets picked? (current: first available, could be configurable)

---

## Success Criteria

- ✅ App loads and detects active PRs/worktrees
- ✅ One minion assigned to each active PR's scaffolding floor
- ✅ Minions positioned correctly on scaffolding geometry
- ✅ When PR closes, minion is unassigned and returns to idle
- ✅ Assignments persist across app reload
- ✅ New minions auto-created if needed
- ✅ Existing idle minions reused before creating new ones
