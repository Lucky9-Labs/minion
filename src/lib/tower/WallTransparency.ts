import * as THREE from 'three';

/**
 * Controls wall transparency when minions are inside the tower
 */
export class WallTransparencyController {
  private materials: THREE.MeshStandardMaterial[];
  private targetOpacity: number = 1.0;
  private currentOpacity: number = 1.0;
  private fadeSpeed: number = 5.0;

  constructor(materials: THREE.MeshStandardMaterial[]) {
    this.materials = materials;

    // Ensure materials are set up for transparency
    for (const mat of this.materials) {
      mat.transparent = true;
      mat.opacity = 1.0;
    }
  }

  /**
   * Set whether minions are inside the tower
   */
  setMinionsInside(hasMinions: boolean): void {
    this.targetOpacity = hasMinions ? 0.15 : 1.0;
  }

  /**
   * Update opacity transition
   */
  update(deltaTime: number): void {
    if (Math.abs(this.currentOpacity - this.targetOpacity) < 0.001) {
      this.currentOpacity = this.targetOpacity;
      return;
    }

    this.currentOpacity = THREE.MathUtils.lerp(
      this.currentOpacity,
      this.targetOpacity,
      deltaTime * this.fadeSpeed
    );

    for (const mat of this.materials) {
      mat.opacity = this.currentOpacity;
    }
  }

  /**
   * Get current opacity
   */
  getOpacity(): number {
    return this.currentOpacity;
  }

  /**
   * Force immediate opacity (no transition)
   */
  setImmediate(opacity: number): void {
    this.currentOpacity = opacity;
    this.targetOpacity = opacity;
    for (const mat of this.materials) {
      mat.opacity = opacity;
    }
  }
}
