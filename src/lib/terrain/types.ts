/**
 * Terrain types for continuous procedural world generation
 */

export interface PlotCoord {
  gridX: number;  // -4 to 4 (9x9 grid)
  gridZ: number;
}

export type BiomeType = 'grassland' | 'forest' | 'rocky' | 'magical' | 'swamp';

export type PathDirection = 'north' | 'south' | 'east' | 'west';

export interface PlotConfig {
  seed: number;
  coord: PlotCoord;
  biome: BiomeType;
  heightVariance: number;      // 0-1, how bumpy the terrain is
  treesDensity: number;        // 0-1, how many trees
  rocksDensity: number;        // 0-1, how many rocks
  hasPath: boolean;
  pathDirections: PathDirection[];
  isCenter: boolean;           // True for the main tower plot
  elevation: number;           // Base Y elevation variance
}

export interface TerrainConfig {
  worldSeed: number;
  plotSize: number;            // Size of each plot in world units
  totalGridSize: number;       // Number of plots per side (9 = 9x9)
  visibleRadius: number;       // How many plots visible at once
  clearingRadius: number;      // Radius around tower with sparse vegetation
  maxTerrainHeight: number;    // Maximum height variance at edges
}

export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  worldSeed: 12345,
  plotSize: 18,                // Current island is ~18 units
  totalGridSize: 9,            // 9x9 = 81 plots
  visibleRadius: 4,            // Can see 4 plots in each direction
  clearingRadius: 25,          // Units radius of clear area around tower
  maxTerrainHeight: 8,         // Max height at world edges
};

// Exclusion zone for buildings (no trees/rocks placed here)
export interface ExclusionZone {
  x: number;
  z: number;
  radius: number;
}

// Continuous terrain generation config
export interface ContinuousTerrainConfig {
  worldSeed: number;
  worldSize: number;           // Total world size in units
  resolution: number;          // Vertices per side for height map
  clearingRadius: number;      // Flat area around tower
  maxHeight: number;           // Maximum terrain height
  riverWidth: number;          // Width of river
  pathWidth: number;           // Width of beaten path
  exclusionZones: ExclusionZone[]; // Areas where no features are placed
}

export const DEFAULT_CONTINUOUS_CONFIG: ContinuousTerrainConfig = {
  worldSeed: 12345,
  worldSize: 120,              // Cozy world - 120 units total
  resolution: 64,              // 64x64 height map - enough detail for visible facets
  clearingRadius: 18,          // 18 unit flat area around tower
  maxHeight: 8,                // Max 8 units high at edges
  riverWidth: 4,               // 4 unit wide river
  pathWidth: 2,                // 2 unit wide path
  exclusionZones: [{ x: 0, z: 0, radius: 12 }], // Default: center building area
};

// River segment for procedural river generation
export interface RiverSegment {
  start: { x: number; z: number };
  end: { x: number; z: number };
  width: number;
}

// Path node for winding path generation
export interface PathNode {
  x: number;
  z: number;
  direction: number;  // Angle in radians
}

// Biome color palettes
export const BIOME_COLORS: Record<BiomeType, {
  grass: number;
  dirt: number;
  rock: number;
  accent: number;
}> = {
  grassland: {
    grass: 0x4ade80,
    dirt: 0x92400e,
    rock: 0x6b7280,
    accent: 0xfbbf24,
  },
  forest: {
    grass: 0x22c55e,
    dirt: 0x78350f,
    rock: 0x525252,
    accent: 0x84cc16,
  },
  rocky: {
    grass: 0x86efac,
    dirt: 0xa16207,
    rock: 0x404040,
    accent: 0x9ca3af,
  },
  magical: {
    grass: 0xa78bfa,
    dirt: 0x581c87,
    rock: 0x7c3aed,
    accent: 0xf0abfc,
  },
  swamp: {
    grass: 0x65a30d,
    dirt: 0x365314,
    rock: 0x3f3f46,
    accent: 0xa3e635,
  },
};

// Tree configurations per biome
export const BIOME_TREE_CONFIG: Record<BiomeType, {
  trunkColor: number;
  foliageColor: number;
  maxHeight: number;
  density: number;
}> = {
  grassland: {
    trunkColor: 0x92400e,
    foliageColor: 0x22c55e,
    maxHeight: 3.5,
    density: 0.4,
  },
  forest: {
    trunkColor: 0x78350f,
    foliageColor: 0x166534,
    maxHeight: 4.5,
    density: 0.8,
  },
  rocky: {
    trunkColor: 0xa16207,
    foliageColor: 0x4d7c0f,
    maxHeight: 2.5,
    density: 0.2,
  },
  magical: {
    trunkColor: 0x6d28d9,
    foliageColor: 0xc084fc,
    maxHeight: 4.0,
    density: 0.5,
  },
  swamp: {
    trunkColor: 0x365314,
    foliageColor: 0x84cc16,
    maxHeight: 3.0,
    density: 0.6,
  },
};
