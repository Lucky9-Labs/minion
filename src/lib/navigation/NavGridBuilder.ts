import type { NavCell, NavGridConfig, ObstacleDef } from './types';
import { DEFAULT_GRID_CONFIG, STATIC_OBSTACLES } from './types';
import { NavGrid } from './NavGrid';

/**
 * Tower interior configuration for navigation
 */
export interface TowerNavConfig {
  /** Number of floors (including ground) */
  floors: number;
  /** Width of interior in grid cells */
  interiorWidth: number;
  /** Depth of interior in grid cells */
  interiorDepth: number;
  /** Floor height in world units */
  floorHeight: number;
  /** Stair positions per floor (where stairs connect to next floor) */
  stairPositions: Array<{ x: number; z: number; direction: 'up' | 'down' }>;
}

/**
 * Default tower navigation config
 */
export const DEFAULT_TOWER_NAV: TowerNavConfig = {
  floors: 4,
  interiorWidth: 3,  // 3x3 grid cells inside
  interiorDepth: 3,
  floorHeight: 2.5,
  stairPositions: [
    { x: 1, z: 0, direction: 'up' },   // Floor 0 -> 1
    { x: 0, z: 1, direction: 'up' },   // Floor 1 -> 2
    { x: -1, z: 0, direction: 'up' },  // Floor 2 -> 3
  ],
};

/**
 * Builds navigation grids for the game world
 */
export class NavGridBuilder {
  private config: NavGridConfig;
  private obstacles: ObstacleDef[];
  private towerConfig: TowerNavConfig;

  constructor(
    gridConfig: NavGridConfig = DEFAULT_GRID_CONFIG,
    obstacles: ObstacleDef[] = STATIC_OBSTACLES,
    towerConfig: TowerNavConfig = DEFAULT_TOWER_NAV
  ) {
    this.config = gridConfig;
    this.obstacles = obstacles;
    this.towerConfig = towerConfig;
  }

  /**
   * Build the complete navigation grid
   */
  build(): NavGrid {
    const grid = new NavGrid(this.config);

    // Build ground level
    this.buildGroundLevel(grid);

    // Build tower interior floors
    this.buildTowerFloors(grid);

    // Connect stairs between floors
    this.connectStairs(grid);

    // Add tower entrance
    this.addTowerEntrance(grid);

    return grid;
  }

  /**
   * Build the ground level grid (floor 0)
   */
  private buildGroundLevel(grid: NavGrid): void {
    const { cellSize, minX, maxX, minZ, maxZ, innerRadius, outerRadius } = this.config;

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const worldX = x * cellSize;
        const worldZ = z * cellSize;

        // Check if within walkable annular region
        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
        const inWalkableZone = distFromCenter >= innerRadius && distFromCenter <= outerRadius;

        // Check if blocked by any obstacle
        const blocked = this.isBlockedByObstacle(worldX, worldZ);

        const cell: NavCell = {
          x,
          z,
          floor: 0,
          walkable: inWalkableZone && !blocked,
          cost: 1.0,
          isInterior: false,
        };

        grid.addCell(cell);
      }
    }
  }

  /**
   * Build tower interior floors
   */
  private buildTowerFloors(grid: NavGrid): void {
    const { interiorWidth, interiorDepth, floors } = this.towerConfig;
    const halfW = Math.floor(interiorWidth / 2);
    const halfD = Math.floor(interiorDepth / 2);

    // Start from floor 1 (floor 0 is ground outside)
    for (let floor = 1; floor <= floors; floor++) {
      for (let x = -halfW; x <= halfW; x++) {
        for (let z = -halfD; z <= halfD; z++) {
          const cell: NavCell = {
            x,
            z,
            floor,
            walkable: true,
            cost: 1.0,
            isInterior: true,
          };

          grid.addCell(cell);
        }
      }
    }
  }

  /**
   * Connect stairs between floors
   */
  private connectStairs(grid: NavGrid): void {
    const { stairPositions } = this.towerConfig;

    for (let i = 0; i < stairPositions.length; i++) {
      const stair = stairPositions[i];
      const fromFloor = i + 1;  // Stairs start from floor 1
      const toFloor = i + 2;    // Go to next floor

      // Mark lower floor cell as stair going up
      const lowerCell = grid.getCell(stair.x, stair.z, fromFloor);
      if (lowerCell) {
        lowerCell.isStair = true;
        lowerCell.stairTarget = { x: stair.x, z: stair.z, floor: toFloor };
      }

      // Mark upper floor cell as stair going down
      const upperCell = grid.getCell(stair.x, stair.z, toFloor);
      if (upperCell) {
        upperCell.isStair = true;
        upperCell.stairTarget = { x: stair.x, z: stair.z, floor: fromFloor };
      }
    }
  }

  /**
   * Add entrance connection from ground to tower floor 1
   */
  private addTowerEntrance(grid: NavGrid): void {
    // Entrance is at +Z side (front of tower)
    const entranceX = 0;
    const entranceZ = 2;  // Just outside tower at grid (0, 2)

    // Find the ground cell closest to entrance
    const groundCell = grid.getCell(entranceX, entranceZ, 0);
    if (groundCell && groundCell.walkable) {
      // Create entrance cell inside tower
      const entranceInterior: NavCell = {
        x: 0,
        z: 1,  // Inside tower
        floor: 1,
        walkable: true,
        cost: 1.0,
        isInterior: true,
        isStair: true,
        stairTarget: { x: entranceX, z: entranceZ, floor: 0 },
      };

      // Update the interior cell to be the entrance
      const existingInterior = grid.getCell(0, 1, 1);
      if (existingInterior) {
        existingInterior.isStair = true;
        existingInterior.stairTarget = { x: entranceX, z: entranceZ, floor: 0 };
      }

      // Also mark ground cell as entrance
      groundCell.isStair = true;
      groundCell.stairTarget = { x: 0, z: 1, floor: 1 };
    }
  }

  /**
   * Check if a world position is blocked by any obstacle
   */
  private isBlockedByObstacle(worldX: number, worldZ: number): boolean {
    for (const obstacle of this.obstacles) {
      // Skip tower (handled separately)
      if (obstacle.type === 'tower') continue;

      const dx = worldX - obstacle.x;
      const dz = worldZ - obstacle.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < obstacle.radius) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Convenience function to build a navigation grid with default settings
 */
export function buildNavGrid(): NavGrid {
  const builder = new NavGridBuilder();
  return builder.build();
}
