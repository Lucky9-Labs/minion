# Implementation Plan: Minion Interaction with Camera Animation

## Overview

When a user clicks on a minion, the game enters "conversation mode":
- Camera smoothly transitions from orthographic isometric view to perspective eye-level view
- Minion stops moving and faces the camera (right side of frame)
- Wizard teleports with visual flourish to face the minion (left side, back to camera)
- Minion reacts based on personality (surprised/annoyed/excited)
- Speech bubble UI appears for interaction
- Spring-arm camera avoids collisions with environment
- "Leave convo" button exits back to normal gameplay

---

## Phase 1: Camera System Overhaul

### 1.1 Create Camera Controller (`src/lib/camera/CameraController.ts`)

New class to manage camera state and transitions:

```typescript
interface CameraState {
  mode: 'isometric' | 'conversation'
  type: 'orthographic' | 'perspective'
  position: Vector3
  target: Vector3
  fov?: number // for perspective
  zoom?: number // for orthographic
}
```

**Key methods:**
- `transitionToConversation(minionPosition: Vector3, duration: number)` - Animate to conversation view
- `transitionToIsometric(duration: number)` - Return to default isometric
- `update(deltaTime: number)` - Called each frame for smooth interpolation
- `setTarget(position: Vector3)` - For switching between minions

**Implementation details:**
- Use `THREE.MathUtils.lerp` for smooth position/rotation interpolation
- Calculate optimal camera position: minion on right third, wizard on left third
- Eye-level means camera Y approximately matches minion head height
- Camera looks at midpoint between wizard and minion

### 1.2 Spring-Arm Collision System (`src/lib/camera/SpringArm.ts`)

Medium-complexity camera collision avoidance:

```typescript
interface SpringArmConfig {
  idealDistance: number      // Desired distance from target
  minDistance: number        // Closest allowed
  maxDistance: number        // Furthest allowed
  collisionRadius: number    // Sphere radius for collision checks
  smoothSpeed: number        // How fast to adjust (lerp factor)
}
```

**Algorithm:**
1. Calculate ideal camera position based on conversation framing
2. Cast ray from target (midpoint) toward ideal camera position
3. If ray hits obstacle (cottage walls, terrain), calculate intersection point
4. Pull camera position back to just before obstacle + offset
5. Smoothly interpolate actual position toward safe position
6. Use multiple rays (cone pattern) for more robust detection

**Collision sources:**
- Cottage walls from `RoomMeshBuilder`
- Terrain from `ContinuousTerrainBuilder`
- Any future obstacles

### 1.3 Orthographic ↔ Perspective Transition

**Challenge:** These are fundamentally different projection types.

**Solution:** Cross-fade approach:
1. Calculate equivalent frustum sizes so scene appears same size
2. Create both cameras, only one active at a time
3. During transition:
   - Render scene to texture with old camera (fading out)
   - Render scene with new camera (fading in)
   - Blend with opacity
4. Or simpler: instant switch at midpoint of position animation (when camera is moving, switch is less jarring)

**Simpler alternative:** Just use perspective camera always, but zoom out far for "isometric feel" during normal gameplay. This avoids the projection switch complexity.

**Recommendation:** Go with instant switch at animation midpoint - simpler and works well in practice.

---

## Phase 2: Conversation Mode State

### 2.1 Extend Game Store (`src/store/gameStore.ts`)

Add conversation state:

```typescript
interface ConversationState {
  active: boolean
  minionId: string | null
  wizardPosition: Vector3 | null
  phase: 'entering' | 'active' | 'exiting' | null
}

// New store properties
conversationState: ConversationState
enterConversation: (minionId: string) => void
exitConversation: () => void
transitionToMinion: (minionId: string) => void // smooth switch
```

### 2.2 New Minion State: `'conversing'`

Update `src/types/game.ts`:

```typescript
type MinionState = 'idle' | 'traveling' | 'working' | 'stuck' | 'returning' | 'conversing'
```

When in `'conversing'` state:
- Minion stops all movement
- Faces toward wizard (calculated rotation)
- Plays idle animation with occasional expression changes
- Quest progress paused (not abandoned)

---

## Phase 3: Wizard Teleportation System

### 3.1 Teleport Effect (`src/lib/effects/TeleportEffect.ts`)

Visual flourish for wizard teleportation:

**Disappear effect (at origin):**
- Particle burst (sparkles/magic dust)
- Brief scale down (0.3s)
- Fade to transparent
- Optional: leave behind fading "afterimage"

**Appear effect (at destination):**
- Reverse of disappear
- Magic circle on ground (brief glow)
- Scale up from small
- Particles coalesce inward

**Implementation:**
- Use `THREE.Points` with custom shader for particles
- Animate via uniforms in shader
- Pool and reuse particle systems for performance

### 3.2 Wizard Positioning Logic

Calculate wizard position for conversation:

```typescript
function calculateWizardConversationPosition(
  minionPosition: Vector3,
  cameraPosition: Vector3
): { position: Vector3; rotation: Euler } {
  // Wizard should be:
  // - To the left of minion from camera's perspective
  // - Facing minion (back to camera)
  // - At appropriate conversation distance (2-3 units)

  const cameraToMinion = minionPosition.clone().sub(cameraPosition).normalize()
  const leftOffset = new Vector3().crossVectors(cameraToMinion, UP).normalize()
  const wizardPos = minionPosition.clone().add(leftOffset.multiplyScalar(-2.5))

  // Rotation: face the minion
  const wizardRotation = // calculate to face minion

  return { position: wizardPos, rotation: wizardRotation }
}
```

---

## Phase 4: Minion Reaction System

### 4.1 Reaction Types & Animations

Based on minion personality, react to wizard arrival:

| Personality | Reaction | Animation |
|------------|----------|-----------|
| Friendly/Excitable | Excited | Wave hands, bounce, happy expression |
| Cautious/Nervous | Surprised | Jump back slightly, wide eyes, exclamation |
| Grumpy/Independent | Annoyed | Furrowed brows, arms crossed pose, huff |

### 4.2 Emoji-Style Indicators (`src/components/ReactionIndicator.tsx`)

Floating indicators above minion head:

**Types:**
- `!` - Exclamation (surprised)
- `?` - Confused
- `♥` or `//` - Blushing (embarrassed/flattered)
- `💢` - Annoyed (anger mark)
- `✨` - Happy/excited sparkles
- `...` - Thinking/processing

**Implementation:**
- Billboard sprite that always faces camera
- Animate: pop in with scale bounce, float up slightly, fade out
- Use `THREE.Sprite` with canvas texture or pre-made PNG atlas
- Position: `minionHead.y + 0.5` units above

### 4.3 Expression System Enhancement

Extend existing `ExpressionUpdater` in animator:

Current expressions: `'neutral' | 'happy' | 'mischievous' | 'worried' | 'surprised'`

**Add:**
- `'annoyed'` - Furrowed brows, narrowed eyes
- `'excited'` - Wide eyes, bouncy

**Body language additions:**
- Arms crossed pose (annoyed)
- Waving animation (excited)
- Jump-back startle (surprised)

These can be triggered via `animator.playReaction('surprised')` which:
1. Shows indicator above head
2. Plays one-shot body animation
3. Sets expression
4. Returns to idle after duration

---

## Phase 5: Conversation UI

### 5.1 Speech Bubble Component (`src/components/ui/SpeechBubble.tsx`)

Classic RPG-style speech bubble:

```typescript
interface SpeechBubbleProps {
  speaker: 'minion' | 'wizard'
  text: string
  position: 'left' | 'right' // screen position
  onComplete?: () => void // for typewriter effect completion
}
```

**Features:**
- Rounded rectangle with tail pointing to speaker
- Typewriter text animation
- Support for simple formatting (bold, italic)
- Auto-size based on content
- Positioned via CSS, not 3D (overlay)

### 5.2 Conversation Panel (`src/components/ui/ConversationPanel.tsx`)

Container for conversation UI:

```typescript
interface ConversationPanelProps {
  minionId: string
  onLeave: () => void
}
```

**Layout:**
- Bottom of screen (classic RPG style)
- Speaker name/portrait on left
- Speech bubble in center
- "Leave Conversation" button (styled as old-school RPG menu option)

**Style inspiration:** Classic JRPGs like Final Fantasy, Dragon Quest
- Decorative border/frame
- Semi-transparent background
- Pixel-ish or fantasy font

### 5.3 Leave Conversation Button

Old-school text RPG style:

```
┌─────────────────────┐
│  ▶ Leave Convo      │
└─────────────────────┘
```

- Appears as menu option in conversation panel
- Hover state: arrow indicator, highlight
- Click triggers `exitConversation()` in store
- Keyboard shortcut: Escape

---

## Phase 6: Wizard Wandering Behavior

### 6.1 Wizard State Machine

After conversation, wizard returns to wandering:

```typescript
type WizardState = 'idle' | 'wandering' | 'teleporting' | 'conversing'

interface WizardBehavior {
  state: WizardState
  currentTarget: Vector3 | null
  wanderRadius: number      // How far from cottage
  idleDuration: [min, max]  // Random idle time
  wanderSpeed: number
}
```

**Wandering algorithm:**
1. Pick random point within wanderRadius of cottage
2. Ensure point is walkable (terrain height check, not inside building)
3. Walk to point with walking animation
4. Idle for random duration
5. Repeat

### 6.2 Integration with Conversation

- When conversation starts: interrupt wandering, teleport to position
- When conversation ends: teleport back near cottage, resume wandering
- Wizard should feel "alive" when not in conversation

---

## Phase 7: Smooth Transitions

### 7.1 Minion-to-Minion Transition

When clicking different minion during active conversation:

1. Fade out current speech bubble
2. Animate camera to new minion position (spring-arm handles obstacles)
3. Wizard teleports to new position (with effect)
4. New minion reacts based on personality
5. Fade in new conversation UI

**Duration:** ~1.5 seconds total

### 7.2 Enter Conversation Sequence

Timeline when clicking minion:

| Time | Event |
|------|-------|
| 0.0s | Click detected, minion state → 'conversing' |
| 0.0s | Camera begins transition (ortho → perspective at 0.3s) |
| 0.3s | Wizard teleport effect starts at origin |
| 0.5s | Wizard appears at conversation position |
| 0.6s | Minion plays reaction animation |
| 0.8s | Camera arrives at final position |
| 1.0s | Conversation UI fades in |

### 7.3 Exit Conversation Sequence

| Time | Event |
|------|-------|
| 0.0s | "Leave Convo" clicked |
| 0.0s | Conversation UI fades out |
| 0.2s | Wizard teleport effect (disappear) |
| 0.4s | Wizard appears near cottage |
| 0.4s | Camera begins return transition |
| 0.7s | Camera switches perspective → ortho |
| 1.0s | Camera arrives at isometric view |
| 1.0s | Minion state returns to previous (idle/traveling) |

---

## File Structure

New files to create:

```
src/
├── lib/
│   ├── camera/
│   │   ├── CameraController.ts    # Main camera state machine
│   │   ├── SpringArm.ts           # Collision avoidance
│   │   └── transitions.ts         # Easing functions, interpolation
│   ├── effects/
│   │   └── TeleportEffect.ts      # Wizard teleport particles
│   └── wizard/
│       └── WizardBehavior.ts      # Wandering AI
├── components/
│   ├── ReactionIndicator.tsx      # Emoji indicators (!, ?, ♥)
│   └── ui/
│       ├── SpeechBubble.tsx       # Speech bubble component
│       └── ConversationPanel.tsx  # Full conversation UI
```

Files to modify:

```
src/
├── components/
│   ├── SimpleScene.tsx            # Integrate camera controller, handle clicks
│   └── MinionEntity.tsx           # Add reaction animations
├── store/
│   └── gameStore.ts               # Add conversation state
├── types/
│   └── game.ts                    # Add 'conversing' state
└── lib/
    └── minion/
        └── animation/
            └── core.ts            # Add reaction animations
```

---

## Implementation Order

1. **Camera Controller & Spring Arm** - Foundation for everything else
2. **Conversation State in Store** - Enable the mode toggle
3. **Basic Enter/Exit Flow** - Click minion → camera moves → click leave → return
4. **Wizard Teleportation** - Position calculation + visual effect
5. **Minion Reactions** - Indicators + expressions + body animations
6. **Conversation UI** - Speech bubble + panel + leave button
7. **Wizard Wandering** - Post-conversation behavior
8. **Polish** - Smooth transitions, timing tweaks, edge cases

---

## Technical Considerations

### Performance
- Particle systems pooled and reused
- Camera collision raycasts limited to nearby objects
- UI components use React.memo where appropriate

### Edge Cases
- Minion clicked while inside cottage (camera must not go through roof)
- Minion clicked at edge of map (camera bounds)
- Multiple rapid clicks (debounce or queue)
- Minion on quest clicked (pause quest, don't cancel)

### Testing
- Manual testing of camera transitions in various positions
- Test collision avoidance around cottage from all angles
- Test minion-to-minion transitions
- Test enter/exit during various minion states

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Camera type during conversation? | Perspective (switch from ortho) |
| UI style? | Speech bubble + emoji reactions |
| Expression system? | Body + eyes (Mii-style), no mouth |
| Wizard teleport effect? | Instant snap with particle flourish |
| Minion reaction? | Based on personality (surprised/annoyed/excited) |
| Camera collision? | Medium - spring-arm style |
| Exit method? | "Leave convo" button (old-school RPG) |
| Multiple minion handling? | Smooth transition |
| Post-conversation wizard? | Wanders around town |

---

## Implementation Status

### Completed Features
- [x] **CameraController** - Manages ortho↔perspective camera transitions with smooth interpolation
- [x] **SpringArm** - Collision avoidance using multi-ray casting
- [x] **Conversation State** - Zustand store with `enterConversation`, `exitConversation`, `transitionToMinion`
- [x] **Conversation UI** - RPG-style panel with "Leave Conversation" button, Escape key support
- [x] **Teleport Effects** - Particle burst with magic circle for wizard teleportation
- [x] **Reaction Indicators** - Floating emoji-style indicators (!, anger mark, wave) based on personality
- [x] **Wizard Wandering** - Autonomous wandering behavior when not in conversation

### New Files Created
- `src/lib/camera/CameraController.ts`
- `src/lib/camera/SpringArm.ts`
- `src/lib/effects/TeleportEffect.ts`
- `src/lib/effects/ReactionIndicator.ts`
- `src/lib/wizard/WizardBehavior.ts`
- `src/components/ui/ConversationPanel.tsx`

### Modified Files
- `src/types/game.ts` - Added `conversing` state, `ConversationState` interface
- `src/store/gameStore.ts` - Added conversation actions
- `src/components/SimpleScene.tsx` - Integrated all systems
- `src/components/GameLayout.tsx` - Added ConversationPanel, hides UI during conversation
- `src/components/MinionEntity.tsx` - Added `conversing` color
