# Plan: Medieval Stone Building Aesthetic

## Overview
Transform all buildings from flat brown aesthetic to medieval gray stone with 3D procedural textures and wooden plank roofs. Keep the green grassy ground as visual contrast.

## Current State
- Buildings use flat `meshStandardMaterial` with earthy brown/beige colors
- Walls are simple box geometries without surface detail
- Roofs are solid-color cones/boxes in browns and dark grays
- No visual stone block divisions or depth

## Target Aesthetic
- **Walls**: Gray stone blocks with visible mortar lines, slight depth variation
- **Roofs**: Wooden plank/shingle patterns in warm wood tones
- **Overall**: More dimensional, castle/medieval village feel

---

## Implementation Steps

### Phase 1: Create Shared Stone Material Utilities

**File: `src/components/buildings/materials/StoneMaterial.tsx`**

Create reusable components for procedural stone effects:

1. **`StoneBlock` component** - Individual stone block with:
   - Slight random position offset (±0.02) for organic feel
   - Random gray color variation (#6b7280 to #9ca3af range)
   - Roughness: 0.85-0.95
   - Optional beveled edges using scaled inner box

2. **`StoneWall` component** - Grid of stone blocks:
   - Props: width, height, depth, blockSize, mortarWidth
   - Generates stone block grid with mortar gaps (#4b5563 dark gray)
   - Randomizes block sizes slightly for natural look

3. **`WoodPlankRoof` component** - Wooden shingle pattern:
   - Props: width, depth, plankWidth, plankLength
   - Warm wood colors (#8B4513, #A0522D, #6B4423 range)
   - Slight height variation per plank
   - Visible plank divisions/gaps

4. **Color palette constants**:
   ```typescript
   STONE_COLORS = {
     light: '#9ca3af',
     medium: '#6b7280',
     dark: '#4b5563',
     mortar: '#374151'
   }
   WOOD_COLORS = {
     light: '#A0522D',
     medium: '#8B4513',
     dark: '#6B4423',
     weathered: '#5D4037'
   }
   ```

### Phase 2: Update Tower.tsx

1. **Replace wall materials**:
   - Change floor body from type-specific colors to stone gray palette
   - Keep accent colors for windows/glows to maintain visual identity per floor type

2. **Add stone block geometry**:
   - Replace flat wall meshes with `StoneWall` component
   - Add corner quoin stones (larger blocks at corners)
   - Stone trim remains but shifts to darker gray

3. **Update TowerBase**:
   - Foundation layers use darker stone gradients
   - Add visible stone block divisions to steps
   - Door archway gets stone block surround

4. **Update TowerRoof**:
   - Replace solid color with `WoodPlankRoof` pattern
   - Keep gold spire and red flag as accent colors
   - Add exposed wooden beam framework under eaves

### Phase 3: Update CottageBuilding.tsx

1. **Walls**: Replace cream #E8DCC4 with stone gray using `StoneWall`
2. **Roof**: Convert brown saddle roof to wooden plank shingles
3. **Foundation**: Darker stone blocks
4. **Keep**: Door brown wood, window blue glass for contrast

### Phase 4: Update WorkshopBuilding.tsx

1. **Walls**: Replace tan #8B7355 with `StoneWall`
2. **Roof**: Dark slate → wooden planks with weathered look
3. **Foundation**: Gray stone blocks
4. **Keep**: Orange forge glow, metal details as accents

### Phase 5: Update LaboratoryBuilding.tsx

1. **Walls**: Replace purple-gray #5C5470 with stone (keep slight purple tint in mortar)
2. **Roof**: Dark purple → wooden planks with darker stain
3. **Foundation**: Stone blocks
4. **Keep**: Purple glow, green cauldron liquid, magical accents

### Phase 6: Update ManorBuilding.tsx

1. **Walls**: Replace tan #D4C4A8 with dressed stone blocks (more uniform)
2. **Roof**: Already dark gray - convert to wooden planks with slate accents
3. **Columns**: Keep white/cream for contrast
4. **Foundation**: Formal cut stone blocks
5. **Keep**: Red/blue flags, window details

### Phase 7: Update MarketBuilding.tsx

1. **Walls**: Replace burlywood with mixed stone/wood (half-timber style)
2. **Roof**: Wooden plank shingles
3. **Counter/stalls**: Keep warm wood tones
4. **Keep**: Colorful awning, crate goods for visual interest

---

## Technical Approach

### Stone Block Generation
```typescript
// Pseudo-code for procedural stone wall
function generateStoneBlocks(width, height, blockSize) {
  const blocks = [];
  for (let y = 0; y < height; y += blockSize + mortarGap) {
    // Offset every other row for brick pattern
    const xOffset = (y / blockSize) % 2 === 0 ? 0 : blockSize / 2;
    for (let x = xOffset; x < width; x += blockSize + mortarGap) {
      blocks.push({
        position: [x, y, 0],
        size: [blockSize * randomRange(0.9, 1.0), blockSize * randomRange(0.9, 1.0)],
        color: randomGray(),
        depth: randomRange(0.02, 0.05) // Slight protrusion
      });
    }
  }
  return blocks;
}
```

### Performance Considerations
- Use `useMemo` for block generation (static once created)
- Consider `InstancedMesh` if block count becomes performance issue
- Keep block count reasonable (8-12 blocks per wall face)
- Mortar as single background plane, not individual meshes

### Color Shift Summary
| Building | Old Wall Color | New Wall Color |
|----------|---------------|----------------|
| Tower | Various (purple, brown, red, teal, green) | Gray stone + colored window accents |
| Cottage | Cream #E8DCC4 | Light gray stone #9ca3af |
| Workshop | Tan #8B7355 | Medium gray stone #6b7280 |
| Laboratory | Purple-gray #5C5470 | Gray stone with purple mortar |
| Manor | Tan #D4C4A8 | Light dressed stone #a1a1aa |
| Market | Burlywood #DEB887 | Half-timber (stone + wood) |

| Building | Old Roof | New Roof |
|----------|----------|----------|
| Tower | Type-specific solid | Wooden planks #8B4513 |
| Cottage | Brown #8B4513 | Wooden shingles #A0522D |
| Workshop | Dark slate #2F4F4F | Weathered wood #5D4037 |
| Laboratory | Dark purple #352F44 | Dark stained wood #4A3728 |
| Manor | Dark gray #4A4A4A | Wooden planks with trim |
| Market | N/A (awning) | Wooden plank canopy |

---

## Files to Modify
1. `src/components/buildings/materials/StoneMaterial.tsx` (new)
2. `src/components/Tower.tsx`
3. `src/components/buildings/CottageBuilding.tsx`
4. `src/components/buildings/WorkshopBuilding.tsx`
5. `src/components/buildings/LaboratoryBuilding.tsx`
6. `src/components/buildings/ManorBuilding.tsx`
7. `src/components/buildings/MarketBuilding.tsx`

## Files NOT Modified
- `src/components/Ground.tsx` - Keep green grass contrast
- `src/components/buildings/AnimatedDoor.tsx` - Door mechanics unchanged
- Store/types files - No data model changes

## Testing
- Visual inspection of all building types at each construction stage
- Verify construction stage opacity still works with new materials
- Check shadow casting/receiving on new geometry
- Performance check with multiple buildings on screen

## Rollback
All changes are aesthetic-only material/geometry updates. Easy rollback by reverting color constants if needed.
