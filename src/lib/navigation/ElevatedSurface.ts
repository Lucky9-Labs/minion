/**
 * Elevated Surface Navigation System
 *
 * Extends the navigation system to support elevated walkable surfaces like:
 * - Scaffolding platforms
 * - Bridges
 * - Elevated walkways
 * - Multi-story structures
 *
 * Key concepts:
 * - ElevatedSurface: A walkable area at a specific Y height
 * - Characters can walk UNDER elevated surfaces (ground level is independent)
 * - Stairs connect different elevation levels
 * - Multiple surfaces can exist at the same X,Z but different Y
 */

import type { NavCell } from './types';

/**
 * A walkable elevated surface (platform, bridge, etc.)
 */
export interface ElevatedSurface {
  id: string;
  /** World Y position of the surface */
  y: number;
  /** Bounds of the surface in world coordinates */
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  /** Optional: parent structure this belongs to (e.g., building ID) */
  parentId?: string;
  /** Movement cost multiplier (1.0 = normal) */
  cost?: number;
}

/**
 * A stair or ramp connecting two elevations
 */
export interface ElevationConnection {
  id: string;
  /** Lower end of the connection */
  lower: {
    x: number;
    z: number;
    y: number;
    surfaceId?: string; // null = ground level
  };
  /** Upper end of the connection */
  upper: {
    x: number;
    z: number;
    y: number;
    surfaceId: string;
  };
  /** Width of the stair/ramp */
  width: number;
  /** Movement cost multiplier for traversing */
  cost?: number;
}

/**
 * A point on an elevated surface or stair
 */
export interface ElevatedNavPoint {
  x: number;
  z: number;
  y: number;
  surfaceId: string | null; // null = ground level
  isStair: boolean;
  connectionId?: string;
}

/**
 * Registry for elevated surfaces and their connections.
 * Works alongside the existing NavGrid for ground-level navigation.
 */
export class ElevatedSurfaceRegistry {
  private surfaces: Map<string, ElevatedSurface> = new Map();
  private connections: Map<string, ElevationConnection> = new Map();
  private surfacesByParent: Map<string, string[]> = new Map();

  /**
   * Register an elevated surface (e.g., scaffold platform)
   */
  registerSurface(surface: ElevatedSurface): void {
    this.surfaces.set(surface.id, surface);

    if (surface.parentId) {
      if (!this.surfacesByParent.has(surface.parentId)) {
        this.surfacesByParent.set(surface.parentId, []);
      }
      this.surfacesByParent.get(surface.parentId)!.push(surface.id);
    }
  }

  /**
   * Register a stair/ramp connection between elevations
   */
  registerConnection(connection: ElevationConnection): void {
    this.connections.set(connection.id, connection);
  }

  /**
   * Unregister all surfaces and connections for a parent (e.g., when building removed)
   */
  unregisterByParent(parentId: string): void {
    const surfaceIds = this.surfacesByParent.get(parentId) || [];

    // Remove surfaces
    for (const surfaceId of surfaceIds) {
      this.surfaces.delete(surfaceId);
    }
    this.surfacesByParent.delete(parentId);

    // Remove connections that reference these surfaces
    for (const [connId, conn] of this.connections) {
      if (surfaceIds.includes(conn.upper.surfaceId) ||
          (conn.lower.surfaceId && surfaceIds.includes(conn.lower.surfaceId))) {
        this.connections.delete(connId);
      }
    }
  }

  /**
   * Get the surface at a world position, if any.
   * Returns null if position is at ground level (no elevated surface).
   */
  getSurfaceAt(x: number, z: number, y: number, tolerance: number = 0.5): ElevatedSurface | null {
    for (const surface of this.surfaces.values()) {
      // Check if within bounds
      if (x >= surface.bounds.minX && x <= surface.bounds.maxX &&
          z >= surface.bounds.minZ && z <= surface.bounds.maxZ) {
        // Check if Y is close to surface height
        if (Math.abs(y - surface.y) < tolerance) {
          return surface;
        }
      }
    }
    return null;
  }

  /**
   * Get all surfaces at a given X,Z position (may be multiple at different heights)
   */
  getSurfacesAtXZ(x: number, z: number): ElevatedSurface[] {
    const result: ElevatedSurface[] = [];
    for (const surface of this.surfaces.values()) {
      if (x >= surface.bounds.minX && x <= surface.bounds.maxX &&
          z >= surface.bounds.minZ && z <= surface.bounds.maxZ) {
        result.push(surface);
      }
    }
    return result.sort((a, b) => a.y - b.y); // Sort by height
  }

  /**
   * Check if a position is walkable on an elevated surface
   */
  isWalkableElevated(x: number, z: number, y: number): boolean {
    return this.getSurfaceAt(x, z, y) !== null;
  }

  /**
   * Get the connection (stair) at a position, if any
   */
  getConnectionAt(x: number, z: number, y: number, tolerance: number = 0.5): ElevationConnection | null {
    for (const conn of this.connections.values()) {
      // Check if within stair bounds (interpolate between lower and upper)
      const lowerY = conn.lower.y;
      const upperY = conn.upper.y;

      if (y >= lowerY - tolerance && y <= upperY + tolerance) {
        // Check X,Z bounds (simplified - line between lower and upper)
        const t = (y - lowerY) / (upperY - lowerY);
        const expectedX = conn.lower.x + t * (conn.upper.x - conn.lower.x);
        const expectedZ = conn.lower.z + t * (conn.upper.z - conn.lower.z);

        const dx = Math.abs(x - expectedX);
        const dz = Math.abs(z - expectedZ);

        if (dx <= conn.width / 2 + tolerance && dz <= conn.width / 2 + tolerance) {
          return conn;
        }
      }
    }
    return null;
  }

  /**
   * Get all connections to/from a surface
   */
  getConnectionsForSurface(surfaceId: string): ElevationConnection[] {
    const result: ElevationConnection[] = [];
    for (const conn of this.connections.values()) {
      if (conn.upper.surfaceId === surfaceId || conn.lower.surfaceId === surfaceId) {
        result.push(conn);
      }
    }
    return result;
  }

  /**
   * Get connections from ground level (surfaceId = null) to any elevated surface
   */
  getGroundConnections(): ElevationConnection[] {
    const result: ElevationConnection[] = [];
    for (const conn of this.connections.values()) {
      if (conn.lower.surfaceId === undefined || conn.lower.surfaceId === null) {
        result.push(conn);
      }
    }
    return result;
  }

  /**
   * Get all surfaces for a parent structure
   */
  getSurfacesForParent(parentId: string): ElevatedSurface[] {
    const surfaceIds = this.surfacesByParent.get(parentId) || [];
    return surfaceIds.map(id => this.surfaces.get(id)!).filter(Boolean);
  }

  /**
   * Get a random walkable point on a surface
   */
  getRandomPointOnSurface(surfaceId: string): ElevatedNavPoint | null {
    const surface = this.surfaces.get(surfaceId);
    if (!surface) return null;

    const x = surface.bounds.minX + Math.random() * (surface.bounds.maxX - surface.bounds.minX);
    const z = surface.bounds.minZ + Math.random() * (surface.bounds.maxZ - surface.bounds.minZ);

    return {
      x,
      z,
      y: surface.y,
      surfaceId,
      isStair: false,
    };
  }

  /**
   * Find the nearest surface to a world position
   */
  findNearestSurface(x: number, z: number, y: number): ElevatedSurface | null {
    let nearest: ElevatedSurface | null = null;
    let nearestDist = Infinity;

    for (const surface of this.surfaces.values()) {
      // Distance to surface (considering both horizontal and vertical)
      const centerX = (surface.bounds.minX + surface.bounds.maxX) / 2;
      const centerZ = (surface.bounds.minZ + surface.bounds.maxZ) / 2;
      const dx = x - centerX;
      const dz = z - centerZ;
      const dy = y - surface.y;
      const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = surface;
      }
    }

    return nearest;
  }

  /**
   * Get all registered surfaces
   */
  getAllSurfaces(): ElevatedSurface[] {
    return Array.from(this.surfaces.values());
  }

  /**
   * Get all registered connections
   */
  getAllConnections(): ElevationConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Clear all surfaces and connections
   */
  clear(): void {
    this.surfaces.clear();
    this.connections.clear();
    this.surfacesByParent.clear();
  }
}

/**
 * Helper to register scaffolding surfaces for a building
 * @param baseY - The terrain height at the building position (surfaces are relative to this)
 */
export function registerScaffoldingSurfaces(
  registry: ElevatedSurfaceRegistry,
  buildingId: string,
  buildingPosition: { x: number; z: number },
  baseY: number = 0,
  buildingWidth: number = 6,
  buildingDepth: number = 5,
  platformLevels: number[] = [2.5, 5.0]
): void {
  const halfW = buildingWidth / 2;
  const halfD = buildingDepth / 2;
  const platformOffset = 1.0;
  const platformDepth = 1.2;

  platformLevels.forEach((levelYOffset, levelIndex) => {
    const levelY = baseY + levelYOffset; // Add terrain height
    const floor = levelIndex + 1;

    // Front platform (+Z)
    registry.registerSurface({
      id: `${buildingId}-scaffold-f${floor}-front`,
      y: levelY,
      parentId: buildingId,
      bounds: {
        minX: buildingPosition.x - halfW - platformDepth,
        maxX: buildingPosition.x + halfW + platformDepth,
        minZ: buildingPosition.z + halfD + platformOffset - platformDepth / 2,
        maxZ: buildingPosition.z + halfD + platformOffset + platformDepth / 2,
      },
      cost: 1.2, // Slightly slower on scaffolding
    });

    // Back platform (-Z)
    registry.registerSurface({
      id: `${buildingId}-scaffold-f${floor}-back`,
      y: levelY,
      parentId: buildingId,
      bounds: {
        minX: buildingPosition.x - halfW - platformDepth,
        maxX: buildingPosition.x + halfW + platformDepth,
        minZ: buildingPosition.z - halfD - platformOffset - platformDepth / 2,
        maxZ: buildingPosition.z - halfD - platformOffset + platformDepth / 2,
      },
      cost: 1.2,
    });

    // Left platform (-X)
    registry.registerSurface({
      id: `${buildingId}-scaffold-f${floor}-left`,
      y: levelY,
      parentId: buildingId,
      bounds: {
        minX: buildingPosition.x - halfW - platformOffset - platformDepth / 2,
        maxX: buildingPosition.x - halfW - platformOffset + platformDepth / 2,
        minZ: buildingPosition.z - halfD - platformDepth,
        maxZ: buildingPosition.z + halfD + platformDepth,
      },
      cost: 1.2,
    });

    // Right platform (+X)
    registry.registerSurface({
      id: `${buildingId}-scaffold-f${floor}-right`,
      y: levelY,
      parentId: buildingId,
      bounds: {
        minX: buildingPosition.x + halfW + platformOffset - platformDepth / 2,
        maxX: buildingPosition.x + halfW + platformOffset + platformDepth / 2,
        minZ: buildingPosition.z - halfD - platformDepth,
        maxZ: buildingPosition.z + halfD + platformDepth,
      },
      cost: 1.2,
    });
  });

  // Register stair connections
  const stairWidth = 0.8;
  const stairDepth = 4.0;

  // Ground to Level 1 stairs (on right side)
  registry.registerConnection({
    id: `${buildingId}-stair-g-to-1`,
    lower: {
      x: buildingPosition.x + halfW - 0.4,
      z: buildingPosition.z + halfD + 1.6,
      y: baseY + 0.1, // Ground level with terrain height
      surfaceId: undefined, // Ground level
    },
    upper: {
      x: buildingPosition.x + halfW - 0.4,
      z: buildingPosition.z + halfD + 1.6 + stairDepth,
      y: baseY + platformLevels[0],
      surfaceId: `${buildingId}-scaffold-f1-front`,
    },
    width: stairWidth,
    cost: 1.5,
  });

  // Level 1 to Level 2 stairs (on left side)
  if (platformLevels.length > 1) {
    registry.registerConnection({
      id: `${buildingId}-stair-1-to-2`,
      lower: {
        x: buildingPosition.x - halfW + 0.4,
        z: buildingPosition.z + halfD + 1.6,
        y: baseY + platformLevels[0],
        surfaceId: `${buildingId}-scaffold-f1-front`,
      },
      upper: {
        x: buildingPosition.x - halfW + 0.4,
        z: buildingPosition.z + halfD + 1.6 + stairDepth,
        y: baseY + platformLevels[1],
        surfaceId: `${buildingId}-scaffold-f2-front`,
      },
      width: stairWidth,
      cost: 1.5,
    });
  }
}
