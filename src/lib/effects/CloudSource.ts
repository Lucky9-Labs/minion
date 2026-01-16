import * as THREE from 'three';

/**
 * Configuration for cloud source effect
 */
export interface CloudSourceConfig {
  /** Number of cloud particles */
  particleCount: number;
  /** Cloud spread radius */
  radius: number;
  /** Cloud color */
  color: number;
}

export const DEFAULT_CLOUD_SOURCE_CONFIG: CloudSourceConfig = {
  particleCount: 25,
  radius: 5,
  color: 0xeef4ff,
};

/**
 * Particle data for cloud
 */
interface CloudParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * CloudSource - An ethereal cloud/mist effect that can serve as a water source
 * Positioned above terrain features like mountains
 */
export class CloudSource {
  private config: CloudSourceConfig;
  private group: THREE.Group;
  private origin: THREE.Vector3;

  // Cloud particles
  private particles: CloudParticle[] = [];
  private points: THREE.Points;
  private positions: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;

  // Cloud mesh (volumetric)
  private cloudMesh: THREE.Group;

  // Animation state
  private time: number = 0;

  constructor(
    origin: THREE.Vector3,
    config: CloudSourceConfig = DEFAULT_CLOUD_SOURCE_CONFIG
  ) {
    this.config = config;
    this.origin = origin.clone();
    this.group = new THREE.Group();

    // Initialize arrays
    this.positions = new Float32Array(config.particleCount * 3);
    this.sizes = new Float32Array(config.particleCount);
    this.opacities = new Float32Array(config.particleCount);

    // Build components
    this.cloudMesh = this.buildCloudMesh();
    this.points = this.buildParticleSystem();

    // Initialize particles
    this.initializeParticles();
  }

  /**
   * Build the cloud mesh - soft spheres forming a cloud volume
   */
  private buildCloudMesh(): THREE.Group {
    const cloudGroup = new THREE.Group();
    const { radius, color } = this.config;

    const cloudMat = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    // Main cloud puff
    const mainCloudGeo = new THREE.IcosahedronGeometry(radius * 0.4, 1);
    const mainCloud = new THREE.Mesh(mainCloudGeo, cloudMat);
    mainCloud.position.copy(this.origin);
    mainCloud.scale.set(1.2, 0.6, 1.0);
    cloudGroup.add(mainCloud);

    // Secondary cloud puffs
    const offsets = [
      new THREE.Vector3(-radius * 0.3, radius * 0.1, -radius * 0.1),
      new THREE.Vector3(radius * 0.3, -radius * 0.06, radius * 0.06),
      new THREE.Vector3(-radius * 0.3, -radius * 0.06, radius * 0.3),
    ];

    for (const offset of offsets) {
      const puffGeo = new THREE.IcosahedronGeometry(
        radius * 0.4 + Math.random() * radius * 0.3,
        1
      );
      const puff = new THREE.Mesh(puffGeo, cloudMat.clone());
      (puff.material as THREE.MeshStandardMaterial).opacity = 0.3 + Math.random() * 0.2;
      puff.position.copy(this.origin).add(offset);
      puff.scale.set(
        0.8 + Math.random() * 0.4,
        0.5 + Math.random() * 0.3,
        0.7 + Math.random() * 0.4
      );
      cloudGroup.add(puff);
    }

    this.group.add(cloudGroup);
    return cloudGroup;
  }

  /**
   * Build cloud particle system for ethereal mist effect
   */
  private buildParticleSystem(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.config.color) },
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying float vOpacity;

        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Very soft, foggy particle
          float alpha = (1.0 - dist * 2.0) * vOpacity * 0.5;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.group.add(points);

    return points;
  }

  /**
   * Initialize cloud particles
   */
  private initializeParticles(): void {
    const { particleCount, radius } = this.config;

    for (let i = 0; i < particleCount; i++) {
      const particle: CloudParticle = {
        position: new THREE.Vector3(
          this.origin.x + (Math.random() - 0.5) * radius * 2,
          this.origin.y + (Math.random() - 0.5) * radius * 0.8,
          this.origin.z + (Math.random() - 0.5) * radius * 1.6
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        life: Math.random(),
        maxLife: 3 + Math.random() * 3,
        size: 8 + Math.random() * 12,
      };

      this.particles.push(particle);
    }
  }

  /**
   * Update cloud animation
   */
  update(deltaTime: number): void {
    this.time += deltaTime;

    // Update particles
    this.updateParticles(deltaTime);

    // Update geometry
    this.updateGeometry();

    // Update cloud mesh animation
    this.updateCloudMesh();

    // Update shader uniforms
    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.time.value = this.time;
  }

  /**
   * Update cloud particles
   */
  private updateParticles(deltaTime: number): void {
    const { radius } = this.config;

    for (const particle of this.particles) {
      // Gentle drift
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Add some turbulence
      particle.position.x += Math.sin(this.time * 0.5 + particle.life * 10) * deltaTime * 0.5;
      particle.position.y += Math.cos(this.time * 0.3 + particle.life * 8) * deltaTime * 0.3;

      // Update life
      particle.life += deltaTime / particle.maxLife;

      // Recycle if life expired or drifted too far
      const distFromOrigin = particle.position.distanceTo(this.origin);
      if (particle.life > 1 || distFromOrigin > radius * 2.5) {
        this.resetParticle(particle);
      }
    }
  }

  /**
   * Reset a cloud particle
   */
  private resetParticle(particle: CloudParticle): void {
    const { radius } = this.config;

    particle.position.set(
      this.origin.x + (Math.random() - 0.5) * radius * 1.6,
      this.origin.y + (Math.random() - 0.5) * radius * 0.6,
      this.origin.z + (Math.random() - 0.5) * radius * 1.2
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.5
    );
    particle.life = 0;
    particle.maxLife = 3 + Math.random() * 3;
  }

  /**
   * Update geometry buffer attributes
   */
  private updateGeometry(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;

      this.positions[i3] = particle.position.x;
      this.positions[i3 + 1] = particle.position.y;
      this.positions[i3 + 2] = particle.position.z;

      this.sizes[i] = particle.size;

      // Opacity pulses with life
      this.opacities[i] = Math.sin(particle.life * Math.PI) * 0.8;
    }

    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Update cloud mesh animation
   */
  private updateCloudMesh(): void {
    // Gentle pulsing/breathing effect on cloud meshes
    this.cloudMesh.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const scale = 1 + Math.sin(this.time * 0.5 + index * 0.5) * 0.05;
        child.scale.x = child.scale.x * 0.95 + scale * 0.05;
        child.scale.z = child.scale.z * 0.95 + scale * 0.05;
      }
    });
  }

  /**
   * Get the Three.js group containing all cloud elements
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Update colors based on time of day
   */
  setTimeOfDay(timeOfDay: number): void {
    let cloudColor: THREE.Color;

    if (timeOfDay < 0.22 || timeOfDay > 0.8) {
      // Night
      cloudColor = new THREE.Color(0x556677);
    } else if (timeOfDay < 0.28 || timeOfDay > 0.72) {
      // Dawn/dusk
      cloudColor = new THREE.Color(0xddbbaa);
    } else {
      // Day
      cloudColor = new THREE.Color(this.config.color);
    }

    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.color.value.copy(cloudColor);

    // Update cloud mesh colors
    this.cloudMesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshStandardMaterial).color.copy(cloudColor);
      }
    });
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();

    this.cloudMesh.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });

    this.particles = [];
  }
}
