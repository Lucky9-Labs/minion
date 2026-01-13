# MMORPG Aesthetic UI Redesign Plan

## Overview

Transform the current dark, glass-morphism UI into a classic World of Warcraft-inspired interface with stone textures, parchment backgrounds, ornate borders, and warm brown/gold color palette.

## Design Direction

**Target Aesthetic**: Classic WoW (2004-2010 era)
- Stone panel borders with beveled edges
- Parchment/leather panel backgrounds
- Gold/bronze metallic accents and corner ornaments
- Warm color palette: browns, tans, golds, deep reds
- Custom pixel-art/hand-drawn style icons
- Subtle UI sound effects

---

## Phase 1: Foundation & Design System

### 1.1 Create WoW-Style Design Tokens

**File**: `src/styles/theme.ts` (new)

```typescript
export const wowTheme = {
  colors: {
    // Stone/Border colors
    stoneDark: '#2a2015',
    stoneMid: '#4a3c2a',
    stoneLight: '#6b5a42',
    stoneBorder: '#1a1510',

    // Parchment/Background colors
    parchmentDark: '#3d3225',
    parchmentMid: '#5c4d3a',
    parchmentLight: '#8b7355',

    // Metallic accents
    goldDark: '#8b6914',
    goldMid: '#c9a227',
    goldLight: '#e8c84a',
    bronze: '#b87333',

    // Text
    textPrimary: '#f4e4c1',
    textSecondary: '#c4a77d',
    textMuted: '#8b7355',

    // Status colors (keeping role distinction)
    scout: '#4a8f4a',      // Muted green
    scribe: '#4a6a8f',     // Muted blue
    artificer: '#c9a227',  // Gold

    // UI States
    hover: '#5c4d3a',
    active: '#c9a227',
    danger: '#8b3a3a',
  },

  borders: {
    panel: '3px solid #1a1510',
    inset: '2px solid #3d3225',
    gold: '2px solid #c9a227',
  },

  shadows: {
    panel: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    inset: 'inset 0 2px 4px rgba(0,0,0,0.3)',
    glow: '0 0 10px rgba(201, 162, 39, 0.3)',
  }
}
```

### 1.2 Create Texture Assets

**Directory**: `public/textures/` (new)

Required texture images (to be generated via Gemini logo skill):
- `stone-border.png` - Tileable stone texture for panel borders
- `parchment-bg.png` - Parchment/leather panel background
- `parchment-dark.png` - Darker variant for nested elements
- `metal-corner-tl.png` - Ornate gold corner (top-left)
- `metal-corner-tr.png` - Ornate gold corner (top-right)
- `metal-corner-bl.png` - Ornate gold corner (bottom-left)
- `metal-corner-br.png` - Ornate gold corner (bottom-right)
- `title-bar-bg.png` - Decorative title bar background
- `button-normal.png` - Button background (normal state)
- `button-hover.png` - Button background (hover state)
- `button-pressed.png` - Button background (pressed state)
- `divider-horizontal.png` - Ornate horizontal divider
- `scroll-track.png` - Scrollbar track texture
- `scroll-thumb.png` - Scrollbar thumb texture

### 1.3 Create Custom Icon Set

**Directory**: `public/icons/` (new)

Icons to replace emojis (generated via Gemini logo skill):
- `icon-tower.png` - Mage tower (replaces 🏰)
- `icon-minion-scout.png` - Scout class icon (replaces 🧝)
- `icon-minion-scribe.png` - Scribe class icon
- `icon-minion-artificer.png` - Artificer class icon
- `icon-quest.png` - Quest/sword icon (replaces ⚔️)
- `icon-vault.png` - Chest/vault icon (replaces 📦)
- `icon-scroll.png` - Scroll artifact (replaces 📜)
- `icon-artifact.png` - Magic item icon
- `icon-rune.png` - Rune/automation icon
- `icon-postcard.png` - Postcard/mail icon (replaces 📮)
- `icon-close.png` - X button for panels
- `icon-expand.png` - Expand/maximize
- `icon-minimize.png` - Minimize/collapse
- `icon-gold.png` - Gold coin for resources
- `icon-xp.png` - Experience star
- `icon-level.png` - Level indicator

---

## Phase 2: Base Component Refactor

### 2.1 Create WoW-Style Panel Component

**File**: `src/components/ui/WowPanel.tsx` (new)

A new panel component with:
- Stone-textured border frame (using border-image or layered divs)
- Parchment background with slight noise texture
- Ornate gold corner decorations (positioned absolutely)
- Decorative title bar with embossed text effect
- Close button styled as a small ornate X icon
- Inner shadow for depth

```
┌─────────────────────────────────┐
│ ◆═══════ PANEL TITLE ═══════◆ │  ← Gold ornaments, embossed title
├─────────────────────────────────┤  ← Decorative divider
│                                 │
│     [Parchment Background]      │
│                                 │
│                                 │
└─────────────────────────────────┘
  ↑ Stone border with beveled edge
```

### 2.2 Create WoW-Style Button Component

**File**: `src/components/ui/WowButton.tsx` (new)

Button variants:
- **Primary**: Gold/bronze gradient, beveled edges, metallic shine
- **Secondary**: Stone texture, subtle border
- **Danger**: Dark red stone with gold trim

States:
- Normal: Raised appearance with highlight on top edge
- Hover: Slight glow, brightness increase
- Pressed: Inverted bevel (sunken appearance)
- Disabled: Desaturated, no shine

### 2.3 Create WoW-Style Input Component

**File**: `src/components/ui/WowInput.tsx` (new)

- Dark inset background (carved into stone appearance)
- Gold border on focus
- Parchment-colored text
- Label styled with small-caps, gold color

### 2.4 Create Icon Component

**File**: `src/components/ui/WowIcon.tsx` (new)

```typescript
type IconName = 'tower' | 'scout' | 'scribe' | 'artificer' | 'quest' | 'vault' | ...

interface WowIconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}
```

Renders custom icons from `/public/icons/` with optional glow effect.

---

## Phase 3: Sound System

### 3.1 Create Sound Manager

**File**: `src/lib/sounds.ts` (new)

```typescript
export const UISounds = {
  panelOpen: '/sounds/panel-open.mp3',
  panelClose: '/sounds/panel-close.mp3',
  buttonClick: '/sounds/button-click.mp3',
  buttonHover: '/sounds/button-hover.mp3',
  questAccept: '/sounds/quest-accept.mp3',
  questComplete: '/sounds/quest-complete.mp3',
  itemPickup: '/sounds/item-pickup.mp3',
  error: '/sounds/error.mp3',
}

export function playSound(sound: keyof typeof UISounds, volume?: number): void
export function setSoundEnabled(enabled: boolean): void
```

### 3.2 Sound Assets

**Directory**: `public/sounds/` (new)

Required sounds (short, subtle, fantasy-themed):
- `panel-open.mp3` - Parchment unfurl / stone slide
- `panel-close.mp3` - Soft thud / paper fold
- `button-click.mp3` - Satisfying click / stone tap
- `button-hover.mp3` - Very subtle whoosh (optional)
- `quest-accept.mp3` - Heroic chime
- `quest-complete.mp3` - Triumphant fanfare (short)
- `item-pickup.mp3` - Magical sparkle
- `error.mp3` - Low thud / denial sound

### 3.3 Sound Settings Integration

**File**: `src/store/gameStore.ts` (modify)

Add to store:
```typescript
soundEnabled: boolean;
soundVolume: number; // 0-1
toggleSound: () => void;
setSoundVolume: (volume: number) => void;
```

---

## Phase 4: Component Migration

### 4.1 Migrate Panel.tsx

Replace current `<Panel>` with `<WowPanel>`:
- Update all imports across UI components
- Maintain same props interface for compatibility
- Add sound effects on open/close

### 4.2 Migrate MinionPanel.tsx

- Replace emoji icons with `<WowIcon>` components
- Apply WoW color palette to role indicators
- Style minion cards with inset parchment backgrounds
- Add ornate frames around selected minion
- Recruitment button gets gold primary style

### 4.3 Migrate QuestPanel.tsx

- Quest input area styled as "quest scroll" with curled edges
- Progress stages shown as illuminated waypoints
- Active quest highlighted with gold glow border
- "Dispatch" button prominently styled

### 4.4 Migrate VaultPanel.tsx

- Tab buttons styled as book/chest toggles
- Artifact cards on parchment with wax seal decoration
- Postcards styled as aged letters with torn edges
- Category headers with decorative dividers

### 4.5 Migrate CharacterPanel.tsx

- Character portrait frame with ornate gold border
- Stats displayed on stone tablets
- Traits as engraved runestones
- Lore section on aged scroll paper
- Treasures displayed in ornate chest-style container

### 4.6 Migrate GameLayout.tsx

- Top bar styled as stone banner with metal fixtures
- Navigation buttons as icon-only stone tablets
- Tower level indicator in ornate shield frame
- Overall background gets subtle dark stone texture

---

## Phase 5: Global Styles & Polish

### 5.1 Update globals.css

```css
/* WoW-style scrollbar */
::-webkit-scrollbar { ... }
::-webkit-scrollbar-track { background: url('/textures/scroll-track.png'); }
::-webkit-scrollbar-thumb { background: url('/textures/scroll-thumb.png'); }

/* Custom font (fantasy style) */
@font-face {
  font-family: 'WoW-Header';
  src: url('/fonts/...'); /* Consider: Morpheus, Fritz Quadrata, or similar */
}

/* Text effects */
.text-embossed { text-shadow: 0 1px 0 rgba(255,255,255,0.1), 0 -1px 0 rgba(0,0,0,0.5); }
.text-gold { color: #c9a227; text-shadow: 0 0 8px rgba(201,162,39,0.5); }
```

### 5.2 Tailwind Config Updates

**File**: `tailwind.config.ts` (modify)

Add custom colors, extend theme with WoW palette, add texture background utilities.

### 5.3 Animation Updates

- Panel open: Slight scale + fade with parchment unfurl feel
- Button hover: Subtle golden glow pulse
- Quest progress: Glowing waypoint animations
- Minion selection: Gold border shimmer

---

## Phase 6: Gemini Logo Skill Creation

### 6.1 Create Skill Definition

**File**: `.claude/skills/gemini-logo.md` (new)

Skill that interfaces with Gemini's image generation to create:
- Consistent WoW-style pixel art icons
- Tileable textures (stone, parchment, metal)
- UI decorative elements

Prompt templates for consistent style:
```
"World of Warcraft classic UI style, {description},
pixel art, fantasy game interface, 32x32px icon,
transparent background, warm medieval colors"
```

---

## Implementation Order

1. **Phase 1.1**: Design tokens (theme.ts) - Establishes color/style foundation
2. **Phase 6**: Gemini logo skill - Needed to generate assets
3. **Phase 1.2-1.3**: Generate texture and icon assets using skill
4. **Phase 3**: Sound system setup (can work in parallel)
5. **Phase 2**: Build base components (WowPanel, WowButton, WowInput, WowIcon)
6. **Phase 4**: Migrate existing components one by one
7. **Phase 5**: Global polish and animations

---

## Asset Generation Prompts (for Gemini Logo Skill)

### Textures

**Stone Border**:
```
Tileable dark stone texture, World of Warcraft classic UI style,
rough hewn stone blocks, subtle mortar lines, fantasy game interface border,
128x128px, seamless tile, warm brown-gray tones
```

**Parchment Background**:
```
Tileable aged parchment texture, World of Warcraft classic UI style,
yellowed paper with subtle stains and fiber texture, fantasy scroll background,
256x256px, seamless tile, warm tan/cream tones
```

**Gold Corner Ornament**:
```
Ornate gold corner decoration, World of Warcraft classic UI style,
Celtic knot pattern, polished bronze metal, fantasy game interface,
64x64px, transparent background, top-left corner piece
```

### Icons (32x32px each)

**Tower Icon**:
```
Mage tower icon, World of Warcraft classic UI style,
tall wizard spire with glowing windows, purple magic aura,
32x32px pixel art, transparent background
```

**Scout Icon**:
```
Elven scout class icon, World of Warcraft classic UI style,
hooded ranger with keen eyes, green nature theme,
32x32px pixel art, transparent background
```

*(Continue for all icons...)*

---

## Testing Checklist

- [ ] All panels render with new stone/parchment styling
- [ ] Buttons show correct states (normal/hover/pressed/disabled)
- [ ] Icons display at correct sizes with optional glow
- [ ] Sound effects play on interactions (when enabled)
- [ ] Sound toggle works and persists
- [ ] Scrollbars match theme
- [ ] Text is readable on all backgrounds
- [ ] Responsive behavior maintained
- [ ] No visual regressions on 3D scene overlay
- [ ] Performance acceptable (texture loading)

---

## Files Changed Summary

**New Files**:
- `src/styles/theme.ts`
- `src/components/ui/WowPanel.tsx`
- `src/components/ui/WowButton.tsx`
- `src/components/ui/WowInput.tsx`
- `src/components/ui/WowIcon.tsx`
- `src/lib/sounds.ts`
- `.claude/skills/gemini-logo.md`
- `public/textures/*` (13 texture files)
- `public/icons/*` (16+ icon files)
- `public/sounds/*` (8 sound files)

**Modified Files**:
- `src/components/ui/Panel.tsx` → potentially deprecated
- `src/components/ui/MinionPanel.tsx`
- `src/components/ui/QuestPanel.tsx`
- `src/components/ui/VaultPanel.tsx`
- `src/components/ui/CharacterPanel.tsx`
- `src/components/GameLayout.tsx`
- `src/store/gameStore.ts`
- `src/app/globals.css`
- `tailwind.config.ts`

---

## Risk Considerations

1. **Asset Loading Performance**: Multiple texture images may impact initial load. Consider:
   - CSS sprites for icons
   - Lazy loading for non-critical textures
   - WebP format for smaller file sizes

2. **Accessibility**: Ensure sufficient contrast with parchment backgrounds. Test with accessibility tools.

3. **Sound Annoyance**: Default sound to OFF or low volume. Provide easy toggle.

4. **Gemini Skill Dependency**: If Gemini asset generation is slow/unavailable, have fallback plan (CSS-only approximation or placeholder assets).
