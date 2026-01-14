import * as THREE from 'three';
import { vec3Pool } from './vectorPool';

/**
 * Optimized update utilities for animation loops.
 * These functions avoid allocations and use throttling where appropriate.
 */

/**
 * Walkability cache to avoid repeated terrain checks.
 * Grid resolution determines cache granularity.
 */
class WalkabilityCache {
  private cache = new Map<string, boolean>();
  private gridResolution: number;

  constructor(gridResolution = 1) {
    this.gridResolution = gridResolution;
  }

  /**
   * Get cache key for a position.
   */
  private getKey(x: number, z: number): string {
    const gx = Math.floor(x / this.gridResolution);
    const gz = Math.floor(z / this.gridResolution);
    return `${gx},${gz}`;
  }

  /**
   * Check walkability with caching.
   */
  isWalkable(
    x: number,
    z: number,
    terrainChecker: (x: number, z: number) => boolean
  ): boolean {
    const key = this.getKey(x, z);
    let result = this.cache.get(key);

    if (result === undefined) {
      result = terrainChecker(x, z);
      this.cache.set(key, result);
    }

    return result;
  }

  /**
   * Clear cache (call when terrain changes).
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need hit/miss tracking
    };
  }
}

export const walkabilityCache = new WalkabilityCache(0.5);

/**
 * Throttled update manager - runs callbacks at reduced frequency.
 */
class ThrottledUpdateManager {
  private timers = new Map<string, number>();

  /**
   * Check if enough time has passed to run an update.
   * @param id Unique identifier for this update type
   * @param currentTime Current elapsed time in seconds
   * @param intervalMs Minimum interval between updates in milliseconds
   * @returns true if update should run
   */
  shouldUpdate(id: string, currentTime: number, intervalMs: number): boolean {
    const lastTime = this.timers.get(id) ?? -Infinity;
    const intervalSec = intervalMs / 1000;

    if (currentTime - lastTime >= intervalSec) {
      this.timers.set(id, currentTime);
      return true;
    }
    return false;
  }

  /**
   * Force reset timer for an ID.
   */
  reset(id: string): void {
    this.timers.delete(id);
  }

  /**
   * Clear all timers.
   */
  clear(): void {
    this.timers.clear();
  }
}

export const throttledUpdates = new ThrottledUpdateManager();

/**
 * Update intervals for different systems (in milliseconds).
 */
export const UPDATE_INTERVALS = {
  WILDLIFE_AI: 100,      // Wildlife pathfinding
  INTERIOR_LIGHTS: 50,   // Light intensity updates
  CLOUD_SHADOWS: 33,     // Cloud movement (30fps)
  MINION_PATHFINDING: 100, // Minion destination selection
  LOD_CALCULATION: 200,  // LOD level changes
  ZUSTAND_SYNC: 500,     // Position sync to store
} as const;

/**
 * Calculate direction from source to target without allocation.
 * Uses vector pool internally.
 * @returns The pooled direction vector (normalized)
 */
export function getDirection(
  source: THREE.Vector3,
  target: THREE.Vector3
): THREE.Vector3 {
  return vec3Pool.get().copy(target).sub(source).normalize();
}

/**
 * Calculate horizontal direction (XZ plane) without allocation.
 * @returns The pooled horizontal direction vector (NOT normalized)
 */
export function getHorizontalDirection(
  source: THREE.Vector3,
  target: THREE.Vector3
): THREE.Vector3 {
  const dir = vec3Pool.get().copy(target).sub(source);
  dir.y = 0;
  return dir;
}

/**
 * Calculate horizontal distance between two points.
 */
export function horizontalDistance(
  a: THREE.Vector3,
  b: THREE.Vector3
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Move a position toward a target by a given distance.
 * Modifies the position in place.
 * @returns true if reached target
 */
export function moveToward(
  position: THREE.Vector3,
  target: THREE.Vector3,
  distance: number,
  getGroundHeight: (x: number, z: number) => number
): boolean {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist <= distance) {
    position.copy(target);
    return true;
  }

  // Normalize and scale
  const scale = distance / horizontalDist;
  position.x += dx * scale;
  position.z += dz * scale;
  position.y = getGroundHeight(position.x, position.z);

  return false;
}

/**
 * Dirty flag manager for tracking what needs updates.
 */
class DirtyFlagManager {
  private flags = new Map<string, boolean>();

  set(id: string, dirty = true): void {
    this.flags.set(id, dirty);
  }

  isDirty(id: string): boolean {
    return this.flags.get(id) ?? true;
  }

  clear(id: string): void {
    this.flags.set(id, false);
  }

  clearAll(): void {
    this.flags.clear();
  }
}

export const dirtyFlags = new DirtyFlagManager();

/**
 * Interior light update helper - only traverses when needed.
 */
export function updateInteriorLight(
  light: THREE.PointLight,
  fixture: THREE.Object3D,
  targetIntensity: number,
  deltaTime: number,
  fixtureId: string
): void {
  const currentIntensity = light.intensity;
  const diff = targetIntensity - currentIntensity;

  if (Math.abs(diff) > 0.01) {
    light.intensity += diff * deltaTime * 3;
    dirtyFlags.set(`light-${fixtureId}`, true);
  } else {
    light.intensity = targetIntensity;

    // Only traverse if dirty (intensity just changed)
    if (dirtyFlags.isDirty(`light-${fixtureId}`)) {
      fixture.traverse((child) => {
        if (child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshBasicMaterial) {
          child.visible = light.intensity > 0.1;
        }
      });
      dirtyFlags.clear(`light-${fixtureId}`);
    }
  }
}

/**
 * Random within range helper.
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Smooth damp toward target (for camera, etc).
 */
export function smoothDamp(
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  deltaTime: number,
  maxSpeed = Infinity
): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;

  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;

  const temp = (velocity.value + omega * change) * deltaTime;
  velocity.value = (velocity.value - omega * temp) * exp;

  let output = target + (change + temp) * exp;

  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    velocity.value = (output - originalTo) / deltaTime;
  }

  return output;
}

/**
 * Performance monitor for tracking frame times.
 */
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples = 60;
  private index = 0;

  recordFrameTime(deltaMs: number): void {
    this.frameTimes[this.index] = deltaMs;
    this.index = (this.index + 1) % this.maxSamples;
  }

  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avg;
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  isPerformanceGood(): boolean {
    return this.getAverageFPS() >= 55;
  }
}

export const performanceMonitor = new PerformanceMonitor();
