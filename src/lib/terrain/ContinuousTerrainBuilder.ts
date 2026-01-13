import * as THREE from 'three';
import type { ContinuousTerrainConfig, PathNode, RiverSegment } from './types';
import { DEFAULT_CONTINUOUS_CONFIG, BIOME_TREE_CONFIG } from './types';

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

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  gaussian(): number {
    // Box-Muller transform for gaussian distribution
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Simple 2D noise generator
 */
function noise2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const n00 = noise2D(ix, iz, seed);
  const n10 = noise2D(ix + 1, iz, seed);
  const n01 = noise2D(ix, iz + 1, seed);
  const n11 = noise2D(ix + 1, iz + 1, seed);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return nx0 * (1 - sz) + nx1 * sz;
}

function fbmNoise(x: number, z: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, z * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Builds continuous terrain with height variation, rivers, paths, and vegetation
 */
export class ContinuousTerrainBuilder {
  private config: ContinuousTerrainConfig;
  private rng: SeededRandom;
  private heightMap: Float32Array;
  private riverPath: RiverSegment[] = [];
  private mainPaths: PathNode[][] = [];

  constructor(config: ContinuousTerrainConfig = DEFAULT_CONTINUOUS_CONFIG) {
    this.config = config;
    this.rng = new SeededRandom(config.worldSeed);
    this.heightMap = new Float32Array(config.resolution * config.resolution);

    // Generate terrain data
    this.generateHeightMap();
    this.generateRiver();
    this.generatePaths();
    this.carveRiverAndPaths();
  }

  /**
   * Build the complete terrain mesh
   */
  build(): THREE.Group {
    const group = new THREE.Group();

    // Unified ground mesh with rivers/paths as carved valleys with vertex colors
    const ground = this.buildGroundMesh();
    group.add(ground);

    // Transparent water blocks over river valleys
    const water = this.buildWaterMesh();
    group.add(water);

    // Cobblestone paths (3D modeled stones)
    const cobblestones = this.buildCobblestonePaths();
    group.add(cobblestones);

    // Grass blades of varying heights
    const grass = this.buildGrass();
    group.add(grass);

    // Vegetation (trees, rocks, flowers)
    const vegetation = this.buildVegetation();
    group.add(vegetation);

    // Dynamic features
    const features = this.buildDynamicFeatures();
    group.add(features);

    return group;
  }

  /**
   * Build a continuous water ribbon mesh that follows the river path
   * Creates a single merged geometry for smooth appearance
   */
  private buildWaterMesh(): THREE.Group {
    const group = new THREE.Group();

    if (this.riverPath.length === 0) return group;

    // Collect all river points into a single path
    const riverPoints: { x: number; z: number; width: number }[] = [];

    for (const segment of this.riverPath) {
      if (riverPoints.length === 0) {
        riverPoints.push({
          x: segment.start.x,
          z: segment.start.z,
          width: segment.width,
        });
      }
      riverPoints.push({
        x: segment.end.x,
        z: segment.end.z,
        width: segment.width,
      });
    }

    if (riverPoints.length < 2) return group;

    // Build ribbon geometry along the river path
    const vertices: number[] = [];
    const indices: number[] = [];
    const waterY = -0.25; // Water surface level

    for (let i = 0; i < riverPoints.length; i++) {
      const point = riverPoints[i];
      const width = point.width * 0.75; // Slightly narrower than valley

      // Calculate perpendicular direction for ribbon width
      let perpX: number, perpZ: number;

      if (i === 0) {
        // First point - use direction to next point
        const next = riverPoints[i + 1];
        const dx = next.x - point.x;
        const dz = next.z - point.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
      } else if (i === riverPoints.length - 1) {
        // Last point - use direction from previous point
        const prev = riverPoints[i - 1];
        const dx = point.x - prev.x;
        const dz = point.z - prev.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        perpX = -dz / len;
        perpZ = dx / len;
      } else {
        // Middle point - average direction from both neighbors
        const prev = riverPoints[i - 1];
        const next = riverPoints[i + 1];
        const dx1 = point.x - prev.x;
        const dz1 = point.z - prev.z;
        const dx2 = next.x - point.x;
        const dz2 = next.z - point.z;
        const len1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);
        const len2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

        // Average the perpendiculars
        const perpX1 = -dz1 / len1;
        const perpZ1 = dx1 / len1;
        const perpX2 = -dz2 / len2;
        const perpZ2 = dx2 / len2;

        perpX = (perpX1 + perpX2) / 2;
        perpZ = (perpZ1 + perpZ2) / 2;

        // Normalize
        const perpLen = Math.sqrt(perpX * perpX + perpZ * perpZ);
        perpX /= perpLen;
        perpZ /= perpLen;
      }

      // Add left and right vertices for this point
      // Left vertex
      vertices.push(
        point.x + perpX * width / 2,
        waterY,
        point.z + perpZ * width / 2
      );
      // Right vertex
      vertices.push(
        point.x - perpX * width / 2,
        waterY,
        point.z - perpZ * width / 2
      );

      // Create triangles between consecutive pairs
      if (i > 0) {
        const baseIndex = (i - 1) * 2;
        // Two triangles forming a quad
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
      }
    }

    // Create the geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Water material
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
      metalness: 0.2,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const waterMesh = new THREE.Mesh(geometry, waterMaterial);
    group.add(waterMesh);

    return group;
  }

  /**
   * Build 3D cobblestone paths along the main paths
   * Creates individual stone meshes for a charming low-poly look
   */
  private buildCobblestonePaths(): THREE.Group {
    const group = new THREE.Group();

    // Stone materials with color variation
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x7a7a7a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x8a8a8a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x6a6a6a, flatShading: true, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x9a9a8a, flatShading: true, roughness: 0.9 }),
    ];

    // Place stones along each path
    for (const path of this.mainPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const startX = path[i].x;
        const startZ = path[i].z;
        const endX = path[i + 1].x;
        const endZ = path[i + 1].z;

        const segmentLength = Math.sqrt((endX - startX) ** 2 + (endZ - startZ) ** 2);
        const numStones = Math.floor(segmentLength * 2.5); // ~2.5 stones per unit length

        for (let j = 0; j < numStones; j++) {
          const t = j / numStones;
          const baseX = startX + (endX - startX) * t;
          const baseZ = startZ + (endZ - startZ) * t;

          // Perpendicular offset for path width
          const dx = endX - startX;
          const dz = endZ - startZ;
          const len = Math.sqrt(dx * dx + dz * dz);
          const perpX = -dz / len;
          const perpZ = dx / len;

          // Place 2-3 stones across the path width
          const stonesAcross = 2 + Math.floor(this.rng.next() * 2);
          for (let k = 0; k < stonesAcross; k++) {
            const acrossT = (k + 0.5) / stonesAcross - 0.5;
            const offsetX = perpX * acrossT * this.config.pathWidth * 0.9;
            const offsetZ = perpZ * acrossT * this.config.pathWidth * 0.9;

            // Add some randomness
            const stoneX = baseX + offsetX + this.rng.range(-0.2, 0.2);
            const stoneZ = baseZ + offsetZ + this.rng.range(-0.2, 0.2);
            const stoneY = this.getHeightAt(stoneX, stoneZ) + 0.08;

            // Create cobblestone - low poly box with random scale
            const scaleX = this.rng.range(0.25, 0.45);
            const scaleY = this.rng.range(0.08, 0.15);
            const scaleZ = this.rng.range(0.25, 0.45);

            const stoneGeo = new THREE.BoxGeometry(scaleX, scaleY, scaleZ);
            const mat = stoneMats[Math.floor(this.rng.next() * stoneMats.length)];
            const stone = new THREE.Mesh(stoneGeo, mat);

            stone.position.set(stoneX, stoneY, stoneZ);
            stone.rotation.y = this.rng.range(0, Math.PI * 2);
            stone.rotation.x = this.rng.range(-0.1, 0.1);
            stone.rotation.z = this.rng.range(-0.1, 0.1);
            stone.receiveShadow = true;

            group.add(stone);
          }
        }
      }
    }

    return group;
  }

  /**
   * Build grass blades of varying heights scattered across the terrain
   * Creates clusters of low-poly grass for a lush, cozy feel
   */
  private buildGrass(): THREE.Group {
    const group = new THREE.Group();
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // Grass materials with color variation
    const grassMats = [
      new THREE.MeshStandardMaterial({ color: 0x4a9e4a, flatShading: true, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x3d8e3d, flatShading: true, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x5aae5a, flatShading: true, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x4a8e3a, flatShading: true, side: THREE.DoubleSide }),
    ];

    // Spawn grass in clusters across the terrain
    const gridStep = 3; // Dense grass placement

    for (let z = -halfSize + gridStep; z < halfSize; z += gridStep) {
      for (let x = -halfSize + gridStep; x < halfSize; x += gridStep) {
        const jx = x + this.rng.range(-gridStep * 0.4, gridStep * 0.4);
        const jz = z + this.rng.range(-gridStep * 0.4, gridStep * 0.4);

        const distFromCenter = Math.sqrt(jx * jx + jz * jz);

        // Skip exclusion zones, river, paths
        if (this.isInExclusionZone(jx, jz) || this.isOnRiver(jx, jz) || this.isOnPath(jx, jz)) continue;

        // Grass density - more in clearing, moderate elsewhere
        let grassChance = 0;
        if (distFromCenter < clearingRadius) {
          grassChance = 0.8; // Lots of grass in the clearing meadow
        } else {
          const t = (distFromCenter - clearingRadius) / (halfSize - clearingRadius);
          grassChance = 0.6 - t * 0.4; // Less grass in forests
        }

        if (this.rng.next() > grassChance) continue;

        const height = this.getHeightAt(jx, jz);

        // Create a cluster of grass blades
        const numBlades = Math.floor(this.rng.range(3, 8));
        const clusterGroup = new THREE.Group();

        for (let i = 0; i < numBlades; i++) {
          const bladeX = this.rng.range(-0.4, 0.4);
          const bladeZ = this.rng.range(-0.4, 0.4);

          // Varying blade heights - taller in clearing, shorter in forests
          let bladeHeight: number;
          if (distFromCenter < clearingRadius) {
            bladeHeight = this.rng.range(0.3, 0.8); // Tall meadow grass
          } else {
            bladeHeight = this.rng.range(0.15, 0.4); // Short forest grass
          }

          const bladeWidth = this.rng.range(0.06, 0.12);

          // Grass blade as a thin triangle/cone
          const bladeGeo = new THREE.ConeGeometry(bladeWidth, bladeHeight, 4);
          bladeGeo.translate(0, bladeHeight / 2, 0);

          const mat = grassMats[Math.floor(this.rng.next() * grassMats.length)];
          const blade = new THREE.Mesh(bladeGeo, mat);

          blade.position.set(bladeX, 0, bladeZ);
          blade.rotation.y = this.rng.range(0, Math.PI * 2);
          // Slight random tilt for natural look
          blade.rotation.x = this.rng.range(-0.2, 0.2);
          blade.rotation.z = this.rng.range(-0.2, 0.2);

          clusterGroup.add(blade);
        }

        clusterGroup.position.set(jx, height, jz);
        group.add(clusterGroup);
      }
    }

    return group;
  }

  /**
   * Generate height map with distance-based elevation
   */
  private generateHeightMap(): void {
    const { resolution, worldSize, clearingRadius, maxHeight, worldSeed } = this.config;
    const halfSize = worldSize / 2;

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // World position
        const wx = (x / (resolution - 1)) * worldSize - halfSize;
        const wz = (z / (resolution - 1)) * worldSize - halfSize;

        // Distance from center (tower)
        const distFromCenter = Math.sqrt(wx * wx + wz * wz);

        // Base height increases with distance from center
        // Flat in the clearing, then rises
        let baseHeight = 0;
        if (distFromCenter > clearingRadius) {
          const t = (distFromCenter - clearingRadius) / (halfSize - clearingRadius);
          baseHeight = t * t * maxHeight * 0.6; // Quadratic rise
        }

        // Add noise for natural variation
        // More noise further from center
        const noiseScale = 0.03;
        const noiseAmp = Math.min((distFromCenter / halfSize) * maxHeight * 0.4, maxHeight * 0.4);
        const noiseValue = fbmNoise(wx * noiseScale, wz * noiseScale, worldSeed, 5);

        // Combine base height with noise
        let height = baseHeight + (noiseValue - 0.5) * noiseAmp * 2;

        // Smooth transition near clearing
        if (distFromCenter < clearingRadius * 1.5) {
          const blend = Math.max(0, (distFromCenter - clearingRadius) / (clearingRadius * 0.5));
          height *= blend;
        }

        // Add micro-variation everywhere for ground texture (low-poly bumpiness)
        // High frequency, low amplitude noise that creates visible facets even in flat areas
        const microNoiseScale = 0.12;
        const microNoise = smoothNoise(wx * microNoiseScale, wz * microNoiseScale, worldSeed + 999);
        const microHeight = (microNoise - 0.5) * 0.8; // +/- 0.4 units of micro bumps for more visible polygons

        this.heightMap[z * resolution + x] = Math.max(0, height + microHeight);
      }
    }
  }

  /**
   * Generate river path winding through the terrain
   */
  private generateRiver(): void {
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // River starts from one edge, winds through, exits another edge
    // Avoid going through the center clearing
    const startAngle = this.rng.range(0.3, 0.7) * Math.PI; // Start from one side
    const startX = Math.cos(startAngle) * halfSize * 0.95;
    const startZ = Math.sin(startAngle) * halfSize * 0.95;

    let currentX = startX;
    let currentZ = startZ;
    let direction = startAngle + Math.PI; // Toward center initially

    const segments: RiverSegment[] = [];
    const stepLength = 8;
    const maxSteps = 30;

    for (let i = 0; i < maxSteps; i++) {
      const prevX = currentX;
      const prevZ = currentZ;

      // Curve away from center when getting close
      const distFromCenter = Math.sqrt(currentX * currentX + currentZ * currentZ);
      if (distFromCenter < clearingRadius * 1.8) {
        // Curve around the clearing
        const angleToCenter = Math.atan2(currentZ, currentX);
        const tangent = angleToCenter + Math.PI / 2;
        direction = tangent + this.rng.range(-0.3, 0.3);
      } else {
        // Add random wandering
        direction += this.rng.range(-0.4, 0.4);
      }

      // Move forward
      currentX += Math.cos(direction) * stepLength;
      currentZ += Math.sin(direction) * stepLength;

      // Stop if we exit the world
      if (Math.abs(currentX) > halfSize || Math.abs(currentZ) > halfSize) {
        segments.push({
          start: { x: prevX, z: prevZ },
          end: { x: currentX, z: currentZ },
          width: this.config.riverWidth,
        });
        break;
      }

      segments.push({
        start: { x: prevX, z: prevZ },
        end: { x: currentX, z: currentZ },
        width: this.config.riverWidth + this.rng.range(-0.5, 0.5),
      });
    }

    this.riverPath = segments;
  }

  /**
   * Generate winding paths from the tower outward
   */
  private generatePaths(): void {
    const { worldSize, clearingRadius, pathWidth } = this.config;
    const halfSize = worldSize / 2;

    // Create 3-4 main paths radiating outward from the tower
    const numPaths = 3 + Math.floor(this.rng.next() * 2);
    const angleStep = (Math.PI * 2) / numPaths;
    const startAngle = this.rng.range(0, angleStep);

    for (let i = 0; i < numPaths; i++) {
      const path: PathNode[] = [];
      let angle = startAngle + i * angleStep + this.rng.range(-0.3, 0.3);

      // Start at edge of clearing
      let x = Math.cos(angle) * clearingRadius;
      let z = Math.sin(angle) * clearingRadius;
      let direction = angle;

      path.push({ x, z, direction });

      // Wind outward
      const maxSteps = 15;
      const stepLength = 6;

      for (let j = 0; j < maxSteps; j++) {
        // Gradually curve
        direction += this.rng.range(-0.4, 0.4);

        // Bias slightly outward
        const angleFromCenter = Math.atan2(z, x);
        const outwardBias = angleFromCenter - direction;
        direction += outwardBias * 0.1;

        x += Math.cos(direction) * stepLength;
        z += Math.sin(direction) * stepLength;

        // Stop at world edge
        if (Math.abs(x) > halfSize * 0.9 || Math.abs(z) > halfSize * 0.9) {
          path.push({ x, z, direction });
          break;
        }

        path.push({ x, z, direction });
      }

      this.mainPaths.push(path);
    }
  }

  /**
   * Carve river and paths into height map (lower terrain)
   * Creates smooth valleys that integrate with the low-poly mesh
   */
  private carveRiverAndPaths(): void {
    // Carve river as a smooth valley
    for (const segment of this.riverPath) {
      this.carveValley(
        segment.start.x, segment.start.z,
        segment.end.x, segment.end.z,
        segment.width * 1.5, // Wider bank area
        -0.8, // Valley depth
        'river'
      );
    }

    // Carve paths as subtle depressions
    for (const path of this.mainPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        this.carveValley(
          path[i].x, path[i].z,
          path[i + 1].x, path[i + 1].z,
          this.config.pathWidth * 1.2,
          -0.15, // Subtle depression
          'path'
        );
      }
    }

    // Smooth the terrain to blend valleys naturally
    this.smoothHeightMap(2);
  }

  /**
   * Carve a smooth valley along a line segment
   * Uses Gaussian-like falloff for natural-looking slopes
   */
  private carveValley(
    x1: number, z1: number,
    x2: number, z2: number,
    width: number,
    depth: number,
    type: 'river' | 'path'
  ): void {
    const { resolution, worldSize } = this.config;
    const halfSize = worldSize / 2;

    // Sample many points along the line for smooth carving
    const dist = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const steps = Math.ceil(dist * 2); // More samples for smoother result

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;

      // Convert to grid coordinates
      const gridX = ((px + halfSize) / worldSize) * (resolution - 1);
      const gridZ = ((pz + halfSize) / worldSize) * (resolution - 1);

      // Affect radius in grid units
      const gridRadius = (width / worldSize) * (resolution - 1) * 1.5;

      for (let dz = -Math.ceil(gridRadius); dz <= Math.ceil(gridRadius); dz++) {
        for (let dx = -Math.ceil(gridRadius); dx <= Math.ceil(gridRadius); dx++) {
          const gx = Math.round(gridX + dx);
          const gz = Math.round(gridZ + dz);

          if (gx >= 0 && gx < resolution && gz >= 0 && gz < resolution) {
            const index = gz * resolution + gx;

            // Distance from center line normalized to width
            const distFromCenter = Math.sqrt(dx * dx + dz * dz) / gridRadius;

            if (distFromCenter <= 1) {
              // Smooth Gaussian-like falloff for natural valley shape
              // cos^2 gives a nice smooth valley profile
              const falloff = Math.cos(distFromCenter * Math.PI / 2);
              const falloffSq = falloff * falloff;

              // Apply carving - deeper in center, gentle slopes at edges
              const carveAmount = depth * falloffSq;
              this.heightMap[index] = Math.max(
                type === 'river' ? -0.5 : 0, // River can go slightly below 0
                this.heightMap[index] + carveAmount
              );
            }
          }
        }
      }
    }
  }

  /**
   * Smooth the height map to blend features naturally
   */
  private smoothHeightMap(iterations: number): void {
    const { resolution } = this.config;

    for (let iter = 0; iter < iterations; iter++) {
      const newHeightMap = new Float32Array(resolution * resolution);

      for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
          const index = z * resolution + x;
          let sum = this.heightMap[index];
          let count = 1;

          // Average with neighbors
          for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < resolution && nz >= 0 && nz < resolution) {
              sum += this.heightMap[nz * resolution + nx];
              count++;
            }
          }

          newHeightMap[index] = sum / count;
        }
      }

      this.heightMap = newHeightMap;
    }
  }

  /**
   * Build the ground mesh with vertex colors
   * Rivers and paths are colored valleys - no separate overlay meshes
   * Uses flat shading for clean low-poly triangle aesthetic
   */
  private buildGroundMesh(): THREE.Mesh {
    const { resolution, worldSize } = this.config;
    const halfSize = worldSize / 2;

    const geometry = new THREE.PlaneGeometry(
      worldSize,
      worldSize,
      resolution - 1,
      resolution - 1
    );

    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = new Float32Array(positions.length);

    // Apply height map and vertex colors
    for (let i = 0; i < resolution * resolution; i++) {
      const vertexIndex = i * 3;
      const height = this.heightMap[i];

      // Set Y position from height map
      positions[vertexIndex + 1] = height;

      // Get world position for color calculation
      const wx = positions[vertexIndex];
      const wz = positions[vertexIndex + 2];
      const distFromCenter = Math.sqrt(wx * wx + wz * wz);

      // Calculate river and path proximity for smooth color blending
      const riverDist = this.getDistanceToRiver(wx, wz);
      const pathDist = this.getDistanceToPath(wx, wz);

      let r: number, g: number, b: number;

      // River coloring - blue water in the carved valley
      if (riverDist < this.config.riverWidth * 0.6) {
        // Center of river - deep blue
        const t = riverDist / (this.config.riverWidth * 0.6);
        r = 0.18 + t * 0.05;
        g = 0.42 + t * 0.08;
        b = 0.75 - t * 0.1;
      } else if (riverDist < this.config.riverWidth * 1.2) {
        // River banks - blend from water to muddy bank
        const t = (riverDist - this.config.riverWidth * 0.6) / (this.config.riverWidth * 0.6);
        // Blue to muddy brown
        r = 0.23 * (1 - t) + 0.45 * t;
        g = 0.50 * (1 - t) + 0.38 * t;
        b = 0.65 * (1 - t) + 0.28 * t;
      } else if (pathDist < this.config.pathWidth * 0.8) {
        // On path - dirt/packed earth
        const t = pathDist / (this.config.pathWidth * 0.8);
        r = 0.52 - t * 0.05;
        g = 0.38 - t * 0.03;
        b = 0.24 + t * 0.02;
      } else if (pathDist < this.config.pathWidth * 1.5) {
        // Path edges - blend to grass
        const t = (pathDist - this.config.pathWidth * 0.8) / (this.config.pathWidth * 0.7);
        r = 0.47 * (1 - t) + 0.32 * t;
        g = 0.35 * (1 - t) + 0.58 * t;
        b = 0.26 * (1 - t) + 0.28 * t;
      } else {
        // Regular terrain based on height
        if (height < 0.3) {
          // Low/flat ground - lush meadow grass
          r = 0.32; g = 0.58; b = 0.28;
        } else if (height < 2) {
          // Mid elevation - grass
          const t = height / 2;
          r = 0.32 * (1 - t) + 0.38 * t;
          g = 0.58 * (1 - t) + 0.52 * t;
          b = 0.28 * (1 - t) + 0.26 * t;
        } else if (height < 5) {
          // Higher - forest floor/brownish
          const t = (height - 2) / 3;
          r = 0.38 * (1 - t) + 0.42 * t;
          g = 0.52 * (1 - t) + 0.44 * t;
          b = 0.26 * (1 - t) + 0.30 * t;
        } else {
          // Highest - rocky gray
          r = 0.48; g = 0.46; b = 0.42;
        }

        // Add subtle variation based on distance from center
        // Clearing area is slightly lighter
        if (distFromCenter < this.config.clearingRadius) {
          const clearingBoost = 1 - (distFromCenter / this.config.clearingRadius);
          r = Math.min(1, r + clearingBoost * 0.08);
          g = Math.min(1, g + clearingBoost * 0.1);
        }
      }

      colors[vertexIndex] = r;
      colors[vertexIndex + 1] = g;
      colors[vertexIndex + 2] = b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true, // Key for low-poly triangle aesthetic
      roughness: 0.85,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    return mesh;
  }

  /**
   * Get distance to nearest river segment
   */
  private getDistanceToRiver(x: number, z: number): number {
    let minDist = Infinity;
    for (const segment of this.riverPath) {
      const dist = this.pointToSegmentDistance(
        x, z,
        segment.start.x, segment.start.z,
        segment.end.x, segment.end.z
      );
      minDist = Math.min(minDist, dist);
    }
    return minDist;
  }

  /**
   * Get distance to nearest path segment
   */
  private getDistanceToPath(x: number, z: number): number {
    let minDist = Infinity;
    for (const path of this.mainPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const dist = this.pointToSegmentDistance(
          x, z,
          path[i].x, path[i].z,
          path[i + 1].x, path[i + 1].z
        );
        minDist = Math.min(minDist, dist);
      }
    }
    return minDist;
  }

  /**
   * Build vegetation (trees, rocks, flowers) with distance-based density
   */
  /**
   * Check if a point is in any exclusion zone
   */
  private isInExclusionZone(x: number, z: number): boolean {
    for (const zone of this.config.exclusionZones) {
      const dist = Math.sqrt((x - zone.x) ** 2 + (z - zone.z) ** 2);
      if (dist < zone.radius) return true;
    }
    return false;
  }

  private buildVegetation(): THREE.Group {
    const group = new THREE.Group();
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // Spawn vegetation in a grid pattern with jitter
    // Larger step = fewer objects = better performance
    const gridStep = 8;

    for (let z = -halfSize + gridStep; z < halfSize; z += gridStep) {
      for (let x = -halfSize + gridStep; x < halfSize; x += gridStep) {
        // Add jitter
        const jx = x + this.rng.range(-gridStep * 0.4, gridStep * 0.4);
        const jz = z + this.rng.range(-gridStep * 0.4, gridStep * 0.4);

        const distFromCenter = Math.sqrt(jx * jx + jz * jz);

        // Skip if in exclusion zone (buildings), on river, or on path
        if (this.isInExclusionZone(jx, jz) || this.isOnRiver(jx, jz) || this.isOnPath(jx, jz)) continue;

        // Density increases with distance from center
        // Some objects in clearing for texture, dense at edges
        let density = 0;
        if (distFromCenter < clearingRadius) {
          density = 0.25; // More objects in clearing for visual interest
        } else {
          const t = (distFromCenter - clearingRadius) / (halfSize - clearingRadius);
          density = 0.2 + t * 0.6; // 20% to 80% density
        }

        if (this.rng.next() > density) continue;

        const height = this.getHeightAt(jx, jz);

        // What to spawn based on distance and randomness
        const roll = this.rng.next();

        if (roll < 0.6) {
          // Tree
          const tree = this.buildTree(distFromCenter);
          tree.position.set(jx, height, jz);
          group.add(tree);
        } else if (roll < 0.8) {
          // Rock
          const rock = this.buildRock(height);
          rock.position.set(jx, height, jz);
          group.add(rock);
        } else {
          // Flower cluster
          const flowers = this.buildFlowerCluster();
          flowers.position.set(jx, height, jz);
          group.add(flowers);
        }
      }
    }

    return group;
  }

  /**
   * Build dynamic features (river stones, fallen logs, mushrooms)
   */
  private buildDynamicFeatures(): THREE.Group {
    const group = new THREE.Group();
    const { worldSize } = this.config;
    const halfSize = worldSize / 2;

    // River stones
    for (const segment of this.riverPath) {
      const midX = (segment.start.x + segment.end.x) / 2;
      const midZ = (segment.start.z + segment.end.z) / 2;

      // Add stones near river banks - reduced count
      for (let i = 0; i < 1; i++) {
        if (this.rng.chance(0.5)) {
          const offset = (this.rng.next() > 0.5 ? 1 : -1) * (segment.width * 0.8 + this.rng.range(0, 2));
          const angle = Math.atan2(segment.end.z - segment.start.z, segment.end.x - segment.start.x) + Math.PI / 2;
          const sx = midX + Math.cos(angle) * offset + this.rng.range(-3, 3);
          const sz = midZ + Math.sin(angle) * offset + this.rng.range(-3, 3);

          const stone = this.buildRiverStone();
          stone.position.set(sx, this.getHeightAt(sx, sz) + 0.1, sz);
          group.add(stone);
        }
      }
    }

    // Mushroom patches (mostly in higher elevation areas) - reduced count
    for (let i = 0; i < 8; i++) {
      const x = this.rng.range(-halfSize * 0.8, halfSize * 0.8);
      const z = this.rng.range(-halfSize * 0.8, halfSize * 0.8);
      const height = this.getHeightAt(x, z);

      if (height > 2 && !this.isInExclusionZone(x, z) && !this.isOnRiver(x, z) && !this.isOnPath(x, z)) {
        const mushrooms = this.buildMushroomPatch();
        mushrooms.position.set(x, height, z);
        group.add(mushrooms);
      }
    }

    // Fallen logs (forest-like areas) - reduced count
    for (let i = 0; i < 4; i++) {
      const x = this.rng.range(-halfSize * 0.7, halfSize * 0.7);
      const z = this.rng.range(-halfSize * 0.7, halfSize * 0.7);
      const distFromCenter = Math.sqrt(x * x + z * z);

      if (distFromCenter > this.config.clearingRadius * 1.5 && !this.isInExclusionZone(x, z) && !this.isOnRiver(x, z) && !this.isOnPath(x, z)) {
        const log = this.buildFallenLog();
        log.position.set(x, this.getHeightAt(x, z), z);
        log.rotation.y = this.rng.next() * Math.PI * 2;
        group.add(log);
      }
    }

    return group;
  }

  /**
   * Build a single tree with size based on distance from center
   */
  private buildTree(distFromCenter: number): THREE.Group {
    const group = new THREE.Group();

    // Trees get bigger further from center
    const baseScale = 0.6 + (distFromCenter / (this.config.worldSize / 2)) * 0.8;
    const scale = baseScale * this.rng.range(0.8, 1.2);

    // Tree type varies with distance
    const isConiferArea = distFromCenter > this.config.clearingRadius * 2;

    // Trunk - low poly (4 segments = square-ish)
    const trunkHeight = (isConiferArea ? 3 : 2.5) * scale;
    const trunkGeo = new THREE.CylinderGeometry(
      0.15 * scale,
      0.25 * scale,
      trunkHeight,
      4 // Low poly
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: isConiferArea ? 0x5d4037 : 0x795548,
      flatShading: true,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage
    const foliageMat = new THREE.MeshStandardMaterial({
      color: isConiferArea ? 0x2e7d32 : 0x43a047,
      flatShading: true,
    });

    if (isConiferArea) {
      // Conifer - single cone for performance
      const coneGeo = new THREE.ConeGeometry(0.9 * scale, 2.5 * scale, 5); // 5 segments
      const cone = new THREE.Mesh(coneGeo, foliageMat);
      cone.position.y = trunkHeight + 1.2 * scale;
      cone.castShadow = true;
      group.add(cone);
    } else {
      // Deciduous - icosahedron for low-poly sphere
      const foliageGeo = new THREE.IcosahedronGeometry(1.0 * scale, 0); // 0 detail = lowest poly
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = trunkHeight + 0.8 * scale;
      foliage.scale.y = 0.7;
      foliage.castShadow = true;
      group.add(foliage);
    }

    return group;
  }

  /**
   * Build a rock
   */
  private buildRock(height: number): THREE.Group {
    const group = new THREE.Group();
    const scale = this.rng.range(0.3, 1.0);

    // Color based on elevation
    const color = height > 4 ? 0x616161 : 0x757575;

    const rockMat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.9,
    });

    const rockGeo = new THREE.DodecahedronGeometry(scale);
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.scale.set(1, this.rng.range(0.5, 0.9), 1);
    rock.rotation.set(
      this.rng.next() * 0.5,
      this.rng.next() * Math.PI * 2,
      this.rng.next() * 0.5
    );
    rock.castShadow = true;
    group.add(rock);

    return group;
  }

  /**
   * Build a cluster of flowers
   */
  private buildFlowerCluster(): THREE.Group {
    const group = new THREE.Group();

    const colors = [0xf06292, 0xba68c8, 0x64b5f6, 0xffd54f, 0xff8a65];
    const numFlowers = this.rng.range(3, 8);

    for (let i = 0; i < numFlowers; i++) {
      const flowerGroup = new THREE.Group();
      const color = colors[Math.floor(this.rng.next() * colors.length)];

      // Stem
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.15;
      flowerGroup.add(stem);

      // Flower head
      const flowerMat = new THREE.MeshStandardMaterial({ color });
      const flowerGeo = new THREE.SphereGeometry(0.08, 6, 4);
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.y = 0.35;
      flowerGroup.add(flower);

      flowerGroup.position.set(
        this.rng.range(-0.5, 0.5),
        0,
        this.rng.range(-0.5, 0.5)
      );

      group.add(flowerGroup);
    }

    return group;
  }

  /**
   * Build a river stone
   */
  private buildRiverStone(): THREE.Group {
    const group = new THREE.Group();
    const scale = this.rng.range(0.2, 0.6);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x78909c,
      flatShading: true,
      roughness: 0.7,
    });

    const stoneGeo = new THREE.SphereGeometry(scale, 6, 4);
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.scale.set(1, 0.5, this.rng.range(0.8, 1.2));
    stone.castShadow = true;
    group.add(stone);

    return group;
  }

  /**
   * Build a mushroom patch
   */
  private buildMushroomPatch(): THREE.Group {
    const group = new THREE.Group();
    const numMushrooms = this.rng.range(2, 5);

    for (let i = 0; i < numMushrooms; i++) {
      const mushroomGroup = new THREE.Group();
      const scale = this.rng.range(0.1, 0.3);

      // Stem
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1 });
      const stemGeo = new THREE.CylinderGeometry(scale * 0.4, scale * 0.5, scale * 2, 6);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = scale;
      mushroomGroup.add(stem);

      // Cap
      const capColor = this.rng.chance(0.5) ? 0xd32f2f : 0x795548;
      const capMat = new THREE.MeshStandardMaterial({ color: capColor });
      const capGeo = new THREE.SphereGeometry(scale, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = scale * 2;
      mushroomGroup.add(cap);

      mushroomGroup.position.set(
        this.rng.range(-0.5, 0.5),
        0,
        this.rng.range(-0.5, 0.5)
      );

      group.add(mushroomGroup);
    }

    return group;
  }

  /**
   * Build a fallen log
   */
  private buildFallenLog(): THREE.Group {
    const group = new THREE.Group();
    const length = this.rng.range(2, 4);

    const logMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      flatShading: true,
    });

    const logGeo = new THREE.CylinderGeometry(0.25, 0.35, length, 8);
    const log = new THREE.Mesh(logGeo, logMat);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.15;
    log.castShadow = true;
    group.add(log);

    return group;
  }

  /**
   * Get height at a world position
   */
  getHeightAt(x: number, z: number): number {
    const { resolution, worldSize } = this.config;
    const halfSize = worldSize / 2;

    // Convert to grid coordinates
    const gx = ((x + halfSize) / worldSize) * (resolution - 1);
    const gz = ((z + halfSize) / worldSize) * (resolution - 1);

    // Bilinear interpolation
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const x1 = Math.min(x0 + 1, resolution - 1);
    const z1 = Math.min(z0 + 1, resolution - 1);

    const fx = gx - x0;
    const fz = gz - z0;

    const h00 = this.heightMap[z0 * resolution + x0] || 0;
    const h10 = this.heightMap[z0 * resolution + x1] || 0;
    const h01 = this.heightMap[z1 * resolution + x0] || 0;
    const h11 = this.heightMap[z1 * resolution + x1] || 0;

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  /**
   * Check if a point is on the river
   */
  private isOnRiver(x: number, z: number): boolean {
    for (const segment of this.riverPath) {
      const dist = this.pointToSegmentDistance(
        x, z,
        segment.start.x, segment.start.z,
        segment.end.x, segment.end.z
      );
      if (dist < segment.width) return true;
    }
    return false;
  }

  /**
   * Check if a point is on a path
   */
  private isOnPath(x: number, z: number): boolean {
    for (const path of this.mainPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const dist = this.pointToSegmentDistance(
          x, z,
          path[i].x, path[i].z,
          path[i + 1].x, path[i + 1].z
        );
        if (dist < this.config.pathWidth * 1.5) return true;
      }
    }
    return false;
  }

  /**
   * Distance from point to line segment
   */
  private pointToSegmentDistance(
    px: number, pz: number,
    x1: number, z1: number,
    x2: number, z2: number
  ): number {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const lenSq = dx * dx + dz * dz;

    if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);

    let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projZ = z1 + t * dz;

    return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
  }

  /**
   * Get camera bounds for the terrain
   */
  getCameraBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    const halfSize = this.config.worldSize / 2;
    return {
      min: new THREE.Vector3(-halfSize, 0, -halfSize),
      max: new THREE.Vector3(halfSize, 50, halfSize),
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Height map will be garbage collected
    this.heightMap = new Float32Array(0);
    this.riverPath = [];
    this.mainPaths = [];
  }
}
