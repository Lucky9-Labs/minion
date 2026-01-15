# Implementation Plan: Minions Building Scaffolding & PRs

## Overview

Transform buildings into living representations of repository activity. Each building's height reflects merged PR count, open PRs render as scaffolding floors with worker minions, and buildings can be moved via the radial menu with auto-updating cobblestone paths.

---

## Phase 1: GitHub CLI Integration for PR Data

### 1.1 Create PR Fetching API Route

**File:** `src/app/api/prs/route.ts`

Add a new API route that uses `gh` CLI to fetch PR data for a repository:

```typescript
// Use gh pr list --json number,title,headRefName,state,createdAt
// Map PRs to worktrees by matching headRefName to worktree.branch
```

**Commands to execute:**
- `gh pr list --repo <owner/repo> --state open --json number,title,headRefName,state,createdAt`
- Parse JSON output and return structured PR data

### 1.2 Update Scan Route to Include PR Data

**File:** `src/app/api/scan/route.ts`

Modify `scanProjects()` to:
1. Extract git remote URL from each project (`git remote get-url origin`)
2. Parse owner/repo from GitHub URL
3. Call `gh pr list` for open PRs
4. Match PRs to worktrees by branch name
5. Get merged PR count: `gh pr list --state merged --json number | jq length`

**New data structure additions:**
```typescript
interface OpenPR {
  number: number;
  title: string;
  branch: string;  // headRefName - matches worktree.branch
  createdAt: number;
}

// Add to ChaudProject:
openPRs: OpenPR[];
```

### 1.3 Update Types

**File:** `src/types/project.ts`

Add `OpenPR` interface and extend `ChaudProject` and `Worktree` types:
- `ChaudProject.openPRs: OpenPR[]`
- `Worktree.prNumber: number | null` (linked PR)

---

## Phase 2: Building Height & Stage Logic

### 2.1 Update Building Stage Determination

**File:** `src/app/api/scan/route.ts`

Modify `determineBuildingStage()`:
```typescript
// OLD: if (worktreeCount > 0) return 'scaffolding';
// NEW: Scaffolding only if there are open PRs
function determineBuildingStage(openPRCount: number, mergeCount: number): BuildingStage {
  if (openPRCount > 0) return 'scaffolding';
  if (mergeCount > 0) return 'decorated';
  return 'foundation';
}
```

### 2.2 Building Height Calculation

**File:** `src/app/api/scan/route.ts`

Update building level calculation:
```typescript
// Building height = base height + merged PR floors
// Each merged PR adds one floor
building.level = Math.max(1, mergeCount);
```

### 2.3 Update Project Store Merging

**File:** `src/store/projectStore.ts`

Ensure `openPRs` data is merged correctly during scan refresh while preserving user customizations.

---

## Phase 3: Scaffolding Visual Component

### 3.1 Create Scaffolding Geometry

**File:** `src/components/buildings/Scaffolding.tsx`

Create a medieval wooden scaffolding component:
- Vertical wooden poles at corners
- Horizontal crossbeams connecting poles
- Diagonal bracing for stability
- Wooden planks as walkways for minions
- Each floor of scaffolding = one open PR

**Props:**
```typescript
interface ScaffoldingProps {
  buildingWidth: number;
  buildingDepth: number;
  floorCount: number;        // Number of open PRs = scaffold floors
  baseHeight: number;        // Start above existing building height
  floorHeight: number;       // Height per floor (~2 units)
}
```

**Visual design:**
- Warm brown wood material (`#8B4513` sienna)
- Slightly weathered texture
- Poles extend slightly above top platform
- Rope/cloth details optional

### 3.2 Integrate Scaffolding into Building Components

**Files:** `src/components/buildings/*.tsx`

For each building type, conditionally render scaffolding when `stage === 'scaffolding'`:
```tsx
{stage === 'scaffolding' && openPRs.length > 0 && (
  <Scaffolding
    buildingWidth={buildingWidth}
    buildingDepth={buildingDepth}
    floorCount={openPRs.length}
    baseHeight={building.level * floorHeight}
  />
)}
```

### 3.3 Update Building.tsx Router

**File:** `src/components/Building.tsx`

Pass `openPRs` and building data to child components.

---

## Phase 4: Worker Minions on Scaffolding

### 4.1 Create Worker Minion Type

**File:** `src/types/game.ts`

Add a `WorkerMinion` type for auto-generated scaffold workers:
```typescript
interface WorkerMinion {
  id: string;
  prNumber: number;
  projectId: string;
  position: [number, number, number];  // On scaffolding
  animationState: 'building';
}
```

### 4.2 Worker Minion Store Slice

**File:** `src/store/projectStore.ts`

Add worker minion management:
```typescript
workerMinions: WorkerMinion[];
generateWorkersForProject: (projectId: string, openPRs: OpenPR[]) => void;
removeWorkersForProject: (projectId: string) => void;
```

Logic:
- One worker minion per open PR
- First use assigned `gameStore.minions` if available
- Generate temporary workers for remaining PRs
- Workers have unique IDs like `worker_${projectId}_${prNumber}`

### 4.3 Create ScaffoldWorker Component

**File:** `src/components/ScaffoldWorker.tsx`

Render a minion on scaffolding:
- Reuse `MinionEntity` visual geometry (goblin model)
- Position on scaffolding platform for their PR floor
- Custom `animateBuilding()` animation:
  - Hammering motion
  - Occasional brick-laying gesture
  - Random pauses to "inspect work"
- Smaller scale (~0.8) to fit on platforms

### 4.4 Integrate Workers into Scaffolding

**File:** `src/components/buildings/Scaffolding.tsx`

Render `ScaffoldWorker` for each open PR:
```tsx
{openPRs.map((pr, index) => (
  <ScaffoldWorker
    key={pr.number}
    prNumber={pr.number}
    floorIndex={index}
    position={calculatePlatformPosition(index)}
  />
))}
```

---

## Phase 5: Building Movement via Radial Menu

### 5.1 Add Move Option to Building Menu

**File:** `src/types/interaction.ts`

Add 'move' option to `BUILDING_MENU_OPTIONS`:
```typescript
{ id: 'move', label: 'Move', icon: '🏗️', description: 'Relocate building' }
```

### 5.2 Create BuildingGrabController

**File:** `src/lib/interaction/BuildingGrabController.ts`

Simplified version of `ForceGrabController` for buildings:
- No ragdoll/rotation effects
- Lift building to hover height (~3 units above ground)
- Follow camera aim point, snapped to grid
- Ghost preview showing valid placement
- Drop on click with grid snap

```typescript
class BuildingGrabController {
  grab(projectId: string, buildingMesh: THREE.Object3D): void;
  updateTargetFromCamera(camera: THREE.Camera, groundPlane: THREE.Plane): void;
  getSnappedPosition(): { x: number; z: number };  // Grid-snapped
  drop(): { projectId: string; newPosition: { x: number; z: number } };
  cancel(): void;
}
```

### 5.3 Update StaffInteractionController

**File:** `src/lib/interaction/StaffInteractionController.ts`

Handle building move selection:
```typescript
case 'move':
  this.startBuildingGrab(target.id, target.mesh);
  break;
```

Add building grab mode to interaction state machine.

### 5.4 Grid Snap Visualization

**File:** `src/components/ui/BuildingPlacementGrid.tsx`

Show grid overlay when moving building:
- Highlight valid cells
- Show building footprint ghost
- Red tint for invalid placements (overlapping)

### 5.5 Persist Building Position

**File:** `src/store/projectStore.ts`

Add action to update building position:
```typescript
updateBuildingPosition: (projectId: string, position: { x: number; z: number }) => void;
```

Ensure position persists to localStorage and survives scan refreshes.

---

## Phase 6: Cobblestone Pathing System

### 6.1 Create Path Generation Utility

**File:** `src/lib/pathGeneration.ts`

Generate organic curved paths between buildings and tower:

```typescript
interface PathSegment {
  points: THREE.Vector3[];  // Bezier control points
  width: number;
}

function generateVillagePaths(buildings: Building[]): PathSegment[];
```

**Algorithm:**
1. Tower at center (0, 0) is the hub
2. For each building, create a path to the main street
3. Main street runs along Z-axis
4. Use cubic Bezier curves for organic feel
5. Paths widen at intersections

### 6.2 Create CobblestonePathMesh Component

**File:** `src/components/CobblestonePathMesh.tsx`

Generate static mesh for all paths:
- Extrude path curves into flat geometry
- Apply cobblestone texture/material
- Slightly raised above ground (0.01 units)
- Instance individual cobblestones for detail (optional)

**Material:**
- Gray stone base color
- Normal map for depth
- Slight roughness variation

### 6.3 Integrate Paths into Scene

**File:** `src/components/Ground.tsx` or new `VillagePaths.tsx`

Render paths based on current building positions:
```tsx
const paths = useMemo(() =>
  generateVillagePaths(projects.map(p => p.building)),
  [projects]  // Regenerate when buildings move
);

return <CobblestonePathMesh segments={paths} />;
```

### 6.4 Update Paths on Building Move

When a building is dropped at new position:
1. Update projectStore with new position
2. Path component recomputes due to dependency
3. New mesh generated with updated curves

---

## Phase 7: Polling System

### 7.1 Create Polling Hook

**File:** `src/hooks/useProjectPolling.ts`

```typescript
export function useProjectPolling(intervalMs: number = 30000) {
  const { scanProjects } = useProjectStore();

  useEffect(() => {
    // Initial scan
    scanProjects();

    // Poll every 30 seconds
    const interval = setInterval(scanProjects, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}
```

### 7.2 Integrate Polling into App

**File:** `src/app/page.tsx` or `src/components/GameLayout.tsx`

Call `useProjectPolling()` at app level to start background scanning.

### 7.3 Handle State Transitions

When polling detects changes:
- **New worktree + PR appears:** Add scaffolding floor, spawn worker minion
- **Worktree disappears + new merge commit:** Complete floor (remove scaffolding for that PR), remove worker, increment building height
- **PR closed without merge:** Remove scaffolding floor and worker

---

## Phase 8: Animation & Polish

### 8.1 Building Animation

**File:** `src/components/ScaffoldWorker.tsx`

Create `animateBuilding()` function:
```typescript
function animateBuilding(time: number, meshRefs: MinionMeshRefs) {
  // Hammering motion: arm swings down rhythmically
  // Body bobs slightly with each hammer hit
  // Occasional pause to wipe brow or look at work
}
```

### 8.2 Scaffolding Appear/Disappear Animation

When PR opens: Scaffolding builds up from base (pieces appear sequentially)
When PR merges: Scaffolding fades out as building section solidifies

### 8.3 Worker Minion Spawn Animation

Workers materialize on scaffolding with sparkle effect when PR detected.

---

## Data Flow Summary

```
┌─────────────────┐
│   GitHub API    │
│   (gh CLI)      │
└────────┬────────┘
         │ PRs, merge count
         ▼
┌─────────────────┐
│  /api/scan      │
│  Route          │
└────────┬────────┘
         │ ChaudProject[]
         ▼
┌─────────────────┐
│  projectStore   │◄──── User moves building
│  (Zustand)      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌──────────┐
│Building│ │Cobblestone│
│+Scaff. │ │Paths      │
└───────┘ └──────────┘
    │
    ▼
┌─────────────┐
│ScaffoldWorker│
│(per open PR) │
└─────────────┘
```

---

## File Changes Summary

### New Files
- `src/app/api/prs/route.ts` - GitHub PR fetching
- `src/components/buildings/Scaffolding.tsx` - Scaffolding geometry
- `src/components/ScaffoldWorker.tsx` - Worker minion on scaffolding
- `src/lib/interaction/BuildingGrabController.ts` - Building movement
- `src/components/ui/BuildingPlacementGrid.tsx` - Grid overlay during move
- `src/lib/pathGeneration.ts` - Bezier path algorithms
- `src/components/CobblestonePathMesh.tsx` - Path mesh component
- `src/hooks/useProjectPolling.ts` - Polling hook

### Modified Files
- `src/app/api/scan/route.ts` - Add PR data, update stage logic
- `src/types/project.ts` - Add OpenPR type, extend interfaces
- `src/types/interaction.ts` - Add 'move' menu option
- `src/store/projectStore.ts` - Add position persistence, worker management
- `src/lib/interaction/StaffInteractionController.ts` - Handle building grab
- `src/components/Building.tsx` - Pass PR data to children
- `src/components/buildings/*.tsx` - Render scaffolding conditionally
- `src/components/GameLayout.tsx` or `src/app/page.tsx` - Add polling

---

## Implementation Order

1. **Phase 1** - GitHub CLI integration (foundation for everything)
2. **Phase 2** - Building height & stage logic (pure logic changes)
3. **Phase 7** - Polling system (enables live updates)
4. **Phase 3** - Scaffolding visuals (geometry work)
5. **Phase 4** - Worker minions (builds on scaffolding)
6. **Phase 5** - Building movement (new interaction mode)
7. **Phase 6** - Cobblestone paths (polish feature)
8. **Phase 8** - Animation polish (final touches)

---

## Testing Checklist

- [ ] `gh` CLI returns PR data correctly for test repo
- [ ] Building height increases with each merged PR
- [ ] Scaffolding appears when PR is opened
- [ ] Worker minion spawns on scaffolding for each PR
- [ ] Scaffolding disappears when PR is merged
- [ ] Building can be lifted via radial menu
- [ ] Building snaps to grid when dropped
- [ ] Building position persists across refresh
- [ ] Cobblestone paths connect all buildings to tower
- [ ] Paths update when building is moved
- [ ] Polling detects new PRs within 30 seconds
- [ ] No performance issues with <10 repos
