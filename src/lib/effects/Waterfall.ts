import * as THREE from 'three';

/**
 * Configuration for waterfall effect
 */
export interface WaterfallConfig {
  /** Number of water particles */
  particleCount: number;
  /** Width of the waterfall */
  width: number;
  /** Fall distance before particles recycle */
  fallDistance: number;
  /** Fall speed in units per second */
  fallSpeed: number;
  /** Spread as particles fall */
  spreadFactor: number;
  /** Number of mist particles */
  mistParticleCount: number;
  /** Main water color */
  waterColor: number;
  /** Mist/foam color */
  mistColor: number;
}

export const DEFAULT_WATERFALL_CONFIG: WaterfallConfig = {
  particleCount: 300,
  width: 6,
  fallDistance: 40,
  fallSpeed: 12,
  spreadFactor: 0.3,
  mistParticleCount: 80,
  waterColor: 0x4a9ed9,
  mistColor: 0xccddee,
};

/**
 * Particle data for waterfall
 */
interface WaterParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * Waterfall effect with animated water particles and mist
 * Designed to flow off the edge of a floating island
 */
export class Waterfall {
  private config: WaterfallConfig;
  private group: THREE.Group;

  // Origin position
  private origin: THREE.Vector3;
  private direction: THREE.Vector3; // Direction water flows (outward from island)

  // Main waterfall particles
  private particles: WaterParticle[] = [];
  private particlePoints: THREE.Points;
  private particlePositions: Float32Array;
  private particleSizes: Float32Array;
  private particleOpacities: Float32Array;

  // Mist particles
  private mistParticles: WaterParticle[] = [];
  private mistPoints: THREE.Points;
  private mistPositions: Float32Array;
  private mistSizes: Float32Array;
  private mistOpacities: Float32Array;

  // Water ribbon mesh (sheet of flowing water)
  private waterRibbon: THREE.Mesh;

  // Animation state
  private time: number = 0;

  constructor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    config: WaterfallConfig = DEFAULT_WATERFALL_CONFIG
  ) {
    this.config = config;
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
    this.group = new THREE.Group();

    // Initialize arrays
    this.particlePositions = new Float32Array(config.particleCount * 3);
    this.particleSizes = new Float32Array(config.particleCount);
    this.particleOpacities = new Float32Array(config.particleCount);

    this.mistPositions = new Float32Array(config.mistParticleCount * 3);
    this.mistSizes = new Float32Array(config.mistParticleCount);
    this.mistOpacities = new Float32Array(config.mistParticleCount);

    // Build components
    this.particlePoints = this.buildParticleSystem();
    this.mistPoints = this.buildMistSystem();
    this.waterRibbon = this.buildWaterRibbon();

    // Initialize particles
    this.initializeParticles();
    this.initializeMistParticles();
  }

  /**
   * Build the main water particle system
   */
  private buildParticleSystem(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(this.particleOpacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.config.waterColor) },
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

          // Soft circular particle
          float alpha = (1.0 - smoothstep(0.2, 0.5, dist)) * vOpacity;

          // Slight blue tint variation
          vec3 finalColor = color * (0.9 + 0.1 * (1.0 - dist * 2.0));

          gl_FragColor = vec4(finalColor, alpha * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    this.group.add(points);

    return points;
  }

  /**
   * Build the mist particle system
   */
  private buildMistSystem(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.mistPositions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.mistSizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(this.mistOpacities, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.config.mistColor) },
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
          float alpha = (1.0 - dist * 2.0) * vOpacity * 0.4;

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
   * Build the water ribbon mesh (sheet of flowing water)
   */
  private buildWaterRibbon(): THREE.Mesh {
    const { width, fallDistance } = this.config;

    // Create a ribbon geometry
    const segments = 10;
    const geometry = new THREE.PlaneGeometry(width, fallDistance, 1, segments);

    // Rotate and position
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: this.config.waterColor,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const ribbon = new THREE.Mesh(geometry, material);

    // Position ribbon starting at origin and falling
    ribbon.position.copy(this.origin);
    ribbon.position.y -= fallDistance / 2;

    // Rotate to face outward
    const angle = Math.atan2(this.direction.z, this.direction.x);
    ribbon.rotation.y = -angle + Math.PI / 2;

    // Offset outward slightly
    ribbon.position.x += this.direction.x * width * 0.3;
    ribbon.position.z += this.direction.z * width * 0.3;

    this.group.add(ribbon);

    return ribbon;
  }

  /**
   * Initialize water particles
   */
  private initializeParticles(): void {
    const { particleCount, width, fallDistance, fallSpeed } = this.config;

    for (let i = 0; i < particleCount; i++) {
      // Spread across width
      const lateralOffset = (Math.random() - 0.5) * width;

      // Perpendicular direction for width spread
      const perpX = -this.direction.z;
      const perpZ = this.direction.x;

      const particle: WaterParticle = {
        position: new THREE.Vector3(
          this.origin.x + perpX * lateralOffset + this.direction.x * Math.random() * 2,
          this.origin.y - Math.random() * fallDistance,
          this.origin.z + perpZ * lateralOffset + this.direction.z * Math.random() * 2
        ),
        velocity: new THREE.Vector3(
          this.direction.x * 2 + (Math.random() - 0.5) * 0.5,
          -fallSpeed * (0.8 + Math.random() * 0.4),
          this.direction.z * 2 + (Math.random() - 0.5) * 0.5
        ),
        life: Math.random(),
        maxLife: 1.0,
        size: 1.5 + Math.random() * 2,
      };

      this.particles.push(particle);
    }
  }

  /**
   * Initialize mist particles around the waterfall
   */
  private initializeMistParticles(): void {
    const { mistParticleCount, width, fallDistance } = this.config;

    for (let i = 0; i < mistParticleCount; i++) {
      // Mist spreads outward from waterfall
      const spreadRadius = width * 2;

      const particle: WaterParticle = {
        position: new THREE.Vector3(
          this.origin.x + (Math.random() - 0.5) * spreadRadius,
          this.origin.y - fallDistance * 0.3 - Math.random() * fallDistance * 0.5,
          this.origin.z + (Math.random() - 0.5) * spreadRadius
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 1.5,
          (Math.random() - 0.5) * 2
        ),
        life: Math.random(),
        maxLife: 2 + Math.random() * 2,
        size: 5 + Math.random() * 10,
      };

      this.mistParticles.push(particle);
    }
  }

  /**
   * Update waterfall animation
   */
  update(deltaTime: number): void {
    this.time += deltaTime;

    // Update main particles
    this.updateParticles(deltaTime);

    // Update mist particles
    this.updateMistParticles(deltaTime);

    // Update geometry attributes
    this.updateGeometry();

    // Update water ribbon animation
    this.updateWaterRibbon(deltaTime);

    // Update shader uniforms
    const particleMat = this.particlePoints.material as THREE.ShaderMaterial;
    particleMat.uniforms.time.value = this.time;
  }

  /**
   * Update water particle positions
   */
  private updateParticles(deltaTime: number): void {
    const { fallDistance, fallSpeed, spreadFactor, width } = this.config;

    for (const particle of this.particles) {
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Add spread as particle falls
      const fallProgress = (this.origin.y - particle.position.y) / fallDistance;
      particle.position.x += (Math.random() - 0.5) * spreadFactor * deltaTime;
      particle.position.z += (Math.random() - 0.5) * spreadFactor * deltaTime;

      // Update life
      particle.life += deltaTime / particle.maxLife;

      // Recycle particle if it fell too far or life expired
      if (particle.position.y < this.origin.y - fallDistance || particle.life > 1) {
        this.resetParticle(particle);
      }
    }
  }

  /**
   * Reset a particle to the top
   */
  private resetParticle(particle: WaterParticle): void {
    const { width, fallSpeed } = this.config;

    // Perpendicular direction for width spread
    const perpX = -this.direction.z;
    const perpZ = this.direction.x;
    const lateralOffset = (Math.random() - 0.5) * width;

    particle.position.set(
      this.origin.x + perpX * lateralOffset + this.direction.x * Math.random() * 2,
      this.origin.y + Math.random() * 2,
      this.origin.z + perpZ * lateralOffset + this.direction.z * Math.random() * 2
    );

    particle.velocity.set(
      this.direction.x * 2 + (Math.random() - 0.5) * 0.5,
      -fallSpeed * (0.8 + Math.random() * 0.4),
      this.direction.z * 2 + (Math.random() - 0.5) * 0.5
    );

    particle.life = 0;
  }

  /**
   * Update mist particle positions
   */
  private updateMistParticles(deltaTime: number): void {
    const { fallDistance, width } = this.config;

    for (const particle of this.mistParticles) {
      // Update position (mist rises and drifts)
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Slow drift
      particle.velocity.x *= 0.99;
      particle.velocity.z *= 0.99;

      // Update life
      particle.life += deltaTime / particle.maxLife;

      // Recycle if life expired
      if (particle.life > 1) {
        this.resetMistParticle(particle);
      }
    }
  }

  /**
   * Reset a mist particle
   */
  private resetMistParticle(particle: WaterParticle): void {
    const { width, fallDistance } = this.config;
    const spreadRadius = width * 1.5;

    particle.position.set(
      this.origin.x + (Math.random() - 0.5) * spreadRadius,
      this.origin.y - fallDistance * 0.4 + Math.random() * 5,
      this.origin.z + (Math.random() - 0.5) * spreadRadius
    );

    particle.velocity.set(
      (Math.random() - 0.5) * 2,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 2
    );

    particle.life = 0;
    particle.maxLife = 2 + Math.random() * 2;
  }

  /**
   * Update geometry buffer attributes
   */
  private updateGeometry(): void {
    const { fallDistance } = this.config;

    // Update water particle positions
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;

      this.particlePositions[i3] = particle.position.x;
      this.particlePositions[i3 + 1] = particle.position.y;
      this.particlePositions[i3 + 2] = particle.position.z;

      this.particleSizes[i] = particle.size;

      // Opacity fades at bottom
      const fallProgress = (this.origin.y - particle.position.y) / fallDistance;
      this.particleOpacities[i] = Math.max(0, 1 - fallProgress * 0.7);
    }

    // Update mist particle positions
    for (let i = 0; i < this.mistParticles.length; i++) {
      const particle = this.mistParticles[i];
      const i3 = i * 3;

      this.mistPositions[i3] = particle.position.x;
      this.mistPositions[i3 + 1] = particle.position.y;
      this.mistPositions[i3 + 2] = particle.position.z;

      this.mistSizes[i] = particle.size;

      // Opacity fades with life
      const lifeProgress = particle.life;
      this.mistOpacities[i] = Math.sin(lifeProgress * Math.PI);
    }

    // Mark attributes for update
    (this.particlePoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particlePoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.particlePoints.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;

    (this.mistPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.mistPoints.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.mistPoints.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Update water ribbon animation (vertex displacement)
   */
  private updateWaterRibbon(deltaTime: number): void {
    const geometry = this.waterRibbon.geometry as THREE.PlaneGeometry;
    const positions = geometry.attributes.position.array as Float32Array;

    // Add wave motion to the ribbon
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      // Horizontal wave based on vertical position and time
      positions[i] += Math.sin(this.time * 3 + y * 0.5) * deltaTime * 0.5;
    }

    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Get the Three.js group containing all waterfall elements
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Set waterfall position
   */
  setPosition(position: THREE.Vector3): void {
    this.origin.copy(position);
    this.waterRibbon.position.copy(position);
    this.waterRibbon.position.y -= this.config.fallDistance / 2;
  }

  /**
   * Update colors based on time of day
   */
  setTimeOfDay(timeOfDay: number): void {
    let waterColor: THREE.Color;
    let mistColor: THREE.Color;

    if (timeOfDay < 0.22 || timeOfDay > 0.8) {
      // Night - darker blue
      waterColor = new THREE.Color(0x2a4a6a);
      mistColor = new THREE.Color(0x445566);
    } else if (timeOfDay < 0.28 || timeOfDay > 0.72) {
      // Dawn/dusk - orange tinted
      waterColor = new THREE.Color(0x6a7a8a);
      mistColor = new THREE.Color(0xccaa99);
    } else {
      // Day - bright blue
      waterColor = new THREE.Color(this.config.waterColor);
      mistColor = new THREE.Color(this.config.mistColor);
    }

    const particleMat = this.particlePoints.material as THREE.ShaderMaterial;
    particleMat.uniforms.color.value.copy(waterColor);

    const mistMat = this.mistPoints.material as THREE.ShaderMaterial;
    mistMat.uniforms.color.value.copy(mistColor);

    const ribbonMat = this.waterRibbon.material as THREE.MeshStandardMaterial;
    ribbonMat.color.copy(waterColor);
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Dispose particle systems
    this.particlePoints.geometry.dispose();
    (this.particlePoints.material as THREE.Material).dispose();

    this.mistPoints.geometry.dispose();
    (this.mistPoints.material as THREE.Material).dispose();

    // Dispose water ribbon
    this.waterRibbon.geometry.dispose();
    (this.waterRibbon.material as THREE.Material).dispose();

    // Clear arrays
    this.particles = [];
    this.mistParticles = [];
  }
}
