# Implementation Plan: Wizard Flight Mode

## Summary

Enable flight for the wizard with double-tap Space to toggle floating. While floating, the wizard moves significantly slower than walking, hovers slightly above ground (~0.5-1 unit), and displays a magical particle trail effect. Flight ends when touching the ground.

## User Requirements

- **Activation**: Double-tap Space bar to start floating
- **Vertical Control**: Space to ascend, Ctrl to descend
- **Exit**: Touching the ground automatically exits flight mode
- **Float Height**: Slight hover (~0.5-1 unit above terrain)
- **Movement Speed**: Much slower than walking (intentional)
- **Visual Feedback**: Particle trail/glow effect while flying

---

## Architecture Overview

### New Files
1. `src/lib/effects/FlightEffect.ts` - Particle trail effect for flight mode

### Modified Files
1. `src/lib/camera/FirstPersonController.ts` - Add flight state, vertical movement, slower speed
2. `src/components/SimpleScene.tsx` - Add double-tap detection, integrate flight effect

---

## Implementation Details

### 1. Extend FirstPersonController for Flight

**File**: `src/lib/camera/FirstPersonController.ts`

#### 1.1 Add Flight Configuration

Add to `FirstPersonConfig` interface:
```typescript
flightSpeedMultiplier: number;  // Speed reduction while flying (e.g., 0.3)
flightAscendSpeed: number;      // Vertical ascend speed (units/sec)
flightDescendSpeed: number;     // Vertical descend speed (units/sec)
flightHoverHeight: number;      // Minimum hover height above ground
```

Default values:
```typescript
flightSpeedMultiplier: 0.3,     // 30% of normal speed
flightAscendSpeed: 2.5,
flightDescendSpeed: 3.0,
flightHoverHeight: 0.75,        // ~0.75 units above ground
```

#### 1.2 Add Flight State

Add to class properties:
```typescript
private isFlying: boolean = false;
private flightVerticalVelocity: number = 0;
```

Add to `InputState`:
```typescript
ascend: boolean;   // Space key while flying
descend: boolean;  // Ctrl key while flying
```

#### 1.3 Add Key Bindings for Flight

Extend `KEY_BINDINGS`:
```typescript
ascend: ['Space'],
descend: ['ControlLeft', 'ControlRight'],
```

Update `handleKeyDown` and `handleKeyUp` to track ascend/descend keys.

#### 1.4 Modify Movement Speed Calculation

In the `update()` method, adjust speed based on flight state:
```typescript
const baseSpeed = this.keys.sprint
  ? this.config.moveSpeed * this.config.sprintMultiplier
  : this.config.moveSpeed;

const speed = this.isFlying
  ? baseSpeed * this.config.flightSpeedMultiplier
  : baseSpeed;
```

#### 1.5 Add Vertical Movement Logic

In the `update()` method, handle vertical velocity when flying:
```typescript
if (this.isFlying) {
  // Apply vertical input
  if (this.keys.ascend) {
    this.flightVerticalVelocity = this.config.flightAscendSpeed;
  } else if (this.keys.descend) {
    this.flightVerticalVelocity = -this.config.flightDescendSpeed;
  } else {
    // Gentle hover deceleration
    this.flightVerticalVelocity *= 0.9;
  }

  newPosition.y += this.flightVerticalVelocity * deltaTime;

  // Check ground collision for exit
  const groundHeight = heightProvider?.getHeightAt(newPosition.x, newPosition.z) ?? 0;
  const minFlightHeight = groundHeight + this.config.eyeHeight + this.config.flightHoverHeight;

  if (newPosition.y <= minFlightHeight && this.flightVerticalVelocity <= 0) {
    // Landing - exit flight mode
    this.isFlying = false;
    this.flightVerticalVelocity = 0;
    newPosition.y = groundHeight + this.config.eyeHeight;
  }
}
```

#### 1.6 Add Public Flight API

```typescript
startFlight(): void {
  if (!this.isFlying) {
    this.isFlying = true;
    this.flightVerticalVelocity = this.config.flightAscendSpeed * 0.5; // Initial lift
  }
}

stopFlight(): void {
  this.isFlying = false;
  this.flightVerticalVelocity = 0;
}

getIsFlying(): boolean {
  return this.isFlying;
}
```

#### 1.7 Disable View Bob While Flying

Modify view bob calculation:
```typescript
if (!this.isFlying) {
  this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, currentSpeed > 0.5 ? 1 : 0, deltaTime * 8);
  this.bobPhase += deltaTime * currentSpeed * 2.5;
} else {
  // Smooth floating motion instead of bob
  this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0, deltaTime * 4);
}
```

---

### 2. Create Flight Effect

**File**: `src/lib/effects/FlightEffect.ts`

Create a persistent particle effect that follows the wizard while flying:

```typescript
interface FlightEffectConfig {
  particleCount: number;        // Number of trailing particles
  particleSize: number;
  primaryColor: THREE.ColorRepresentation;
  secondaryColor: THREE.ColorRepresentation;
  trailLength: number;          // How far particles trail behind
  emissionRate: number;         // Particles per second
}

const DEFAULT_FLIGHT_CONFIG: FlightEffectConfig = {
  particleCount: 30,
  particleSize: 0.06,
  primaryColor: 0x66ccff,       // Light blue/cyan magic
  secondaryColor: 0xffffff,     // White sparkles
  trailLength: 1.5,
  emissionRate: 15,
};
```

#### Effect Behavior:
- Particles emit from below the wizard's feet
- Trail downward and fade out
- Gentle swirl/spiral motion
- Continuous while flying (not one-shot like teleport)
- Includes a subtle glow ring beneath the wizard

#### Key Methods:
```typescript
class FlightEffect {
  start(): void           // Begin emitting particles
  stop(): void            // Stop emitting, let existing particles fade
  update(deltaTime: number, wizardPosition: THREE.Vector3): void
  getGroup(): THREE.Group
  isActive(): boolean
  dispose(): void
}
```

---

### 3. Integrate Double-Tap Detection

**File**: `src/components/SimpleScene.tsx`

#### 3.1 Add Double-Tap State

```typescript
const lastSpacePress = useRef<number>(0);
const DOUBLE_TAP_THRESHOLD = 300; // milliseconds
```

#### 3.2 Modify Key Handler

In the keyboard event handler, detect double-tap Space:
```typescript
if (event.code === 'Space' && isFirstPerson) {
  const now = Date.now();
  const timeSinceLastPress = now - lastSpacePress.current;

  if (timeSinceLastPress < DOUBLE_TAP_THRESHOLD) {
    // Double-tap detected - toggle flight
    if (firstPersonRef.current?.getIsFlying()) {
      // Already flying - do nothing, let gravity/ground handle exit
    } else {
      firstPersonRef.current?.startFlight();
      flightEffectRef.current?.start();
    }
    lastSpacePress.current = 0; // Reset to prevent triple-tap
  } else {
    lastSpacePress.current = now;
  }
}
```

#### 3.3 Add Flight Effect Instance

```typescript
const flightEffectRef = useRef<FlightEffect | null>(null);

// In scene setup:
flightEffectRef.current = new FlightEffect();
scene.add(flightEffectRef.current.getGroup());

// In animation loop:
if (firstPersonRef.current?.getIsFlying()) {
  const wizardPos = firstPersonRef.current.getGroundPosition();
  flightEffectRef.current?.update(deltaTime, wizardPos);
} else if (flightEffectRef.current?.isActive()) {
  // Still fading out
  flightEffectRef.current?.update(deltaTime, wizardPos);
}
```

#### 3.4 Handle Flight End

When `FirstPersonController.getIsFlying()` transitions from true to false:
```typescript
// In update loop, detect flight end
const wasFlying = prevFlyingRef.current;
const isFlying = firstPersonRef.current?.getIsFlying() ?? false;

if (wasFlying && !isFlying) {
  flightEffectRef.current?.stop();
}

prevFlyingRef.current = isFlying;
```

---

## Testing Checklist

1. **Double-tap activation**
   - [ ] Double-tap Space within 300ms starts flight
   - [ ] Single Space tap does nothing (no accidental activation)
   - [ ] Triple-tap doesn't cause issues

2. **Flight movement**
   - [ ] Horizontal movement is ~30% of walking speed
   - [ ] Sprint while flying also applies speed reduction
   - [ ] Space (held) causes ascent
   - [ ] Ctrl (held) causes descent
   - [ ] Mouse look still works normally

3. **Flight exit**
   - [ ] Descending to ground automatically exits flight
   - [ ] Position snaps correctly to terrain height
   - [ ] No "stuck floating" bugs

4. **Visual effect**
   - [ ] Particles emit continuously while flying
   - [ ] Particles trail properly behind wizard
   - [ ] Effect stops gracefully when landing
   - [ ] No performance issues with particles

5. **Edge cases**
   - [ ] Tab to exit first-person while flying resets state
   - [ ] Flying over different terrain heights works
   - [ ] Collision with buildings while flying handled properly

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/lib/camera/FirstPersonController.ts` | Add flight state, vertical movement, speed multiplier, public API |
| `src/lib/effects/FlightEffect.ts` | **NEW** - Particle trail effect for flight |
| `src/components/SimpleScene.tsx` | Double-tap detection, flight effect integration |

---

## Dependencies

- Existing `TeleportEffect.ts` pattern for particle system reference
- THREE.js particle/mesh system (already in use)
- No new npm dependencies required
