import type {
  MinionRefs,
  AnimationState,
  AnimationModifiers,
  AnimationContext,
  AnimationUpdater,
  LimbType,
  SpeciesFeatures,
  Expression,
  DEFAULT_ANIMATION_MODIFIERS,
} from '@/types/minion';
import { BlinkingUpdater, PupilUpdater, ExpressionUpdater, EarUpdater, TailUpdater } from './facial';
import { LocomotionUpdater } from './locomotion';
import { HandUpdater } from './hands';

/**
 * Creates initial animation state with randomized offsets
 */
export function createAnimationState(): AnimationState {
  return {
    isMoving: false,
    expression: 'mischievous',
    isBlinking: false,
    animTime: Math.random() * 10, // Random start offset
    bobOffset: Math.random() * Math.PI * 2,
    blinkTimer: Math.random() * 3,
    expressionTimer: 0,
  };
}

/**
 * Default animation modifiers
 */
const DEFAULT_MODIFIERS: AnimationModifiers = {
  walkSpeed: 1.0,
  bounceAmount: 1.0,
  armSwingAmount: 1.0,
  handBobSpeed: 2.0,
  handBobAmount: 0.05,
  legSwingAmount: 1.0,
};

/**
 * Main minion animator class
 * Combines all animation updaters and manages state
 */
export class MinionAnimator {
  private refs: MinionRefs;
  private state: AnimationState;
  private modifiers: AnimationModifiers;
  private limbType: LimbType;
  private features: SpeciesFeatures;
  private updaters: AnimationUpdater[] = [];

  constructor(
    refs: MinionRefs,
    limbType: LimbType,
    features: SpeciesFeatures,
    modifiers?: Partial<AnimationModifiers>
  ) {
    this.refs = refs;
    this.limbType = limbType;
    this.features = features;
    this.modifiers = { ...DEFAULT_MODIFIERS, ...modifiers };
    this.state = createAnimationState();

    // Register all animation updaters
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

  /**
   * Update all animations
   */
  update(deltaTime: number, elapsedTime: number, isMoving: boolean): void {
    this.state.isMoving = isMoving;
    this.state.animTime += deltaTime;

    const ctx: AnimationContext = {
      refs: this.refs,
      state: this.state,
      modifiers: this.modifiers,
      limbType: this.limbType,
      features: this.features,
      deltaTime,
      elapsedTime,
    };

    for (const updater of this.updaters) {
      updater.update(ctx);
    }
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return this.state;
  }

  /**
   * Set expression manually
   */
  setExpression(expression: Expression): void {
    this.state.expression = expression;
    this.state.expressionTimer = 0;
  }

  /**
   * Apply gear animation modifiers
   */
  applyGearModifiers(modifiers: Partial<AnimationModifiers>): void {
    this.modifiers = { ...this.modifiers, ...modifiers };
  }

  /**
   * Get the current bounce value for position interpolation
   */
  getBounce(): number {
    return (this.refs.root as { _bounce?: number })._bounce ?? 0;
  }
}
