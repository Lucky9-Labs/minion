# Implementation Plan: Enhance Building Design Functionality

## Overview

Enhance building rendering for first-person mode compatibility with properly oriented roofs, functional animated doors, textured rivers, gap-free building geometry, LOD system, lazy-loaded interior decor, and environmental details (rats on cobblestones).

---

## Phase 1: Foundation - View Mode State Management

### 1.1 Add Explicit View Mode to Game Store

**File:** `src/store/gameStore.ts`

- Add `viewMode: 'isometric' | 'firstPerson' | 'transitioning'` to store state
- Add `setViewMode(mode)` action
- This prepares us for camera transitions and enables conditional rendering

### 1.2 Integrate View Mode with Camera Controller

**File:** `src/lib/camera/FirstPersonController.ts`

- Call `setViewMode('firstPerson')` when entering first-person mode
- Call `setViewMode('isometric')` when exiting
- Set `'transitioning'` during camera animation if applicable

---

## Phase 2: Roof Orientation Fix

### 2.1 Analyze Current Roof Geometry

**Files to modify:**
- `src/components/Tower.tsx` - TowerRoof component (lines 151-203)
- `src/components/buildings/CottageBuilding.tsx` - ExtrudeGeometry roof
- `src/lib/building/RoomMeshBuilder.ts` - 5 roof type implementations (lines 1079-1241)

### 2.2 Fix Tower Roof Orientation

**Current issue:** `ConeGeometry(2.8, 2.2, 4)` with 4 segments creates faces at wrong angles

**Fix approach:**
- Adjust rotation on Y-axis to align roof faces with building walls
- Test with `rotation.y` values: `0`, `Math.PI/4`, `Math.PI/2` until correctly oriented
- Apply same fix to roof edge trim cylinder

### 2.3 Fix Building Roof Orientations

**Peaked Roof (ExtrudeGeometry):**
- Current: `rotateX(-Math.PI / 2)`
- Test rotations to align ridge with building length vs width

**Pitched Roof:**
- Current: `rotation.x = 0.2` or `rotation.z = 0.2`
- May need to swap X/Z based on building orientation

**Conical Roof:**
- Same 4-segment issue as tower - add Y rotation fix

### 2.4 Iterative Testing

- Implement rotation adjustments with configurable values
- Test in both isometric and first-person views
- Iterate until user confirms correct orientation

---

## Phase 3: Gap Elimination in Building Geometry

### 3.1 Audit Gap Sources

**Known gap locations:**
- Between floor levels in multi-story buildings
- Between wall segments at corners
- Between roof and wall tops
- Between building base and ground

### 3.2 Fix Floor-to-Floor Gaps

**File:** `src/lib/building/RoomMeshBuilder.ts`

- Ensure floor planes extend slightly into walls (overlap by 0.02-0.05 units)
- Ceiling of lower floor should meet/overlap with floor of upper floor
- Add floor trim/molding geometry to visually seal joints

### 3.3 Fix Wall-to-Wall Gaps

- Extend wall geometry at corners to overlap
- Or add corner post geometry to cover seams
- Ensure consistent wall thickness (currently 0.2 units)

### 3.4 Fix Roof-to-Wall Gaps

- Extend roof overhang to fully cover wall tops
- Add fascia board geometry under roof edges
- Ensure roof sits directly on wall top with no air gap

### 3.5 Fix Building-to-Ground Gaps

- Extend wall geometry slightly below ground level (-0.1 units)
- Add foundation/baseboard detail to cover seam

---

## Phase 4: Animated Proximity Doors

### 4.1 Create Door Component with Animation State

**New file:** `src/components/buildings/AnimatedDoor.tsx`

```typescript
interface AnimatedDoorProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  width?: number
  height?: number
  onOpen?: () => void
  onClose?: () => void
}
```

**Features:**
- Door mesh with hinge point at edge (not center)
- Smooth rotation animation (0° closed → 90° open)
- Use `useFrame` for animation interpolation
- Configurable open/close speed

### 4.2 Proximity Detection System

**New file:** `src/lib/interaction/ProximityDetector.ts`

- Track player/character position from FirstPersonController
- Calculate distance to each door
- Trigger door open when distance < threshold (e.g., 2.0 units)
- Trigger door close when distance > threshold + hysteresis (e.g., 3.0 units)

### 4.3 Integrate Doors into Buildings

**Files to modify:**
- `src/components/Tower.tsx` - Replace static door with AnimatedDoor
- `src/components/buildings/*.tsx` - Replace door meshes with AnimatedDoor
- `src/lib/building/RoomMeshBuilder.ts` - Use AnimatedDoor for procedural buildings

### 4.4 Door Open Event for Interior Loading

- `onOpen` callback triggers interior decor loading
- Track which buildings have loaded interiors
- Prevent redundant loading on subsequent door opens

---

## Phase 5: River Texture Enhancement

### 5.1 Create River Material with Animated Texture

**New file:** `src/lib/effects/RiverMaterial.ts`

**Features:**
- Custom ShaderMaterial for water effect
- Animated UV scrolling for flow direction
- Procedural noise for ripple/wave patterns
- Fresnel effect for edge highlights
- Configurable flow speed and direction

### 5.2 River Geometry Component

**New file:** `src/components/environment/River.tsx`

- PlaneGeometry following river path
- Apply RiverMaterial
- Support for curved/winding river paths via vertices
- Depth variation for visual interest

### 5.3 Integrate with Terrain

**File:** `src/components/VillageGround.tsx`

- Add River component to village terrain
- Position river to flow through/around village
- Ensure river banks blend with ground texture

---

## Phase 6: LOD System Implementation

### 6.1 LOD Manager

**New file:** `src/lib/rendering/LODManager.ts`

**Strategy for browser performance:**
- 2-3 LOD levels (High/Medium/Low or High/Low)
- Distance-based switching with hysteresis to prevent popping
- View mode override: force High LOD in first-person mode

**LOD Thresholds:**
- High: < 10 units or first-person mode
- Medium: 10-30 units (isometric typical view)
- Low: > 30 units

### 6.2 LOD Component Wrapper

**New file:** `src/components/LODWrapper.tsx`

```typescript
interface LODWrapperProps {
  high: React.ReactNode
  medium?: React.ReactNode
  low?: React.ReactNode
  position: [number, number, number]
}
```

- Uses `useFrame` to check camera distance
- Conditionally renders appropriate LOD level
- Respects `viewMode` from game store

### 6.3 Create LOD Variants for Buildings

**High LOD (first-person):**
- Full geometry detail
- All decorative elements
- High-res textures/materials
- Animated elements active

**Medium LOD (isometric default):**
- Current geometry (adequate for isometric)
- Essential decorations only
- Standard materials

**Low LOD (distant/many buildings):**
- Simplified box geometry
- Single color materials
- No decorations

### 6.4 Apply LOD to Building Components

- Wrap each building type in LODWrapper
- Create simplified geometry variants
- Test performance in both modes

---

## Phase 7: Interior Decor System (Lazy-Loaded)

### 7.1 Interior State Management

**File:** `src/store/gameStore.ts`

- Add `loadedInteriors: Set<string>` to track which buildings have loaded interiors
- Add `loadInterior(buildingId)` action
- Add `isInteriorLoaded(buildingId)` selector

### 7.2 Interior Decor Components

**New directory:** `src/components/interiors/`

**Components:**
- `InteriorBase.tsx` - Floor, ceiling, wall interior surfaces
- `Furniture.tsx` - Tables, chairs, beds, shelves
- `Lighting.tsx` - Interior light sources, candles, lanterns
- `Decorations.tsx` - Rugs, paintings, books, pottery

### 7.3 Room-Type Specific Interiors

Based on existing room types in `src/lib/building/types.ts`:
- `entrance` - Coat hooks, welcome mat, small table
- `living` - Fireplace, seating, rug
- `kitchen` - Stove, counter, pots/pans
- `bedroom` - Bed, nightstand, wardrobe
- `storage` - Shelves, crates, barrels
- `workshop` - Workbench, tools, projects
- `library` - Bookshelves, reading desk, ladder
- `garden` - Planters, gardening tools (interior greenhouse)
- `tower` - Magical equipment, glowing orbs
- `balcony` - Railing, outdoor furniture

### 7.4 Interior Loading Trigger

**Integration with AnimatedDoor:**
- Door `onOpen` checks if interior loaded
- If not loaded, call `loadInterior(buildingId)`
- Interior components check `isInteriorLoaded` before rendering
- Use React.lazy/Suspense for code splitting if beneficial

### 7.5 Interior Rendering Optimization

- Only render interior when:
  1. Door is open AND
  2. Player is in first-person mode AND
  3. Player is within render distance
- Unload interiors when player moves far away (optional, for memory)

---

## Phase 8: External Building Details

### 8.1 Window Enhancements

**File:** `src/components/buildings/WindowDetail.tsx`

- Window shutters (can be open/closed)
- Window frames with depth
- Window sills
- Flower boxes (optional, for cottages)
- Interior glow at night

### 8.2 Wall Details

- Exposed beam ends (timber frame style)
- Stone/brick texture variation
- Wall-mounted lanterns
- Climbing vines (optional)

### 8.3 Door Details

- Door frames with trim
- Knockers/handles with detail
- Welcome mats
- Overhead lanterns

### 8.4 Foundation Details

- Visible stone foundation blocks
- Steps at entrances
- Drainage channels

---

## Phase 9: Environmental Details - Rats

### 9.1 Rat Entity Component

**New file:** `src/components/environment/Rat.tsx`

**Geometry:**
- Simple low-poly rat mesh
- Body: elongated ellipsoid
- Head: smaller sphere
- Ears: tiny cones
- Tail: tapered cylinder or line
- Legs: tiny cylinders (optional, may be too small)

**Materials:**
- Dark gray/brown color (0x4a4a4a or 0x5c4a3a)
- Slightly glossy for fur sheen

### 9.2 Rat Behavior System

**New file:** `src/lib/entities/RatBehavior.ts`

**Behaviors:**
- Idle: stationary, occasional twitch animation
- Scurrying: fast movement along paths
- Fleeing: run away when player approaches
- Eating: stationary near food sources

**Movement:**
- Stick to cobblestone/ground surfaces
- Random direction changes
- Avoid water, buildings (unless entering)
- Speed: 2-3 units/second when scurrying

### 9.3 Rat Spawning System

**Integration with VillageGround.tsx:**

- Spawn rats in cobblestone/path areas
- 3-8 rats per village (configurable)
- Seeded random positions for consistency
- Respawn if all rats flee off-screen

### 9.4 Rat Animation

- Scurry animation: rapid leg movement (if legs modeled) or body wobble
- Tail sway
- Occasional standing on hind legs
- Flee animation: faster movement, erratic path

---

## Phase 10: Testing and Polish

### 10.1 First-Person Mode Testing

- Walk through all building types
- Verify doors open/close smoothly
- Check for visual gaps from player eye level
- Confirm roof orientations look correct
- Test interior loading on door open
- Verify rat behavior and visibility

### 10.2 Isometric Mode Testing

- Verify LOD system switches appropriately
- Confirm performance is maintained
- Check that essential details visible
- Verify no regression in existing functionality

### 10.3 Performance Profiling

- Measure FPS in both modes
- Identify any geometry/material bottlenecks
- Optimize as needed (reduce polygon counts, simplify materials)
- Test on lower-end hardware/browsers if possible

### 10.4 Edge Cases

- Camera transition between modes
- Multiple doors open simultaneously
- Many rats on screen
- River edge interactions
- Building placement edge cases

---

## File Changes Summary

### New Files
- `src/components/buildings/AnimatedDoor.tsx`
- `src/components/environment/River.tsx`
- `src/components/environment/Rat.tsx`
- `src/components/LODWrapper.tsx`
- `src/components/interiors/InteriorBase.tsx`
- `src/components/interiors/Furniture.tsx`
- `src/components/interiors/Lighting.tsx`
- `src/components/interiors/Decorations.tsx`
- `src/lib/effects/RiverMaterial.ts`
- `src/lib/rendering/LODManager.ts`
- `src/lib/interaction/ProximityDetector.ts`
- `src/lib/entities/RatBehavior.ts`

### Modified Files
- `src/store/gameStore.ts` - viewMode state, interior loading state
- `src/lib/camera/FirstPersonController.ts` - viewMode integration
- `src/components/Tower.tsx` - roof rotation fix, AnimatedDoor integration
- `src/components/buildings/CottageBuilding.tsx` - roof fix, door, details
- `src/components/buildings/WorkshopBuilding.tsx` - roof fix, door, details
- `src/components/buildings/LaboratoryBuilding.tsx` - roof fix, door, details
- `src/components/buildings/MarketBuilding.tsx` - roof fix, door, details
- `src/components/buildings/ManorBuilding.tsx` - roof fix, door, details
- `src/lib/building/RoomMeshBuilder.ts` - roof fixes, gap elimination, LOD variants
- `src/components/VillageGround.tsx` - river integration, rat spawning

---

## Implementation Order

1. **Phase 1** - View mode state (foundation for everything else)
2. **Phase 2** - Roof fixes (high-priority visual issue, iterate with user)
3. **Phase 3** - Gap elimination (visual quality improvement)
4. **Phase 4** - Animated doors (enables interior loading)
5. **Phase 5** - River textures (environmental polish)
6. **Phase 6** - LOD system (performance optimization)
7. **Phase 7** - Interior decor (major feature, depends on doors)
8. **Phase 8** - External details (visual polish)
9. **Phase 9** - Rats (environmental detail)
10. **Phase 10** - Testing and polish

---

## Success Criteria

- [ ] Roofs oriented correctly (confirmed by user)
- [ ] No visible gaps between building elements in first-person view
- [ ] Doors animate open when player approaches, close when player leaves
- [ ] River has animated, textured water appearance
- [ ] LOD system maintains 60fps in isometric mode
- [ ] Interiors load on-demand when doors open
- [ ] External building details visible in first-person mode
- [ ] Rats scurry on cobblestone areas
- [ ] View mode state properly tracked during camera transitions
