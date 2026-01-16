# Implementation Plan: Spellbook Minion/Building Selection in First Person

## Overview

When entering grid drawing mode or building placement in first person, the wizard opens a spellbook in their left hand (replacing/alongside the staff). Scroll wheel turns pages, with a 3D preview mesh spinning above the open book showing the currently selected minion or building type.

## Current Architecture Understanding

### Existing Components
- **`FirstPersonHands.ts`**: Renders staff + hand in first person, attached to perspective camera
- **`StaffInteractionController.ts`**: Manages interaction modes (idle, aiming, menu, grabbing, drawing)
- **`FoundationDrawer.ts`**: Handles grid cell selection for building placement
- **Staff States**: `idle | aiming | charging | grabbing | drawing`

### Entities to Preview
**Minions (3 spawnable):**
- Goblin, Penguin, Mushroom

**Buildings (5 types):**
- Cottage, Workshop, Laboratory, Market, Manor

---

## Implementation Plan

### Phase 1: Spellbook 3D Model (`src/lib/FirstPersonSpellbook.ts`)

Create a new class similar to `FirstPersonHands` that renders:

**Book Structure:**
- Two "covers" (box geometry) hinged at spine
- Multiple "pages" between covers (thin box geometry, grouped)
- Left page and right page surfaces for content
- Gold trim/decorative elements on covers

**Position:** Left side of view, opposite the staff
- Offset: `(-0.35, -0.3, -0.5)` approximately
- Base rotation tilted toward camera for readability

**Key Methods:**
```typescript
class FirstPersonSpellbook {
  constructor()
  getObject(): THREE.Group
  setVisible(visible: boolean): void
  setOpen(open: boolean): void  // Animate open/close
  turnPage(direction: 1 | -1): void  // Animate page turn
  getCurrentPage(): number
  setPreviewMesh(mesh: THREE.Object3D | null): void
  update(deltaTime: number, elapsedTime: number): void
  dispose(): void
}
```

**Animation States:**
- Closed → Opening (book opens, pages settle)
- Open idle (gentle floating, page edges flutter)
- Page turning (left or right, with curve animation)
- Open → Closing

### Phase 2: Page Turn Animation System

**Page Geometry:**
- Each "page" is a thin rectangular mesh
- During turn: apply bend deformation via vertex shader or morph targets
- Simple approach: use 2-3 intermediate page meshes that rotate and scale

**Turn Animation Sequence:**
1. Current page lifts from right side
2. Page curves through center (bezier path)
3. Page settles on left side
4. New content revealed

**Implementation Options:**
- **Option A (Recommended)**: Pre-baked morph targets for page curl
- **Option B**: Procedural vertex displacement in update loop
- **Option C**: Multiple flat planes that rotate in sequence (simpler, still effective)

Going with **Option C** for simplicity - 3 page planes that rotate sequentially gives convincing flip.

### Phase 3: Preview Mesh System (`src/lib/SpellbookPreviews.ts`)

Create simplified/iconic meshes for each spawnable entity:

**Minion Previews (simplified silhouettes):**
```typescript
function createGoblinPreview(): THREE.Group   // Green blob with ears
function createPenguinPreview(): THREE.Group  // Black/white oval with flippers
function createMushroomPreview(): THREE.Group // Cap + stem
```

**Building Previews (iconic shapes):**
```typescript
function createCottagePreview(): THREE.Group     // Simple house shape
function createWorkshopPreview(): THREE.Group    // House + chimney
function createLaboratoryPreview(): THREE.Group  // Tall flask shape
function createMarketPreview(): THREE.Group      // Stall with awning
function createManorPreview(): THREE.Group       // Large multi-roof
```

**Preview Properties:**
- Scale: ~0.08 units (small enough to float above book)
- Materials: Glowing/emissive for magical appearance
- Animation: Slow spin (Y-axis rotation)
- Position: 0.15-0.2 units above open book center

### Phase 4: Spellbook State Management

**New Types (`src/types/interaction.ts`):**
```typescript
export type SpellbookPage =
  | { type: 'minion'; species: 'goblin' | 'penguin' | 'mushroom' }
  | { type: 'building'; buildingType: 'cottage' | 'workshop' | 'laboratory' | 'market' | 'manor' };

export interface SpellbookState {
  isOpen: boolean;
  currentPageIndex: number;
  pages: SpellbookPage[];
  isAnimating: boolean;
}
```

**Page Order (8 pages total):**
1. Goblin
2. Penguin
3. Mushroom
4. Cottage
5. Workshop
6. Laboratory
7. Market
8. Manor

### Phase 5: Integration with FirstPersonHands

**Modify `FirstPersonHands.ts`:**
- Add spellbook as sibling to staff in the group
- Add method `setSpellbookMode(active: boolean)`:
  - When active: staff lowers/dims, spellbook raises and opens
  - When inactive: spellbook closes and lowers, staff returns

**Or Create New Composite Class:**
`FirstPersonViewModel.ts` that manages both staff and spellbook visibility.

**Recommended:** Modify `FirstPersonHands` to include spellbook, keeping single source of truth for first-person viewmodel.

### Phase 6: Scroll Wheel Integration

**In `SimpleScene.tsx`:**

Add scroll wheel handler for first person mode:
```typescript
// In first person + drawing/building mode
if (isFirstPersonRef.current && interactionMode === 'drawing') {
  event.preventDefault();
  const direction = event.deltaY > 0 ? 1 : -1;
  firstPersonHandsRef.current?.turnSpellbookPage(direction);
}
```

**Debouncing:**
- Prevent rapid page turns (300ms cooldown)
- Queue turns if user scrolls during animation

### Phase 7: Mode Trigger Integration

**Entry Points (when spellbook should open):**

1. **Ground Menu → "New Building"**:
   - `StaffInteractionController.executeAction('build')` triggers drawing mode
   - Signal to `FirstPersonHands` to open spellbook

2. **Direct Minion Spawn** (if implemented):
   - Similar trigger when entering spawn selection

**Modify `StaffInteractionController.ts`:**
Add callback `onSpellbookStateChange?: (open: boolean) => void`

**In `SimpleScene.tsx`:**
Wire callback to `FirstPersonHands.setSpellbookMode()`

### Phase 8: Selection Confirmation

**Current Selection Display:**
- The spinning preview mesh above the book indicates current selection
- HUD text below reticle shows selection name (existing `FirstPersonHUD.tsx`)

**Confirmation Flow:**
1. User scrolls to desired entity
2. Current selection shown as spinning preview
3. User clicks/draws on ground to place
4. `onFoundationComplete` callback receives selection type
5. Building/minion spawned at location

**Modify `DrawnFoundation` or create new interface:**
```typescript
interface PlacementIntent {
  foundation: DrawnFoundation;
  entityType: 'minion' | 'building';
  entityId: string; // 'goblin', 'cottage', etc.
}
```

---

## File Changes Summary

### New Files
1. `src/lib/FirstPersonSpellbook.ts` - Spellbook 3D model and animations
2. `src/lib/SpellbookPreviews.ts` - Simplified preview meshes for entities

### Modified Files
1. `src/lib/FirstPersonHands.ts` - Add spellbook integration, mode switching
2. `src/types/interaction.ts` - Add SpellbookPage, SpellbookState types
3. `src/lib/interaction/StaffInteractionController.ts` - Add spellbook callbacks
4. `src/components/SimpleScene.tsx` - Scroll wheel handling, spellbook state wiring
5. `src/components/ui/FirstPersonHUD.tsx` - Display current spellbook selection

---

## Technical Considerations

### Performance
- Preview meshes should be low-poly (< 100 triangles each)
- Page turn animation uses simple rotation, not complex deformation
- Single ambient light for preview glow, no shadows

### Visual Polish
- Book covers: Dark leather texture (procedural or color)
- Pages: Cream/parchment color with slight transparency at edges
- Gold trim: Emissive material for magical glow
- Preview meshes: Slight emissive + rotating point light

### Animation Timing
- Book open: 400ms
- Page turn: 300ms
- Book close: 300ms
- Preview mesh spin: 2s per rotation

---

## Implementation Order

1. **Phase 1**: Create `FirstPersonSpellbook.ts` with static open book model
2. **Phase 3**: Create `SpellbookPreviews.ts` with all preview meshes
3. **Phase 5**: Integrate spellbook into `FirstPersonHands`, test visibility toggle
4. **Phase 2**: Add page turn animation
5. **Phase 6**: Add scroll wheel handling in SimpleScene
6. **Phase 7**: Wire up mode triggers from StaffInteractionController
7. **Phase 4 & 8**: Add state management and selection confirmation

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Where does spellbook render? | Left hand, attached to perspective camera like staff |
| What triggers spellbook? | Entering drawing mode (ground → build) |
| Scroll behavior? | Turns pages, shows preview on page settle |
| Preview mesh style? | Simplified iconic shapes, glowing/emissive |
| Coexist with UI? | Yes, spellbook is 3D overlay, UI panels remain |
