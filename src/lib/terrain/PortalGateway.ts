import * as THREE from 'three';

export interface PortalGatewayConfig {
  width: number;       // Width of the portal arch
  height: number;      // Height of the portal arch
  depth: number;       // Depth/thickness of the stone frame
  portalColor: number; // Color of the magical energy
  stoneColor: number;  // Color of the stone arch
  particleCount: number; // Number of particles in portal effect
}

export const DEFAULT_PORTAL_CONFIG: PortalGatewayConfig = {
  width: 5,
  height: 6,
  depth: 1.5,
  portalColor: 0x8b5cf6,  // Purple magical energy
  stoneColor: 0x4a4a4a,   // Dark gray stone
  particleCount: 200,     // Number of swirling particles
};

/**
 * Builds a magical portal gateway arch built into rocky outcroppings
 * This serves as the spawn point and gateway for the player
 */
export class PortalGateway {
  private config: PortalGatewayConfig;
  private group: THREE.Group;
  private particles: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleVelocities: Float32Array | null = null;
  private particleSizes: Float32Array | null = null;
  private glowLight: THREE.PointLight | null = null;
  private time: number = 0;
  private portalCenter: THREE.Vector3;

  constructor(config: Partial<PortalGatewayConfig> = {}) {
    this.config = { ...DEFAULT_PORTAL_CONFIG, ...config };
    this.group = new THREE.Group();
    this.portalCenter = new THREE.Vector3(0, this.config.height * 0.45, 0);
    this.build();
  }

  private build(): void {
    const { width, height, depth, portalColor, stoneColor } = this.config;

    // Stone material for the arch
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: stoneColor,
      roughness: 0.95,
      metalness: 0.05,
    });

    // Darker stone for accents
    const darkStoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9,
      metalness: 0.1,
    });

    // === LEFT PILLAR ===
    const pillarWidth = depth * 0.8;
    const pillarGeom = new THREE.BoxGeometry(pillarWidth, height * 0.85, depth);

    const leftPillar = new THREE.Mesh(pillarGeom, stoneMaterial);
    leftPillar.position.set(-width / 2 - pillarWidth / 2 + 0.3, height * 0.425, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    this.group.add(leftPillar);

    // === RIGHT PILLAR ===
    const rightPillar = new THREE.Mesh(pillarGeom, stoneMaterial);
    rightPillar.position.set(width / 2 + pillarWidth / 2 - 0.3, height * 0.425, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    this.group.add(rightPillar);

    // === TOP ARCH ===
    // Create a curved arch on top
    const archSegments = 12;
    const archRadius = width / 2 + pillarWidth * 0.3;

    for (let i = 0; i <= archSegments; i++) {
      const angle = (i / archSegments) * Math.PI;
      const x = Math.cos(angle) * archRadius;
      const y = Math.sin(angle) * (height * 0.3) + height * 0.85;

      const stoneSize = 0.6 + Math.random() * 0.3;
      const archStone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(stoneSize),
        i % 2 === 0 ? stoneMaterial : darkStoneMaterial
      );
      archStone.position.set(x, y, (Math.random() - 0.5) * depth * 0.5);
      archStone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      archStone.castShadow = true;
      this.group.add(archStone);
    }

    // === KEYSTONE at top center ===
    const keystone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.0),
      darkStoneMaterial
    );
    keystone.position.set(0, height * 1.15, 0);
    keystone.castShadow = true;
    this.group.add(keystone);

    // === DECORATIVE ROCKS at base ===
    const baseRockPositions = [
      [-width / 2 - pillarWidth, 0.3, depth * 0.3],
      [-width / 2 - pillarWidth * 0.5, 0.2, -depth * 0.4],
      [width / 2 + pillarWidth, 0.3, depth * 0.3],
      [width / 2 + pillarWidth * 0.5, 0.2, -depth * 0.4],
      [-width / 2 - pillarWidth * 1.3, 0.4, 0],
      [width / 2 + pillarWidth * 1.3, 0.4, 0],
    ];

    for (const [rx, ry, rz] of baseRockPositions) {
      const rockSize = 0.4 + Math.random() * 0.5;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(rockSize),
        stoneMaterial
      );
      rock.position.set(rx, ry, rz);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      rock.castShadow = true;
      this.group.add(rock);
    }

    // === PORTAL ENERGY (particle swirl effect) ===
    this.createPortalParticles(width, height, portalColor);

    // === PORTAL GLOW LIGHT ===
    this.glowLight = new THREE.PointLight(portalColor, 2, 15);
    this.glowLight.position.set(0, height * 0.5, 1);
    this.group.add(this.glowLight);

    // Secondary ambient glow
    const ambientGlow = new THREE.PointLight(0x6d28d9, 0.5, 8);
    ambientGlow.position.set(0, height * 0.3, 2);
    this.group.add(ambientGlow);

    // === RUNES ON PILLARS ===
    this.addRuneGlow(leftPillar.position.clone().add(new THREE.Vector3(pillarWidth / 2 + 0.05, 0.5, 0)));
    this.addRuneGlow(leftPillar.position.clone().add(new THREE.Vector3(pillarWidth / 2 + 0.05, 1.5, 0)));
    this.addRuneGlow(leftPillar.position.clone().add(new THREE.Vector3(pillarWidth / 2 + 0.05, 2.5, 0)));
    this.addRuneGlow(rightPillar.position.clone().add(new THREE.Vector3(-pillarWidth / 2 - 0.05, 0.5, 0)));
    this.addRuneGlow(rightPillar.position.clone().add(new THREE.Vector3(-pillarWidth / 2 - 0.05, 1.5, 0)));
    this.addRuneGlow(rightPillar.position.clone().add(new THREE.Vector3(-pillarWidth / 2 - 0.05, 2.5, 0)));
  }

  private addRuneGlow(position: THREE.Vector3): void {
    const runeGeom = new THREE.PlaneGeometry(0.4, 0.4);
    const runeMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.7,
    });

    const rune = new THREE.Mesh(runeGeom, runeMaterial);
    rune.position.copy(position);
    rune.lookAt(position.clone().add(new THREE.Vector3(position.x > 0 ? 1 : -1, 0, 0)));
    this.group.add(rune);
  }

  /**
   * Create swirling particle effect for the portal
   */
  private createPortalParticles(width: number, height: number, portalColor: number): void {
    const count = this.config.particleCount;
    const portalWidth = width * 0.85;
    const portalHeight = height * 0.75;

    // Initialize particle data arrays
    this.particlePositions = new Float32Array(count * 3);
    this.particleVelocities = new Float32Array(count * 3);
    this.particleSizes = new Float32Array(count);

    const colors = new Float32Array(count * 3);
    const color1 = new THREE.Color(portalColor);
    const color2 = new THREE.Color(0x4c1d95); // Darker purple
    const color3 = new THREE.Color(0xc084fc); // Lighter purple

    // Initialize particles in elliptical pattern
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random angle for initial position
      const angle = Math.random() * Math.PI * 2;
      // Random radius with bias toward edges (ring distribution)
      const radiusNorm = 0.3 + Math.random() * 0.7;
      const radiusX = radiusNorm * portalWidth * 0.45;
      const radiusY = radiusNorm * portalHeight * 0.45;

      // Elliptical position
      this.particlePositions[i3] = Math.cos(angle) * radiusX;
      this.particlePositions[i3 + 1] = this.portalCenter.y + Math.sin(angle) * radiusY;
      this.particlePositions[i3 + 2] = (Math.random() - 0.5) * 0.3; // Slight z variation

      // Store initial velocity (will be updated in animation loop)
      // Angular velocity - particles orbit around center
      const speed = 0.5 + Math.random() * 0.5;
      this.particleVelocities[i3] = speed;     // orbital speed
      this.particleVelocities[i3 + 1] = angle; // current angle
      this.particleVelocities[i3 + 2] = radiusNorm; // normalized radius

      // Particle sizes - varying for depth effect
      this.particleSizes[i] = 0.08 + Math.random() * 0.15;

      // Particle colors - mix of purples
      const colorMix = Math.random();
      const particleColor = colorMix < 0.5
        ? color1.clone().lerp(color2, colorMix * 2)
        : color1.clone().lerp(color3, (colorMix - 0.5) * 2);

      colors[i3] = particleColor.r;
      colors[i3 + 1] = particleColor.g;
      colors[i3 + 2] = particleColor.b;
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    geometry.setAttribute('particleColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    // Custom shader material for soft glowing particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 particleColor;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = particleColor;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          // Fade particles based on z depth
          vAlpha = 0.6 + 0.4 * (1.0 - abs(position.z) * 2.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          // Create soft circular particle
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Soft falloff
          float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;

          // Add glow effect
          float glow = exp(-dist * 4.0) * 0.5;

          gl_FragColor = vec4(vColor + glow * 0.3, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);

    // Add some floating motes that drift more freely
    this.createFloatingMotes(width, height, portalColor);
  }

  /**
   * Create additional floating motes around the portal
   */
  private createFloatingMotes(width: number, height: number, portalColor: number): void {
    const count = 50;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const color = new THREE.Color(portalColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Position around the portal frame
      const angle = Math.random() * Math.PI * 2;
      const radius = width * 0.5 + Math.random() * 1.5;

      positions[i3] = Math.cos(angle) * radius * (0.8 + Math.random() * 0.4);
      positions[i3 + 1] = this.portalCenter.y + (Math.random() - 0.5) * height * 0.9;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;

      sizes[i] = 0.03 + Math.random() * 0.06;

      // Slightly varied purple colors
      const brightness = 0.8 + Math.random() * 0.4;
      colors[i3] = color.r * brightness;
      colors[i3 + 1] = color.g * brightness;
      colors[i3 + 2] = color.b * brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('moteColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 moteColor;
        varying vec3 vColor;
        uniform float uTime;

        void main() {
          vColor = moteColor;

          // Add gentle floating motion
          vec3 pos = position;
          pos.y += sin(uTime * 0.5 + position.x * 2.0) * 0.1;
          pos.x += cos(uTime * 0.3 + position.y * 2.0) * 0.05;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          float alpha = smoothstep(0.5, 0.0, dist) * 0.7;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const motes = new THREE.Points(geometry, material);
    motes.userData.isMotes = true;
    this.group.add(motes);
  }

  /**
   * Update portal animation
   */
  update(deltaTime: number): void {
    this.time += deltaTime;

    // Animate swirling particles
    if (this.particles && this.particlePositions && this.particleVelocities) {
      const { width, height } = this.config;
      const portalWidth = width * 0.85;
      const portalHeight = height * 0.75;
      const count = this.config.particleCount;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Get particle properties
        const speed = this.particleVelocities[i3];
        let angle = this.particleVelocities[i3 + 1];
        const radiusNorm = this.particleVelocities[i3 + 2];

        // Update angle (orbital motion)
        angle += speed * deltaTime;
        this.particleVelocities[i3 + 1] = angle;

        // Calculate new position with some wobble
        const radiusX = radiusNorm * portalWidth * 0.45;
        const radiusY = radiusNorm * portalHeight * 0.45;

        // Add slight radial pulsing
        const pulse = 1.0 + Math.sin(this.time * 2 + i * 0.1) * 0.05;

        this.particlePositions[i3] = Math.cos(angle) * radiusX * pulse;
        this.particlePositions[i3 + 1] = this.portalCenter.y + Math.sin(angle) * radiusY * pulse;
        // Z wobble for depth
        this.particlePositions[i3 + 2] = Math.sin(this.time + angle * 2) * 0.15;
      }

      // Mark buffer for update
      const posAttr = this.particles.geometry.getAttribute('position');
      (posAttr as THREE.BufferAttribute).needsUpdate = true;
    }

    // Update floating motes time uniform
    this.group.traverse((child) => {
      if (child instanceof THREE.Points && child.userData.isMotes) {
        const material = child.material as THREE.ShaderMaterial;
        if (material.uniforms?.uTime) {
          material.uniforms.uTime.value = this.time;
        }
      }
    });

    // Pulse the glow light
    if (this.glowLight) {
      this.glowLight.intensity = 2 + Math.sin(this.time * 2) * 0.5;
    }
  }

  /**
   * Get the mesh group
   */
  getMesh(): THREE.Group {
    return this.group;
  }

  /**
   * Get position in front of the portal (for spawn point)
   */
  getSpawnPosition(): THREE.Vector3 {
    // Return position slightly in front of portal (positive Z = toward cottage)
    return new THREE.Vector3(0, 0, -3);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
