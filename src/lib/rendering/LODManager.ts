import * as THREE from 'three';

/**
 * Level of Detail configuration
 */
export interface LODLevel {
  /** Distance threshold from camera */
  distance: number;
  /** The object to show at this level */
  object: THREE.Object3D;
}

/**
 * LOD Group - manages multiple detail levels for a single object
 */
export class LODGroup {
  private group: THREE.Group;
  private levels: LODLevel[];
  private currentLevel: number = -1;

  constructor() {
    this.group = new THREE.Group();
    this.levels = [];
  }

  /**
   * Add a detail level
   * @param distance - Distance at which this level becomes visible
   * @param object - The object to show at this level
   */
  addLevel(distance: number, object: THREE.Object3D): this {
    // Hide by default
    object.visible = false;
    this.group.add(object);

    this.levels.push({ distance, object });
    // Sort by distance (closest first)
    this.levels.sort((a, b) => a.distance - b.distance);

    return this;
  }

  /**
   * Update LOD based on camera position
   */
  update(camera: THREE.Camera): void {
    if (this.levels.length === 0) return;

    // Calculate distance from camera to group
    const groupPosition = new THREE.Vector3();
    this.group.getWorldPosition(groupPosition);
    const distance = camera.position.distanceTo(groupPosition);

    // Find appropriate level
    let newLevel = this.levels.length - 1; // Default to lowest detail
    for (let i = 0; i < this.levels.length; i++) {
      if (distance < this.levels[i].distance) {
        newLevel = i;
        break;
      }
    }

    // Update visibility if level changed
    if (newLevel !== this.currentLevel) {
      // Hide previous level
      if (this.currentLevel >= 0 && this.currentLevel < this.levels.length) {
        this.levels[this.currentLevel].object.visible = false;
      }
      // Show new level
      this.levels[newLevel].object.visible = true;
      this.currentLevel = newLevel;
    }
  }

  /**
   * Force a specific LOD level (useful for view mode changes)
   */
  forceLevel(level: number): void {
    if (level < 0 || level >= this.levels.length) return;

    // Hide all
    for (const lvl of this.levels) {
      lvl.object.visible = false;
    }

    // Show selected
    this.levels[level].object.visible = true;
    this.currentLevel = level;
  }

  /**
   * Get the group containing all levels
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const level of this.levels) {
      level.object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          } else if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          }
        }
      });
    }
    this.levels = [];
  }
}

/**
 * LOD Manager - handles multiple LOD groups and batch updates
 */
export class LODManager {
  private lodGroups: Map<string, LODGroup> = new Map();
  private viewMode: 'isometric' | 'firstPerson' | 'transitioning' = 'isometric';

  /**
   * Register a new LOD group
   */
  register(id: string, lodGroup: LODGroup): void {
    this.lodGroups.set(id, lodGroup);
  }

  /**
   * Unregister and dispose a LOD group
   */
  unregister(id: string): void {
    const group = this.lodGroups.get(id);
    if (group) {
      group.dispose();
      this.lodGroups.delete(id);
    }
  }

  /**
   * Update all LOD groups based on camera
   */
  update(camera: THREE.Camera): void {
    for (const group of this.lodGroups.values()) {
      group.update(camera);
    }
  }

  /**
   * Set view mode - can force specific LOD levels
   * @param mode - The view mode
   * @param forceHighDetail - If true, force high detail in first person
   */
  setViewMode(mode: 'isometric' | 'firstPerson' | 'transitioning', forceHighDetail: boolean = true): void {
    this.viewMode = mode;

    if (forceHighDetail && mode === 'firstPerson') {
      // Force highest detail (level 0) in first person
      for (const group of this.lodGroups.values()) {
        group.forceLevel(0);
      }
    }
  }

  /**
   * Get current view mode
   */
  getViewMode(): 'isometric' | 'firstPerson' | 'transitioning' {
    return this.viewMode;
  }

  /**
   * Get a registered LOD group
   */
  get(id: string): LODGroup | undefined {
    return this.lodGroups.get(id);
  }

  /**
   * Dispose all LOD groups
   */
  dispose(): void {
    for (const group of this.lodGroups.values()) {
      group.dispose();
    }
    this.lodGroups.clear();
  }
}

/**
 * Create simplified geometry variants for LOD
 */
export const LODGeometryUtils = {
  /**
   * Create a simplified box to replace complex geometry
   */
  createSimplifiedBox(width: number, height: number, depth: number, color: number | THREE.Color): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
    });
    return new THREE.Mesh(geo, mat);
  },

  /**
   * Reduce geometry detail by simplifying
   */
  simplifyGeometry(geometry: THREE.BufferGeometry, targetRatio: number = 0.5): THREE.BufferGeometry {
    // Simple approach: just return a copy for now
    // In production, you'd use a mesh simplification algorithm
    return geometry.clone();
  },

  /**
   * Create impostor (billboard) for very far distances
   */
  createImpostor(width: number, height: number, color: number | THREE.Color): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geo, mat);
  },
};

// Export singleton manager
export const lodManager = new LODManager();
