// Main factory function
export { createMinion } from './factory';
export type { CreateMinionOptions, MinionInstance } from './factory';

// Animation system
export { MinionAnimator, createAnimationState } from './animation';

// Species
export {
  getSpeciesBuilder,
  registerSpecies,
  getRegisteredSpecies,
  isSpeciesRegistered,
  goblinBuilder,
} from './species';

// Gear
export {
  getGearItem,
  registerGear,
  getRegisteredGear,
  getGearForSlot,
  knightHelmetConfig,
} from './gear';

// Shared builders (for custom species)
export {
  MINION_SCALE,
  createMaterials,
  buildEyes,
  buildMouth,
  buildEyebrows,
  buildTeeth,
  buildFloatingHand,
  buildLeg,
  buildPointedEars,
  buildBulbousNose,
  createAttachmentPoints,
} from './species/shared';
