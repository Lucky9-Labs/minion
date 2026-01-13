import * as THREE from 'three';

export interface TeleportEffectConfig {
  particleCount: number;
  particleSize: number;
  color: THREE.ColorRepresentation;
  secondaryColor: THREE.ColorRepresentation;
  duration: number; // seconds
  radius: number;
  height: number;
}

export const DEFAULT_TELEPORT_CONFIG: TeleportEffectConfig = {
  particleCount: 50,
  particleSize: 0.08,
  color: 0x9966ff, // Purple magic
  secondaryColor: 0xffcc00, // Golden sparkles
  duration: 0.5,
  radius: 0.8,
  height: 1.5,
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

/**
 * Magical teleportation effect with particles
 */
export class TeleportEffect {
  private config: TeleportEffectConfig;
  private particleGroup: THREE.Group;
  private particles: Particle[] = [];
  private particleMeshes: THREE.Mesh[] = [];
  private geometry: THREE.SphereGeometry;
  private materials: THREE.MeshBasicMaterial[] = [];

  private isPlaying = false;
  private playTime = 0;
  private mode: 'appear' | 'disappear' = 'appear';
  private onComplete?: () => void;

  constructor(config: Partial<TeleportEffectConfig> = {}) {
    this.config = { ...DEFAULT_TELEPORT_CONFIG, ...config };

    // Create particle group
    this.particleGroup = new THREE.Group();
    this.particleGroup.visible = false;

    // Create shared geometry
    this.geometry = new THREE.SphereGeometry(this.config.particleSize, 4, 4);

    // Create materials (primary and secondary colors)
    this.materials = [
      new THREE.MeshBasicMaterial({
        color: this.config.color,
        transparent: true,
        opacity: 1,
      }),
      new THREE.MeshBasicMaterial({
        color: this.config.secondaryColor,
        transparent: true,
        opacity: 1,
      }),
    ];

    // Pre-create particle meshes
    for (let i = 0; i < this.config.particleCount; i++) {
      const material = this.materials[i % 2];
      const mesh = new THREE.Mesh(this.geometry, material.clone());
      mesh.visible = false;
      this.particleMeshes.push(mesh);
      this.particleGroup.add(mesh);
    }
  }

  /**
   * Get the particle group to add to scene
   */
  getGroup(): THREE.Group {
    return this.particleGroup;
  }

  /**
   * Play disappear effect (particles fly outward)
   */
  playDisappear(position: THREE.Vector3, onComplete?: () => void): void {
    this.mode = 'disappear';
    this.startEffect(position, onComplete);
  }

  /**
   * Play appear effect (particles fly inward)
   */
  playAppear(position: THREE.Vector3, onComplete?: () => void): void {
    this.mode = 'appear';
    this.startEffect(position, onComplete);
  }

  private startEffect(position: THREE.Vector3, onComplete?: () => void): void {
    this.particleGroup.position.copy(position);
    this.particleGroup.visible = true;
    this.isPlaying = true;
    this.playTime = 0;
    this.onComplete = onComplete;

    // Initialize particles
    this.particles = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      const angle = (i / this.config.particleCount) * Math.PI * 2;
      const heightOffset = Math.random() * this.config.height;

      // Random position within radius
      const r = Math.random() * this.config.radius;
      const startX = Math.cos(angle) * r;
      const startZ = Math.sin(angle) * r;
      const startY = heightOffset;

      // Velocity - outward for disappear, inward for appear
      const speed = 2 + Math.random() * 3;
      let vx: number, vy: number, vz: number;

      if (this.mode === 'disappear') {
        // Particles start at center, fly outward
        vx = Math.cos(angle) * speed;
        vy = (Math.random() - 0.3) * speed;
        vz = Math.sin(angle) * speed;
      } else {
        // Particles start outside, fly inward
        vx = -Math.cos(angle) * speed * 0.5;
        vy = (Math.random() - 0.5) * speed * 0.3;
        vz = -Math.sin(angle) * speed * 0.5;
      }

      const particle: Particle = {
        position: this.mode === 'disappear'
          ? new THREE.Vector3(0, startY, 0)
          : new THREE.Vector3(startX * 2, startY, startZ * 2),
        velocity: new THREE.Vector3(vx, vy, vz),
        life: 0,
        maxLife: this.config.duration * (0.7 + Math.random() * 0.3),
        scale: 0.5 + Math.random() * 0.5,
        color: new THREE.Color(i % 2 === 0 ? this.config.color : this.config.secondaryColor),
      };

      this.particles.push(particle);

      // Position mesh
      const mesh = this.particleMeshes[i];
      mesh.position.copy(particle.position);
      mesh.scale.setScalar(particle.scale);
      mesh.visible = true;

      // Reset material opacity
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1;
      material.color.copy(particle.color);
    }
  }

  /**
   * Update effect animation
   * @returns true if still playing, false if complete
   */
  update(deltaTime: number): boolean {
    if (!this.isPlaying) return false;

    this.playTime += deltaTime;

    let anyAlive = false;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.life += deltaTime;

      if (particle.life < particle.maxLife) {
        anyAlive = true;

        // Update position
        particle.position.add(
          particle.velocity.clone().multiplyScalar(deltaTime)
        );

        // Apply gravity for disappear, slight float for appear
        if (this.mode === 'disappear') {
          particle.velocity.y -= 5 * deltaTime;
        } else {
          particle.velocity.y += 1 * deltaTime;
        }

        // Update mesh
        const mesh = this.particleMeshes[i];
        mesh.position.copy(particle.position);

        // Fade out near end of life
        const lifeRatio = particle.life / particle.maxLife;
        const material = mesh.material as THREE.MeshBasicMaterial;

        if (this.mode === 'disappear') {
          // Disappear: start full, fade out
          material.opacity = 1 - lifeRatio;
          mesh.scale.setScalar(particle.scale * (1 - lifeRatio * 0.5));
        } else {
          // Appear: start faded, become full, then converge
          if (lifeRatio < 0.3) {
            material.opacity = lifeRatio / 0.3;
          } else if (lifeRatio > 0.7) {
            material.opacity = 1 - (lifeRatio - 0.7) / 0.3;
          } else {
            material.opacity = 1;
          }
          mesh.scale.setScalar(particle.scale * (1 - lifeRatio * 0.3));
        }
      } else {
        // Hide dead particles
        this.particleMeshes[i].visible = false;
      }
    }

    if (!anyAlive) {
      this.isPlaying = false;
      this.particleGroup.visible = false;

      // Call completion callback
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = undefined;
      }
    }

    return this.isPlaying;
  }

  /**
   * Check if effect is currently playing
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Stop effect immediately
   */
  stop(): void {
    this.isPlaying = false;
    this.particleGroup.visible = false;

    for (const mesh of this.particleMeshes) {
      mesh.visible = false;
    }
  }

  dispose(): void {
    this.stop();
    this.geometry.dispose();
    for (const material of this.materials) {
      material.dispose();
    }
    for (const mesh of this.particleMeshes) {
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }
}

/**
 * Magic circle effect that appears on the ground during teleportation
 */
export class MagicCircle {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private isActive = false;
  private fadeTime = 0;
  private fadeDirection: 'in' | 'out' = 'in';

  constructor(radius: number = 1, color: THREE.ColorRepresentation = 0x9966ff) {
    // Create a ring geometry
    const geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);

    this.material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2; // Lay flat
    this.mesh.visible = false;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  show(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.01; // Slightly above ground
    this.mesh.visible = true;
    this.isActive = true;
    this.fadeTime = 0;
    this.fadeDirection = 'in';
  }

  hide(): void {
    this.fadeDirection = 'out';
  }

  update(deltaTime: number): boolean {
    if (!this.isActive) return false;

    this.fadeTime += deltaTime;

    if (this.fadeDirection === 'in') {
      this.material.opacity = Math.min(1, this.fadeTime * 3);
      // Rotate while active
      this.mesh.rotation.z += deltaTime * 2;
    } else {
      this.material.opacity = Math.max(0, 1 - this.fadeTime * 3);
      if (this.material.opacity <= 0) {
        this.isActive = false;
        this.mesh.visible = false;
      }
    }

    return this.isActive;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
