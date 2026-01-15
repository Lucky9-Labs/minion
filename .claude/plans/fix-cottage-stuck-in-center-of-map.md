# Implementation Plan: Fix Cottage Stuck in Center of Map

## Problem Statement
Two overlapping objects are rendering at position (0, 0):
1. A hardcoded cottage object (geometry) - **TO BE REMOVED**
2. A building associated with the "minion" project (from projectStore) - **TO BE KEPT**

The hardcoded cottage needs to be removed, while the minion building should remain.

## Root Cause Analysis

### Object #1: Hardcoded Cottage Geometry
- **Likely location**: Scene component (possibly `SimpleScene.tsx`, `VillageScene.tsx`, or `Ground.tsx`)
- **Nature**: Direct mesh/geometry rendering in Three.js
- **Expected status**: Commit `6d44405` was supposed to remove this, but it may still exist

### Object #2: "minion" Project Building
- **Location**: `src/store/projectStore.ts`, lines 49-59
- **Nature**: `calculateBuildingPositions()` function hardcodes position (0, 0) for any project named "minion"
- **How it's rendered**: Via `VillageScene.tsx` line 154-165, which maps projects to `Building` components
- **Status**: Still actively being positioned and rendered

## Implementation Steps

### Phase 1: Locate Both Objects

**Step 1.1**: Search for hardcoded cottage rendering
- Check `src/components/SimpleScene.tsx` for any remaining LayoutGenerator, RoomMeshBuilder, or cottage mesh geometry
- Check `src/components/VillageScene.tsx` for any hardcoded cottage mesh creation
- Check `src/components/Ground.tsx` for cottage-specific geometry
- Check `src/components/buildings/CottageBuilding.tsx` for any position (0, 0) logic
- Search for any remaining "cottage" references in Scene components that aren't from building data

**Step 1.2**: Verify the "minion" project hardcoding
- Confirm `src/store/projectStore.ts` lines 49-59 still contain the hardcoded (0, 0) positioning
- Trace where this positioned project is being rendered in `VillageScene.tsx`

### Phase 2: Remove Object #1 (Hardcoded Cottage)

**Step 2.1**: Identify the exact geometry rendering code
- Read the scene components to find where cottage meshes are created directly
- Note any geometry building, material creation, or mesh addition at position (0, 0)

**Step 2.2**: Remove hardcoded cottage rendering
- Delete all hardcoded cottage mesh creation code
- Remove any position (0, 0) references for cottage
- Clean up any related imports or builders (LayoutGenerator, RoomMeshBuilder, etc.)
- Verify no other code depends on this hardcoded cottage

**Step 2.3**: Validate removal
- Ensure terrain/ground still renders correctly
- Ensure no broken imports or references remain
- Verify the minion building is still visible and unaffected

### Phase 3: Testing & Verification

**Step 3.1**: Verify cottage is removed, minion building remains
- Run dev server and confirm only minion building at position (0, 0), not cottage
- Check that minion building renders correctly
- Check that terrain/ground renders correctly at center
- Verify the scene loads without errors

**Step 3.2**: Verify other buildings still render
- Confirm all projects from persistent storage render correctly
- Verify building positioning logic works for projects that DO exist
- Check village layout is sensible with buildings distributed appropriately

**Step 3.3**: Clear cache and test persistence
- Clear localStorage to test fresh state
- Create new projects/buildings and verify they position correctly
- Load existing projects and verify they display as expected

## Critical Files to Modify

| File | Lines | Action | Purpose |
|------|-------|--------|---------|
| Scene component(s) | TBD | DELETE | Remove hardcoded cottage geometry (location TBD) |
| `src/components/buildings/CottageBuilding.tsx` | Check all | REVIEW | Ensure no position (0,0) hardcoding for cottage |
| `src/lib/tower/Cottage.ts` | All | REVIEW | Verify this legacy file isn't still being used |

## Success Criteria

- [ ] Cottage is removed from position (0, 0)
- [ ] Minion building still renders at position (0, 0)
- [ ] Only one object visible at center (minion building, not overlapping cottage)
- [ ] All buildings from persistent storage still render at correct positions
- [ ] No console errors or broken imports
- [ ] Dev server runs without issues
- [ ] Fresh state loads correctly (localStorage cleared)

## Potential Edge Cases

1. **Cottage geometry builders**: Old builders (LayoutGenerator, RoomMeshBuilder) might have dependencies elsewhere
2. **Cottage imports**: Removing cottage rendering might leave orphaned imports or unused code
3. **Legacy files**: `Cottage.ts` and related legacy code might still be referenced somewhere
4. **Minion building unaffected**: Must ensure removing cottage doesn't accidentally affect minion building rendering

## Notes

- Commit `6d44405` was supposed to remove cottage hardcoding but appears incomplete
- The minion project hardcoding at (0, 0) is intentional and should be preserved
- Only the hardcoded cottage geometry needs to be found and removed
- Need to locate where the cottage geometry is being created/rendered in the scene components
