# Floating Island Map Enhancement - Implementation Plan

## Overview
Transform the current continuous terrain into a dramatic floating island with rocky cliff perimeter, a waterfall cascading into the void, and an immersive sky environment with day/night cycle support.

## Current State Analysis
- **Ground.tsx**: Simple floating island with layered boxes (unused in main scene)
- **SimpleScene.tsx**: Uses `ContinuousTerrainBuilder` for terrain generation with rivers, paths, vegetation
- **ContinuousTerrainBuilder.ts**: ~1600 LOC terrain system with height maps, rivers, bridges, vegetation
- **DayNightCycle.ts**: Existing day/night system with sun/moon orbits, sky color interpolation (solid color background)

## Architecture Decisions

### 1. Sky Environment System (New Component)
Create a new `SkyEnvironment` class in `src/lib/lighting/` that:
- Integrates with existing `DayNightCycle` for time-of-day awareness
- Manages a sky dome/sphere for gradient sky rendering
- Handles static cloud meshes positioned around the island
- Renders stars at night with twinkling animation

### 2. Floating Island Edge System (New Component)
Create a new `IslandEdgeBuilder` class in `src/lib/terrain/` that:
- Generates rocky cliff geometry around the island perimeter
- Creates the dramatic underside tapering effect
- Handles the waterfall edge cutout where the river exits

### 3. Waterfall System (New Component)
Create a new `Waterfall` class in `src/lib/effects/` that:
- Renders animated water particles falling from the island edge
- Creates mist/spray effect at the waterfall origin
- Integrates with the river system from `ContinuousTerrainBuilder`

---

## Implementation Steps

### Phase 1: Sky Environment Foundation
**Files to modify/create:**
- Create `src/lib/lighting/SkyEnvironment.ts`
- Modify `src/lib/lighting/index.ts` (add export)
- Modify `src/lib/lighting/DayNightCycle.ts` (expose sky color state)

**Tasks:**
1. Create `SkyEnvironment` class with constructor taking scene reference
2. Build sky dome geometry (large sphere with inverted normals)
3. Implement gradient shader material for day sky:
   - Zenith color (top of dome)
   - Horizon color (around the sides)
   - Support for `below` color (visible through island underside)
4. Hook into `DayNightCycle.getSkyColor()` for dynamic colors
5. Add `update(timeOfDay: number)` method to animate sky colors

### Phase 2: Cloud System
**Files to modify:**
- `src/lib/lighting/SkyEnvironment.ts`

**Tasks:**
1. Create low-poly cloud mesh generator (layered icosahedrons/spheres)
2. Position 8-12 static cloud clusters at varying heights around island
3. Add slight Y-position bob animation for subtle life
4. Clouds should be visible both above and below the island horizon
5. Cloud colors adjust based on time of day (white → orange at sunset → dark at night)

### Phase 3: Night Sky with Stars
**Files to modify:**
- `src/lib/lighting/SkyEnvironment.ts`

**Tasks:**
1. Create star field using Points geometry with custom shader
2. Generate ~500-800 star positions on inner dome surface
3. Implement twinkling animation via time-based alpha modulation
4. Fade stars in/out based on `timeOfDay` (visible ~0.0-0.22 and 0.78-1.0)
5. Vary star sizes and brightness for depth

### Phase 4: Floating Island Edge Cliffs
**Files to create/modify:**
- Create `src/lib/terrain/IslandEdgeBuilder.ts`
- Modify `src/lib/terrain/index.ts` (add export)
- Modify `src/lib/terrain/ContinuousTerrainBuilder.ts` (integrate edge builder)

**Tasks:**
1. Create `IslandEdgeBuilder` class that takes terrain config
2. Generate rocky cliff geometry around perimeter:
   - Sample height map at edge positions
   - Create jagged rock face meshes descending from edge
   - Use dodecahedron/icosahedron for low-poly rocky look
3. Implement cliff layering:
   - Top layer: Grass-colored rocks matching terrain edge
   - Middle layers: Brown/earth tones
   - Bottom layers: Gray/dark stone tapering to point
4. Add variation in cliff depth and angles for organic feel
5. Create underside geometry (inverted cone-like tapering)

### Phase 5: Waterfall Integration
**Files to create/modify:**
- Create `src/lib/effects/Waterfall.ts`
- Modify `src/lib/effects/index.ts` (add export)
- Modify `src/lib/terrain/ContinuousTerrainBuilder.ts` (expose river exit point)

**Tasks:**
1. Identify river exit point from `ContinuousTerrainBuilder.getRiverPath()`
2. Create gap in cliff geometry at waterfall location
3. Build waterfall particle system:
   - Emit particles at river edge
   - Apply gravity for falling animation
   - Recycle particles that fall below threshold
4. Add waterfall mesh (animated water ribbon geometry)
5. Create mist effect at waterfall base using small particles
6. Waterfall color tints based on time of day

### Phase 6: Scene Integration
**Files to modify:**
- `src/components/SimpleScene.tsx`

**Tasks:**
1. Import and instantiate `SkyEnvironment` alongside `DayNightCycle`
2. Replace solid `scene.background` with sky dome rendering
3. Connect sky environment update to animation loop
4. Integrate `IslandEdgeBuilder` into terrain setup
5. Instantiate `Waterfall` effect at river exit point
6. Update camera far plane if needed for sky dome visibility
7. Adjust lighting to work with new sky environment

### Phase 7: Polish & Optimization
**Tasks:**
1. Tune cloud positions and sizes for aesthetic balance
2. Adjust cliff rock density for performance
3. Optimize star shader for mobile/low-end GPUs
4. Add subtle parallax to clouds based on camera position
5. Ensure all new geometry properly casts/receives shadows where appropriate
6. Test day/night cycle transitions for smooth color blending
7. Verify minion pathfinding still works (avoid cliff edges)

---

## Technical Details

### Sky Dome Shader (GLSL snippet concept)
```glsl
// Vertex shader passes normalized position
varying vec3 vWorldPosition;

// Fragment shader
uniform vec3 topColor;      // Zenith
uniform vec3 horizonColor;  // Horizon
uniform vec3 bottomColor;   // Below horizon
uniform float horizonSharpness;

void main() {
  float h = normalize(vWorldPosition).y;
  vec3 color;
  if (h > 0.0) {
    color = mix(horizonColor, topColor, pow(h, horizonSharpness));
  } else {
    color = mix(horizonColor, bottomColor, pow(-h, 0.5));
  }
  gl_FragColor = vec4(color, 1.0);
}
```

### Cloud Generation Parameters
- Cloud count: 10-14 clusters
- Height range: Y = -5 to +25 (relative to island surface)
- Distance from center: 40-80 units (outside island but visible)
- Cloud size: 5-15 units diameter
- Material: MeshStandardMaterial with emissive for sunset glow

### Cliff Generation Parameters
- Cliff depth: 8-15 units below island surface
- Rock segment count: 40-60 around perimeter
- Taper ratio: ~60% width at bottom vs top
- Color gradient: Green → Brown → Gray → Dark gray

### Waterfall Parameters
- Particle count: 200-400
- Fall speed: 8-12 units/second
- Spread: 2-4 units width
- Mist particles: 50-100 at lower opacity

---

## Risk Assessment

### Performance Concerns
- **Sky dome**: Minimal impact (single large mesh)
- **Clouds**: Low impact (10-14 simple meshes)
- **Stars**: Low impact (single Points object with ~800 points)
- **Cliff rocks**: Medium impact - may need LOD or instancing if >100 meshes
- **Waterfall particles**: Medium impact - limit particle count, use Points not meshes

### Compatibility
- All new code uses existing Three.js patterns from codebase
- Integrates with existing `DayNightCycle` API
- No new dependencies required

### Testing Considerations
- Verify day/night transitions don't cause visual pops
- Test camera movement near island edges
- Ensure waterfall doesn't block minion pathing
- Check that existing building/terrain exclusion zones still work

---

## File Structure After Implementation

```
src/lib/
├── lighting/
│   ├── index.ts           (modified - add SkyEnvironment export)
│   ├── DayNightCycle.ts   (modified - expose sky state)
│   └── SkyEnvironment.ts  (new - sky dome, clouds, stars)
├── terrain/
│   ├── index.ts           (modified - add IslandEdgeBuilder export)
│   ├── ContinuousTerrainBuilder.ts (modified - integrate edges, expose river exit)
│   └── IslandEdgeBuilder.ts (new - cliff generation)
└── effects/
    ├── index.ts           (modified - add Waterfall export)
    └── Waterfall.ts       (new - waterfall particles and mesh)

src/components/
└── SimpleScene.tsx        (modified - integrate new systems)
```

---

## Estimated Complexity
- **SkyEnvironment**: ~200-300 LOC
- **IslandEdgeBuilder**: ~300-400 LOC
- **Waterfall**: ~150-250 LOC
- **Integration changes**: ~100-150 LOC modifications

**Total new code**: ~750-1100 LOC
