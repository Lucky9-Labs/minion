import type { GearItemConfig, GearSlot } from '@/types/minion';
import { knightHelmetConfig } from './items/knight-helmet';
import { hardHatConfig } from './items/hard-hat';
import { hammerConfig } from './items/hammer';

/**
 * Registry of all available gear items
 */
const gearRegistry = new Map<string, GearItemConfig>();

// Register built-in gear
gearRegistry.set(knightHelmetConfig.id, knightHelmetConfig);
gearRegistry.set(hardHatConfig.id, hardHatConfig);
gearRegistry.set(hammerConfig.id, hammerConfig);

/**
 * Get a gear item by ID
 */
export function getGearItem(gearId: string): GearItemConfig | undefined {
  return gearRegistry.get(gearId);
}

/**
 * Register a custom gear item
 */
export function registerGear(gear: GearItemConfig): void {
  gearRegistry.set(gear.id, gear);
}

/**
 * Get all registered gear IDs
 */
export function getRegisteredGear(): string[] {
  return Array.from(gearRegistry.keys());
}

/**
 * Get all gear items for a specific slot
 */
export function getGearForSlot(slot: GearSlot): GearItemConfig[] {
  return Array.from(gearRegistry.values()).filter((g) => g.slot === slot);
}

// Export gear items
export { knightHelmetConfig } from './items/knight-helmet';
export { hardHatConfig } from './items/hard-hat';
export { hammerConfig } from './items/hammer';
