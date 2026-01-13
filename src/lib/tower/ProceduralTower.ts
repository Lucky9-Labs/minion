import type {
  TowerConfig,
  TowerData,
  FloorLayout,
  StairPosition,
  WindowConfig,
} from './types';
import { DEFAULT_TOWER_CONFIG } from './types';

/**
 * Seeded random number generator
 * Uses a simple LCG (Linear Congruential Generator)
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Get next random number between 0 and 1
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * Get random integer in range [min, max]
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Random boolean with given probability
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * Stair positions that rotate around the tower
 */
const STAIR_ROTATION: StairPosition[] = ['south', 'east', 'north', 'west'];

/**
 * Generate procedural tower layout
 */
export class ProceduralTower {
  private config: TowerConfig;
  private rng: SeededRandom;

  constructor(config: Partial<TowerConfig> = {}) {
    this.config = { ...DEFAULT_TOWER_CONFIG, ...config };
    this.rng = new SeededRandom(this.config.seed);
  }

  /**
   * Generate the tower data
   */
  generate(): TowerData {
    const floors: FloorLayout[] = [];

    for (let i = 0; i < this.config.floors; i++) {
      floors.push(this.generateFloor(i));
    }

    return {
      config: this.config,
      floors,
    };
  }

  /**
   * Generate layout for a single floor
   */
  private generateFloor(floorIndex: number): FloorLayout {
    // Stairs rotate around the tower as you go up
    const stairPosition = STAIR_ROTATION[floorIndex % 4];

    // Generate windows
    const windows = this.generateWindows(floorIndex);

    // Balconies on upper floors (20% chance)
    const hasBalcony = floorIndex >= 2 && this.rng.chance(0.2);

    // Only ground floor has door
    const hasDoor = floorIndex === 0;

    return {
      floorIndex,
      stairPosition,
      windows,
      hasBalcony,
      hasDoor,
    };
  }

  /**
   * Generate window configurations for a floor
   */
  private generateWindows(floorIndex: number): WindowConfig[] {
    const windows: WindowConfig[] = [];
    const walls: Array<'front' | 'back' | 'left' | 'right'> = ['front', 'back', 'left', 'right'];

    for (const wall of walls) {
      // Skip front wall on ground floor (has door)
      if (floorIndex === 0 && wall === 'front') continue;

      // 1-2 windows per wall
      const numWindows = this.rng.nextInt(1, 2);

      for (let i = 0; i < numWindows; i++) {
        // Spread windows across wall
        const offsetX = numWindows === 1
          ? 0.5
          : (i + 1) / (numWindows + 1);

        windows.push({
          wall,
          offsetX,
          offsetY: 0.4 + this.rng.next() * 0.2,  // 40-60% up the floor
          width: 0.3 + this.rng.next() * 0.1,    // 0.3-0.4 units
          height: 0.4 + this.rng.next() * 0.15,  // 0.4-0.55 units
        });
      }
    }

    return windows;
  }

  /**
   * Get the Y position for a floor
   */
  getFloorY(floorIndex: number): number {
    return this.config.baseY + floorIndex * this.config.floorHeight;
  }

  /**
   * Get the world position of a stair on a floor
   */
  getStairWorldPosition(floorIndex: number): { x: number; z: number; y: number } {
    const stairPos = STAIR_ROTATION[floorIndex % 4];
    const halfWidth = this.config.footprint.width / 2 - 0.5;

    let x = 0;
    let z = 0;

    switch (stairPos) {
      case 'north': z = -halfWidth; break;
      case 'south': z = halfWidth; break;
      case 'east': x = halfWidth; break;
      case 'west': x = -halfWidth; break;
    }

    return {
      x,
      z,
      y: this.getFloorY(floorIndex),
    };
  }
}
