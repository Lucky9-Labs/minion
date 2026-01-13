# Isometric Cute Character Animation

This skill covers creating cute, low-poly animated characters in Three.js with the isometric style used in this project.

## Design Principles

### Low-Poly Aesthetic
- Use `flatShading: true` on all MeshStandardMaterial
- Geometry segments: 4-8 for simple shapes (spheres, cylinders, cones)
- Box geometry for blocky elements
- Capsule/Cylinder geometry for limbs

### Proportions (Cute Character Style)
- **Big head**: 1.3-1.5x normal scale
- **Short body**: 0.6-0.8x normal height
- **Stubby legs**: 0.5-0.7x normal length
- **Floating hands**: Detached orb hands that hover independently

### Scale Factor
```typescript
const MINION_SCALE = 2.5; // Base scale for all geometry
```

## Floating Hands System

Floating hands are key to the cute aesthetic. They are children of the root group (not body) for independent animation.

### Hand Structure
```typescript
function buildFloatingHand(material: THREE.MeshStandardMaterial, side: 'left' | 'right', scale: number): THREE.Group {
  const hand = new THREE.Group();
  const xOffset = side === 'left' ? 0.5 : -0.5;

  // Position floating near body
  hand.position.set(xOffset * scale, 0.8 * scale, 0.08 * scale);

  // Simple orb hand (low poly)
  const handGeo = new THREE.SphereGeometry(0.1 * scale, 5, 4);
  const handMesh = new THREE.Mesh(handGeo, material);
  handMesh.castShadow = true;
  hand.add(handMesh);

  // Tool attachment point at center
  const toolAttach = new THREE.Group();
  toolAttach.name = `${side}_tool_attach`;
  hand.add(toolAttach);

  return hand;
}
```

### Floating Hand Animation
```typescript
// Idle: independent gentle bob with circular drift
const bobPhase = elapsedTime * handBobSpeed + bobOffset;
const leftBob = Math.sin(bobPhase) * handBobAmount;
const rightBob = Math.sin(bobPhase + Math.PI * 0.3) * handBobAmount;

// Different phase for variety
const driftX = Math.sin(elapsedTime * 0.5 + bobOffset) * 0.03;
const driftZ = Math.cos(elapsedTime * 0.7 + bobOffset) * 0.02;

hand.position.x = baseX + driftX;
hand.position.y = baseY + bob;
hand.position.z = baseZ + driftZ;

// Walking: sync with body rhythm
if (isMoving) {
  const walkCycle = animTime * 8;
  const walkSwing = Math.sin(walkCycle);
  hand.position.z = baseZ + walkSwing * 0.06;
  hand.position.y = baseY + Math.abs(walkSwing) * 0.03;
}
```

## Eye Animation System

### Eye Structure
- Eye white: `SphereGeometry(0.055 * scale, 6, 5)`
- Pupil: `SphereGeometry(0.03 * scale, 5, 4)` inside a Group for movement
- Eye shine: `SphereGeometry(0.008 * scale, 4, 3)` with white BasicMaterial
- Eyelid: Half sphere using `SphereGeometry(0.055 * scale, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2)`

### Blink Animation (Critical for Cute Feel)
```typescript
// Timer-based blink trigger (every 3-5 seconds)
blinkTimer += deltaTime;
if (blinkTimer > 3 + Math.random() * 2 && !isBlinking) {
  isBlinking = true;
  blinkTimer = 0;
  setTimeout(() => { isBlinking = false; }, 150); // 150ms blink duration
}

// Smooth eyelid scale animation
const targetScale = isBlinking ? 1 : 0.1;
eyelid.scale.y = THREE.MathUtils.lerp(eyelid.scale.y, targetScale, 0.3);
```

### Pupil Look-Around
```typescript
// Gentle wandering eye movement
const lookX = Math.sin(elapsedTime * 0.5 + bobOffset) * 0.02;
const lookY = Math.cos(elapsedTime * 0.7 + bobOffset) * 0.01;
leftPupil.position.x = lookX * scale;
leftPupil.position.y = 0.02 * scale + lookY * scale;
```

## Expression System

### Expression Configurations
```typescript
const EXPRESSIONS = {
  neutral:     { eyebrowAngle: 0.1,  mouthScaleX: 1,   mouthScaleY: 0.5, mouthRotation: 0,    showTeeth: false },
  happy:       { eyebrowAngle: 0.15, mouthScaleX: 1.2, mouthScaleY: 0.8, mouthRotation: 0,    showTeeth: false },
  mischievous: { eyebrowAngle: 0.35, mouthScaleX: 0.8, mouthScaleY: 0.6, mouthRotation: 0.25, showTeeth: true  },
  worried:     { eyebrowAngle: -0.3, mouthScaleX: 0.6, mouthScaleY: 0.4, mouthRotation: 0,    showTeeth: false },
  surprised:   { eyebrowAngle: 0.4,  mouthScaleX: 0.5, mouthScaleY: 1.0, mouthRotation: 0,    showTeeth: false },
};
```

### Expression Animation
```typescript
// Eyebrow rotation (mirrored for left/right)
leftEyebrow.rotation.z = THREE.MathUtils.lerp(leftEyebrow.rotation.z, -config.eyebrowAngle, 0.1);
rightEyebrow.rotation.z = THREE.MathUtils.lerp(rightEyebrow.rotation.z, config.eyebrowAngle, 0.1);

// Mouth scale and rotation
mouth.scale.x = THREE.MathUtils.lerp(mouth.scale.x, config.mouthScaleX, 0.1);
mouth.scale.y = THREE.MathUtils.lerp(mouth.scale.y, config.mouthScaleY, 0.1);
mouth.rotation.z = THREE.MathUtils.lerp(mouth.rotation.z, config.mouthRotation, 0.1);

// Teeth visibility
teeth.visible = config.showTeeth;
```

## Springy Locomotion

### Walk Animation (Key to Charm)
```typescript
const walkCycle = animTime * 8; // Speed of walk cycle
const bounce = Math.abs(Math.sin(walkCycle)) * 0.15; // Body bounce

// Body lean and sway
body.rotation.z = Math.sin(walkCycle) * 0.08;      // Side-to-side sway
body.rotation.x = 0.08;                            // Forward lean

// Leg swing (alternating)
leftLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
rightLeg.rotation.x = Math.sin(walkCycle) * 0.5;

// Head bob
head.rotation.z = Math.sin(walkCycle * 0.5) * 0.05;

// Apply bounce to Y position
mesh.position.y = baseY + bounce;
```

### Idle Animation (Breathing Feel)
```typescript
const idleBob = Math.sin(animTime * 1.5) * 0.05; // Gentle up/down

// Subtle body sway
body.rotation.z = Math.sin(animTime * 0.8) * 0.02;
body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, 0.1); // Return to neutral

mesh.position.y = baseY + idleBob;
```

## Material Setup

```typescript
function createMaterials(colors: ColorPalette): SpeciesMaterials {
  return {
    primary: new THREE.MeshStandardMaterial({
      color: colors.primary,
      roughness: 0.7,
      flatShading: true,
    }),
    secondary: new THREE.MeshStandardMaterial({
      color: colors.secondary,
      roughness: 0.7,
      flatShading: true,
    }),
    eyeWhite: new THREE.MeshStandardMaterial({
      color: colors.eyeWhite,
      roughness: 0.3,
      flatShading: true,
    }),
    pupil: new THREE.MeshBasicMaterial({ color: colors.pupil }),
    mouth: new THREE.MeshBasicMaterial({
      color: colors.mouth,
      side: THREE.DoubleSide,
    }),
  };
}
```

## Attachment Points (for Gear)

```typescript
function createAttachmentPoints(head, body, leftHand, rightHand, scale) {
  const attachments = new Map<AttachmentPoint, THREE.Group>();

  // Head top (helmets, hats)
  const headTop = new THREE.Group();
  headTop.position.set(0, 0.2 * scale, 0);
  head.add(headTop);
  attachments.set('head_top', headTop);

  // Back (backpacks, capes)
  const back = new THREE.Group();
  back.position.set(0, 0.3 * scale, -0.15 * scale);
  body.add(back);
  attachments.set('back', back);

  // Hands (for tools)
  attachments.set('left_hand', leftHand.getObjectByName('left_tool_attach'));
  attachments.set('right_hand', rightHand.getObjectByName('right_tool_attach'));

  return attachments;
}
```

## Animation Updater Pattern

Use a modular updater pattern for composable animations:

```typescript
interface AnimationUpdater {
  update(ctx: AnimationContext): void;
}

interface AnimationContext {
  refs: MinionRefs;
  state: AnimationState;
  modifiers: AnimationModifiers;
  limbType: LimbType;
  features: SpeciesFeatures;
  deltaTime: number;
  elapsedTime: number;
}

class MinionAnimator {
  private updaters: AnimationUpdater[] = [];

  constructor(refs, limbType, features, modifiers) {
    this.updaters = [
      new BlinkingUpdater(),
      new PupilUpdater(),
      new ExpressionUpdater(),
      new EarUpdater(),
      new TailUpdater(),
      new LocomotionUpdater(),
      new HandUpdater(),
    ];
  }

  update(deltaTime, elapsedTime, isMoving) {
    for (const updater of this.updaters) {
      updater.update(ctx);
    }
  }
}
```

## Species-Specific Features

Different species can have different limb types:
- `floatingHand`: Independent hovering orb hands (goblin, gnome, squirrel)
- `fin`: Attached flippers that flap (penguin)
- `wing`: Flying wing motion (future: fairy, bat)
- `bone`: Floating but rigid skeleton hands

Each limb type has its own animation behavior in the HandUpdater.

## Color Palette Example (Goblin)

```typescript
const GOBLIN_COLORS = {
  primary: 0x5a9c4e,      // Green skin
  secondary: 0x4a8340,    // Darker green
  tertiary: 0x6eb85e,     // Lighter green
  eyeWhite: 0xe8e8d0,
  pupil: 0x1a1a1a,
  mouth: 0x2d4a28,
  clothing: {
    main: 0x5c4a3d,       // Brown overalls
    accent: 0x6b5a4d,     // Strap color
    buckle: 0xc9a227,     // Gold buckle
  },
};
```
