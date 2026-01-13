import * as THREE from 'three';

interface BuildingPosition {
  x: number;
  z: number;
}

interface VillagePathsConfig {
  mainStreetWidth: number;
  sidePathWidth: number;
  stoneScale: number;
  stonesPerUnit: number;
}

const DEFAULT_CONFIG: VillagePathsConfig = {
  mainStreetWidth: 3.5,
  sidePathWidth: 2.0,
  stoneScale: 1.0,
  stonesPerUnit: 2.5,
};

/**
 * Seeded random for consistent cobblestone placement
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Builds cobblestone village paths connecting buildings along a main street
 */
export class VillagePathsBuilder {
  private config: VillagePathsConfig;
  private rng: SeededRandom;
  private getHeightAt: (x: number, z: number) => number;

  constructor(
    getHeightAt: (x: number, z: number) => number,
    config: Partial<VillagePathsConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = new SeededRandom(42);
    this.getHeightAt = getHeightAt;
  }

  /**
   * Build village paths based on building positions
   */
  build(buildings: BuildingPosition[]): THREE.Group {
    const group = new THREE.Group();

    if (buildings.length === 0) return group;

    // Find the furthest building along the Z-axis to determine street length
    let maxZ = 0;
    for (const building of buildings) {
      if (building.z > maxZ) maxZ = building.z;
    }

    // Add some padding beyond the furthest building
    const streetEndZ = maxZ + 8;

    // Build main street from tower (0,0) going south (positive Z)
    const mainStreet = this.buildMainStreet(0, streetEndZ);
    group.add(mainStreet);

    // Build side paths to each building (skip the first one which is the tower)
    for (let i = 1; i < buildings.length; i++) {
      const building = buildings[i];
      const sidePath = this.buildSidePath(building.x, building.z);
      group.add(sidePath);
    }

    return group;
  }

  /**
   * Build the main cobblestone street running along Z-axis
   */
  private buildMainStreet(startZ: number, endZ: number): THREE.Group {
    const group = new THREE.Group();
    const { mainStreetWidth, stonesPerUnit, stoneScale } = this.config;

    // Stone materials with color variation
    const stoneMats = this.createStoneMaterials();

    const streetLength = endZ - startZ;
    const numSegments = Math.floor(streetLength * stonesPerUnit);

    for (let i = 0; i < numSegments; i++) {
      const z = startZ + (i / numSegments) * streetLength + 2; // Start 2 units south of tower

      // Place stones across the width
      const stonesAcross = 4 + Math.floor(this.rng.next() * 3); // 4-6 stones wide

      for (let j = 0; j < stonesAcross; j++) {
        const acrossT = (j + 0.5) / stonesAcross - 0.5;
        const x = acrossT * mainStreetWidth * 0.95 + this.rng.range(-0.2, 0.2);
        const stoneZ = z + this.rng.range(-0.2, 0.2);
        const y = this.getHeightAt(x, stoneZ) + 0.08;

        const stone = this.createCobblestone(stoneMats, stoneScale);
        stone.position.set(x, y, stoneZ);
        group.add(stone);
      }
    }

    return group;
  }

  /**
   * Build a side path from main street to a building
   */
  private buildSidePath(buildingX: number, buildingZ: number): THREE.Group {
    const group = new THREE.Group();
    const { sidePathWidth, stonesPerUnit, stoneScale } = this.config;

    const stoneMats = this.createStoneMaterials();

    // Path runs from main street (x=0) to building
    const pathLength = Math.abs(buildingX);
    const numSegments = Math.floor(pathLength * stonesPerUnit);
    const direction = buildingX > 0 ? 1 : -1;

    // Start path slightly before reaching building
    const pathEndX = buildingX - direction * 3;

    for (let i = 0; i < numSegments; i++) {
      const t = i / numSegments;
      const x = t * pathEndX;

      // Place stones across the width (perpendicular to path direction)
      const stonesAcross = 2 + Math.floor(this.rng.next() * 2); // 2-3 stones wide

      for (let j = 0; j < stonesAcross; j++) {
        const acrossT = (j + 0.5) / stonesAcross - 0.5;
        const stoneX = x + this.rng.range(-0.15, 0.15);
        const stoneZ = buildingZ + acrossT * sidePathWidth * 0.9 + this.rng.range(-0.15, 0.15);
        const y = this.getHeightAt(stoneX, stoneZ) + 0.08;

        const stone = this.createCobblestone(stoneMats, stoneScale * 0.85);
        stone.position.set(stoneX, y, stoneZ);
        group.add(stone);
      }
    }

    return group;
  }

  /**
   * Create stone materials with color variation
   */
  private createStoneMaterials(): THREE.MeshStandardMaterial[] {
    return [
      new THREE.MeshStandardMaterial({ color: 0x7a7a7a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x6a6a6a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x9a9a8a, flatShading: true, roughness: 0.9 }),
    ];
  }

  /**
   * Create a single cobblestone mesh
   */
  private createCobblestone(
    materials: THREE.MeshStandardMaterial[],
    scale: number
  ): THREE.Mesh {
    const scaleX = this.rng.range(0.25, 0.45) * scale;
    const scaleY = this.rng.range(0.08, 0.15) * scale;
    const scaleZ = this.rng.range(0.25, 0.45) * scale;

    const stoneGeo = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);
    const mat = materials[Math.floor(this.rng.next() * materials.length)];
    const stone = new THREE.Mesh(stoneGeo, mat);

    stone.rotation.y = this.rng.range(0, Math.PI * 2);
    stone.rotation.x = this.rng.range(-0.1, 0.1);
    stone.rotation.z = this.rng.range(-0.1, 0.1);
    stone.receiveShadow = true;

    return stone;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Materials will be disposed when the group is removed
  }
}

/**
 * Create village paths for the given building positions
 */
export function createVillagePaths(
  buildings: BuildingPosition[],
  getHeightAt: (x: number, z: number) => number,
  config?: Partial<VillagePathsConfig>
): THREE.Group {
  const builder = new VillagePathsBuilder(getHeightAt, config);
  return builder.build(buildings);
}
