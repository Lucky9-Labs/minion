// ============================================================
// MINION SYSTEM TYPE DEFINITIONS
// ============================================================

import * as THREE from 'three';

// ============================================================
// SPECIES TYPES
// ============================================================

export type MinionSpeciesId = 'goblin' | 'penguin' | 'mushroom' | 'gnome' | 'squirrel' | 'skeleton' | 'wizard' | 'witch';

// Color palette structure shared by all species
export interface SpeciesColorPalette {
  // Body colors
  primary: number;        // Main body/skin color
  secondary: number;      // Secondary/darker shade
  tertiary: number;       // Lighter accent

  // Face colors
  eyeWhite: number;
  pupil: number;
  mouth: number;

  // Clothing colors (optional - some species may not have)
  clothing?: {
    main: number;
    accent: number;
    buckle: number;
  };
}

// Limb configuration varies by species
export type LimbType = 'floatingHand' | 'fin' | 'wing' | 'bone';
export type FootType = 'foot' | 'webbed' | 'paw' | 'bone';

export interface SpeciesProportions {
  headScale: number;      // Big head = 1.3+
  bodyHeight: number;     // Short body = 0.6-0.8
  legLength: number;      // Stubby legs = 0.5-0.7
}

export interface SpeciesFeatures {
  hasEars: boolean;
  earStyle?: 'pointed' | 'round' | 'none';
  hasNose: boolean;
  noseStyle?: 'bulbous' | 'beak' | 'snout' | 'button' | 'none';
  hasTail: boolean;
  tailStyle?: 'bushy' | 'thin' | 'none';
  hasEyebrows: boolean;
  hasTeeth: boolean;
  teethStyle?: 'goblin' | 'buck' | 'skull' | 'none';
}

export interface SpeciesConfig {
  id: MinionSpeciesId;
  name: string;
  proportions: SpeciesProportions;
  limbType: LimbType;
  footType: FootType;
  features: SpeciesFeatures;
  colors: SpeciesColorPalette;
}

// ============================================================
// ATTACHMENT POINTS & GEAR
// ============================================================

export type AttachmentPoint =
  | 'head_top'      // For helmets, hats
  | 'head_face'     // For masks, goggles (should show face through)
  | 'back'          // For backpacks, capes
  | 'left_hand'     // For tools, weapons
  | 'right_hand';   // For tools, shields

export type GearSlot = 'helmet' | 'backpack' | 'leftTool' | 'rightTool';

export interface GearItemConfig {
  id: string;
  name: string;
  slot: GearSlot;
  attachmentPoint: AttachmentPoint;
  // Function to create the 3D mesh
  createMesh: () => THREE.Group;
  // Some gear (like helmets) should still show face
  showFaceThrough?: boolean;
  // Animation overrides when equipped
  animationModifiers?: Partial<AnimationModifiers>;
}

export interface GearInstance {
  config: GearItemConfig;
  mesh: THREE.Group;
  attachedTo: THREE.Group | null;
}

// ============================================================
// REF STRUCTURE
// ============================================================

// Species-specific refs (optional, varies by species)
export interface SpeciesSpecificRefs {
  // Goblin/Gnome ears
  leftEar?: THREE.Group;
  rightEar?: THREE.Group;

  // Expression features
  leftEyebrow?: THREE.Mesh;
  rightEyebrow?: THREE.Mesh;
  teeth?: THREE.Group;

  // Penguin-specific
  beak?: THREE.Group;

  // Squirrel-specific
  tail?: THREE.Group;

  // Gnome-specific
  beard?: THREE.Group;
  hat?: THREE.Group;

  // Skeleton-specific
  jaw?: THREE.Group;

  // Mage/Wizard/Witch-specific
  staff?: THREE.Group;
  robe?: THREE.Group;
}

// Core refs shared by ALL species (required for animation system)
export interface MinionRefs {
  // Root groups
  root: THREE.Group;           // Top-level minion group
  body: THREE.Group;           // Body group (torso + legs)
  head: THREE.Group;           // Head group (includes face)

  // Locomotion (always present, animation system needs these)
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;

  // Upper body (type varies by species, but group always exists)
  leftHand: THREE.Group;       // Contains hand OR fin OR wing
  rightHand: THREE.Group;      // Contains hand OR fin OR wing

  // Facial animation (required for expression system)
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  leftPupil: THREE.Group;
  rightPupil: THREE.Group;
  mouth: THREE.Mesh;

  // Gear attachment points (groups where gear gets added)
  attachments: Map<AttachmentPoint, THREE.Group>;

  // Species-specific refs
  species: SpeciesSpecificRefs;
}

// ============================================================
// ANIMATION TYPES
// ============================================================

export type Expression = 'neutral' | 'happy' | 'mischievous' | 'worried' | 'surprised';

export interface AnimationState {
  isMoving: boolean;
  expression: Expression;
  isBlinking: boolean;
  animTime: number;
  bobOffset: number;          // Random offset for varied timing
  blinkTimer: number;
  expressionTimer: number;
}

export interface AnimationModifiers {
  walkSpeed: number;          // Multiplier for walk cycle
  bounceAmount: number;       // Multiplier for body bounce
  armSwingAmount: number;     // How much arms swing (for species with arms)
  handBobSpeed: number;       // For floating hands
  handBobAmount: number;      // Floating hand bob distance
  legSwingAmount: number;     // How much legs swing
}

export interface AnimationContext {
  refs: MinionRefs;
  state: AnimationState;
  modifiers: AnimationModifiers;
  limbType: LimbType;
  features: SpeciesFeatures;
  deltaTime: number;
  elapsedTime: number;
}

export interface AnimationUpdater {
  update(ctx: AnimationContext): void;
}

// ============================================================
// EXPRESSION CONFIGS
// ============================================================

export interface ExpressionConfig {
  eyebrowAngle: number;
  mouthScaleX: number;
  mouthScaleY: number;
  mouthRotation: number;
  showTeeth: boolean;
}

export const EXPRESSION_CONFIGS: Record<Expression, ExpressionConfig> = {
  neutral: { eyebrowAngle: 0.1, mouthScaleX: 1, mouthScaleY: 0.5, mouthRotation: 0, showTeeth: false },
  happy: { eyebrowAngle: 0.15, mouthScaleX: 1.2, mouthScaleY: 0.8, mouthRotation: 0, showTeeth: false },
  mischievous: { eyebrowAngle: 0.35, mouthScaleX: 0.8, mouthScaleY: 0.6, mouthRotation: 0.25, showTeeth: true },
  worried: { eyebrowAngle: -0.3, mouthScaleX: 0.6, mouthScaleY: 0.4, mouthRotation: 0, showTeeth: false },
  surprised: { eyebrowAngle: 0.4, mouthScaleX: 0.5, mouthScaleY: 1.0, mouthRotation: 0, showTeeth: false },
};

// ============================================================
// FACTORY OUTPUT
// ============================================================

export interface MinionInstance {
  id: string;
  species: MinionSpeciesId;
  mesh: THREE.Group;
  refs: MinionRefs;
  animationState: AnimationState;
  equippedGear: Map<GearSlot, GearInstance>;
  config: SpeciesConfig;
}

// ============================================================
// SPECIES BUILDER INTERFACE
// ============================================================

export interface SpeciesMaterials {
  primary: THREE.MeshStandardMaterial;
  secondary: THREE.MeshStandardMaterial;
  tertiary: THREE.MeshStandardMaterial;
  eyeWhite: THREE.MeshStandardMaterial;
  pupil: THREE.MeshBasicMaterial;
  mouth: THREE.MeshBasicMaterial;
  clothing?: {
    main: THREE.MeshStandardMaterial;
    accent: THREE.MeshStandardMaterial;
    buckle: THREE.MeshStandardMaterial;
  };
}

export interface SpeciesBuilder {
  config: SpeciesConfig;
  build(colors?: Partial<SpeciesColorPalette>): {
    mesh: THREE.Group;
    refs: MinionRefs;
  };
}

// ============================================================
// DEFAULT ANIMATION MODIFIERS
// ============================================================

export const DEFAULT_ANIMATION_MODIFIERS: AnimationModifiers = {
  walkSpeed: 1.0,
  bounceAmount: 1.0,
  armSwingAmount: 1.0,
  handBobSpeed: 2.0,
  handBobAmount: 0.05,
  legSwingAmount: 1.0,
};
