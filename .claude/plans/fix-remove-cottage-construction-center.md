# Implementation Plan: Remove Hardcoded Cottage Construction Center

## Overview
Remove the hardcoded cottage that renders unconditionally at the center of the map (0, 0). The scene should rely entirely on persistent storage (projectStore) to determine what buildings exist and where they are positioned. The center can be empty or contain a building from persistent storage—both states are valid.

## Architecture Decision
- **Single source of truth**: projectStore (persistent storage)
- **Hardcoded assets**: Remove completely
- **Special cases**: None—treat (0, 0) like any other position
- **Empty center**: Valid state (no building if projectStore has nothing there)

## Files to Modify

### 1. SimpleScene.tsx
**File**: `src/components/SimpleScene.tsx`

#### Change 1.1: Remove Hardcoded Cottage Generation (Lines 537-623)
- **Lines to remove**: 537-623 (entire COZY COTTAGE section)
- **Current code**:
  - `LayoutGenerator` creating cottage with seed 42
  - `RoomMeshBuilder` building geometry from layout
  - `buildingBounds` calculation (lines 550-559)
  - `terrainConfig` adding center exclusion zone (lines 561-567)
  - Positioning cottage at (0, 0) and adding to scene (lines 620-623)

- **What gets deleted**:
  ```typescript
  // REMOVE: Lines 537-540 (cottage generation)
  const layoutGenerator = new LayoutGenerator();
  const buildingLayout = layoutGenerator.generateCottage();

  // REMOVE: Lines 542-543 (mesh building)
  const roomMeshBuilder = new RoomMeshBuilder(buildingLayout);
  const meshes = roomMeshBuilder.buildMeshes();

  // REMOVE: Lines 550-559 (building bounds)
  let buildingMinX = Infinity, buildingMaxX = -Infinity;
  let buildingMinZ = Infinity, buildingMaxZ = -Infinity;
  meshes.forEach((mesh) => { /* bounds calculation */ });
  const buildingRadius = Math.max(
    Math.abs(buildingMaxX - buildingMinX),
    Math.abs(buildingMaxZ - buildingMinZ)
  ) / 2;

  // REMOVE: Lines 561-567 (center exclusion zone)
  terrainConfig.buildings.push({
    x: 0,
    z: 0,
    radius: buildingRadius + 3,
  });

  // REMOVE: Lines 620-623 (cottage positioning)
  const buildingY = terrainBuilder.getHeightAt(0, 0);
  buildingRefs.root.position.y = buildingY;
  scene.add(buildingRefs.root);
  ```

#### Change 1.2: Remove Terrain Exclusion Zone Configuration
- **Lines affected**: 561-567 (within the terrain initialization section)
- **Action**: Remove the center point (0, 0) exclusion from `terrainConfig.buildings`
- **Result**: Terrain will render normally at all positions, including (0, 0)

#### Change 1.3: Remove Center-Specific Building References
- **Check lines around 500-540**: Look for any `buildingRefs` initialization specific to center cottage
- **Action**: Remove any setup that assumes a default center building exists
- **Rationale**: All buildings come from projectStore; no hardcoded references

#### Change 1.4: Verify Project Building Rendering Loop
- **Lines 2208-2241**: Verify this loop correctly handles ALL buildings from projectStore
- **Check**: Does it iterate over `projects.length` and create buildings for each?
- **Check**: Does it position buildings using `project.building.position.x` and `.z`?
- **No changes needed** if the loop is generic and doesn't assume a center building

---

### 2. projectStore.ts
**File**: `src/store/projectStore.ts`

#### Change 2.1: Review Center Position Assignment (Lines 36-90)
- **Lines 40-41**: Special handling for "minion" project at center
  ```typescript
  const centerProject = projects.find((p) => p.name === 'minion');
  ```
- **Action**: KEEP this logic—the "minion" project belongs at center per requirements
- **Verify**: Ensure positions are set correctly in the Building interface (x: 0, z: 0)
- **No changes needed**—this is the desired persistent storage behavior

#### Change 2.2: Verify Building Position Data Structure
- **Confirm**: Projects have `building.position` with `{ x, z }` properties
- **Confirm**: Positions are persisted correctly in localStorage
- **No changes needed** if structure is correct

---

### 3. Building.tsx (Dispatcher Component)
**File**: `src/components/Building.tsx`

#### Change 3.1: Verify No Center-Specific Routing
- **Lines 23-71**: Check Building component doesn't have special logic for position (0, 0)
- **Action**: If found, remove center-specific conditionals
- **Expected**: Building component should render any building type at any position equally

---

### 4. CottageBuilding.tsx (Optional Cleanup)
**File**: `src/components/buildings/CottageBuilding.tsx`

#### Change 4.1: Remove Center-Specific Logic (If Present)
- **Check**: Does CottageBuilding have any hardcoded positions or special cases?
- **Action**: Remove if found; building should work at any position
- **Expected**: Generic cottage rendering logic

---

## Implementation Steps

### Phase 1: Remove Hardcoded Cottage (SimpleScene.tsx)
1. Locate lines 537-623 in SimpleScene.tsx
2. Delete the entire COZY COTTAGE generation and positioning block
3. Delete terrain exclusion zone configuration (lines 561-567)
4. Verify no orphaned variable references remain

### Phase 2: Verify Generic Building Rendering
1. Review project building rendering loop (lines 2208-2241 in SimpleScene.tsx)
2. Confirm it iterates over all projects and creates buildings from stored positions
3. Test that the loop works with zero projects (empty center)
4. Test that the loop works with projects at various positions

### Phase 3: Cleanup and Verify
1. Search for any remaining "center" or "cottage" hardcoded logic
2. Remove special-case positioning logic
3. Ensure terrain renders smoothly everywhere including (0, 0)
4. Test project store persistence—verify buildings appear/disappear based on storage

### Phase 4: Test & Validate
1. **Empty center test**: Clear projectStore and verify map center is empty/terrain-only
2. **Project at center test**: Create a "minion" project and verify it renders at (0, 0)
3. **Project elsewhere test**: Create projects and verify they render at their stored positions
4. **Mixed test**: Verify projects at center and elsewhere coexist correctly
5. **Persistence test**: Reload page and verify buildings persist from localStorage

---

## Success Criteria

- ✅ No hardcoded cottage rendering at (0, 0)
- ✅ Terrain renders normally everywhere, including center
- ✅ Buildings are positioned entirely by projectStore
- ✅ Center position can be empty or contain a building from storage
- ✅ No special-case logic for position (0, 0)
- ✅ All existing project buildings render correctly at their stored positions
- ✅ No console errors or rendering artifacts

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Terrain glitches at (0, 0) | Low | Verify TerrainBuilder handles edge coordinates |
| Project building loop breaks | Low | Review loop logic before deletion |
| Orphaned references to cottage | Low | Search for undefined variable usage |
| Persistence issues | Very Low | projectStore already handles persistence |

---

## Rollback Plan
- Revert SimpleScene.tsx to previous commit
- No database or persistent storage changes required
- All changes are purely in rendering logic

---

## Notes
- The hardcoded cottage with `seed: 42` is purely for demonstration/fallback
- projectStore is the authoritative source for buildings post-fix
- Empty center is a valid and expected state
- No migration needed; existing projects will persist in localStorage
