import * as THREE from 'three';

/**
 * Object pool for THREE.Vector3 instances to reduce GC pressure.
 *
 * Usage:
 *   import { vec3Pool } from '@/lib/vectorPool';
 *
 *   // At start of animation frame:
 *   vec3Pool.reset();
 *
 *   // Instead of: const dir = pos.clone().sub(target);
 *   // Use: const dir = vec3Pool.get().copy(pos).sub(target);
 */

class Vector3Pool {
  private pool: THREE.Vector3[] = [];
  private index = 0;
  private highWaterMark = 0;

  /**
   * Get a Vector3 from the pool. Automatically grows if needed.
   * The returned vector may contain stale data - always set/copy values.
   */
  get(): THREE.Vector3 {
    if (this.index >= this.pool.length) {
      this.pool.push(new THREE.Vector3());
    }
    return this.pool[this.index++];
  }

  /**
   * Get a Vector3 initialized to specific values.
   */
  getWith(x: number, y: number, z: number): THREE.Vector3 {
    return this.get().set(x, y, z);
  }

  /**
   * Get a Vector3 copied from another vector.
   */
  getCopy(source: THREE.Vector3): THREE.Vector3 {
    return this.get().copy(source);
  }

  /**
   * Reset the pool index. Call at the start of each frame.
   */
  reset(): void {
    // Track high water mark for debugging
    if (this.index > this.highWaterMark) {
      this.highWaterMark = this.index;
    }
    this.index = 0;
  }

  /**
   * Get pool statistics for debugging.
   */
  getStats(): { poolSize: number; currentIndex: number; highWaterMark: number } {
    return {
      poolSize: this.pool.length,
      currentIndex: this.index,
      highWaterMark: this.highWaterMark,
    };
  }

  /**
   * Pre-allocate vectors to avoid growth during gameplay.
   */
  preallocate(count: number): void {
    while (this.pool.length < count) {
      this.pool.push(new THREE.Vector3());
    }
  }
}

// Singleton instance
export const vec3Pool = new Vector3Pool();

/**
 * Object pool for THREE.Euler instances.
 */
class EulerPool {
  private pool: THREE.Euler[] = [];
  private index = 0;

  get(): THREE.Euler {
    if (this.index >= this.pool.length) {
      this.pool.push(new THREE.Euler());
    }
    return this.pool[this.index++];
  }

  getWith(x: number, y: number, z: number, order?: THREE.EulerOrder): THREE.Euler {
    return this.get().set(x, y, z, order);
  }

  reset(): void {
    this.index = 0;
  }
}

export const eulerPool = new EulerPool();

/**
 * Object pool for THREE.Quaternion instances.
 */
class QuaternionPool {
  private pool: THREE.Quaternion[] = [];
  private index = 0;

  get(): THREE.Quaternion {
    if (this.index >= this.pool.length) {
      this.pool.push(new THREE.Quaternion());
    }
    return this.pool[this.index++];
  }

  reset(): void {
    this.index = 0;
  }
}

export const quatPool = new QuaternionPool();

/**
 * Object pool for THREE.Matrix4 instances.
 */
class Matrix4Pool {
  private pool: THREE.Matrix4[] = [];
  private index = 0;

  get(): THREE.Matrix4 {
    if (this.index >= this.pool.length) {
      this.pool.push(new THREE.Matrix4());
    }
    return this.pool[this.index++];
  }

  reset(): void {
    this.index = 0;
  }
}

export const mat4Pool = new Matrix4Pool();

/**
 * Reset all pools. Call at start of each animation frame.
 */
export function resetAllPools(): void {
  vec3Pool.reset();
  eulerPool.reset();
  quatPool.reset();
  mat4Pool.reset();
}

/**
 * Pre-allocate all pools for expected usage.
 */
export function preallocatePools(config: {
  vectors?: number;
  eulers?: number;
  quaternions?: number;
  matrices?: number;
} = {}): void {
  const { vectors = 100, eulers = 20, quaternions = 20, matrices = 10 } = config;

  vec3Pool.preallocate(vectors);
  // Euler, quaternion, matrix pools grow on demand
}
