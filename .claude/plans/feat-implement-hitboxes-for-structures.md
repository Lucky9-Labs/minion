# Implementation Plan: Proper Hitboxes for Building Structures

## Overview
Add collision meshes for village buildings, scaffolding, trees, and environmental objects by registering invisible geometry with the existing collision system. This leverages the proven architecture already used in the tower interior (RoomMeshBuilder pattern) and extends it to all structures.

## Goals
1. Prevent player from walking through building walls, scaffolding, and vegetation
2. Support elevation changes for realistic traversal (climbing scaffolding/stairs)
3. Update NPC pathfinding to account for all obstacles
4. Maintain performance with the existing AABB collision detection
5. Reuse existing collision infrastructure instead of building new systems

## Current State Analysis
- **Existing collision system**: Works perfectly in tower interior via `RoomMeshBuilder` → meshes → FirstPersonController (line 860-884 in SimpleScene.tsx)
- **FirstPersonController**: Has proven AABB collision detection (resolveCollisions at line 380-419)
- **Problem**: Village buildings (CottageBuilding, WorkshopBuilding, etc.) are rendered but their meshes are **never registered** with the collision system
- **Scaffolding**: Rendered visually but no collision
- **Trees**: No collision meshes exist at all
- **Why it works for doors**: Tower uses explicit mesh collection and passes to collision system

## Architecture Design

### Core Strategy: Mesh Registration
Instead of building a new hitbox system, register invisible collision meshes with the existing FirstPersonController system. This follows the exact pattern already working in the tower interior.

**How it currently works (tower):**
```
RoomMeshBuilder creates geometry
  → Geometries converted to THREE.Mesh objects
  → Meshes collected in collisionMeshes array
  → Passed to FirstPersonController.update(collisionMeshes)
  → AABB collision detection happens in resolveCollisions()
```

**Our approach (village buildings, scaffolding, trees):**
```
Village buildings/structures render geometry
  → Create invisible collision meshes alongside visible geometry
  → Register meshes (like tower does)
  → Pass to FirstPersonController exactly the same way
```

### 1. Building Collision Mesh Creation

**Update: `src/components/buildings/CottageBuilding.tsx` and similar**
- Add invisible collision meshes for each wall (one mesh per wall, not per visual brick)
- Use `useRef` to store collision mesh references
- Return/export collision meshes alongside rendered component

Example pattern:
```typescript
// Create invisible collision mesh for north wall
const northCollisionMesh = useMemo(() => {
  const geo = new THREE.BoxGeometry(width, height, thickness);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  mesh.position.set(x, y, z);
  return mesh;
}, [width, height, thickness]);
```

**Files to update:**
- `src/components/buildings/CottageBuilding.tsx` - Add wall/door/roof collision meshes
- `src/components/buildings/WorkshopBuilding.tsx` - Same pattern
- `src/components/buildings/LaboratoryBuilding.tsx` - Same pattern
- `src/components/buildings/MarketBuilding.tsx` - Same pattern
- `src/components/buildings/ManorBuilding.tsx` - Same pattern
- Add similar pattern to scaffolding rendering (when visible)

### 2. Collision Mesh Collection for Village

**Update: `src/components/Building.tsx`**
- When rendering buildings, collect collision meshes from each building component
- Export collision meshes as `useImperativeHandle` or return from a hook
- Store references for registration

**Create: `src/lib/building/VillageCollisionRegistry.ts`**
- Simple helper to collect all collision meshes from village buildings
- Similar pattern to what tower does in SimpleScene.tsx lines 860-884
- Exports meshes for use in first-person mode

### 3. Integration with VillageScene

**Update: `src/components/VillageScene.tsx`**
- When entering first-person mode, collect collision meshes from all visible buildings
- Pass to CameraController.setCollisionMeshes() just like SimpleScene does
- Remove from collision when buildings are removed/hidden

### 4. Scaffolding Collision

**Update: Scaffolding rendering in buildings**
- When `showScaffolding === true`, create collision meshes for:
  - Vertical poles (capsule or thin box meshes)
  - Horizontal beams (box meshes)
- Register with collision system

### 5. Elevation Support for Stairs/Ramps

**Update: `src/lib/camera/FirstPersonController.ts`**
- Enhance `resolveCollisions()` to detect walkable surfaces
- Add `getWalkableHeight()` method:
  - Check collision mesh bounding boxes
  - Detect ramps/stairs (meshes at different Y heights)
  - Allow stepping up to `maxStepHeight` (e.g., 0.5 units)
  - Prevent teleporting up obstacles higher than step height

**Pattern:**
- When player runs into a wall/obstacle, check if top surface is walkable
- If surface is within step height, allow player to climb
- If surface is too high, block movement (current behavior)

### 6. Trees/Vegetation

**Identify tree components** (likely `src/components/environment/`)
- Add collision meshes around tree trunks (cylinder or capsule shaped)
- Keep leaf canopy transparent to collision
- For simple trees, single collision mesh around trunk base

### 7. Pathfinding Integration

**Update: `src/lib/navigation/NavGridBuilder.ts`**
- When building navigation grid, consider registered collision meshes
- Mark grid cells as blocked if they intersect collision geometry
- Regenerate grid when collision meshes change

**Simple approach:**
- At grid generation time, test each cell center against all collision meshes
- Use mesh bounding boxes for quick culling

## Implementation Phases

### Phase 1: Village Building Collision Meshes
- [ ] Update `src/components/buildings/CottageBuilding.tsx` - Add invisible collision meshes for walls
- [ ] Update `src/components/buildings/WorkshopBuilding.tsx` - Same pattern
- [ ] Update `src/components/buildings/LaboratoryBuilding.tsx` - Same pattern
- [ ] Update `src/components/buildings/MarketBuilding.tsx` - Same pattern
- [ ] Update `src/components/buildings/ManorBuilding.tsx` - Same pattern
- [ ] Optionally: Add collision mesh helper hook `useCollisionMeshes()` for code reuse

**Testing**: Test village buildings in first-person mode (for reference, compare to working tower collision)

### Phase 2: Mesh Collection and Registration
- [ ] Create `src/lib/building/VillageCollisionRegistry.ts` - Helper to collect building meshes
- [ ] Update `src/components/VillageScene.tsx` - Collect and register collision meshes when entering FP mode
- [ ] Update `src/components/Building.tsx` - Export collision meshes from building components
- [ ] Test mesh collection, verify no warnings in console

**Testing**: Check that collision meshes are collected correctly

### Phase 3: Scaffolding Collision
- [ ] Update scaffolding rendering in building components - Add collision meshes when `showScaffolding === true`
- [ ] Test walking through scaffolding areas

**Testing**: Build a cottage with scaffolding, walk through in first-person mode

### Phase 4: Elevation Support for Stairs/Ramps
- [ ] Enhance `src/lib/camera/FirstPersonController.ts` - Add step-height detection
- [ ] Modify `resolveCollisions()` to allow stepping up surfaces within threshold
- [ ] Test climbing scaffolding and elevated walkways
- [ ] Define max step height (e.g., 0.5 units)

**Testing**: Walk up stairs/ramps, verify smooth climbing without jumping

### Phase 5: Trees and Vegetation
- [ ] Locate tree/vegetation components in `src/components/environment/`
- [ ] Add collision meshes around tree trunks
- [ ] Test collision with vegetation in village

**Testing**: Walk around trees, verify can't walk through trunks

### Phase 6: Pathfinding Integration
- [ ] Update `src/lib/navigation/NavGridBuilder.ts` - Consider collision meshes when building grid
- [ ] Test NPC pathfinding around buildings and obstacles

**Testing**: Command minions to walk, verify proper pathfinding around structures

### Phase 7: Polish and Optimization
- [ ] Profile collision performance
- [ ] Optimize mesh collection if needed
- [ ] Test all structures in combination
- [ ] Verify no regressions in tower interior collision

## Key Technical Considerations

### Collision Mesh Design
- One mesh per wall/obstacle (not separate meshes for each visual block)
- Use `THREE.BoxGeometry` for simple walls and boxes
- Use `THREE.CylinderGeometry` for tree trunks and poles
- Make meshes invisible: `MeshBasicMaterial({ transparent: true, opacity: 0 })`
- Position matches visual geometry exactly
- No material needed for collision (Three.js uses geometry alone)

### Elevation/Step Height
- Current system already handles basic step detection via bounding box heights
- Enhance by checking if collision mesh top is reachable (< maxStepHeight from feet)
- Max step height = 0.5 units (can climb obstacles up to this height)
- Prevents teleporting but allows natural stair climbing

### Performance
- AABB collision is already proven fast in tower interior
- Simple approach: one mesh per structure component
- Only test meshes actively in use (not removed invisible meshes)
- Consider spatial grid only if performance becomes issue

### Mesh Lifecycle
- Create meshes in `useMemo` - won't recreate on each render
- Add to scene group so they traverse with building
- No need to explicitly dispose - React Three Fiber handles cleanup
- Keep references stable so collision system can use them

### Edge Cases
- **Door openings**: Split wall into sections (left, right, above door) - already done in CottageBuilder
- **Scaffolding**: Create individual pole/beam meshes, optional visibility
- **Interior furniture**: Collision optional - can add if needed, tests with invisible meshes
- **Multi-level buildings**: AABB handles vertical separation naturally

## Testing Strategy

**Manual gameplay tests** (primary method - collision system is proven in tower):
1. Walk into all building walls → should block
2. Walk through door openings → should allow passage
3. Walk into scaffolding → verify collision/no-clip
4. Walk into trees → should block at trunk
5. Walk up stairs/ramps → smooth elevation change (no jumping)
6. Minion pathfinding → NPCs navigate around obstacles
7. Mixed structures → buildings + scaffolding + trees together

**Verification approach:**
- Start in tower interior (known working) to establish baseline
- Test village buildings in first-person mode
- Compare collision behavior between tower and village
- Confirm consistent results

## Success Criteria
- ✓ Player cannot walk through building walls in village
- ✓ Player can pass through door openings
- ✓ Player cannot walk through scaffolding poles (unless intentionally designed)
- ✓ Player cannot walk through tree trunks
- ✓ Player can smoothly climb scaffolding/stairs (no teleporting)
- ✓ NPCs pathfind around buildings and obstacles
- ✓ No performance regression from tower interior collision
- ✓ Collision behavior matches tower interior (consistent AABB detection)

## Future Enhancements
- Debug visualization toggle for collision meshes (wireframe rendering)
- Dynamic hitbox creation for procedurally generated buildings
- Interactive obstacles (destructible, movable)
- Door collision state changes (open = passable, closed = blocked)
- Soft bodies (player can push through with difficulty)
- Underwater/void collision zones
