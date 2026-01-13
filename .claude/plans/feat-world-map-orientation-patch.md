# Implementation Plan: World Map Orientation Patch

## Overview

Reorient the world map to establish a clear compass system where:
- **North (N)**: Tallest peaks/mountains
- **South (S)**: Flat terrain with portal gateway and rocky outcroppings
- **NNW → SEE**: River flows from mountain source to southern exit
- **Center**: Cottage (at level 1) or Tower (at higher levels)

## Compass Orientation Reference

```
           N (Tallest Peak)
            ↑
    NW      |      NE
            |
W ←———————[0,0]———————→ E
            |
    SW      |      SE
            ↓
           S (Portal Gateway)
```

In Three.js coordinates (Y-up):
- **North** = negative Z direction (-Z)
- **South** = positive Z direction (+Z)
- **East** = positive X direction (+X)
- **West** = negative X direction (-X)

---

## Implementation Tasks

### 1. Reorient Terrain Height Map
**File:** `src/lib/terrain/ContinuousTerrainBuilder.ts`

**Current behavior:** Height increases uniformly with distance from center in all directions.

**Changes needed:**
- Modify `generateHeightMap()` to bias height toward the NORTH (negative Z)
- Add directional height multiplier: positions with negative Z get higher terrain
- Formula: `directionalBias = Math.max(0, -normalizedZ) * 0.6` to boost northern heights
- Keep southern side (positive Z) relatively flat
- Maintain the clearing radius around the tower center

**Key code location:** Lines 408-453

### 2. Reorient River Flow (NNW → SEE)
**File:** `src/lib/terrain/ContinuousTerrainBuilder.ts`

**Current behavior:** River starts from random edge, wanders with random direction.

**Changes needed:**
- Modify `generateRiver()` to use fixed start/end points:
  - **Start:** NNW corner (approximately x=-40, z=-50) - on mountain
  - **End:** SEE direction (approximately x=50, z=40)
- River should follow terrain height, descending naturally
- Maintain curve-around-clearing logic but bias direction toward SE

**Key code location:** Lines 458-514

### 3. Create Portal Gateway Structure
**New file:** `src/lib/terrain/PortalGateway.ts`

**Description:** Create a new magical stone arch gateway at TRUE SOUTH edge of map.

**Components:**
- **Stone arch frame:** Built from rock-textured geometry, ~4-5 units tall
- **Inner portal effect:** Swirling purple/blue magical energy (animated shader or particle effect)
- **Integration with rocky outcroppings:** Position portal so rocks frame it naturally
- **Glow effect:** Point light inside portal for atmospheric lighting

**Position:** Approximately [0, terrain_height, 50] (true south edge, centered on X)

### 4. Modify Path Generation
**File:** `src/lib/terrain/ContinuousTerrainBuilder.ts`

**Current behavior:** 3-4 paths radiate outward at random angles.

**Changes needed:**
- Modify `generatePaths()` to create:
  - **Primary path:** From tower center (0,0) southward to portal gateway
  - **Secondary paths (optional):** 1-2 paths toward eastern/western areas (less mountainous)
- Ensure primary path is wider and more prominent
- Path should avoid the river (or create bridge crossing if necessary)

**Key code location:** Lines 519-566

### 5. Conditional Tower/Cottage Rendering
**Files:**
- `src/components/SimpleScene.tsx`
- `src/lib/building/LayoutGenerator.ts`

**Current behavior:** Always generates cottage layout via `generateCottage()`.

**Changes needed:**
- Access `tower.level` from game store in SimpleScene
- At level 1: Use existing cottage generation (already works)
- At level 2+: Generate tower structure instead
- This may already work correctly - verify the `Building.tsx` component logic

**Verification needed:** Check if `unlockedFloors.length` controls tower vs cottage display.

### 6. Concentrate Rocky Outcroppings at South
**File:** `src/lib/terrain/ContinuousTerrainBuilder.ts`

**Current behavior:** Rocks placed on grid with density increasing at distance from center.

**Changes needed:**
- Modify `buildVegetation()` rock placement logic
- Add directional bias: higher rock density for positive Z (south)
- Lower rock density for negative Z (north) - let mountains dominate there
- Create cluster around portal gateway position

**Key code location:** Lines 1012-1079 (buildVegetation), Lines 1240-1305 (buildRock/buildRockCluster)

### 7. Default to First Person View at Portal
**File:** `src/components/SimpleScene.tsx`

**Current behavior:** Starts in isometric view, can toggle to first person.

**Changes needed:**
- On scene initialization, call `enterFirstPerson()` instead of isometric setup
- Spawn position: Near portal gateway (approximately [0, terrain_height, 45])
- Initial yaw: Face NORTH (toward cottage/tower) - yaw = Math.PI (180°)
- Ensure toggle to isometric still works via existing keybind/UI

**Key code location:** Scene initialization in useEffect, around line 400-500

### 8. Add Portal Gateway to Scene
**File:** `src/components/SimpleScene.tsx`

**Changes needed:**
- Import and instantiate PortalGateway
- Position at southern edge of map
- Add to scene group
- Optionally add exclusion zone so vegetation doesn't spawn inside portal

---

## File Changes Summary

| File | Type | Changes |
|------|------|---------|
| `src/lib/terrain/ContinuousTerrainBuilder.ts` | Modify | Height bias, river path, path generation, rock placement |
| `src/lib/terrain/PortalGateway.ts` | **New** | Portal gateway structure with magical effects |
| `src/lib/terrain/index.ts` | Modify | Export PortalGateway |
| `src/components/SimpleScene.tsx` | Modify | Add portal, default first-person spawn |
| `src/lib/camera/CameraController.ts` | Modify (if needed) | Ensure first-person spawn direction |

---

## Testing Checklist

- [ ] Terrain height is highest at north, lowest at south
- [ ] River flows from NNW mountains down to SEE
- [ ] Portal gateway renders at true south with magical effect
- [ ] Main cobblestone path connects tower to portal
- [ ] Rocky outcroppings cluster around portal/south edge
- [ ] At level 1, cottage renders (not tower)
- [ ] Game starts in first-person view near portal
- [ ] Player faces north (toward cottage) on spawn
- [ ] Toggle to isometric view still works
- [ ] No vegetation spawns inside portal arch

---

## Visual Reference

```
                    ╔═══════════════════════╗
                    ║     TALL PEAKS        ║
                    ║   (North - max height)║
                    ╚═══════════════════════╝
                              ↑
                    ┌─────────┼─────────┐
                    │  RIVER  │         │
                    │  START  │         │
                    │ (NNW)   │         │
                    │    ╲    │         │
                    │     ╲   │         │
                    │      ╲  │         │
       MOUNTAINS    │       ╲ │         │    ROLLING HILLS
       (West)       │  [COTTAGE]        │    (East)
                    │         │╲        │
                    │         │ ╲       │
                    │    PATH │  ╲      │
                    │    ↓    │   ╲     │
                    │         │    ╲    │
                    │    ↓    │  RIVER  │
                    │         │  (SEE)  │
                    ├─────────┼─────────┤
                    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
                    │ ▓ ROCKY OUTCROPS ▓ │
                    │ ▓    [PORTAL]    ▓ │
                    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
                    └───────────────────┘
                         (South - flat)
                              ↓
                     First-person spawn
                     (facing north)
```

---

## Implementation Order

1. **Terrain height reorientation** - Foundation for everything else
2. **River path reorientation** - Depends on terrain heights
3. **Path generation** - Single path from center to south
4. **Rocky outcropping placement** - Concentrate at south
5. **Portal gateway creation** - New component
6. **Portal integration into scene** - Add to SimpleScene
7. **First-person default spawn** - Final touch

This order ensures each step builds on the previous, minimizing rework.
