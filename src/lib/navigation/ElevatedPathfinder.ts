/**
 * Pathfinder for elevated surfaces.
 *
 * Uses A-star/Dijkstra to find paths across elevated platforms and stairs.
 * Works with the ElevatedSurfaceRegistry to navigate scaffolding, bridges, etc.
 */

import type {
  ElevatedSurface,
  ElevationConnection,
  ElevatedNavPoint,
} from './ElevatedSurface';
import { ElevatedSurfaceRegistry } from './ElevatedSurface';

/**
 * A path through elevated surfaces
 */
export interface ElevatedPath {
  points: ElevatedNavPoint[];
  totalCost: number;
}

/**
 * Node in the pathfinding graph
 */
interface PathNode {
  point: ElevatedNavPoint;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

/**
 * Pathfinder for elevated surfaces.
 */
export class ElevatedPathfinder {
  private registry: ElevatedSurfaceRegistry;
  private gridSize: number;

  constructor(registry: ElevatedSurfaceRegistry, gridSize: number = 0.5) {
    this.registry = registry;
    this.gridSize = gridSize;
  }

  /**
   * Find a path from start to goal on elevated surfaces.
   * Returns null if no path exists.
   */
  findPath(start: ElevatedNavPoint, goal: ElevatedNavPoint): ElevatedPath | null {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      point: start,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null,
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      // Check if we reached the goal
      if (this.isAtGoal(current.point, goal)) {
        return this.reconstructPath(current);
      }

      const currentKey = this.pointKey(current.point);
      if (closedSet.has(currentKey)) continue;
      closedSet.add(currentKey);

      // Expand neighbors
      const neighbors = this.getNeighbors(current.point);

      for (const neighborPoint of neighbors) {
        const neighborKey = this.pointKey(neighborPoint);
        if (closedSet.has(neighborKey)) continue;

        const g = current.g + this.movementCost(current.point, neighborPoint);
        const h = this.heuristic(neighborPoint, goal);
        const f = g + h;

        // Check if this path is better than existing
        const existingIdx = openSet.findIndex(n => this.pointKey(n.point) === neighborKey);
        if (existingIdx >= 0) {
          if (g < openSet[existingIdx].g) {
            openSet[existingIdx].g = g;
            openSet[existingIdx].f = f;
            openSet[existingIdx].parent = current;
          }
        } else {
          openSet.push({
            point: neighborPoint,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get neighboring points from current position.
   */
  private getNeighbors(point: ElevatedNavPoint): ElevatedNavPoint[] {
    const neighbors: ElevatedNavPoint[] = [];

    if (point.isStair && point.connectionId) {
      // On stairs - can move along stair or to connected surface
      const conn = this.registry.getAllConnections().find(c => c.id === point.connectionId);
      if (conn) {
        // Move to top or bottom of stairs
        neighbors.push({
          x: conn.upper.x,
          z: conn.upper.z,
          y: conn.upper.y,
          surfaceId: conn.upper.surfaceId,
          isStair: false,
        });
        neighbors.push({
          x: conn.lower.x,
          z: conn.lower.z,
          y: conn.lower.y,
          surfaceId: conn.lower.surfaceId || null,
          isStair: false,
        });
      }
    } else if (point.surfaceId) {
      // On a surface - can move around surface or to stairs
      const surface = this.registry.getAllSurfaces().find(s => s.id === point.surfaceId);
      if (surface) {
        // Add 8-directional neighbors within surface bounds
        const dirs = [
          [-1, -1], [0, -1], [1, -1],
          [-1, 0],          [1, 0],
          [-1, 1],  [0, 1],  [1, 1],
        ];

        for (const [dx, dz] of dirs) {
          const nx = point.x + dx * this.gridSize;
          const nz = point.z + dz * this.gridSize;

          // Check if still within surface bounds
          if (nx >= surface.bounds.minX && nx <= surface.bounds.maxX &&
              nz >= surface.bounds.minZ && nz <= surface.bounds.maxZ) {
            neighbors.push({
              x: nx,
              z: nz,
              y: surface.y,
              surfaceId: surface.id,
              isStair: false,
            });
          }
        }

        // Check for connections to other surfaces/ground
        const connections = this.registry.getConnectionsForSurface(surface.id);
        for (const conn of connections) {
          // Check if we're near the connection point
          const connPoint = conn.upper.surfaceId === surface.id ? conn.upper : conn.lower;
          const dist = Math.sqrt(
            (point.x - connPoint.x) ** 2 +
            (point.z - connPoint.z) ** 2
          );

          if (dist < conn.width) {
            // Add stair entry point
            neighbors.push({
              x: connPoint.x,
              z: connPoint.z,
              y: connPoint.y,
              surfaceId: surface.id,
              isStair: true,
              connectionId: conn.id,
            });
          }
        }

        // Check for adjacent surfaces (corner connections)
        const adjacentSurfaces = this.findAdjacentSurfaces(surface, point);
        neighbors.push(...adjacentSurfaces);
      }
    } else {
      // On ground level - check for stairs going up
      const groundConnections = this.registry.getGroundConnections();
      for (const conn of groundConnections) {
        const dist = Math.sqrt(
          (point.x - conn.lower.x) ** 2 +
          (point.z - conn.lower.z) ** 2
        );

        if (dist < conn.width + this.gridSize) {
          neighbors.push({
            x: conn.lower.x,
            z: conn.lower.z,
            y: conn.lower.y,
            surfaceId: null,
            isStair: true,
            connectionId: conn.id,
          });
        }
      }
    }

    return neighbors;
  }

  /**
   * Find adjacent surfaces that can be walked to directly (corner connections)
   */
  private findAdjacentSurfaces(
    currentSurface: ElevatedSurface,
    point: ElevatedNavPoint
  ): ElevatedNavPoint[] {
    const neighbors: ElevatedNavPoint[] = [];
    const tolerance = this.gridSize * 2;

    for (const surface of this.registry.getAllSurfaces()) {
      if (surface.id === currentSurface.id) continue;
      if (Math.abs(surface.y - currentSurface.y) > 0.5) continue; // Must be same level

      // Check if surfaces share an edge/corner
      const overlapX = !(surface.bounds.maxX < currentSurface.bounds.minX - tolerance ||
                        surface.bounds.minX > currentSurface.bounds.maxX + tolerance);
      const overlapZ = !(surface.bounds.maxZ < currentSurface.bounds.minZ - tolerance ||
                        surface.bounds.minZ > currentSurface.bounds.maxZ + tolerance);

      if (overlapX || overlapZ) {
        // Check if point is near the shared edge
        const nearEdgeX = point.x <= currentSurface.bounds.minX + tolerance ||
                         point.x >= currentSurface.bounds.maxX - tolerance;
        const nearEdgeZ = point.z <= currentSurface.bounds.minZ + tolerance ||
                         point.z >= currentSurface.bounds.maxZ - tolerance;

        if (nearEdgeX || nearEdgeZ) {
          // Find closest point on adjacent surface
          const clampedX = Math.max(surface.bounds.minX,
                          Math.min(surface.bounds.maxX, point.x));
          const clampedZ = Math.max(surface.bounds.minZ,
                          Math.min(surface.bounds.maxZ, point.z));

          neighbors.push({
            x: clampedX,
            z: clampedZ,
            y: surface.y,
            surfaceId: surface.id,
            isStair: false,
          });
        }
      }
    }

    return neighbors;
  }

  /**
   * Calculate heuristic distance between two points (3D)
   */
  private heuristic(from: ElevatedNavPoint, to: ElevatedNavPoint): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dz * dz + dy * dy);
  }

  /**
   * Calculate movement cost between two adjacent points
   */
  private movementCost(from: ElevatedNavPoint, to: ElevatedNavPoint): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dy = to.y - from.y;
    let cost = Math.sqrt(dx * dx + dz * dz + dy * dy);

    // Stairs cost more
    if (from.isStair || to.isStair) {
      cost *= 1.5;
    }

    // Vertical movement costs more
    if (Math.abs(dy) > 0.1) {
      cost *= 1.5;
    }

    return cost;
  }

  /**
   * Check if point is at or near the goal
   */
  private isAtGoal(point: ElevatedNavPoint, goal: ElevatedNavPoint): boolean {
    const dx = Math.abs(point.x - goal.x);
    const dz = Math.abs(point.z - goal.z);
    const dy = Math.abs(point.y - goal.y);
    return dx < this.gridSize && dz < this.gridSize && dy < 0.5;
  }

  /**
   * Create unique key for a point
   */
  private pointKey(point: ElevatedNavPoint): string {
    const x = Math.round(point.x / this.gridSize);
    const z = Math.round(point.z / this.gridSize);
    const y = Math.round(point.y * 2);
    return `${x},${z},${y},${point.surfaceId || 'g'}`;
  }

  /**
   * Reconstruct path from goal node back to start
   */
  private reconstructPath(goalNode: PathNode): ElevatedPath {
    const points: ElevatedNavPoint[] = [];
    let current: PathNode | null = goalNode;

    while (current) {
      points.unshift(current.point);
      current = current.parent;
    }

    return {
      points,
      totalCost: goalNode.g,
    };
  }

  /**
   * Find a random point on any surface belonging to a parent
   */
  findRandomPointForParent(parentId: string): ElevatedNavPoint | null {
    const surfaces = this.registry.getSurfacesForParent(parentId);
    if (surfaces.length === 0) return null;

    const surface = surfaces[Math.floor(Math.random() * surfaces.length)];
    return this.registry.getRandomPointOnSurface(surface.id);
  }

  /**
   * Find path from ground to an elevated surface
   */
  findPathFromGround(
    groundX: number,
    groundZ: number,
    targetSurfaceId: string
  ): ElevatedPath | null {
    const start: ElevatedNavPoint = {
      x: groundX,
      z: groundZ,
      y: 0.1,
      surfaceId: null,
      isStair: false,
    };

    const targetPoint = this.registry.getRandomPointOnSurface(targetSurfaceId);
    if (!targetPoint) return null;

    return this.findPath(start, targetPoint);
  }
}
