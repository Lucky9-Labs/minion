import * as THREE from 'three';
import type { PlotConfig, BiomeType, PathDirection } from './types';
import { BIOME_COLORS, BIOME_TREE_CONFIG, DEFAULT_TERRAIN_CONFIG } from './types';

/**
 * Seeded random number generator
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

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

/**
 * Builds 3D meshes for terrain plots
 */
export class PlotMeshBuilder {
  private plotSize: number;

  constructor(plotSize: number = DEFAULT_TERRAIN_CONFIG.plotSize) {
    this.plotSize = plotSize;
  }

  /**
   * Build the 3D mesh for a single plot
   */
  build(config: PlotConfig): THREE.Group {
    const group = new THREE.Group();
    const rng = new SeededRandom(config.seed);

    // Skip center plot as it uses existing tower island
    if (config.isCenter) {
      return group;
    }

    // Generate height map
    const heightMap = this.generateHeightMap(config, rng);

    // Build floating island
    const island = this.buildFloatingIsland(heightMap, config.biome, rng);
    group.add(island);

    // Add trees
    const trees = this.buildTrees(config, rng);
    group.add(trees);

    // Add rocks
    const rocks = this.buildRocks(config, rng);
    group.add(rocks);

    // Add paths
    if (config.hasPath) {
      const paths = this.buildPaths(config.pathDirections, config.biome);
      group.add(paths);
    }

    // Add biome-specific features
    const features = this.buildBiomeFeatures(config.biome, rng);
    group.add(features);

    // Position in world space
    const worldX = config.coord.gridX * this.plotSize;
    const worldZ = config.coord.gridZ * this.plotSize;
    group.position.set(worldX, config.elevation, worldZ);

    return group;
  }

  /**
   * Generate a height map for terrain variation
   */
  private generateHeightMap(config: PlotConfig, rng: SeededRandom): number[][] {
    const size = 8;
    const map: number[][] = [];

    for (let x = 0; x < size; x++) {
      map[x] = [];
      for (let z = 0; z < size; z++) {
        // Simple noise-like height variation
        const nx = x / size;
        const nz = z / size;
        const noise =
          Math.sin(nx * Math.PI * 2) * Math.cos(nz * Math.PI * 2) * 0.5 +
          Math.sin(nx * Math.PI * 4) * 0.25 +
          (rng.next() - 0.5) * config.heightVariance;
        map[x][z] = noise * config.heightVariance;
      }
    }

    return map;
  }

  /**
   * Build a floating island mesh
   */
  private buildFloatingIsland(
    heightMap: number[][],
    biome: BiomeType,
    rng: SeededRandom
  ): THREE.Group {
    const group = new THREE.Group();
    const colors = BIOME_COLORS[biome];
    const halfSize = this.plotSize / 2;

    // Grass layer (top)
    const grassGeo = new THREE.BoxGeometry(this.plotSize * 0.9, 1.5, this.plotSize * 0.9);
    const grassMat = new THREE.MeshStandardMaterial({
      color: colors.grass,
      flatShading: true,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0.75;
    grass.receiveShadow = true;
    group.add(grass);

    // Add height variation on top
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        const h = heightMap[x * 2]?.[z * 2] || 0;
        if (Math.abs(h) > 0.1) {
          const bumpGeo = new THREE.BoxGeometry(
            this.plotSize * 0.2,
            Math.abs(h) * 2,
            this.plotSize * 0.2
          );
          const bump = new THREE.Mesh(bumpGeo, grassMat);
          bump.position.set(
            (x - 1.5) * (this.plotSize * 0.22),
            1.5 + Math.abs(h),
            (z - 1.5) * (this.plotSize * 0.22)
          );
          group.add(bump);
        }
      }
    }

    // Dirt layer
    const dirtGeo = new THREE.BoxGeometry(this.plotSize * 0.85, 2.0, this.plotSize * 0.85);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: colors.dirt,
      flatShading: true,
    });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.position.y = -0.5;
    group.add(dirt);

    // Stone layer
    const stoneGeo = new THREE.BoxGeometry(this.plotSize * 0.75, 2.5, this.plotSize * 0.75);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: colors.rock,
      flatShading: true,
    });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.position.y = -2.5;
    group.add(stone);

    // Bottom spike
    const spikeGeo = new THREE.ConeGeometry(this.plotSize * 0.3, 4, 6);
    const spike = new THREE.Mesh(spikeGeo, stoneMat);
    spike.position.y = -5.5;
    spike.rotation.x = Math.PI;
    group.add(spike);

    return group;
  }

  /**
   * Build trees for the plot
   */
  private buildTrees(config: PlotConfig, rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const treeConfig = BIOME_TREE_CONFIG[config.biome];
    const numTrees = Math.floor(config.treesDensity * 12);
    const halfSize = this.plotSize / 2 - 1.5;

    for (let i = 0; i < numTrees; i++) {
      const x = rng.range(-halfSize, halfSize);
      const z = rng.range(-halfSize, halfSize);

      // Avoid center for paths
      if (Math.abs(x) < 1.5 && Math.abs(z) < 1.5) continue;

      const scale = rng.range(0.7, 1.3);
      const tree = this.buildTree(config.biome, scale, rng);
      tree.position.set(x, 1.5, z);
      group.add(tree);
    }

    return group;
  }

  /**
   * Build a single tree
   */
  private buildTree(biome: BiomeType, scale: number, rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const treeConfig = BIOME_TREE_CONFIG[biome];

    // Trunk
    const trunkHeight = treeConfig.maxHeight * scale * rng.range(0.7, 1.0);
    const trunkGeo = new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, trunkHeight, 6);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: treeConfig.trunkColor,
      flatShading: true,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage (cone shape for most, sphere for magical)
    const foliageMat = new THREE.MeshStandardMaterial({
      color: treeConfig.foliageColor,
      flatShading: true,
    });

    if (biome === 'magical') {
      // Crystal-like foliage
      const foliageGeo = new THREE.OctahedronGeometry(1.0 * scale);
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = trunkHeight + 0.5 * scale;
      foliage.rotation.y = rng.next() * Math.PI;
      foliage.castShadow = true;
      group.add(foliage);

      // Add glow
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.3,
      });
      const glowGeo = new THREE.SphereGeometry(1.2 * scale, 8, 6);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = trunkHeight + 0.5 * scale;
      group.add(glow);
    } else if (biome === 'swamp') {
      // Willow-like droopy foliage
      const foliageGeo = new THREE.ConeGeometry(1.2 * scale, 2.5 * scale, 8);
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = trunkHeight + 0.8 * scale;
      foliage.castShadow = true;
      group.add(foliage);
    } else {
      // Standard cone tree
      const foliageGeo = new THREE.ConeGeometry(1.0 * scale, 2.0 * scale, 8);
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = trunkHeight + 0.8 * scale;
      foliage.castShadow = true;
      group.add(foliage);

      // Second layer for fuller trees
      if (biome === 'forest' && rng.chance(0.7)) {
        const foliage2Geo = new THREE.ConeGeometry(0.7 * scale, 1.5 * scale, 8);
        const foliage2 = new THREE.Mesh(foliage2Geo, foliageMat);
        foliage2.position.y = trunkHeight + 1.8 * scale;
        foliage2.castShadow = true;
        group.add(foliage2);
      }
    }

    return group;
  }

  /**
   * Build rocks for the plot
   */
  private buildRocks(config: PlotConfig, rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const colors = BIOME_COLORS[config.biome];
    const numRocks = Math.floor(config.rocksDensity * 8);
    const halfSize = this.plotSize / 2 - 1;

    const rockMat = new THREE.MeshStandardMaterial({
      color: colors.rock,
      flatShading: true,
    });

    for (let i = 0; i < numRocks; i++) {
      const x = rng.range(-halfSize, halfSize);
      const z = rng.range(-halfSize, halfSize);

      // Avoid center path area
      if (Math.abs(x) < 1 && Math.abs(z) < 1) continue;

      const scale = rng.range(0.3, 0.8);
      const rockGeo = new THREE.DodecahedronGeometry(scale);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, 1.5 + scale * 0.3, z);
      rock.rotation.set(
        rng.next() * Math.PI,
        rng.next() * Math.PI,
        rng.next() * Math.PI
      );
      rock.castShadow = true;
      group.add(rock);
    }

    return group;
  }

  /**
   * Build paths connecting plots
   */
  private buildPaths(directions: PathDirection[], biome: BiomeType): THREE.Group {
    const group = new THREE.Group();
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      flatShading: true,
    });

    const halfSize = this.plotSize / 2;
    const pathWidth = 1.2;
    const pathY = 1.52;

    for (const dir of directions) {
      let pathGeo: THREE.BoxGeometry;
      let x = 0, z = 0;

      switch (dir) {
        case 'north':
          pathGeo = new THREE.BoxGeometry(pathWidth, 0.05, halfSize);
          z = -halfSize / 2;
          break;
        case 'south':
          pathGeo = new THREE.BoxGeometry(pathWidth, 0.05, halfSize);
          z = halfSize / 2;
          break;
        case 'east':
          pathGeo = new THREE.BoxGeometry(halfSize, 0.05, pathWidth);
          x = halfSize / 2;
          break;
        case 'west':
          pathGeo = new THREE.BoxGeometry(halfSize, 0.05, pathWidth);
          x = -halfSize / 2;
          break;
      }

      const path = new THREE.Mesh(pathGeo, pathMat);
      path.position.set(x, pathY, z);
      path.receiveShadow = true;
      group.add(path);
    }

    // Central intersection
    if (directions.length > 0) {
      const centerGeo = new THREE.BoxGeometry(pathWidth * 1.5, 0.05, pathWidth * 1.5);
      const center = new THREE.Mesh(centerGeo, pathMat);
      center.position.y = pathY;
      center.receiveShadow = true;
      group.add(center);
    }

    return group;
  }

  /**
   * Build biome-specific decorative features
   */
  private buildBiomeFeatures(biome: BiomeType, rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();

    switch (biome) {
      case 'magical':
        // Floating crystals
        for (let i = 0; i < 3; i++) {
          const crystal = this.buildCrystal(rng);
          crystal.position.set(
            rng.range(-6, 6),
            rng.range(3, 6),
            rng.range(-6, 6)
          );
          group.add(crystal);
        }
        break;

      case 'swamp':
        // Lily pads / mushrooms
        for (let i = 0; i < 5; i++) {
          const mushroom = this.buildMushroom(rng);
          mushroom.position.set(
            rng.range(-7, 7),
            1.5,
            rng.range(-7, 7)
          );
          group.add(mushroom);
        }
        break;

      case 'rocky':
        // Larger boulders
        for (let i = 0; i < 2; i++) {
          const boulder = this.buildBoulder(rng);
          boulder.position.set(
            rng.range(-5, 5),
            1.5,
            rng.range(-5, 5)
          );
          group.add(boulder);
        }
        break;

      case 'forest':
        // Fallen logs
        if (rng.chance(0.5)) {
          const log = this.buildLog(rng);
          log.position.set(
            rng.range(-5, 5),
            1.6,
            rng.range(-5, 5)
          );
          log.rotation.y = rng.next() * Math.PI;
          group.add(log);
        }
        break;

      default:
        // Grassland - flowers
        for (let i = 0; i < 8; i++) {
          const flower = this.buildFlower(rng);
          flower.position.set(
            rng.range(-7, 7),
            1.55,
            rng.range(-7, 7)
          );
          group.add(flower);
        }
    }

    return group;
  }

  private buildCrystal(rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const color = rng.chance(0.5) ? 0xc084fc : 0x8b5cf6;
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
    });

    const geo = new THREE.OctahedronGeometry(rng.range(0.3, 0.6));
    const crystal = new THREE.Mesh(geo, mat);
    crystal.rotation.set(rng.next(), rng.next(), rng.next());
    group.add(crystal);

    return group;
  }

  private buildMushroom(rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const scale = rng.range(0.2, 0.5);

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      flatShading: true,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: rng.chance(0.5) ? 0xdc2626 : 0x854d0e,
      flatShading: true,
    });

    const stemGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.4, scale * 1.5, 6);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = scale * 0.75;
    group.add(stem);

    const capGeo = new THREE.SphereGeometry(scale, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = scale * 1.5;
    group.add(cap);

    return group;
  }

  private buildBoulder(rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const scale = rng.range(1.0, 2.0);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x525252,
      flatShading: true,
    });

    const geo = new THREE.DodecahedronGeometry(scale);
    const boulder = new THREE.Mesh(geo, mat);
    boulder.scale.set(1, rng.range(0.6, 0.9), 1);
    boulder.rotation.set(rng.next(), rng.next(), rng.next());
    boulder.castShadow = true;
    group.add(boulder);

    return group;
  }

  private buildLog(rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const length = rng.range(2, 4);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      flatShading: true,
    });

    const geo = new THREE.CylinderGeometry(0.25, 0.3, length, 8);
    const log = new THREE.Mesh(geo, mat);
    log.rotation.z = Math.PI / 2;
    log.castShadow = true;
    group.add(log);

    return group;
  }

  private buildFlower(rng: SeededRandom): THREE.Group {
    const group = new THREE.Group();
    const colors = [0xf472b6, 0xfbbf24, 0x60a5fa, 0xc084fc, 0xfb7185];
    const color = colors[Math.floor(rng.next() * colors.length)];

    const petalMat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
    });

    // Simple flower - sphere
    const flowerGeo = new THREE.SphereGeometry(0.1, 6, 4);
    const flower = new THREE.Mesh(flowerGeo, petalMat);
    group.add(flower);

    // Stem
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      flatShading: true,
    });
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = -0.1;
    group.add(stem);

    return group;
  }
}
