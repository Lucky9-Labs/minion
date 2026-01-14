import * as THREE from 'three';

/**
 * Non-reactive position store for high-frequency updates.
 *
 * This store exists outside of React/Zustand to avoid triggering
 * re-renders on every position update (which happens 60x/sec).
 *
 * The main Zustand store syncs with this periodically for persistence.
 *
 * Usage:
 *   // In animation loop:
 *   positionStore.setPosition(minionId, x, y, z);
 *   const pos = positionStore.getPosition(minionId);
 *
 *   // Sync to Zustand periodically:
 *   positionStore.syncToZustand();
 */

interface EntityPosition {
  x: number;
  y: number;
  z: number;
  // Velocity for physics
  vx: number;
  vy: number;
  vz: number;
  // Rotation
  rotationY: number;
  // Dirty flag for sync optimization
  dirty: boolean;
}

interface EntityState {
  position: EntityPosition;
  // Optional: store other high-frequency data here
  animationTime: number;
  lodLevel: 'high' | 'medium' | 'low' | 'culled';
}

class PositionStore {
  private entities = new Map<string, EntityState>();
  private listeners = new Set<(id: string, pos: EntityPosition) => void>();
  private syncCallback: ((positions: Map<string, { x: number; y: number; z: number }>) => void) | null = null;
  private syncIntervalMs = 500; // Sync to Zustand every 500ms
  private lastSyncTime = 0;

  /**
   * Initialize position for an entity.
   */
  initEntity(id: string, x = 0, y = 0, z = 0): void {
    if (!this.entities.has(id)) {
      this.entities.set(id, {
        position: {
          x, y, z,
          vx: 0, vy: 0, vz: 0,
          rotationY: 0,
          dirty: true,
        },
        animationTime: 0,
        lodLevel: 'high',
      });
    }
  }

  /**
   * Remove an entity.
   */
  removeEntity(id: string): void {
    this.entities.delete(id);
  }

  /**
   * Set position for an entity.
   */
  setPosition(id: string, x: number, y: number, z: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position.x = x;
      entity.position.y = y;
      entity.position.z = z;
      entity.position.dirty = true;
      this.notifyListeners(id, entity.position);
    }
  }

  /**
   * Update position incrementally.
   */
  addPosition(id: string, dx: number, dy: number, dz: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position.x += dx;
      entity.position.y += dy;
      entity.position.z += dz;
      entity.position.dirty = true;
    }
  }

  /**
   * Set velocity for an entity.
   */
  setVelocity(id: string, vx: number, vy: number, vz: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position.vx = vx;
      entity.position.vy = vy;
      entity.position.vz = vz;
    }
  }

  /**
   * Set rotation for an entity.
   */
  setRotation(id: string, rotationY: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.position.rotationY = rotationY;
    }
  }

  /**
   * Get position for an entity.
   */
  getPosition(id: string): EntityPosition | null {
    return this.entities.get(id)?.position ?? null;
  }

  /**
   * Get position as Vector3 (copies into provided vector to avoid allocation).
   */
  getPositionVec3(id: string, target: THREE.Vector3): THREE.Vector3 | null {
    const entity = this.entities.get(id);
    if (entity) {
      target.set(entity.position.x, entity.position.y, entity.position.z);
      return target;
    }
    return null;
  }

  /**
   * Check if entity exists.
   */
  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * Get all entity IDs.
   */
  getEntityIds(): string[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Set LOD level for an entity.
   */
  setLODLevel(id: string, level: 'high' | 'medium' | 'low' | 'culled'): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.lodLevel = level;
    }
  }

  /**
   * Get LOD level for an entity.
   */
  getLODLevel(id: string): 'high' | 'medium' | 'low' | 'culled' {
    return this.entities.get(id)?.lodLevel ?? 'high';
  }

  /**
   * Update animation time for an entity.
   */
  setAnimationTime(id: string, time: number): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.animationTime = time;
    }
  }

  /**
   * Get animation time for an entity.
   */
  getAnimationTime(id: string): number {
    return this.entities.get(id)?.animationTime ?? 0;
  }

  /**
   * Apply physics update (velocity to position).
   */
  applyPhysics(id: string, deltaTime: number, gravity = 9.8): void {
    const entity = this.entities.get(id);
    if (entity) {
      // Apply gravity
      entity.position.vy -= gravity * deltaTime;

      // Apply velocity
      entity.position.x += entity.position.vx * deltaTime;
      entity.position.y += entity.position.vy * deltaTime;
      entity.position.z += entity.position.vz * deltaTime;

      entity.position.dirty = true;
    }
  }

  /**
   * Register a sync callback for Zustand integration.
   */
  setSyncCallback(callback: (positions: Map<string, { x: number; y: number; z: number }>) => void): void {
    this.syncCallback = callback;
  }

  /**
   * Sync dirty positions to Zustand store.
   * Call this periodically (e.g., every 500ms) rather than every frame.
   */
  syncToZustand(currentTime: number, force = false): void {
    if (!this.syncCallback) return;

    // Throttle sync
    if (!force && currentTime - this.lastSyncTime < this.syncIntervalMs / 1000) {
      return;
    }
    this.lastSyncTime = currentTime;

    // Collect dirty positions
    const dirtyPositions = new Map<string, { x: number; y: number; z: number }>();

    this.entities.forEach((entity, id) => {
      if (entity.position.dirty) {
        dirtyPositions.set(id, {
          x: entity.position.x,
          y: entity.position.y,
          z: entity.position.z,
        });
        entity.position.dirty = false;
      }
    });

    // Sync if there are dirty positions
    if (dirtyPositions.size > 0) {
      this.syncCallback(dirtyPositions);
    }
  }

  /**
   * Initialize from Zustand store state.
   */
  initFromStore(minions: Array<{ id: string; position: { x: number; y: number; z: number } }>): void {
    for (const minion of minions) {
      this.initEntity(minion.id, minion.position.x, minion.position.y, minion.position.z);
    }
  }

  /**
   * Subscribe to position changes.
   */
  subscribe(listener: (id: string, pos: EntityPosition) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(id: string, pos: EntityPosition): void {
    this.listeners.forEach((listener) => listener(id, pos));
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.entities.clear();
  }

  /**
   * Get stats for debugging.
   */
  getStats(): { entityCount: number; dirtyCount: number } {
    let dirtyCount = 0;
    this.entities.forEach((entity) => {
      if (entity.position.dirty) dirtyCount++;
    });
    return {
      entityCount: this.entities.size,
      dirtyCount,
    };
  }
}

// Singleton instance
export const positionStore = new PositionStore();
