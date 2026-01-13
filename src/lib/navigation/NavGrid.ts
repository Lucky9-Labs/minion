import type { NavCell, NavGridConfig } from './types';
import { DEFAULT_GRID_CONFIG } from './types';

/**
 * Creates a unique key for a cell based on its coordinates
 */
function cellKey(x: number, z: number, floor: number): string {
  return `${x},${z},${floor}`;
}

/**
 * Navigation grid data structure
 * Manages cells for ground level and tower floors
 */
export class NavGrid {
  private cells: Map<string, NavCell> = new Map();
  private config: NavGridConfig;
  private floorCells: Map<number, NavCell[]> = new Map();

  constructor(config: NavGridConfig = DEFAULT_GRID_CONFIG) {
    this.config = config;
  }

  /**
   * Add a cell to the grid
   */
  addCell(cell: NavCell): void {
    const key = cellKey(cell.x, cell.z, cell.floor);
    this.cells.set(key, cell);

    // Track cells by floor for quick lookup
    if (!this.floorCells.has(cell.floor)) {
      this.floorCells.set(cell.floor, []);
    }
    this.floorCells.get(cell.floor)!.push(cell);
  }

  /**
   * Get a cell at grid coordinates
   */
  getCell(x: number, z: number, floor: number): NavCell | null {
    return this.cells.get(cellKey(x, z, floor)) || null;
  }

  /**
   * Get all cells on a specific floor
   */
  getCellsOnFloor(floor: number): NavCell[] {
    return this.floorCells.get(floor) || [];
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldX: number, worldZ: number): { x: number; z: number } {
    return {
      x: Math.round(worldX / this.config.cellSize),
      z: Math.round(worldZ / this.config.cellSize),
    };
  }

  /**
   * Convert grid coordinates to world coordinates (center of cell)
   */
  gridToWorld(gridX: number, gridZ: number): { x: number; z: number } {
    return {
      x: gridX * this.config.cellSize,
      z: gridZ * this.config.cellSize,
    };
  }

  /**
   * Get neighboring cells (8-way adjacency)
   */
  getNeighbors(cell: NavCell): NavCell[] {
    const neighbors: NavCell[] = [];
    const directions = [
      { dx: -1, dz: -1 }, { dx: 0, dz: -1 }, { dx: 1, dz: -1 },
      { dx: -1, dz: 0 },                      { dx: 1, dz: 0 },
      { dx: -1, dz: 1 },  { dx: 0, dz: 1 },  { dx: 1, dz: 1 },
    ];

    for (const { dx, dz } of directions) {
      const neighbor = this.getCell(cell.x + dx, cell.z + dz, cell.floor);
      if (neighbor && neighbor.walkable) {
        neighbors.push(neighbor);
      }
    }

    // Add stair connection if this cell has one
    if (cell.isStair && cell.stairTarget) {
      const stairCell = this.getCell(
        cell.stairTarget.x,
        cell.stairTarget.z,
        cell.stairTarget.floor
      );
      if (stairCell && stairCell.walkable) {
        neighbors.push(stairCell);
      }
    }

    return neighbors;
  }

  /**
   * Get movement cost between two adjacent cells
   */
  getMovementCost(from: NavCell, to: NavCell): number {
    // Diagonal movement costs more (sqrt(2))
    const dx = Math.abs(to.x - from.x);
    const dz = Math.abs(to.z - from.z);
    const isDiagonal = dx === 1 && dz === 1;

    // Floor change (stairs) has extra cost
    const floorChange = from.floor !== to.floor;

    let baseCost = isDiagonal ? 1.414 : 1.0;
    if (floorChange) {
      baseCost += 2.0; // Stairs take more time
    }

    return baseCost * to.cost;
  }

  /**
   * Get a random walkable cell on a specific floor
   */
  getRandomWalkable(floor: number): NavCell | null {
    const floorCells = this.getCellsOnFloor(floor);
    const walkable = floorCells.filter(c => c.walkable);

    if (walkable.length === 0) return null;
    return walkable[Math.floor(Math.random() * walkable.length)];
  }

  /**
   * Find the nearest walkable cell to a world position
   */
  findNearestWalkable(worldX: number, worldZ: number, floor: number): NavCell | null {
    const grid = this.worldToGrid(worldX, worldZ);

    // Check the exact cell first
    let cell = this.getCell(grid.x, grid.z, floor);
    if (cell && cell.walkable) return cell;

    // Spiral outward to find nearest walkable
    for (let radius = 1; radius <= 5; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) === radius || Math.abs(dz) === radius) {
            cell = this.getCell(grid.x + dx, grid.z + dz, floor);
            if (cell && cell.walkable) return cell;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get all cells (for debugging/visualization)
   */
  getAllCells(): NavCell[] {
    return Array.from(this.cells.values());
  }

  /**
   * Get grid configuration
   */
  getConfig(): NavGridConfig {
    return this.config;
  }

  /**
   * Check if a world position is inside the tower bounds
   */
  isInsideTower(worldX: number, worldZ: number): boolean {
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
    return dist < this.config.innerRadius;
  }
}
