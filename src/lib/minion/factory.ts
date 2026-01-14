import * as THREE from 'three';
import type {
  MinionSpeciesId,
  MinionRefs,
  SpeciesColorPalette,
  AnimationModifiers,
  GearSlot,
  GearItemConfig,
} from '@/types/minion';
import { getSpeciesBuilder } from './species';
import { MinionAnimator } from './animation';

// Minion scale factor - controls overall minion size (0.5 = half size)
const MINION_SCALE = 0.5;

/**
 * Options for creating a minion
 */
export interface CreateMinionOptions {
  species: MinionSpeciesId;
  colors?: Partial<SpeciesColorPalette>;
  animationModifiers?: Partial<AnimationModifiers>;
}

/**
 * Result from creating a minion
 */
export interface MinionInstance {
  /** The Three.js group containing the minion mesh */
  mesh: THREE.Group;
  /** References to minion parts for animation */
  refs: MinionRefs;
  /** Animator instance for updating animations */
  animator: MinionAnimator;
  /** Species ID */
  species: MinionSpeciesId;
  /** Currently equipped gear */
  equippedGear: Map<GearSlot, GearItemConfig>;
  /** Equip a gear item */
  equipGear: (gear: GearItemConfig) => void;
  /** Unequip a gear item */
  unequipGear: (slot: GearSlot) => void;
  /** Dispose of all resources */
  dispose: () => void;
}

/**
 * Creates a new minion instance
 */
export function createMinion(options: CreateMinionOptions): MinionInstance {
  const { species, colors, animationModifiers } = options;

  // Get the species builder
  const builder = getSpeciesBuilder(species);

  // Build the minion mesh
  const { mesh, refs } = builder.build(colors);

  // Apply scale to shrink minions to half size
  mesh.scale.setScalar(MINION_SCALE);

  // Create the animator
  const animator = new MinionAnimator(
    refs,
    builder.config.limbType,
    builder.config.features,
    animationModifiers
  );

  // Gear tracking
  const equippedGear = new Map<GearSlot, GearItemConfig>();
  const gearMeshes = new Map<GearSlot, THREE.Object3D>();

  /**
   * Equip a gear item
   */
  function equipGear(gear: GearItemConfig): void {
    // Unequip existing gear in the same slot
    if (equippedGear.has(gear.slot)) {
      unequipGear(gear.slot);
    }

    // Get the attachment point
    const attachPoint = refs.attachments.get(gear.attachmentPoint);
    if (!attachPoint) {
      console.warn(`Attachment point not found: ${gear.attachmentPoint}`);
      return;
    }

    // Build the gear mesh
    const gearMesh = gear.createMesh();
    attachPoint.add(gearMesh);

    // Track the gear
    equippedGear.set(gear.slot, gear);
    gearMeshes.set(gear.slot, gearMesh);

    // Apply any animation modifiers from the gear
    if (gear.animationModifiers) {
      animator.applyGearModifiers(gear.animationModifiers);
    }
  }

  /**
   * Unequip a gear item
   */
  function unequipGear(slot: GearSlot): void {
    const gearMesh = gearMeshes.get(slot);
    if (gearMesh) {
      gearMesh.parent?.remove(gearMesh);

      // Dispose of geometry and materials
      gearMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });

      gearMeshes.delete(slot);
    }
    equippedGear.delete(slot);
  }

  /**
   * Dispose of all minion resources
   */
  function dispose(): void {
    // Unequip all gear
    for (const slot of equippedGear.keys()) {
      unequipGear(slot);
    }

    // Dispose of minion mesh
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }

  return {
    mesh,
    refs,
    animator,
    species,
    equippedGear,
    equipGear,
    unequipGear,
    dispose,
  };
}
