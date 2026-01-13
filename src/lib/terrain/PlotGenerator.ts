import type { PlotCoord, PlotConfig, BiomeType, PathDirection, TerrainConfig } from './types';
import { DEFAULT_TERRAIN_CONFIG } from './types';

/**
 * Seeded random number generator (LCG)
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Generates procedural configuration for terrain plots
 */
export class PlotGenerator {
  private config: TerrainConfig;
  private rng: SeededRandom;

  constructor(config: TerrainConfig = DEFAULT_TERRAIN_CONFIG) {
    this.config = config;
    this.rng = new SeededRandom(config.worldSeed);
  }

  /**
   * Generate configuration for a specific plot
   */
  generatePlotConfig(coord: PlotCoord): PlotConfig {
    // Create deterministic seed from position
    const plotSeed = this.hashCoord(coord);
    const plotRng = new SeededRandom(plotSeed);

    // Center plot (0,0) is the main island with tower
    if (coord.gridX === 0 && coord.gridZ === 0) {
      return this.getCenterPlotConfig(plotSeed, coord);
    }

    // Determine biome based on distance from center
    const distance = Math.sqrt(coord.gridX ** 2 + coord.gridZ ** 2);
    const biome = this.determineBiome(distance, plotRng);

    // Calculate terrain features
    const heightVariance = this.calculateHeightVariance(biome, distance, plotRng);
    const treesDensity = this.calculateTreeDensity(biome, plotRng);
    const rocksDensity = this.calculateRockDensity(biome, plotRng);

    // Paths connect plots
    const hasPath = this.shouldHavePath(coord, plotRng);
    const pathDirections = this.calculatePathDirections(coord, plotRng);

    // Base elevation varies by distance and position
    const elevation = this.calculateElevation(coord, distance, plotRng);

    return {
      seed: plotSeed,
      coord,
      biome,
      heightVariance,
      treesDensity,
      rocksDensity,
      hasPath,
      pathDirections,
      isCenter: false,
      elevation,
    };
  }

  /**
   * Get config for the center plot (main tower island)
   */
  private getCenterPlotConfig(seed: number, coord: PlotCoord): PlotConfig {
    return {
      seed,
      coord,
      biome: 'magical',
      heightVariance: 0.2,
      treesDensity: 0.4,
      rocksDensity: 0.2,
      hasPath: true,
      pathDirections: ['north', 'south', 'east', 'west'],
      isCenter: true,
      elevation: 0,
    };
  }

  /**
   * Hash coordinate to get deterministic seed
   */
  private hashCoord(coord: PlotCoord): number {
    // Simple hash combining world seed with coordinates
    return this.config.worldSeed ^
      ((coord.gridX + 100) * 73856093) ^
      ((coord.gridZ + 100) * 19349663);
  }

  /**
   * Determine biome based on distance from center
   */
  private determineBiome(distance: number, rng: SeededRandom): BiomeType {
    const roll = rng.next();

    // Inner ring - mostly grassland with some magical
    if (distance <= 1.5) {
      return roll < 0.7 ? 'grassland' : 'magical';
    }

    // Middle ring - mixed
    if (distance <= 3) {
      if (roll < 0.4) return 'grassland';
      if (roll < 0.7) return 'forest';
      if (roll < 0.9) return 'rocky';
      return 'magical';
    }

    // Outer ring - more wilderness
    if (roll < 0.35) return 'forest';
    if (roll < 0.6) return 'rocky';
    if (roll < 0.8) return 'grassland';
    return 'swamp';
  }

  /**
   * Calculate height variance based on biome and position
   */
  private calculateHeightVariance(biome: BiomeType, distance: number, rng: SeededRandom): number {
    const baseVariance: Record<BiomeType, number> = {
      grassland: 0.2,
      forest: 0.3,
      rocky: 0.5,
      magical: 0.25,
      swamp: 0.1,
    };

    // More variance further from center
    const distanceMultiplier = 1 + distance * 0.1;
    const randomVariation = rng.range(0.8, 1.2);

    return baseVariance[biome] * distanceMultiplier * randomVariation;
  }

  /**
   * Calculate tree density based on biome
   */
  private calculateTreeDensity(biome: BiomeType, rng: SeededRandom): number {
    const baseDensity: Record<BiomeType, number> = {
      grassland: 0.3,
      forest: 0.8,
      rocky: 0.15,
      magical: 0.4,
      swamp: 0.5,
    };

    return baseDensity[biome] * rng.range(0.7, 1.3);
  }

  /**
   * Calculate rock density based on biome
   */
  private calculateRockDensity(biome: BiomeType, rng: SeededRandom): number {
    const baseDensity: Record<BiomeType, number> = {
      grassland: 0.2,
      forest: 0.15,
      rocky: 0.7,
      magical: 0.3,
      swamp: 0.1,
    };

    return baseDensity[biome] * rng.range(0.6, 1.4);
  }

  /**
   * Determine if plot should have a path
   */
  private shouldHavePath(coord: PlotCoord, rng: SeededRandom): boolean {
    // Adjacent to center always has path
    if (Math.abs(coord.gridX) <= 1 && Math.abs(coord.gridZ) <= 1) {
      return true;
    }

    // 40% chance for other plots
    return rng.chance(0.4);
  }

  /**
   * Calculate which directions paths should go
   */
  private calculatePathDirections(coord: PlotCoord, rng: SeededRandom): PathDirection[] {
    const directions: PathDirection[] = [];

    // Path toward center
    if (coord.gridX > 0) directions.push('west');
    if (coord.gridX < 0) directions.push('east');
    if (coord.gridZ > 0) directions.push('north');
    if (coord.gridZ < 0) directions.push('south');

    // Random additional paths
    if (rng.chance(0.3) && !directions.includes('north')) directions.push('north');
    if (rng.chance(0.3) && !directions.includes('south')) directions.push('south');
    if (rng.chance(0.3) && !directions.includes('east')) directions.push('east');
    if (rng.chance(0.3) && !directions.includes('west')) directions.push('west');

    return directions;
  }

  /**
   * Calculate base elevation for the plot
   */
  private calculateElevation(coord: PlotCoord, distance: number, rng: SeededRandom): number {
    // Plots further from center can be at different heights
    // Creates a gentle undulating landscape
    const baseElevation = Math.sin(coord.gridX * 0.5) * Math.cos(coord.gridZ * 0.5) * 2;
    const randomOffset = rng.range(-0.5, 0.5);

    // Outer plots tend to be lower (floating islands dropping off)
    const distanceDropoff = distance > 3 ? -(distance - 3) * 0.3 : 0;

    return baseElevation + randomOffset + distanceDropoff;
  }

  /**
   * Get all plot coordinates in the grid
   */
  getAllPlotCoords(): PlotCoord[] {
    const coords: PlotCoord[] = [];
    const half = Math.floor(this.config.totalGridSize / 2);

    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        coords.push({ gridX: x, gridZ: z });
      }
    }

    return coords;
  }

  /**
   * Get neighbor plot coordinates
   */
  getNeighbors(coord: PlotCoord): PlotCoord[] {
    const neighbors: PlotCoord[] = [];
    const half = Math.floor(this.config.totalGridSize / 2);

    const offsets = [
      { dx: 0, dz: -1 }, // north
      { dx: 0, dz: 1 },  // south
      { dx: 1, dz: 0 },  // east
      { dx: -1, dz: 0 }, // west
    ];

    for (const { dx, dz } of offsets) {
      const nx = coord.gridX + dx;
      const nz = coord.gridZ + dz;

      if (Math.abs(nx) <= half && Math.abs(nz) <= half) {
        neighbors.push({ gridX: nx, gridZ: nz });
      }
    }

    return neighbors;
  }
}
