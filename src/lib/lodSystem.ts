import * as THREE from 'three';
import { vec3Pool } from './vectorPool';

/**
 * Level of Detail (LOD) system for distance-based rendering optimization.
 *
 * Manages which entities are visible and at what detail level based on
 * camera distance. Supports frustum culling, distance culling, and
 * multi-tier LOD levels.
 */

export interface LODConfig {
  /** Distance thresholds for each LOD level */
  distances: {
    high: number;
    medium: number;
    low: number;
    cull: number;
  };
  /** Whether to enable frustum culling */
  frustumCulling: boolean;
  /** Hysteresis to prevent LOD flickering at boundaries */
  hysteresis: number;
}

export type LODLevel = 'high' | 'medium' | 'low' | 'culled';

const DEFAULT_CONFIG: LODConfig = {
  distances: {
    high: 10,
    medium: 25,
    low: 50,
    cull: 80,
  },
  frustumCulling: true,
  hysteresis: 1.5, // 1.5 unit buffer to prevent flickering
};

// First-person mode uses tighter distances
const FIRST_PERSON_CONFIG: LODConfig = {
  distances: {
    high: 8,
    medium: 20,
    low: 40,
    cull: 60,
  },
  frustumCulling: true,
  hysteresis: 1.0,
};

/**
 * LOD Manager - tracks camera and calculates LOD levels for entities.
 */
class LODManager {
  private config: LODConfig = DEFAULT_CONFIG;
  private frustum = new THREE.Frustum();
  private projScreenMatrix = new THREE.Matrix4();
  private cameraPosition = new THREE.Vector3();
  private isFirstPerson = false;

  // Cache LOD levels to reduce recalculation
  private lodCache = new Map<string, { level: LODLevel; distance: number }>();

  /**
   * Update camera reference. Call once per frame before LOD calculations.
   */
  updateCamera(camera: THREE.Camera): void {
    this.cameraPosition.copy(camera.position);

    if (this.config.frustumCulling) {
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    }
  }

  /**
   * Set whether we're in first-person mode (uses tighter distances).
   */
  setFirstPersonMode(enabled: boolean): void {
    if (this.isFirstPerson !== enabled) {
      this.isFirstPerson = enabled;
      this.config = enabled ? FIRST_PERSON_CONFIG : DEFAULT_CONFIG;
      this.lodCache.clear(); // Clear cache when mode changes
    }
  }

  /**
   * Get the LOD level for an entity at a given position.
   */
  getLODLevel(entityId: string, position: THREE.Vector3): LODLevel {
    const cached = this.lodCache.get(entityId);
    const distance = this.cameraPosition.distanceTo(position);

    // Check cache with hysteresis
    if (cached) {
      const levelChanged = this.shouldChangeLevel(cached.level, distance, cached.distance);
      if (!levelChanged) {
        // Update distance but keep level
        this.lodCache.set(entityId, { level: cached.level, distance });
        return cached.level;
      }
    }

    // Calculate new LOD level
    const level = this.calculateLevel(position, distance);
    this.lodCache.set(entityId, { level, distance });
    return level;
  }

  /**
   * Batch calculate LOD levels for multiple entities.
   */
  batchGetLODLevels(
    entities: Array<{ id: string; position: THREE.Vector3 }>
  ): Map<string, LODLevel> {
    const results = new Map<string, LODLevel>();

    for (const entity of entities) {
      results.set(entity.id, this.getLODLevel(entity.id, entity.position));
    }

    return results;
  }

  /**
   * Check if an entity should change LOD level (includes hysteresis).
   */
  private shouldChangeLevel(
    currentLevel: LODLevel,
    newDistance: number,
    oldDistance: number
  ): boolean {
    const { distances, hysteresis } = this.config;

    // If moving away, require crossing threshold + hysteresis
    // If moving closer, require crossing threshold - hysteresis
    const movingAway = newDistance > oldDistance;
    const buffer = movingAway ? hysteresis : -hysteresis;

    switch (currentLevel) {
      case 'high':
        return newDistance > distances.high + buffer;
      case 'medium':
        return newDistance < distances.high - buffer ||
               newDistance > distances.medium + buffer;
      case 'low':
        return newDistance < distances.medium - buffer ||
               newDistance > distances.low + buffer;
      case 'culled':
        return newDistance < distances.cull - buffer;
      default:
        return true;
    }
  }

  /**
   * Calculate LOD level based on distance and frustum.
   */
  private calculateLevel(position: THREE.Vector3, distance: number): LODLevel {
    const { distances, frustumCulling } = this.config;

    // Check frustum culling first (cheapest rejection)
    if (frustumCulling && !this.frustum.containsPoint(position)) {
      return 'culled';
    }

    // Distance-based LOD
    if (distance >= distances.cull) {
      return 'culled';
    }
    if (distance >= distances.low) {
      return 'low';
    }
    if (distance >= distances.medium) {
      return 'medium';
    }
    return 'high';
  }

  /**
   * Check if a point is within the camera frustum.
   */
  isInFrustum(position: THREE.Vector3): boolean {
    return this.frustum.containsPoint(position);
  }

  /**
   * Check if a bounding sphere is within the camera frustum.
   */
  isSphereInFrustum(center: THREE.Vector3, radius: number): boolean {
    // Create sphere from pool
    const sphere = { center, radius };
    return this.frustum.intersectsSphere(sphere as THREE.Sphere);
  }

  /**
   * Get distance from camera to a point.
   */
  getDistanceToCamera(position: THREE.Vector3): number {
    return this.cameraPosition.distanceTo(position);
  }

  /**
   * Clear the LOD cache. Call when entities are added/removed.
   */
  clearCache(): void {
    this.lodCache.clear();
  }

  /**
   * Remove a specific entity from the cache.
   */
  removeFromCache(entityId: string): void {
    this.lodCache.delete(entityId);
  }

  /**
   * Get current LOD configuration (for debugging).
   */
  getConfig(): LODConfig {
    return { ...this.config };
  }

  /**
   * Override LOD distances (for testing or user preferences).
   */
  setDistances(distances: Partial<LODConfig['distances']>): void {
    this.config.distances = { ...this.config.distances, ...distances };
    this.lodCache.clear();
  }
}

// Singleton instance
export const lodManager = new LODManager();

/**
 * React hook for LOD-aware components.
 * Returns the current LOD level for the entity.
 */
export function useLODLevel(entityId: string, position: THREE.Vector3): LODLevel {
  return lodManager.getLODLevel(entityId, position);
}

/**
 * LOD visibility helpers.
 */
export const LODVisibility = {
  /** Should render the full detailed mesh? */
  showFullMesh: (level: LODLevel): boolean => level === 'high' || level === 'medium',

  /** Should animate ears/eyes? */
  showDetailAnimations: (level: LODLevel): boolean => level === 'high',

  /** Should render shadow? */
  showShadow: (level: LODLevel): boolean => level === 'high' || level === 'medium',

  /** Should render at all? */
  shouldRender: (level: LODLevel): boolean => level !== 'culled',

  /** Use simplified capsule instead of full mesh? */
  useSimplifiedMesh: (level: LODLevel): boolean => level === 'low',
};

/**
 * Performance thresholds for adaptive quality.
 */
export const PERFORMANCE_THRESHOLDS = {
  targetFPS: 60,
  minAcceptableFPS: 30,
  sampleFrames: 60, // Frames to sample before adjusting
};

/**
 * Adaptive quality manager - adjusts LOD distances based on performance.
 */
class AdaptiveQualityManager {
  private frameTimeSamples: number[] = [];
  private sampleIndex = 0;
  private isEnabled = true;

  /**
   * Record a frame time sample.
   */
  recordFrameTime(deltaMs: number): void {
    if (!this.isEnabled) return;

    this.frameTimeSamples[this.sampleIndex] = deltaMs;
    this.sampleIndex = (this.sampleIndex + 1) % PERFORMANCE_THRESHOLDS.sampleFrames;

    // Check if we have enough samples
    if (this.frameTimeSamples.length >= PERFORMANCE_THRESHOLDS.sampleFrames) {
      this.evaluatePerformance();
    }
  }

  /**
   * Evaluate performance and adjust LOD if needed.
   */
  private evaluatePerformance(): void {
    const avgFrameTime =
      this.frameTimeSamples.reduce((a, b) => a + b, 0) / this.frameTimeSamples.length;
    const avgFPS = 1000 / avgFrameTime;

    if (avgFPS < PERFORMANCE_THRESHOLDS.minAcceptableFPS) {
      // Performance is bad - tighten LOD distances
      this.adjustLODDistances(0.8);
    } else if (avgFPS > PERFORMANCE_THRESHOLDS.targetFPS * 1.2) {
      // Performance is great - can relax LOD distances slightly
      this.adjustLODDistances(1.1);
    }
  }

  /**
   * Adjust LOD distances by a multiplier.
   */
  private adjustLODDistances(multiplier: number): void {
    const current = lodManager.getConfig().distances;
    lodManager.setDistances({
      high: Math.max(5, current.high * multiplier),
      medium: Math.max(10, current.medium * multiplier),
      low: Math.max(20, current.low * multiplier),
      cull: Math.max(30, current.cull * multiplier),
    });
  }

  /**
   * Enable or disable adaptive quality.
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.frameTimeSamples = [];
      this.sampleIndex = 0;
    }
  }
}

export const adaptiveQuality = new AdaptiveQualityManager();
