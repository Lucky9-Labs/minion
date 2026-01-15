import * as THREE from 'three';

/**
 * Configuration for day/night cycle
 */
export interface DayNightConfig {
  /** Duration of full day cycle in seconds */
  cycleDuration: number;
  /** Radius of sun orbit */
  sunOrbitRadius: number;
  /** Height of sun at noon */
  sunHeight: number;
  /** Shadow map resolution (lower = more pixelated/low-poly) */
  shadowMapSize: number;
  /** Shadow camera frustum size */
  shadowFrustum: number;
}

export const DEFAULT_DAY_NIGHT_CONFIG: DayNightConfig = {
  cycleDuration: 300, // 5 minute full day cycle (slower)
  sunOrbitRadius: 50,
  sunHeight: 40,
  shadowMapSize: 256, // Very low res for performance (was 512)
  shadowFrustum: 50,  // Smaller frustum
};

/**
 * Sky color presets for different times of day
 */
const SKY_COLORS = {
  dawn: new THREE.Color(0xffb366), // Orange-pink
  morning: new THREE.Color(0x87ceeb), // Light blue
  noon: new THREE.Color(0x5fa8d3), // Bright blue
  afternoon: new THREE.Color(0x87ceeb), // Light blue
  dusk: new THREE.Color(0xff7f50), // Coral orange
  night: new THREE.Color(0x1e2d4a), // Dark blue but not black
};

/**
 * Ambient light colors/intensities for different times
 * Higher ambient = more diffuse, softer shadows
 */
const AMBIENT_SETTINGS = {
  dawn: { color: 0xffd4a6, intensity: 0.4 },    // Soft diffuse dawn light
  morning: { color: 0xffffff, intensity: 0.35 },
  noon: { color: 0xffffff, intensity: 0.3 },     // Still some ambient even at noon
  afternoon: { color: 0xfff8e7, intensity: 0.35 },
  dusk: { color: 0xffa07a, intensity: 0.45 },    // Very diffuse at dusk
  night: { color: 0x4a6080, intensity: 0.5 },    // High ambient for soft moonlight
};

/**
 * Shadow softness settings for different times
 * Higher radius = softer shadows (PCF antialiasing effect)
 * Values in range 1-4 are industry standard for real-time shadows
 * Larger radius at dawn/dusk/night accounts for diffuse light at those times
 */
const SHADOW_SETTINGS = {
  dawn: { radius: 3.0, intensity: 0.6 },     // Very soft at sunrise
  morning: { radius: 2.0, intensity: 0.75 }, // Soft morning shadows
  noon: { radius: 1.2, intensity: 0.9 },     // Crisper at noon
  afternoon: { radius: 2.0, intensity: 0.75 }, // Soft afternoon shadows
  dusk: { radius: 3.0, intensity: 0.5 },     // Very soft at sunset
  night: { radius: 3.5, intensity: 0.3 },    // Softest for moonlight
};

/**
 * Sun light colors/intensities - dominant light source
 * Strong directional light for visible facets and shadows
 */
const SUN_SETTINGS = {
  dawn: { color: 0xffaa66, intensity: 1.8 },
  morning: { color: 0xfff5e6, intensity: 2.5 },
  noon: { color: 0xfffef0, intensity: 3.0 },
  afternoon: { color: 0xfff8dc, intensity: 2.5 },
  dusk: { color: 0xff6347, intensity: 1.5 },
  night: { color: 0x6080a0, intensity: 0.15 }, // Moonlight
};

/**
 * Day/night cycle controller with rotating sun and dynamic lighting
 */
export class DayNightCycle {
  private config: DayNightConfig;
  private scene: THREE.Scene;

  // Lighting components
  private sunLight: THREE.DirectionalLight;
  private moonLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;

  // State
  private timeOfDay: number = 0.25; // 0-1, starts at morning (0.25)

  constructor(scene: THREE.Scene, config: DayNightConfig = DEFAULT_DAY_NIGHT_CONFIG) {
    this.config = config;
    this.scene = scene;

    // Create sun visual (low-poly icosahedron)
    const sunGeo = new THREE.IcosahedronGeometry(3, 0); // 0 detail = low poly
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(this.sunMesh);

    // Create moon visual
    const moonGeo = new THREE.IcosahedronGeometry(2, 0);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xccccdd,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moonMesh);

    // Create directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.sunLight.castShadow = true;

    // Configure shadow map for low-poly look
    this.sunLight.shadow.mapSize.width = config.shadowMapSize;
    this.sunLight.shadow.mapSize.height = config.shadowMapSize;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 200;
    this.sunLight.shadow.camera.left = -config.shadowFrustum;
    this.sunLight.shadow.camera.right = config.shadowFrustum;
    this.sunLight.shadow.camera.top = config.shadowFrustum;
    this.sunLight.shadow.camera.bottom = -config.shadowFrustum;

    // Optimize shadow bias for PCF soft shadow mapping
    // Dynamic bias scaled to shadow map size (smaller bias for high-res maps)
    const baseBias = -0.0001;
    const shadowMapScale = 2048 / config.shadowMapSize; // Scale to standard 2048px baseline
    this.sunLight.shadow.bias = baseBias * shadowMapScale;

    // Normal bias prevents peter-panning (shadows detached from objects)
    // Scales with shadow radius which changes per time of day
    this.sunLight.shadow.normalBias = 0.02;

    // Shadow radius will be updated dynamically per frame based on time of day
    // See update() method for application
    this.sunLight.shadow.radius = 1;

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Create moon directional light (no shadows - too expensive)
    this.moonLight = new THREE.DirectionalLight(0x6688aa, 0.3);
    this.moonLight.castShadow = false; // Disabled for performance

    // Configure moon shadow map (smaller than sun for performance)
    this.moonLight.shadow.mapSize.width = config.shadowMapSize / 2;
    this.moonLight.shadow.mapSize.height = config.shadowMapSize / 2;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 200;
    this.moonLight.shadow.camera.left = -config.shadowFrustum;
    this.moonLight.shadow.camera.right = config.shadowFrustum;
    this.moonLight.shadow.camera.top = config.shadowFrustum;
    this.moonLight.shadow.camera.bottom = -config.shadowFrustum;
    this.moonLight.shadow.bias = -0.001;
    this.moonLight.shadow.normalBias = 0.02;
    this.moonLight.shadow.radius = 12; // Very soft moon shadows

    scene.add(this.moonLight);
    scene.add(this.moonLight.target);

    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(this.ambientLight);

    // Initial update
    this.update(0);
  }

  /**
   * Update the day/night cycle
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    // Advance time of day
    this.timeOfDay += deltaTime / this.config.cycleDuration;
    if (this.timeOfDay > 1) this.timeOfDay -= 1;

    // Calculate sun angle (0 = midnight/sun below, 0.5 = noon/sun at top)
    // Offset by -0.5 so noon (0.5) maps to angle 0 where cos=1 (sun at max height)
    const sunAngle = (this.timeOfDay - 0.5) * Math.PI * 2;

    // Position sun on orbit - sun rises in east, peaks at noon, sets in west
    const sunX = Math.sin(sunAngle) * this.config.sunOrbitRadius;
    const sunY = Math.cos(sunAngle) * this.config.sunHeight; // Now correct: high at noon, low at midnight
    const sunZ = Math.sin(sunAngle) * this.config.sunOrbitRadius * 0.3; // Slight tilt for variety

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    // Position moon opposite to sun
    const moonX = -sunX;
    const moonY = -sunY + 20;
    const moonZ = -sunZ;
    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonMesh.visible = sunY < 10; // Only visible at night

    // Update moon light position and intensity
    this.moonLight.position.set(moonX, moonY, moonZ);
    this.moonLight.target.position.set(0, 0, 0);
    // Moon light only active at night (when moon is high enough)
    const moonIntensity = moonY > 5 ? 0.25 * (moonY / 30) : 0;
    this.moonLight.intensity = Math.min(0.3, moonIntensity);

    // Get current time period
    const period = this.getTimePeriod();

    // Update sky color
    const skyColor = this.getSkyColor();
    this.scene.background = skyColor;

    // Update ambient light
    const ambient = this.getAmbientSettings();
    this.ambientLight.color.setHex(ambient.color);
    this.ambientLight.intensity = ambient.intensity;

    // Update sun light
    const sun = this.getSunSettings();
    this.sunLight.color.setHex(sun.color);
    this.sunLight.intensity = Math.max(0, sun.intensity * Math.max(0, sunY / this.config.sunHeight));

    // Apply time-of-day shadow softness (softer at dawn/dusk/night)
    const shadowSettings = this.getShadowSettings();
    this.sunLight.shadow.radius = shadowSettings.radius;

    // Sun mesh color based on time
    const sunVisualColor = sunY > 0
      ? this.lerpColor(0xffdd44, 0xff6633, Math.max(0, 1 - sunY / 30))
      : 0xff6633;
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setHex(sunVisualColor);
    this.sunMesh.visible = sunY > -10;
  }

  /**
   * Get current time period (dawn, morning, noon, etc.)
   */
  private getTimePeriod(): keyof typeof SKY_COLORS {
    const t = this.timeOfDay;

    if (t < 0.2) return 'night';
    if (t < 0.25) return 'dawn';
    if (t < 0.4) return 'morning';
    if (t < 0.6) return 'noon';
    if (t < 0.75) return 'afternoon';
    if (t < 0.8) return 'dusk';
    return 'night';
  }

  /**
   * Get interpolated sky color for current time
   */
  private getSkyColor(): THREE.Color {
    const t = this.timeOfDay;

    // Define key times and their colors
    const keyframes = [
      { time: 0.0, color: SKY_COLORS.night },
      { time: 0.2, color: SKY_COLORS.night },
      { time: 0.25, color: SKY_COLORS.dawn },
      { time: 0.35, color: SKY_COLORS.morning },
      { time: 0.5, color: SKY_COLORS.noon },
      { time: 0.65, color: SKY_COLORS.afternoon },
      { time: 0.75, color: SKY_COLORS.dusk },
      { time: 0.8, color: SKY_COLORS.night },
      { time: 1.0, color: SKY_COLORS.night },
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
    return prev.color.clone().lerp(next.color, blend);
  }

  /**
   * Get ambient light settings for current time
   */
  private getAmbientSettings(): { color: number; intensity: number } {
    const period = this.getTimePeriod();
    return AMBIENT_SETTINGS[period];
  }

  /**
   * Get sun light settings for current time
   */
  private getSunSettings(): { color: number; intensity: number } {
    const period = this.getTimePeriod();
    return SUN_SETTINGS[period];
  }

  /**
   * Get shadow settings for current time (softer at dawn/dusk/night)
   */
  private getShadowSettings(): { radius: number; intensity: number } {
    const period = this.getTimePeriod();
    return SHADOW_SETTINGS[period];
  }

  /**
   * Lerp between two hex colors
   */
  private lerpColor(c1: number, c2: number, t: number): number {
    const color1 = new THREE.Color(c1);
    const color2 = new THREE.Color(c2);
    color1.lerp(color2, t);
    return color1.getHex();
  }

  /**
   * Set time of day directly (0-1, where 0.5 is noon)
   */
  setTimeOfDay(time: number): void {
    this.timeOfDay = time % 1;
  }

  /**
   * Get current time of day (0-1)
   */
  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  /**
   * Get the sun light for external configuration
   */
  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  /**
   * Get the ambient light for external configuration
   */
  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  /**
   * Set shadow map resolution dynamically (for performance optimization)
   * Lower values = better performance, more pixelated shadows
   */
  setShadowMapSize(size: number): void {
    this.sunLight.shadow.mapSize.width = size;
    this.sunLight.shadow.mapSize.height = size;
    // Force shadow map regeneration
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.scene.remove(this.sunMesh);
    this.scene.remove(this.moonMesh);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.sunLight.target);
    this.scene.remove(this.moonLight);
    this.scene.remove(this.moonLight.target);
    this.scene.remove(this.ambientLight);

    this.sunMesh.geometry.dispose();
    (this.sunMesh.material as THREE.Material).dispose();
    this.moonMesh.geometry.dispose();
    (this.moonMesh.material as THREE.Material).dispose();
  }
}
