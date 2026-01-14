import * as THREE from 'three';
import type { AnimationContext, AnimationUpdater } from '@/types/minion';

/**
 * Handles body locomotion animation (walking and idle)
 * - Walking: bouncy motion, body lean, leg swing
 * - Idle: gentle body bob and sway
 */
export class LocomotionUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, state, modifiers } = ctx;

    if (state.isMoving) {
      this.updateWalking(ctx);
    } else {
      this.updateIdle(ctx);
    }
  }

  private updateWalking(ctx: AnimationContext): void {
    const { refs, state, modifiers } = ctx;
    const { walkSpeed, bounceAmount, legSwingAmount } = modifiers;

    const walkCycle = state.animTime * 8 * walkSpeed;

    // Body bounce (halved for smaller minion)
    const bounce = Math.abs(Math.sin(walkCycle)) * 0.075 * bounceAmount;

    // Body lean and sway (halved for smaller minion)
    refs.body.rotation.z = Math.sin(walkCycle) * 0.04;
    refs.body.rotation.x = 0.04; // Forward lean (halved)

    // Leg swing (opposite phases)
    refs.leftLeg.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5 * legSwingAmount;
    refs.rightLeg.rotation.x = Math.sin(walkCycle) * 0.5 * legSwingAmount;

    // Head bob (halved for smaller minion)
    refs.head.rotation.z = Math.sin(walkCycle * 0.5) * 0.025;

    // Store bounce for position calculation
    (refs.root as THREE.Group & { _bounce?: number })._bounce = bounce;
  }

  private updateIdle(ctx: AnimationContext): void {
    const { refs, state, modifiers } = ctx;

    // Gentle body bob (halved for smaller minion)
    const idleBob = Math.sin(state.animTime * 1.5) * 0.015;

    // Subtle body sway (halved for smaller minion)
    refs.body.rotation.z = THREE.MathUtils.lerp(
      refs.body.rotation.z,
      Math.sin(state.animTime * 0.8) * 0.01,
      0.1
    );
    refs.body.rotation.x = THREE.MathUtils.lerp(refs.body.rotation.x, 0, 0.1);

    // Legs at rest
    refs.leftLeg.rotation.x = THREE.MathUtils.lerp(refs.leftLeg.rotation.x, 0, 0.1);
    refs.rightLeg.rotation.x = THREE.MathUtils.lerp(refs.rightLeg.rotation.x, 0, 0.1);

    // Head returns to neutral
    refs.head.rotation.z = THREE.MathUtils.lerp(refs.head.rotation.z, 0, 0.1);

    // Store bob for position calculation
    (refs.root as THREE.Group & { _bounce?: number })._bounce = idleBob;
  }
}
