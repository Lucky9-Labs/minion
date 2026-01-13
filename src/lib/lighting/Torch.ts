import * as THREE from 'three';

/**
 * Configuration for torch light
 */
export interface TorchConfig {
  /** Light color */
  color: number;
  /** Light intensity when active */
  intensity: number;
  /** Light distance/radius */
  distance: number;
  /** Light decay */
  decay: number;
  /** Whether to cast shadows (expensive) */
  castShadow: boolean;
  /** Shadow map size (lower = more pixelated) */
  shadowMapSize: number;
}

export const DEFAULT_TORCH_CONFIG: TorchConfig = {
  color: 0xff9944,
  intensity: 1.5,
  distance: 12,
  decay: 2,
  castShadow: false, // Disabled to stay within WebGL texture unit limits
  shadowMapSize: 128,
};

/**
 * Torch entity with flame mesh and point light
 * Low-poly style with flickering effect
 */
export class Torch {
  public readonly group: THREE.Group;
  public readonly light: THREE.PointLight;

  private config: TorchConfig;
  private flameMesh: THREE.Mesh;
  private flickerTime: number = 0;
  private isLit: boolean = false;
  private targetIntensity: number = 0;

  constructor(config: TorchConfig = DEFAULT_TORCH_CONFIG) {
    this.config = config;
    this.group = new THREE.Group();

    // Create torch stick (low-poly cylinder)
    const stickGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 4);
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      flatShading: true,
    });
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 0.25;
    this.group.add(stick);

    // Create flame (low-poly tetrahedron)
    const flameGeo = new THREE.TetrahedronGeometry(0.12, 0);
    const flameMat = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.9,
    });
    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.position.y = 0.55;
    this.flameMesh.visible = false;
    this.group.add(this.flameMesh);

    // Create point light
    this.light = new THREE.PointLight(
      config.color,
      0, // Start off
      config.distance,
      config.decay
    );
    this.light.position.y = 0.55;

    // Configure shadows if enabled
    if (config.castShadow) {
      this.light.castShadow = true;
      this.light.shadow.mapSize.width = config.shadowMapSize;
      this.light.shadow.mapSize.height = config.shadowMapSize;
      this.light.shadow.camera.near = 0.1;
      this.light.shadow.camera.far = config.distance;
      this.light.shadow.bias = -0.005;
    }

    this.group.add(this.light);
  }

  /**
   * Set whether the torch is lit
   */
  setLit(lit: boolean): void {
    this.isLit = lit;
    this.targetIntensity = lit ? this.config.intensity : 0;
    this.flameMesh.visible = lit;
  }

  /**
   * Check if torch is currently lit
   */
  getIsLit(): boolean {
    return this.isLit;
  }

  /**
   * Update torch (call every frame)
   * Handles flickering and smooth on/off transitions
   */
  update(deltaTime: number): void {
    // Smooth intensity transition
    const currentIntensity = this.light.intensity;
    const diff = this.targetIntensity - currentIntensity;

    if (Math.abs(diff) > 0.01) {
      this.light.intensity += diff * deltaTime * 5;
    } else {
      this.light.intensity = this.targetIntensity;
    }

    // Flickering effect when lit
    if (this.isLit && this.light.intensity > 0.1) {
      this.flickerTime += deltaTime;

      // Multi-frequency flicker for natural look
      const flicker1 = Math.sin(this.flickerTime * 15) * 0.1;
      const flicker2 = Math.sin(this.flickerTime * 23) * 0.05;
      const flicker3 = Math.sin(this.flickerTime * 7) * 0.08;

      const flickerAmount = 1 + flicker1 + flicker2 + flicker3;
      this.light.intensity = this.targetIntensity * flickerAmount;

      // Animate flame mesh
      this.flameMesh.rotation.y += deltaTime * 3;
      this.flameMesh.scale.y = 0.8 + Math.sin(this.flickerTime * 12) * 0.2;
    }
  }

  /**
   * Dispose of torch resources
   */
  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    // Safely dispose shadow map if it exists
    try {
      if (this.light?.shadow?.map) {
        this.light.shadow.map.dispose();
      }
    } catch {
      // Shadow map may not be initialized
    }
  }
}

/**
 * Manages multiple torches and their night-time activation
 */
export class TorchManager {
  private torches: Map<string, Torch> = new Map();
  private isNightTime: boolean = false;

  /**
   * Create and register a new torch
   */
  createTorch(id: string, config?: TorchConfig): Torch {
    const torch = new Torch(config);
    this.torches.set(id, torch);

    // Set initial lit state based on current time
    torch.setLit(this.isNightTime);

    return torch;
  }

  /**
   * Remove a torch
   */
  removeTorch(id: string): void {
    const torch = this.torches.get(id);
    if (torch) {
      torch.dispose();
      this.torches.delete(id);
    }
  }

  /**
   * Get a torch by ID
   */
  getTorch(id: string): Torch | undefined {
    return this.torches.get(id);
  }

  /**
   * Update all torches based on time of day
   * @param timeOfDay 0-1 where 0.5 is noon
   * @param deltaTime Frame delta time
   */
  update(timeOfDay: number, deltaTime: number): void {
    // Determine if it's night time
    // Night is roughly 0-0.2 and 0.8-1.0
    const wasNightTime = this.isNightTime;
    this.isNightTime = timeOfDay < 0.22 || timeOfDay > 0.78;

    // Toggle torches if night state changed
    if (this.isNightTime !== wasNightTime) {
      this.torches.forEach((torch) => {
        torch.setLit(this.isNightTime);
      });
    }

    // Update all torches
    this.torches.forEach((torch) => {
      torch.update(deltaTime);
    });
  }

  /**
   * Check if it's currently night time
   */
  getIsNightTime(): boolean {
    return this.isNightTime;
  }

  /**
   * Dispose of all torches
   */
  dispose(): void {
    this.torches.forEach((torch) => torch.dispose());
    this.torches.clear();
  }
}
