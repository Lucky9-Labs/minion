import * as THREE from 'three';
import type { AnimationContext, AnimationUpdater } from '@/types/minion';

/**
 * Handles hand/fin animation based on limb type
 * - floatingHand: Independent bob with circular drift when idle, sync with body when walking
 * - fin: Flapping motion when walking, rest position when idle
 * - bone: Same as floatingHand but with no circular drift
 * - wing: Similar to fin but more pronounced
 */
export class HandUpdater implements AnimationUpdater {
  // Base positions for floating hands (relative to root)
  private readonly leftHandBase = { x: 0.45, y: 0.7, z: 0.1 };
  private readonly rightHandBase = { x: -0.45, y: 0.7, z: 0.1 };

  update(ctx: AnimationContext): void {
    const { limbType } = ctx;

    switch (limbType) {
      case 'floatingHand':
        this.updateFloatingHands(ctx);
        break;
      case 'fin':
        this.updateFins(ctx);
        break;
      case 'wing':
        this.updateWings(ctx);
        break;
      case 'bone':
        this.updateBoneHands(ctx);
        break;
    }
  }

  /**
   * Floating hands bob independently with hover effect
   */
  private updateFloatingHands(ctx: AnimationContext): void {
    const { refs, state, modifiers, elapsedTime } = ctx;
    const { handBobSpeed, handBobAmount } = modifiers;

    // Base bob animation (always active, each hand has different phase)
    const bobPhase = elapsedTime * handBobSpeed + state.bobOffset;
    const leftBob = Math.sin(bobPhase) * handBobAmount;
    const rightBob = Math.sin(bobPhase + Math.PI * 0.3) * handBobAmount; // Offset phase for variety

    if (state.isMoving) {
      // Walking: hands move in sync with body rhythm
      const walkCycle = state.animTime * 8;
      const walkSwing = Math.sin(walkCycle);

      // Vertical bob syncs slightly with walk bounce
      refs.leftHand.position.y = this.leftHandBase.y + leftBob + Math.abs(walkSwing) * 0.03;
      refs.rightHand.position.y = this.rightHandBase.y + rightBob + Math.abs(walkSwing) * 0.03;

      // Forward/back motion with walk
      refs.leftHand.position.z = this.leftHandBase.z + walkSwing * 0.06;
      refs.rightHand.position.z = this.rightHandBase.z - walkSwing * 0.06;

      // Slight side-to-side with walk
      refs.leftHand.position.x = this.leftHandBase.x + Math.abs(walkSwing) * 0.02;
      refs.rightHand.position.x = this.rightHandBase.x - Math.abs(walkSwing) * 0.02;

      // Subtle rotation during walk
      refs.leftHand.rotation.z = walkSwing * 0.1;
      refs.rightHand.rotation.z = -walkSwing * 0.1;

    } else {
      // Idle: independent floating with circular drift
      const driftX = Math.sin(elapsedTime * 0.5 + state.bobOffset) * 0.03;
      const driftZ = Math.cos(elapsedTime * 0.7 + state.bobOffset) * 0.02;

      refs.leftHand.position.x = this.leftHandBase.x + driftX;
      refs.leftHand.position.y = this.leftHandBase.y + leftBob;
      refs.leftHand.position.z = this.leftHandBase.z + driftZ;

      refs.rightHand.position.x = this.rightHandBase.x - driftX;
      refs.rightHand.position.y = this.rightHandBase.y + rightBob;
      refs.rightHand.position.z = this.rightHandBase.z + driftZ;

      // Gentle rotation drift
      refs.leftHand.rotation.z = THREE.MathUtils.lerp(
        refs.leftHand.rotation.z,
        Math.sin(elapsedTime * 0.3) * 0.1,
        0.05
      );
      refs.rightHand.rotation.z = THREE.MathUtils.lerp(
        refs.rightHand.rotation.z,
        -Math.sin(elapsedTime * 0.3) * 0.1,
        0.05
      );
    }
  }

  /**
   * Penguin fins flap when walking
   */
  private updateFins(ctx: AnimationContext): void {
    const { refs, state } = ctx;

    if (state.isMoving) {
      // Fins flap while waddling
      const walkCycle = state.animTime * 6; // Slower waddle for penguin
      refs.leftHand.rotation.z = 0.3 + Math.sin(walkCycle) * 0.5;
      refs.rightHand.rotation.z = -0.3 - Math.sin(walkCycle) * 0.5;

      // Slight forward tilt
      refs.leftHand.rotation.x = Math.abs(Math.sin(walkCycle)) * 0.2;
      refs.rightHand.rotation.x = Math.abs(Math.sin(walkCycle)) * 0.2;
    } else {
      // Fins at rest, slightly out
      refs.leftHand.rotation.z = THREE.MathUtils.lerp(refs.leftHand.rotation.z, 0.2, 0.1);
      refs.rightHand.rotation.z = THREE.MathUtils.lerp(refs.rightHand.rotation.z, -0.2, 0.1);
      refs.leftHand.rotation.x = THREE.MathUtils.lerp(refs.leftHand.rotation.x, 0, 0.1);
      refs.rightHand.rotation.x = THREE.MathUtils.lerp(refs.rightHand.rotation.x, 0, 0.1);
    }
  }

  /**
   * Wings for flying creatures (similar to fins but more dramatic)
   */
  private updateWings(ctx: AnimationContext): void {
    const { refs, state, elapsedTime } = ctx;

    if (state.isMoving) {
      const flapCycle = state.animTime * 10;
      refs.leftHand.rotation.z = 0.5 + Math.sin(flapCycle) * 0.8;
      refs.rightHand.rotation.z = -0.5 - Math.sin(flapCycle) * 0.8;
    } else {
      // Wings folded when idle with slight breathing motion
      const breathe = Math.sin(elapsedTime * 1.5) * 0.05;
      refs.leftHand.rotation.z = THREE.MathUtils.lerp(refs.leftHand.rotation.z, 0.1 + breathe, 0.1);
      refs.rightHand.rotation.z = THREE.MathUtils.lerp(refs.rightHand.rotation.z, -0.1 - breathe, 0.1);
    }
  }

  /**
   * Skeleton bone hands (floating but more rigid, less drift)
   */
  private updateBoneHands(ctx: AnimationContext): void {
    const { refs, state, modifiers, elapsedTime } = ctx;
    const { handBobAmount } = modifiers;

    // Similar to floating hands but with less circular drift and more rigid feel
    const bobPhase = elapsedTime * 1.5 + state.bobOffset;
    const leftBob = Math.sin(bobPhase) * handBobAmount * 0.7;
    const rightBob = Math.sin(bobPhase + Math.PI * 0.5) * handBobAmount * 0.7;

    if (state.isMoving) {
      const walkCycle = state.animTime * 8;
      refs.leftHand.position.y = this.leftHandBase.y + leftBob;
      refs.rightHand.position.y = this.rightHandBase.y + rightBob;

      // Skeleton hands swing more dramatically
      refs.leftHand.rotation.x = Math.sin(walkCycle) * 0.4;
      refs.rightHand.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
    } else {
      // Slight hover, less drift than regular floating hands
      refs.leftHand.position.y = this.leftHandBase.y + leftBob;
      refs.rightHand.position.y = this.rightHandBase.y + rightBob;

      refs.leftHand.rotation.x = THREE.MathUtils.lerp(refs.leftHand.rotation.x, 0, 0.1);
      refs.rightHand.rotation.x = THREE.MathUtils.lerp(refs.rightHand.rotation.x, 0, 0.1);
    }
  }
}
