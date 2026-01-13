import * as THREE from 'three';

export type ReactionType =
  | 'exclamation' // ! - surprised
  | 'question'    // ? - confused
  | 'heart'       // ♥ - happy/blushing
  | 'anger'       // 💢 - annoyed
  | 'sparkle'     // ✨ - excited
  | 'dots'        // ... - thinking
  | 'wave';       // 👋 - greeting

export interface ReactionIndicatorConfig {
  size: number;
  floatHeight: number;
  floatAmplitude: number;
  floatSpeed: number;
  fadeInDuration: number;
  displayDuration: number;
  fadeOutDuration: number;
}

export const DEFAULT_REACTION_CONFIG: ReactionIndicatorConfig = {
  size: 0.4,
  floatHeight: 1.8,
  floatAmplitude: 0.1,
  floatSpeed: 3,
  fadeInDuration: 0.2,
  displayDuration: 1.5,
  fadeOutDuration: 0.3,
};

interface ReactionColors {
  primary: number;
  secondary?: number;
}

const REACTION_COLORS: Record<ReactionType, ReactionColors> = {
  exclamation: { primary: 0xffcc00 }, // Yellow
  question: { primary: 0x66ccff },    // Light blue
  heart: { primary: 0xff6699 },       // Pink
  anger: { primary: 0xff4444 },       // Red
  sparkle: { primary: 0xffff00, secondary: 0xffffff }, // Yellow/white
  dots: { primary: 0xaaaaaa },        // Gray
  wave: { primary: 0x44ff44 },        // Green
};

/**
 * Floating reaction indicator that appears above a character's head
 */
export class ReactionIndicator {
  private group: THREE.Group;
  private mesh: THREE.Mesh | THREE.Group | null = null;
  private config: ReactionIndicatorConfig;

  private isPlaying = false;
  private playTime = 0;
  private currentReaction: ReactionType | null = null;
  private onComplete?: () => void;

  constructor(config: Partial<ReactionIndicatorConfig> = {}) {
    this.config = { ...DEFAULT_REACTION_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.visible = false;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Show a reaction indicator
   */
  show(reaction: ReactionType, onComplete?: () => void): void {
    this.currentReaction = reaction;
    this.onComplete = onComplete;
    this.isPlaying = true;
    this.playTime = 0;

    // Remove old mesh
    if (this.mesh) {
      this.group.remove(this.mesh);
      if (this.mesh instanceof THREE.Mesh) {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
      }
    }

    // Create new mesh based on reaction type
    this.mesh = this.createReactionMesh(reaction);
    this.group.add(this.mesh);
    this.group.visible = true;
    this.group.position.y = this.config.floatHeight;
    this.group.scale.setScalar(0.01); // Start small for pop-in effect
  }

  private createReactionMesh(reaction: ReactionType): THREE.Mesh | THREE.Group {
    const colors = REACTION_COLORS[reaction];
    const size = this.config.size;

    switch (reaction) {
      case 'exclamation':
        return this.createExclamation(size, colors.primary);

      case 'question':
        return this.createQuestion(size, colors.primary);

      case 'heart':
        return this.createHeart(size, colors.primary);

      case 'anger':
        return this.createAngerMark(size, colors.primary);

      case 'sparkle':
        return this.createSparkle(size, colors.primary, colors.secondary || 0xffffff);

      case 'dots':
        return this.createDots(size, colors.primary);

      case 'wave':
        return this.createWave(size, colors.primary);

      default:
        return this.createExclamation(size, 0xffffff);
    }
  }

  private createExclamation(size: number, color: number): THREE.Group {
    const group = new THREE.Group();

    // Exclamation body (elongated diamond)
    const bodyGeo = new THREE.ConeGeometry(size * 0.2, size * 0.6, 4);
    const bodyMat = new THREE.MeshBasicMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI;
    body.position.y = size * 0.2;
    group.add(body);

    // Dot at bottom
    const dotGeo = new THREE.SphereGeometry(size * 0.12, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.y = -size * 0.25;
    group.add(dot);

    return group;
  }

  private createQuestion(size: number, color: number): THREE.Group {
    const group = new THREE.Group();

    // Question mark curve (simplified as a partial torus)
    const curveGeo = new THREE.TorusGeometry(size * 0.2, size * 0.08, 6, 12, Math.PI * 1.2);
    const curveMat = new THREE.MeshBasicMaterial({ color });
    const curve = new THREE.Mesh(curveGeo, curveMat);
    curve.rotation.x = Math.PI / 2;
    curve.rotation.z = Math.PI * 0.3;
    curve.position.y = size * 0.15;
    group.add(curve);

    // Stem
    const stemGeo = new THREE.CylinderGeometry(size * 0.08, size * 0.08, size * 0.15, 6);
    const stemMat = new THREE.MeshBasicMaterial({ color });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -size * 0.05;
    stem.position.x = size * 0.1;
    group.add(stem);

    // Dot at bottom
    const dotGeo = new THREE.SphereGeometry(size * 0.1, 6, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.y = -size * 0.25;
    dot.position.x = size * 0.1;
    group.add(dot);

    return group;
  }

  private createHeart(size: number, color: number): THREE.Mesh {
    // Create a simple heart shape using a sphere stretched
    const geo = new THREE.SphereGeometry(size * 0.3, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    // Scale to make heart-ish shape
    mesh.scale.set(1.2, 1, 0.8);
    return mesh;
  }

  private createAngerMark(size: number, color: number): THREE.Group {
    const group = new THREE.Group();

    // Create anger mark (cross pattern like in anime)
    const barGeo = new THREE.BoxGeometry(size * 0.5, size * 0.12, size * 0.12);
    const barMat = new THREE.MeshBasicMaterial({ color });

    const bar1 = new THREE.Mesh(barGeo, barMat);
    bar1.rotation.z = Math.PI / 4;
    group.add(bar1);

    const bar2 = new THREE.Mesh(barGeo, barMat.clone());
    bar2.rotation.z = -Math.PI / 4;
    group.add(bar2);

    return group;
  }

  private createSparkle(size: number, primaryColor: number, secondaryColor: number): THREE.Group {
    const group = new THREE.Group();

    // Multiple small stars/sparkles
    for (let i = 0; i < 3; i++) {
      const sparkleGeo = new THREE.OctahedronGeometry(size * 0.15);
      const sparkleMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? primaryColor : secondaryColor,
      });
      const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);

      const angle = (i / 3) * Math.PI * 2;
      sparkle.position.x = Math.cos(angle) * size * 0.25;
      sparkle.position.y = Math.sin(angle) * size * 0.15;
      sparkle.userData.angle = angle;

      group.add(sparkle);
    }

    return group;
  }

  private createDots(size: number, color: number): THREE.Group {
    const group = new THREE.Group();

    // Three dots
    for (let i = 0; i < 3; i++) {
      const dotGeo = new THREE.SphereGeometry(size * 0.1, 6, 6);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.x = (i - 1) * size * 0.3;
      group.add(dot);
    }

    return group;
  }

  private createWave(size: number, color: number): THREE.Group {
    const group = new THREE.Group();

    // Simple hand shape (palm and fingers simplified)
    const palmGeo = new THREE.BoxGeometry(size * 0.4, size * 0.3, size * 0.1);
    const palmMat = new THREE.MeshBasicMaterial({ color });
    const palm = new THREE.Mesh(palmGeo, palmMat);
    group.add(palm);

    // Fingers (simplified as small cylinders)
    for (let i = 0; i < 4; i++) {
      const fingerGeo = new THREE.CylinderGeometry(size * 0.04, size * 0.04, size * 0.2, 4);
      const fingerMat = new THREE.MeshBasicMaterial({ color });
      const finger = new THREE.Mesh(fingerGeo, fingerMat);
      finger.position.x = (i - 1.5) * size * 0.1;
      finger.position.y = size * 0.25;
      group.add(finger);
    }

    return group;
  }

  /**
   * Update the indicator animation
   * @returns true if still playing
   */
  update(deltaTime: number): boolean {
    if (!this.isPlaying || !this.mesh) return false;

    this.playTime += deltaTime;

    const { fadeInDuration, displayDuration, fadeOutDuration } = this.config;
    const totalDuration = fadeInDuration + displayDuration + fadeOutDuration;

    if (this.playTime >= totalDuration) {
      // Animation complete
      this.isPlaying = false;
      this.group.visible = false;

      if (this.onComplete) {
        this.onComplete();
        this.onComplete = undefined;
      }

      return false;
    }

    // Calculate phase and progress
    let opacity = 1;
    let scale = 1;

    if (this.playTime < fadeInDuration) {
      // Fade in with pop effect
      const t = this.playTime / fadeInDuration;
      const eased = 1 - Math.pow(1 - t, 3); // Ease out cubic
      scale = eased * 1.2; // Overshoot
      opacity = eased;
    } else if (this.playTime < fadeInDuration + displayDuration) {
      // Display phase - settle to normal size
      const t = (this.playTime - fadeInDuration) / displayDuration;
      scale = 1 + 0.2 * Math.pow(1 - t, 2); // Settle from 1.2 to 1
      opacity = 1;
    } else {
      // Fade out
      const t = (this.playTime - fadeInDuration - displayDuration) / fadeOutDuration;
      scale = 1 - t * 0.5;
      opacity = 1 - t;
    }

    // Apply scale
    this.group.scale.setScalar(scale);

    // Float animation
    const floatOffset = Math.sin(this.playTime * this.config.floatSpeed) * this.config.floatAmplitude;
    this.group.position.y = this.config.floatHeight + floatOffset;

    // Billboard - always face camera (handled by parent or external code)
    // We just rotate around Y to give some life
    this.group.rotation.y += deltaTime * 0.5;

    // Apply opacity to materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    });

    // Special animation for sparkle
    if (this.currentReaction === 'sparkle' && this.mesh instanceof THREE.Group) {
      this.mesh.children.forEach((child, i) => {
        child.rotation.y = this.playTime * 3 + i;
        child.rotation.z = Math.sin(this.playTime * 5 + i) * 0.3;
      });
    }

    return true;
  }

  /**
   * Check if indicator is currently showing
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Stop and hide immediately
   */
  stop(): void {
    this.isPlaying = false;
    this.group.visible = false;
  }

  dispose(): void {
    this.stop();
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
  }
}
