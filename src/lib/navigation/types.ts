/**
 * Navigation System Types
 */

/**
 * A single cell in the navigation grid
 */
export interface NavCell {
  /** Grid X coordinate */
  x: number;
  /** Grid Z coordinate */
  z: number;
  /** Floor number (0 = ground level, 1+ = tower floors) */
  floor: number;
  /** Whether this cell can be walked on */
  walkable: boolean;
  /** Movement cost (1.0 = normal, higher = slower) */
  cost: number;
  /** Whether this cell is a stair connection point */
  isStair?: boolean;
  /** Target cell on connected floor (for stairs) */
  stairTarget?: { x: number; z: number; floor: number };
  /** Whether this cell is inside the tower */
  isInterior?: boolean;
}

/**
 * A path through the navigation grid
 */
export interface NavPath {
  /** Ordered list of cells to traverse */
  cells: NavCell[];
  /** Total movement cost */
  totalCost: number;
}

/**
 * Definition of a static obstacle
 */
export interface ObstacleDef {
  /** World X position */
  x: number;
  /** World Z position */
  z: number;
  /** Collision radius */
  radius: number;
  /** Type of obstacle */
  type: 'tree' | 'rock' | 'tower';
}

/**
 * Grid configuration
 */
export interface NavGridConfig {
  /** Size of each cell in world units */
  cellSize: number;
  /** Minimum X bound */
  minX: number;
  /** Maximum X bound */
  maxX: number;
  /** Minimum Z bound */
  minZ: number;
  /** Maximum Z bound */
  maxZ: number;
  /** Inner exclusion radius (tower area) */
  innerRadius: number;
  /** Outer walkable radius */
  outerRadius: number;
}

/**
 * Default grid configuration for the island
 */
export const DEFAULT_GRID_CONFIG: NavGridConfig = {
  cellSize: 1.0,
  minX: -9,
  maxX: 9,
  minZ: -9,
  maxZ: 9,
  innerRadius: 2.5,  // Tower base radius
  outerRadius: 8,    // Island edge
};

/**
 * Static obstacles on the island
 */
export const STATIC_OBSTACLES: ObstacleDef[] = [
  // Tower (excluded from ground grid, has interior cells)
  { x: 0, z: 0, radius: 2.5, type: 'tower' },
  // Trees
  { x: -5, z: -5, radius: 1.2, type: 'tree' },
  { x: 6, z: -5, radius: 0.9, type: 'tree' },
  { x: -7, z: 4, radius: 1.0, type: 'tree' },
  { x: 5, z: 6, radius: 1.1, type: 'tree' },
  { x: -4, z: 7, radius: 0.85, type: 'tree' },
  { x: 7, z: 2, radius: 1.15, type: 'tree' },
  { x: -6, z: -1, radius: 0.95, type: 'tree' },
  { x: 3, z: -7, radius: 1.05, type: 'tree' },
  // Rocks
  { x: -3, z: -2, radius: 0.5, type: 'rock' },
  { x: 4, z: 3, radius: 0.45, type: 'rock' },
  { x: -5, z: 1, radius: 0.55, type: 'rock' },
  { x: 6, z: -3, radius: 0.5, type: 'rock' },
];
