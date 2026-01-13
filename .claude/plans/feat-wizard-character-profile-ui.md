# Implementation Plan: Wizard Character Profile UI

## Overview

Add MMO-style character profile frames for the wizard (bottom-left) and selected minions (top-right). The wizard profile displays a live 3D portrait with level/XP bar, while the minion target frame shows quest progress when a minion is clicked.

## Design Decisions

Based on user requirements:
- **Wizard portrait**: Live 3D model render (mini Three.js canvas)
- **Wizard status**: Level + XP progress bar
- **Minion interaction**: Click/select triggers target frame
- **Minion info**: Quest progress display

## Architecture

### New Components

```
src/components/ui/
├── WizardProfileFrame.tsx    # Bottom-left wizard profile (always visible)
├── TargetFrame.tsx           # Top-right minion target frame (on selection)
└── Portrait3D.tsx            # Reusable 3D portrait renderer
```

### Store Additions

Add to `gameStore.ts`:
```typescript
// Player/wizard state
wizard: {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}
```

## Implementation Steps

### Step 1: Create Portrait3D Component

**File**: `src/components/ui/Portrait3D.tsx`

A reusable component that renders a 3D character model in an isolated Three.js canvas:

- Accept `species` prop ('wizard' | 'goblin' | 'penguin' | 'mushroom')
- Use existing `MageBuilder` / species builders to generate mesh
- Setup mini scene with:
  - Orthographic camera (head-on view)
  - Ambient + directional lighting (portrait-style)
  - Optional slow rotation animation
- Fixed canvas size (e.g., 64x64 or 80x80 pixels)
- Transparent background to blend with frame

### Step 2: Create WizardProfileFrame Component

**File**: `src/components/ui/WizardProfileFrame.tsx`

Position: Fixed bottom-left corner

**Layout** (MMO-style unit frame):
```
┌────────────────────────────────────┐
│ ┌──────┐  Merlin                   │
│ │  3D  │  ━━━━━━━━━━━━━━ Lvl 12    │
│ │ Port │  [████████░░░░] 3,450 XP  │
│ └──────┘                           │
└────────────────────────────────────┘
```

Features:
- Square portrait frame with decorative WoW-style border
- `Portrait3D` component showing wizard
- Character name (editable in future)
- Level indicator
- XP progress bar with current/max display
- Styled with `wowTheme` tokens (stone border, gold accents)

### Step 3: Add Wizard State to Game Store

**File**: `src/store/gameStore.ts`

Add wizard slice to existing store:

```typescript
interface WizardState {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// Default state
wizard: {
  name: 'Archmage',
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
}

// Actions
gainXP: (amount: number) => void;  // Future: quest completion rewards
setWizardName: (name: string) => void;
```

### Step 4: Create TargetFrame Component

**File**: `src/components/ui/TargetFrame.tsx`

Position: Fixed top-right corner

**Layout** (target unit frame):
```
┌────────────────────────────────────┐
│                  Pip the Scout ┌──────┐
│  Quest: Research API Docs      │  3D  │
│  [████████████░░░░░░] 65%      │ Port │
│  Status: Working               └──────┘
└────────────────────────────────────┘
```

Features:
- Only visible when `selectedMinionId` is set
- Mirrored layout (portrait on right side)
- Minion name and type (Scout/Scribe/Artificer)
- Current quest name (if assigned)
- Quest progress bar with percentage
- Current state indicator (idle, traveling, working, etc.)
- Click to deselect (X button)

### Step 5: Integrate into GameLayout

**File**: `src/components/GameLayout.tsx`

- Import and mount `WizardProfileFrame` (always visible)
- Import and mount `TargetFrame` (conditional on `selectedMinionId`)
- Ensure z-index layering works with existing panels
- Hide frames during conversation mode (like other UI elements)

### Step 6: Style Refinements

Ensure both frames:
- Use consistent WoW aesthetic from `wowTheme`
- Have subtle backdrop blur like existing panels
- Include decorative corner ornaments (via WowPanel or custom)
- Play sound effects on show/hide (existing pattern)
- Responsive scaling for smaller screens

## Component Specifications

### Portrait3D Props
```typescript
interface Portrait3DProps {
  species: 'wizard' | 'goblin' | 'penguin' | 'mushroom';
  size?: number;           // Canvas size in pixels (default: 64)
  rotation?: boolean;      // Enable slow rotation (default: false)
  className?: string;
}
```

### WizardProfileFrame
- Always visible (except during conversation)
- Position: `fixed bottom-4 left-4`
- Max width: ~280px
- Uses store's wizard state

### TargetFrame Props
```typescript
interface TargetFrameProps {
  minionId: string;
  onClose: () => void;
}
```
- Conditionally rendered when minion selected
- Position: `fixed top-20 right-4` (below top bar)
- Max width: ~280px
- Reads minion + quest data from store

## File Changes Summary

| File | Change Type |
|------|-------------|
| `src/components/ui/Portrait3D.tsx` | New |
| `src/components/ui/WizardProfileFrame.tsx` | New |
| `src/components/ui/TargetFrame.tsx` | New |
| `src/store/gameStore.ts` | Modify (add wizard state) |
| `src/components/GameLayout.tsx` | Modify (integrate frames) |
| `src/types/game.ts` | Modify (add wizard types) |

## Dependencies

No new dependencies required. Uses existing:
- `three` + `@react-three/fiber` + `@react-three/drei` for Portrait3D
- `zustand` for state
- Existing minion species builders from `src/lib/minion/`

## Testing Considerations

- Verify Portrait3D renders correctly for all species
- Test frame visibility during conversation mode
- Ensure frames don't overlap with existing panels
- Test XP bar animation when XP is gained
- Verify minion selection triggers target frame correctly

## Future Enhancements (Out of Scope)

- Wizard customization UI (name, robes, etc.)
- XP gain from quest completion
- Target frame for multiple selections
- Buff/debuff indicators on frames
- Portrait click to open full character panel
