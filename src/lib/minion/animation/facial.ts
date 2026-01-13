import * as THREE from 'three';
import type { AnimationContext, AnimationUpdater, Expression, EXPRESSION_CONFIGS } from '@/types/minion';

/**
 * Handles eyelid blink animation
 * Blinks occur every 3-5 seconds with smooth eyelid transitions
 */
export class BlinkingUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, state, deltaTime } = ctx;

    // Blink timing
    state.blinkTimer += deltaTime;
    if (state.blinkTimer > 3 + Math.random() * 2 && !state.isBlinking) {
      state.isBlinking = true;
      state.blinkTimer = 0;
      setTimeout(() => { state.isBlinking = false; }, 150);
    }

    // Animate eyelids - scale.y: 0.1 = open, 1 = closed
    const blinkScale = state.isBlinking ? 1 : 0.1;
    refs.leftEyelid.scale.y = THREE.MathUtils.lerp(
      refs.leftEyelid.scale.y,
      blinkScale,
      0.3
    );
    refs.rightEyelid.scale.y = THREE.MathUtils.lerp(
      refs.rightEyelid.scale.y,
      blinkScale,
      0.3
    );
  }
}

/**
 * Handles pupil look-around animation
 * Pupils slowly drift in circular patterns for a lively look
 */
export class PupilUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, state, elapsedTime } = ctx;

    // Pupils look around slowly with offset per minion
    const lookX = Math.sin(elapsedTime * 0.5 + state.bobOffset) * 0.02;
    const lookY = Math.cos(elapsedTime * 0.7 + state.bobOffset) * 0.01;

    refs.leftPupil.position.x = lookX;
    refs.leftPupil.position.y = 0.02 + lookY;
    refs.rightPupil.position.x = lookX;
    refs.rightPupil.position.y = 0.02 + lookY;
  }
}

/**
 * Expression configurations for different moods
 */
const EXPRESSIONS: Record<Expression, {
  eyebrowAngle: number;
  mouthScaleX: number;
  mouthScaleY: number;
  mouthRotation: number;
  showTeeth: boolean;
}> = {
  neutral: { eyebrowAngle: 0.1, mouthScaleX: 1, mouthScaleY: 0.5, mouthRotation: 0, showTeeth: false },
  happy: { eyebrowAngle: 0.15, mouthScaleX: 1.2, mouthScaleY: 0.8, mouthRotation: 0, showTeeth: false },
  mischievous: { eyebrowAngle: 0.35, mouthScaleX: 0.8, mouthScaleY: 0.6, mouthRotation: 0.25, showTeeth: true },
  worried: { eyebrowAngle: -0.3, mouthScaleX: 0.6, mouthScaleY: 0.4, mouthRotation: 0, showTeeth: false },
  surprised: { eyebrowAngle: 0.4, mouthScaleX: 0.5, mouthScaleY: 1.0, mouthRotation: 0, showTeeth: false },
};

/**
 * Handles expression changes (eyebrows, mouth, teeth)
 * Expressions cycle randomly when idle
 */
export class ExpressionUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, state, features, deltaTime } = ctx;

    // Random expression changes when not moving
    if (!state.isMoving) {
      state.expressionTimer += deltaTime;
      if (state.expressionTimer > 4 + Math.random() * 3) {
        const expressions: Expression[] = ['neutral', 'happy', 'mischievous'];
        state.expression = expressions[Math.floor(Math.random() * expressions.length)];
        state.expressionTimer = 0;
      }
    }

    const config = EXPRESSIONS[state.expression];

    // Eyebrows (if species has them)
    if (features.hasEyebrows && refs.species.leftEyebrow && refs.species.rightEyebrow) {
      refs.species.leftEyebrow.rotation.z = THREE.MathUtils.lerp(
        refs.species.leftEyebrow.rotation.z,
        -config.eyebrowAngle,
        0.1
      );
      refs.species.rightEyebrow.rotation.z = THREE.MathUtils.lerp(
        refs.species.rightEyebrow.rotation.z,
        config.eyebrowAngle,
        0.1
      );
    }

    // Mouth
    refs.mouth.scale.x = THREE.MathUtils.lerp(refs.mouth.scale.x, config.mouthScaleX, 0.1);
    refs.mouth.scale.y = THREE.MathUtils.lerp(refs.mouth.scale.y, config.mouthScaleY, 0.1);
    refs.mouth.rotation.z = THREE.MathUtils.lerp(refs.mouth.rotation.z, config.mouthRotation, 0.1);

    // Teeth (if species has them)
    if (features.hasTeeth && refs.species.teeth) {
      refs.species.teeth.visible = config.showTeeth;
    }
  }
}

/**
 * Handles ear wiggle animation
 * Ears subtly wiggle constantly for a lively look
 */
export class EarUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, features, state, elapsedTime } = ctx;

    if (!features.hasEars) return;
    if (!refs.species.leftEar || !refs.species.rightEar) return;

    const earWiggle = Math.sin(elapsedTime * 2 + state.bobOffset) * 0.05;
    refs.species.leftEar.rotation.z = 0.3 + earWiggle;
    refs.species.rightEar.rotation.z = -0.3 - earWiggle;
  }
}

/**
 * Handles tail animation (for squirrel)
 */
export class TailUpdater implements AnimationUpdater {
  update(ctx: AnimationContext): void {
    const { refs, features, state, elapsedTime } = ctx;

    if (!features.hasTail || !refs.species.tail) return;

    if (state.isMoving) {
      // Tail sways while walking
      const walkCycle = state.animTime * 8;
      refs.species.tail.rotation.z = Math.sin(walkCycle * 0.5) * 0.3;
      refs.species.tail.rotation.x = -0.3 + Math.abs(Math.sin(walkCycle)) * 0.1;
    } else {
      // Tail gentle sway when idle
      refs.species.tail.rotation.z = Math.sin(elapsedTime * 0.8) * 0.15;
      refs.species.tail.rotation.x = THREE.MathUtils.lerp(
        refs.species.tail.rotation.x,
        -0.2,
        0.05
      );
    }
  }
}
