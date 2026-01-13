import type { SpeciesBuilder, MinionSpeciesId } from '@/types/minion';
import { goblinBuilder } from './goblin';
import { wizardBuilder, witchBuilder, MageBuilder } from './mage';
import { penguinBuilder } from './penguin';
import { mushroomBuilder } from './mushroom';

/**
 * Registry of all available species builders
 */
const speciesRegistry = new Map<MinionSpeciesId, SpeciesBuilder>();

// Register built-in species (minions)
speciesRegistry.set('goblin', goblinBuilder);
speciesRegistry.set('penguin', penguinBuilder);
speciesRegistry.set('mushroom', mushroomBuilder);

// Register player characters
speciesRegistry.set('wizard', wizardBuilder);
speciesRegistry.set('witch', witchBuilder);

/**
 * Get a species builder by ID
 */
export function getSpeciesBuilder(speciesId: MinionSpeciesId): SpeciesBuilder {
  const builder = speciesRegistry.get(speciesId);
  if (!builder) {
    throw new Error(`Unknown species: ${speciesId}`);
  }
  return builder;
}

/**
 * Register a custom species builder
 */
export function registerSpecies(builder: SpeciesBuilder): void {
  speciesRegistry.set(builder.config.id, builder);
}

/**
 * Get all registered species IDs
 */
export function getRegisteredSpecies(): MinionSpeciesId[] {
  return Array.from(speciesRegistry.keys());
}

/**
 * Check if a species is registered
 */
export function isSpeciesRegistered(speciesId: MinionSpeciesId): boolean {
  return speciesRegistry.has(speciesId);
}

export { goblinBuilder } from './goblin';
export { penguinBuilder } from './penguin';
export { mushroomBuilder } from './mushroom';
export { wizardBuilder, witchBuilder, MageBuilder } from './mage';
export type { MageCustomization } from './mage';
