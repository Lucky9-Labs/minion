import * as THREE from 'three';

export interface FlightEffectConfig {
  particleCount: number;        // Number of trailing particles
  particleSize: number;
  primaryColor: THREE.ColorRepresentation;
  secondaryColor: THREE.ColorRepresentation;
  trailLength: number;          // How far particles trail behind
  emissionRate: number;         // Particles per second
  glowRingRadius: number;       // Radius of the glow ring beneath wizard
}

export const DEFAULT_FLIGHT_CONFIG: FlightEffectConfig = {
  particleCount: 30,
  particleSize: 0.06,
  primaryColor: 0x66ccff,       // Light blue/cyan magic
  secondaryColor: 0xffffff,     // White sparkles
  trailLength: 1.5,
  emissionRate: 15,
  glowRingRadius: 0.4,
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
  active: boolean;
}

/**
 * Magical flight effect with trailing particles and glow ring
 * Follows the wizard while flying
 */
export class FlightEffect {
  private config: FlightEffectConfig;
  private particleGroup: THREE.Group;
  private particles: Particle[] = [];
  private particleMeshes: THREE.Mesh[] = [];
  private geometry: THREE.SphereGeometry;
  private materials: THREE.MeshBasicMaterial[] = [];

  // Glow ring beneath wizard
  private glowRing: THREE.Mesh;
  private glowMaterial: THREE.MeshBasicMaterial;

  private isActive = false;
  private emissionTimer = 0;
  private nextParticleIndex = 0;

  // Track wizard position for trail
  private lastWizardPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(config: Partial<FlightEffectConfig> = {}) {
    this.config = { ...DEFAULT_FLIGHT_CONFIG, ...config };

    // Create particle group
    this.particleGroup = new THREE.Group();
    this.particleGroup.visible = false;

    // Create shared geometry
    this.geometry = new THREE.SphereGeometry(this.config.particleSize, 6, 6);

    // Create materials (primary and secondary colors)
    this.materials = [
      new THREE.MeshBasicMaterial({
        color: this.config.primaryColor,
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
      const material = this.materials[i % 2].clone();
      const mesh = new THREE.Mesh(this.geometry, material);
      mesh.visible = false;
      this.particleMeshes.push(mesh);
      this.particleGroup.add(mesh);

      // Initialize particle data
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 1,
        color: new THREE.Color(i % 2 === 0 ? this.config.primaryColor : this.config.secondaryColor),
        active: false,
      });
    }

    // Create glow ring
    const ringGeometry = new THREE.RingGeometry(
      this.config.glowRingRadius * 0.6,
      this.config.glowRingRadius,
      24
    );
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: this.config.primaryColor,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.glowRing = new THREE.Mesh(ringGeometry, this.glowMaterial);
    this.glowRing.rotation.x = -Math.PI / 2; // Lay flat
    this.glowRing.visible = false;
    this.particleGroup.add(this.glowRing);
  }

  /**
   * Get the particle group to add to scene
   */
  getGroup(): THREE.Group {
    return this.particleGroup;
  }

  /**
   * Start the flight effect
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.particleGroup.visible = true;
    this.glowRing.visible = true;
    this.emissionTimer = 0;
    this.nextParticleIndex = 0;

    // Reset all particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].active = false;
      this.particleMeshes[i].visible = false;
    }
  }

  /**
   * Stop emitting new particles (existing ones will fade)
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Update effect animation
   * @param deltaTime - Time since last frame
   * @param wizardPosition - Current wizard ground position (feet level)
   * @returns true if still active, false if completely finished
   */
  update(deltaTime: number, wizardPosition: THREE.Vector3): boolean {
    if (!this.isActive && !this.hasActiveParticles()) {
      this.particleGroup.visible = false;
      this.glowRing.visible = false;
      return false;
    }

    // Update glow ring position
    this.glowRing.position.copy(wizardPosition);
    this.glowRing.position.y += 0.05; // Slightly above ground
    this.glowRing.rotation.z += deltaTime * 2; // Rotate slowly

    // Fade ring based on active state
    if (this.isActive) {
      this.glowMaterial.opacity = THREE.MathUtils.lerp(this.glowMaterial.opacity, 0.4, deltaTime * 4);
    } else {
      this.glowMaterial.opacity = THREE.MathUtils.lerp(this.glowMaterial.opacity, 0, deltaTime * 3);
      if (this.glowMaterial.opacity < 0.01) {
        this.glowRing.visible = false;
      }
    }

    // Emit new particles
    if (this.isActive) {
      this.emissionTimer += deltaTime;
      const emissionInterval = 1 / this.config.emissionRate;

      while (this.emissionTimer >= emissionInterval) {
        this.emitParticle(wizardPosition);
        this.emissionTimer -= emissionInterval;
      }
    }

    // Update existing particles
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (!particle.active) continue;

      particle.life += deltaTime;

      if (particle.life >= particle.maxLife) {
        // Particle expired
        particle.active = false;
        this.particleMeshes[i].visible = false;
        continue;
      }

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Add some gentle swirl/spiral motion
      const swirl = Math.sin(particle.life * 4) * 0.3;
      particle.position.x += Math.cos(particle.life * 3) * swirl * deltaTime;
      particle.position.z += Math.sin(particle.life * 3) * swirl * deltaTime;

      // Slight downward drift
      particle.velocity.y -= 0.5 * deltaTime;

      // Update mesh
      const mesh = this.particleMeshes[i];
      mesh.position.copy(particle.position);

      // Fade out near end of life
      const lifeRatio = particle.life / particle.maxLife;
      const material = mesh.material as THREE.MeshBasicMaterial;

      // Fade in quickly, then fade out
      if (lifeRatio < 0.1) {
        material.opacity = lifeRatio / 0.1;
      } else {
        material.opacity = 1 - ((lifeRatio - 0.1) / 0.9);
      }

      // Shrink slightly over time
      mesh.scale.setScalar(particle.scale * (1 - lifeRatio * 0.3));
    }

    this.lastWizardPosition.copy(wizardPosition);

    return true;
  }

  /**
   * Emit a single particle
   */
  private emitParticle(wizardPosition: THREE.Vector3): void {
    const particle = this.particles[this.nextParticleIndex];
    const mesh = this.particleMeshes[this.nextParticleIndex];

    // Random position around wizard feet with slight offset
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.3;

    particle.position.set(
      wizardPosition.x + Math.cos(angle) * radius,
      wizardPosition.y + Math.random() * 0.3, // Near feet
      wizardPosition.z + Math.sin(angle) * radius
    );

    // Velocity: drift downward and outward
    const outwardSpeed = 0.3 + Math.random() * 0.3;
    particle.velocity.set(
      Math.cos(angle) * outwardSpeed,
      -0.5 - Math.random() * 0.5, // Drift down
      Math.sin(angle) * outwardSpeed
    );

    particle.life = 0;
    particle.maxLife = 0.8 + Math.random() * 0.6; // 0.8-1.4 seconds
    particle.scale = 0.5 + Math.random() * 0.5;
    particle.active = true;

    // Update mesh
    mesh.position.copy(particle.position);
    mesh.scale.setScalar(particle.scale);
    mesh.visible = true;

    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0;
    material.color.copy(particle.color);

    // Move to next particle slot (ring buffer)
    this.nextParticleIndex = (this.nextParticleIndex + 1) % this.config.particleCount;
  }

  /**
   * Check if any particles are still active
   */
  private hasActiveParticles(): boolean {
    return this.particles.some(p => p.active);
  }

  /**
   * Check if the effect is currently active (emitting)
   */
  isEmitting(): boolean {
    return this.isActive;
  }

  /**
   * Check if effect is visible (active or has particles fading)
   */
  isVisible(): boolean {
    return this.isActive || this.hasActiveParticles();
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();
    this.geometry.dispose();
    for (const material of this.materials) {
      material.dispose();
    }
    for (const mesh of this.particleMeshes) {
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this.glowRing.geometry.dispose();
    this.glowMaterial.dispose();
  }
}
