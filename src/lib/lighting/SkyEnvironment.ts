import * as THREE from 'three';

/**
 * Configuration for sky environment
 */
export interface SkyEnvironmentConfig {
  /** Radius of sky dome */
  domeRadius: number;
  /** Number of cloud clusters */
  cloudCount: number;
  /** Number of stars for night sky */
  starCount: number;
  /** Distance range for clouds from center */
  cloudDistanceMin: number;
  cloudDistanceMax: number;
  /** Height range for clouds */
  cloudHeightMin: number;
  cloudHeightMax: number;
}

export const DEFAULT_SKY_CONFIG: SkyEnvironmentConfig = {
  domeRadius: 200,
  cloudCount: 12,
  starCount: 800,
  cloudDistanceMin: 50,
  cloudDistanceMax: 120,
  cloudHeightMin: -10,
  cloudHeightMax: 40,
};

/**
 * Sky color presets for gradient sky dome
 */
const SKY_GRADIENTS = {
  dawn: {
    zenith: new THREE.Color(0x4a6fa5),
    horizon: new THREE.Color(0xffb366),
    bottom: new THREE.Color(0x2d3a4a),
  },
  morning: {
    zenith: new THREE.Color(0x4a90d9),
    horizon: new THREE.Color(0x87ceeb),
    bottom: new THREE.Color(0x3d5a80),
  },
  noon: {
    zenith: new THREE.Color(0x1e90ff),
    horizon: new THREE.Color(0x87ceeb),
    bottom: new THREE.Color(0x4a6fa5),
  },
  afternoon: {
    zenith: new THREE.Color(0x5fa8d3),
    horizon: new THREE.Color(0x98d1f5),
    bottom: new THREE.Color(0x3d5a80),
  },
  dusk: {
    zenith: new THREE.Color(0x4a3f6b),
    horizon: new THREE.Color(0xff7f50),
    bottom: new THREE.Color(0x2d2a4a),
  },
  night: {
    zenith: new THREE.Color(0x0a0a1a),
    horizon: new THREE.Color(0x1a1a2e),
    bottom: new THREE.Color(0x050510),
  },
};

/**
 * Cloud data for tracking position and animation
 */
interface CloudData {
  mesh: THREE.Group;
  baseY: number;
  bobPhase: number;
  bobSpeed: number;
  bobAmount: number;
  // Orbital movement
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
}

/**
 * Sky environment system with gradient dome, clouds, and stars
 * Integrates with DayNightCycle for time-aware rendering
 */
export class SkyEnvironment {
  private config: SkyEnvironmentConfig;
  private scene: THREE.Scene;

  // Sky dome
  private skyDome!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;

  // Clouds
  private clouds: CloudData[] = [];
  private cloudGroup!: THREE.Group;

  // Stars
  private stars!: THREE.Points;
  private starMaterial!: THREE.ShaderMaterial;

  // State
  private currentTimeOfDay: number = 0.5;

  constructor(scene: THREE.Scene, config: SkyEnvironmentConfig = DEFAULT_SKY_CONFIG) {
    this.config = config;
    this.scene = scene;

    // Create cloud group
    this.cloudGroup = new THREE.Group();
    scene.add(this.cloudGroup);

    // Build sky components
    this.skyDome = this.buildSkyDome();
    this.stars = this.buildStars();
    this.buildClouds();

    // Initial update
    this.update(0.5, 0);
  }

  /**
   * Build sky dome with gradient shader
   */
  private buildSkyDome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.config.domeRadius, 32, 16);

    // Custom shader for gradient sky
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: SKY_GRADIENTS.noon.zenith },
        horizonColor: { value: SKY_GRADIENTS.noon.horizon },
        bottomColor: { value: SKY_GRADIENTS.noon.bottom },
        horizonSharpness: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform float horizonSharpness;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color;
          if (h > 0.0) {
            // Above horizon - blend to zenith
            float t = pow(h, horizonSharpness);
            color = mix(horizonColor, topColor, t);
          } else {
            // Below horizon - blend to bottom
            float t = pow(-h, 0.5);
            color = mix(horizonColor, bottomColor, t);
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const dome = new THREE.Mesh(geometry, this.skyMaterial);
    dome.renderOrder = -1000; // Render first (behind everything)
    this.scene.add(dome);

    return dome;
  }

  /**
   * Build star field for night sky
   */
  private buildStars(): THREE.Points {
    const { starCount, domeRadius } = this.config;

    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    // Distribute stars on inner dome surface (upper hemisphere only)
    for (let i = 0; i < starCount; i++) {
      // Random point on upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.1); // Mostly above horizon

      const r = domeRadius * 0.95;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Vary star sizes
      sizes[i] = 0.5 + Math.random() * 2.0;

      // Random twinkle phase
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        attribute float size;
        attribute float phase;
        varying float vPhase;
        varying float vSize;

        void main() {
          vPhase = phase;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 color;
        varying float vPhase;
        varying float vSize;

        void main() {
          // Circular point
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Twinkle effect
          float twinkle = 0.5 + 0.5 * sin(time * 2.0 + vPhase * 10.0);
          twinkle = mix(0.3, 1.0, twinkle);

          // Soft edge
          float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
          alpha *= opacity * twinkle;

          // Brighter center
          float brightness = 1.0 + (1.0 - dist * 2.0) * 0.5;

          gl_FragColor = vec4(color * brightness, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, this.starMaterial);
    stars.renderOrder = -999; // After sky dome
    this.scene.add(stars);

    return stars;
  }

  /**
   * Build moving cloud clusters
   */
  private buildClouds(): void {
    const { cloudCount, cloudDistanceMin, cloudDistanceMax, cloudHeightMin, cloudHeightMax } = this.config;

    for (let i = 0; i < cloudCount; i++) {
      // Position clouds in a ring around the island
      const angle = (i / cloudCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const distance = cloudDistanceMin + Math.random() * (cloudDistanceMax - cloudDistanceMin);
      const height = cloudHeightMin + Math.random() * (cloudHeightMax - cloudHeightMin);

      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const cloud = this.buildCloudCluster();
      cloud.position.set(x, height, z);
      cloud.rotation.y = Math.random() * Math.PI * 2;

      // Scale variation
      const scale = 0.8 + Math.random() * 0.8;
      cloud.scale.setScalar(scale);

      this.cloudGroup.add(cloud);

      // Store orbital data for movement
      this.clouds.push({
        mesh: cloud,
        baseY: height,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.3 + Math.random() * 0.3,
        bobAmount: 0.5 + Math.random() * 1.0,
        // Orbital movement - slow drift around the island
        orbitAngle: angle,
        orbitRadius: distance,
        orbitSpeed: 0.01 + Math.random() * 0.02, // Very slow rotation
      });
    }
  }

  /**
   * Build a single cloud cluster from layered spheres - transparent and fluffy
   */
  private buildCloudCluster(): THREE.Group {
    const group = new THREE.Group();

    // Cloud material - transparent and soft
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x333333,
      emissiveIntensity: 0.15,
      flatShading: true,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    cloudMat.userData.isCloudMaterial = true;

    // Create fluffy cloud from multiple spheres - low poly
    const numPuffs = 4 + Math.floor(Math.random() * 3);

    // Main body
    for (let i = 0; i < numPuffs; i++) {
      const size = 4 + Math.random() * 5;
      // Use icosahedron with detail 0 for lowest poly count
      const puffGeo = new THREE.IcosahedronGeometry(size, 0);
      const puff = new THREE.Mesh(puffGeo, cloudMat);

      // Position puffs to form cloud shape
      const spreadX = (Math.random() - 0.5) * 12;
      const spreadY = (Math.random() - 0.5) * 4;
      const spreadZ = (Math.random() - 0.5) * 8;

      puff.position.set(spreadX, spreadY, spreadZ);
      puff.scale.y = 0.4 + Math.random() * 0.3; // Flatten vertically

      group.add(puff);
    }

    return group;
  }

  /**
   * Update sky environment based on time of day
   * @param timeOfDay 0-1 where 0.5 is noon
   * @param deltaTime Time since last frame
   */
  update(timeOfDay: number, deltaTime: number): void {
    this.currentTimeOfDay = timeOfDay;

    // Update sky dome colors
    this.updateSkyColors(timeOfDay);

    // Update star visibility and animation
    this.updateStars(timeOfDay, deltaTime);

    // Update cloud positions (gentle bob) and colors
    this.updateClouds(timeOfDay, deltaTime);
  }

  /**
   * Update sky dome gradient colors based on time
   */
  private updateSkyColors(timeOfDay: number): void {
    const gradient = this.getGradientForTime(timeOfDay);

    this.skyMaterial.uniforms.topColor.value.copy(gradient.zenith);
    this.skyMaterial.uniforms.horizonColor.value.copy(gradient.horizon);
    this.skyMaterial.uniforms.bottomColor.value.copy(gradient.bottom);
  }

  /**
   * Get interpolated sky gradient for time of day
   */
  private getGradientForTime(t: number): { zenith: THREE.Color; horizon: THREE.Color; bottom: THREE.Color } {
    // Define keyframes
    const keyframes = [
      { time: 0.0, gradient: SKY_GRADIENTS.night },
      { time: 0.2, gradient: SKY_GRADIENTS.night },
      { time: 0.25, gradient: SKY_GRADIENTS.dawn },
      { time: 0.35, gradient: SKY_GRADIENTS.morning },
      { time: 0.5, gradient: SKY_GRADIENTS.noon },
      { time: 0.65, gradient: SKY_GRADIENTS.afternoon },
      { time: 0.75, gradient: SKY_GRADIENTS.dusk },
      { time: 0.8, gradient: SKY_GRADIENTS.night },
      { time: 1.0, gradient: SKY_GRADIENTS.night },
    ];

    // Find surrounding keyframes
    let prev = keyframes[0];
    let next = keyframes[1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
        prev = keyframes[i];
        next = keyframes[i + 1];
        break;
      }
    }

    // Interpolate
    const blend = (t - prev.time) / (next.time - prev.time);

    return {
      zenith: prev.gradient.zenith.clone().lerp(next.gradient.zenith, blend),
      horizon: prev.gradient.horizon.clone().lerp(next.gradient.horizon, blend),
      bottom: prev.gradient.bottom.clone().lerp(next.gradient.bottom, blend),
    };
  }

  /**
   * Update stars visibility and twinkling
   */
  private updateStars(timeOfDay: number, deltaTime: number): void {
    // Stars visible at night (0-0.22 and 0.78-1.0)
    let starOpacity = 0;
    if (timeOfDay < 0.22) {
      starOpacity = 1 - (timeOfDay / 0.22);
    } else if (timeOfDay > 0.78) {
      starOpacity = (timeOfDay - 0.78) / 0.22;
    }

    this.starMaterial.uniforms.opacity.value = starOpacity;
    this.starMaterial.uniforms.time.value += deltaTime;
  }

  /**
   * Update cloud positions (orbital + bob) and colors
   */
  private updateClouds(timeOfDay: number, deltaTime: number): void {
    // Cloud color and opacity based on time of day
    let cloudColor: THREE.Color;
    let emissive: THREE.Color;
    let emissiveIntensity: number;
    let targetOpacity: number;

    if (timeOfDay < 0.22 || timeOfDay > 0.8) {
      // Night - darker, more transparent clouds
      cloudColor = new THREE.Color(0x3a3a4a);
      emissive = new THREE.Color(0x111122);
      emissiveIntensity = 0.15;
      targetOpacity = 0.4;
    } else if (timeOfDay < 0.28 || timeOfDay > 0.72) {
      // Dawn/dusk - orange tinted, slightly more visible
      cloudColor = new THREE.Color(0xffccaa);
      emissive = new THREE.Color(0xff6633);
      emissiveIntensity = 0.35;
      targetOpacity = 0.7;
    } else {
      // Day - white, fluffy clouds
      cloudColor = new THREE.Color(0xffffff);
      emissive = new THREE.Color(0x444444);
      emissiveIntensity = 0.15;
      targetOpacity = 0.65;
    }

    // Update cloud materials and positions
    for (const cloudData of this.clouds) {
      // Orbital movement - slow drift around the island
      cloudData.orbitAngle += cloudData.orbitSpeed * deltaTime;
      const x = Math.cos(cloudData.orbitAngle) * cloudData.orbitRadius;
      const z = Math.sin(cloudData.orbitAngle) * cloudData.orbitRadius;

      // Bob animation (vertical)
      cloudData.bobPhase += cloudData.bobSpeed * deltaTime;
      const bobOffset = Math.sin(cloudData.bobPhase) * cloudData.bobAmount;
      const y = cloudData.baseY + bobOffset;

      // Apply position
      cloudData.mesh.position.set(x, y, z);

      // Slowly rotate the cloud itself for more organic movement
      cloudData.mesh.rotation.y += deltaTime * 0.02;

      // Update material colors and opacity
      cloudData.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.userData?.isCloudMaterial) {
            mat.color.lerp(cloudColor, deltaTime * 2);
            mat.emissive.lerp(emissive, deltaTime * 2);
            mat.emissiveIntensity = THREE.MathUtils.lerp(
              mat.emissiveIntensity,
              emissiveIntensity,
              deltaTime * 2
            );
            mat.opacity = THREE.MathUtils.lerp(
              mat.opacity,
              targetOpacity,
              deltaTime * 2
            );
          }
        }
      });
    }
  }

  /**
   * Get current time of day
   */
  getTimeOfDay(): number {
    return this.currentTimeOfDay;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    // Dispose sky dome
    this.scene.remove(this.skyDome);
    this.skyDome.geometry.dispose();
    this.skyMaterial.dispose();

    // Dispose stars
    this.scene.remove(this.stars);
    this.stars.geometry.dispose();
    this.starMaterial.dispose();

    // Dispose clouds
    this.scene.remove(this.cloudGroup);
    for (const cloudData of this.clouds) {
      cloudData.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
    this.clouds = [];
  }
}
