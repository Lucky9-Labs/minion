import * as THREE from 'three';
import type { ContinuousTerrainConfig, PathNode, RiverSegment, BridgeCrossing } from './types';
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
  private bridgeCrossings: BridgeCrossing[] = [];

  constructor(config: ContinuousTerrainConfig = DEFAULT_CONTINUOUS_CONFIG) {
    this.config = config;
    this.rng = new SeededRandom(config.worldSeed);
    this.heightMap = new Float32Array(config.resolution * config.resolution);

    // Generate terrain data
    this.generateHeightMap();
    this.generateRiver();
    this.generatePaths();
    this.findBridgeCrossings(); // Find where paths cross water
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

    // Log bridges at path-river crossings
    const bridges = this.buildLogBridges();
    group.add(bridges);

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
   * Build sparse grass tufts - heavily optimized for performance
   * Uses MeshBasicMaterial (no lighting) and minimal geometry
   */
  private buildGrass(): THREE.Group {
    const group = new THREE.Group();
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // Single cheap material - no lighting calculations
    const grassMat = new THREE.MeshBasicMaterial({
      color: 0x4a9e4a,
      side: THREE.DoubleSide
    });

    // Very sparse grass - only in clearing area for accent
    const gridStep = 8; // Much sparser (was 3)

    for (let z = -halfSize + gridStep; z < halfSize; z += gridStep) {
      for (let x = -halfSize + gridStep; x < halfSize; x += gridStep) {
        const jx = x + this.rng.range(-gridStep * 0.3, gridStep * 0.3);
        const jz = z + this.rng.range(-gridStep * 0.3, gridStep * 0.3);

        const distFromCenter = Math.sqrt(jx * jx + jz * jz);

        // Only grass in the clearing meadow area
        if (distFromCenter > clearingRadius * 1.2) continue;
        if (this.isInExclusionZone(jx, jz) || this.isOnRiver(jx, jz) || this.isOnPath(jx, jz)) continue;
        if (this.rng.next() > 0.5) continue; // 50% chance

        const height = this.getHeightAt(jx, jz);

        // Single grass tuft (just 2-3 blades)
        const numBlades = 2 + Math.floor(this.rng.next() * 2);
        const clusterGroup = new THREE.Group();

        for (let i = 0; i < numBlades; i++) {
          const bladeHeight = this.rng.range(0.3, 0.6);
          const bladeGeo = new THREE.ConeGeometry(0.08, bladeHeight, 3); // 3 segments = triangle
          bladeGeo.translate(0, bladeHeight / 2, 0);

          const blade = new THREE.Mesh(bladeGeo, grassMat);
          blade.position.set(
            this.rng.range(-0.3, 0.3),
            0,
            this.rng.range(-0.3, 0.3)
          );
          blade.rotation.y = this.rng.range(0, Math.PI * 2);
          // No shadows on grass
          clusterGroup.add(blade);
        }

        clusterGroup.position.set(jx, height, jz);
        group.add(clusterGroup);
      }
    }

    return group;
  }

  /**
   * Generate height map with directional elevation
   * North (negative Z) = tallest peaks, South (positive Z) = flat terrain
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

        // Normalized Z position (-1 = north, +1 = south)
        const normalizedZ = wz / halfSize;

        // Directional bias: north (negative Z) gets higher terrain
        // South (positive Z) stays flat
        const northBias = Math.max(0, -normalizedZ); // 0 at south, 1 at north
        const southFlatten = Math.max(0, normalizedZ); // 0 at north, 1 at south

        // Base height increases with distance from center AND northern bias
        let baseHeight = 0;
        if (distFromCenter > clearingRadius) {
          const t = (distFromCenter - clearingRadius) / (halfSize - clearingRadius);
          // Northern areas get much higher, southern areas stay low
          const directionalMultiplier = 0.3 + northBias * 0.9; // 0.3 in south, 1.2 in north
          baseHeight = t * t * maxHeight * directionalMultiplier;

          // Further flatten southern edge
          baseHeight *= (1 - southFlatten * 0.7);
        }

        // Add noise for natural variation
        // More noise in northern (mountainous) areas
        const noiseScale = 0.03;
        const noiseAmp = Math.min((distFromCenter / halfSize) * maxHeight * 0.4, maxHeight * 0.4) * (0.5 + northBias * 0.8);
        const noiseValue = fbmNoise(wx * noiseScale, wz * noiseScale, worldSeed, 5);

        // Combine base height with noise
        let height = baseHeight + (noiseValue - 0.5) * noiseAmp * 2;

        // Smooth transition near clearing
        if (distFromCenter < clearingRadius * 1.5) {
          const blend = Math.max(0, (distFromCenter - clearingRadius) / (clearingRadius * 0.5));
          height *= blend;
        }

        // Add micro-variation everywhere for ground texture (low-poly bumpiness)
        // Less micro-variation in the south for flatter appearance
        const microNoiseScale = 0.12;
        const microNoise = smoothNoise(wx * microNoiseScale, wz * microNoiseScale, worldSeed + 999);
        const microHeight = (microNoise - 0.5) * 0.8 * (0.3 + northBias * 0.7);

        this.heightMap[z * resolution + x] = Math.max(0, height + microHeight);
      }
    }
  }

  /**
   * Generate river path flowing from NNW (mountains) to SEE (lowlands)
   * River starts at the northern mountains and descends to the southeast
   */
  private generateRiver(): void {
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // River starts from NNW (north-northwest) - on the mountains
    // NNW is approximately -X, -Z direction
    const startX = -halfSize * 0.4 + this.rng.range(-5, 5); // Slightly west of center
    const startZ = -halfSize * 0.9 + this.rng.range(-3, 3); // Near north edge

    let currentX = startX;
    let currentZ = startZ;

    // Initial direction: toward SEE (south-southeast)
    // SEE is approximately +X, +Z direction
    let direction = Math.PI * 0.35 + this.rng.range(-0.1, 0.1); // ~63 degrees (toward SE)

    const segments: RiverSegment[] = [];
    const stepLength = 8;
    const maxSteps = 35;

    for (let i = 0; i < maxSteps; i++) {
      const prevX = currentX;
      const prevZ = currentZ;

      // Curve away from center when getting close to the clearing
      const distFromCenter = Math.sqrt(currentX * currentX + currentZ * currentZ);
      if (distFromCenter < clearingRadius * 2.0) {
        // Curve around the clearing - prefer going east (positive X)
        const angleToCenter = Math.atan2(currentZ, currentX);
        const tangent = angleToCenter + Math.PI / 2;
        // Bias toward continuing southeast
        const targetDir = Math.PI * 0.35; // SEE direction
        direction = tangent * 0.6 + targetDir * 0.4 + this.rng.range(-0.2, 0.2);
      } else {
        // Add gentle wandering while maintaining SE bias
        direction += this.rng.range(-0.25, 0.25);
        // Gently pull back toward SEE direction if drifting too far
        const targetDir = Math.PI * 0.35;
        const drift = targetDir - direction;
        direction += drift * 0.05;
      }

      // Move forward
      currentX += Math.cos(direction) * stepLength;
      currentZ += Math.sin(direction) * stepLength;

      // Stop if we exit the world (should exit at SEE)
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
   * Generate paths from the tower
   * Primary path goes south to the portal gateway
   * Secondary paths go to other less mountainous areas
   */
  private generatePaths(): void {
    const { worldSize, clearingRadius } = this.config;
    const halfSize = worldSize / 2;

    // PRIMARY PATH: From tower center south to portal gateway
    // This is the main cobblestone path connecting cottage to portal
    const mainPath: PathNode[] = [];
    const mainDirection = Math.PI / 2; // Due south (+Z direction)

    // Start at south edge of clearing
    let x = 0;
    let z = clearingRadius;
    let direction = mainDirection;

    mainPath.push({ x, z, direction });

    // Path winds south toward portal (at edge of map)
    const portalZ = halfSize * 0.85; // Portal position
    const stepLength = 5;
    const maxSteps = 20;

    for (let j = 0; j < maxSteps; j++) {
      // Gentle wandering but staying on course south
      direction = mainDirection + this.rng.range(-0.15, 0.15);

      x += Math.cos(direction) * stepLength;
      z += Math.sin(direction) * stepLength;

      // Keep path roughly centered (don't drift too far east/west)
      if (Math.abs(x) > 8) {
        x *= 0.9; // Pull back toward center
      }

      mainPath.push({ x, z, direction });

      // Stop when we reach the portal area
      if (z >= portalZ) {
        break;
      }
    }

    this.mainPaths.push(mainPath);

    // SECONDARY PATHS: A couple of smaller paths to east and west
    // These avoid the northern mountains
    const secondaryAngles = [
      Math.PI * 0.1,  // East-southeast
      Math.PI * 0.9,  // West-southwest
    ];

    for (const angle of secondaryAngles) {
      const path: PathNode[] = [];

      // Start at edge of clearing
      let sx = Math.cos(angle) * clearingRadius;
      let sz = Math.sin(angle) * clearingRadius;
      let sdir = angle;

      path.push({ x: sx, z: sz, direction: sdir });

      // Wind outward but stay in southern half
      const secSteps = 10;

      for (let j = 0; j < secSteps; j++) {
        // Gentle wandering
        sdir += this.rng.range(-0.3, 0.3);

        // Bias toward staying in southern hemisphere (positive Z)
        if (sz < 0) {
          sdir += 0.1; // Turn more south
        }

        sx += Math.cos(sdir) * stepLength;
        sz += Math.sin(sdir) * stepLength;

        // Stop at world edge or if going too far north
        if (Math.abs(sx) > halfSize * 0.8 || sz > halfSize * 0.8 || sz < -halfSize * 0.3) {
          path.push({ x: sx, z: sz, direction: sdir });
          break;
        }

        path.push({ x: sx, z: sz, direction: sdir });
      }

      this.mainPaths.push(path);
    }
  }

  /**
   * Find where paths cross the river and store bridge crossing points
   */
  private findBridgeCrossings(): void {
    // Check each path segment against each river segment for intersections
    for (let pathIndex = 0; pathIndex < this.mainPaths.length; pathIndex++) {
      const path = this.mainPaths[pathIndex];

      for (let i = 0; i < path.length - 1; i++) {
        const pathStart = { x: path[i].x, z: path[i].z };
        const pathEnd = { x: path[i + 1].x, z: path[i + 1].z };

        for (const riverSeg of this.riverPath) {
          const intersection = this.lineIntersection(
            pathStart.x, pathStart.z, pathEnd.x, pathEnd.z,
            riverSeg.start.x, riverSeg.start.z, riverSeg.end.x, riverSeg.end.z
          );

          if (intersection) {
            // Calculate river direction at this point
            const riverDx = riverSeg.end.x - riverSeg.start.x;
            const riverDz = riverSeg.end.z - riverSeg.start.z;
            const riverAngle = Math.atan2(riverDz, riverDx);

            // Bridge angle is perpendicular to river (aligned with path crossing)
            const bridgeAngle = riverAngle + Math.PI / 2;

            this.bridgeCrossings.push({
              x: intersection.x,
              z: intersection.z,
              angle: bridgeAngle,
              width: riverSeg.width,
              pathIndex
            });
          }
        }
      }
    }
  }

  /**
   * Line segment intersection check
   * Returns intersection point or null if no intersection
   */
  private lineIntersection(
    x1: number, z1: number, x2: number, z2: number,
    x3: number, z3: number, x4: number, z4: number
  ): { x: number; z: number } | null {
    const denom = (x1 - x2) * (z3 - z4) - (z1 - z2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null; // Parallel lines

    const t = ((x1 - x3) * (z3 - z4) - (z1 - z3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (z1 - z3) - (z1 - z2) * (x1 - x3)) / denom;

    // Check if intersection is within both segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        z: z1 + t * (z2 - z1)
      };
    }
    return null;
  }

  /**
   * Build log bridges at path-river crossing points
   * Creates multiple logs laid side by side for walkable bridges
   */
  private buildLogBridges(): THREE.Group {
    const group = new THREE.Group();

    const logMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      flatShading: true,
      roughness: 0.85,
    });

    const darkLogMat = new THREE.MeshStandardMaterial({
      color: 0x4a3729,
      flatShading: true,
      roughness: 0.9,
    });

    for (const crossing of this.bridgeCrossings) {
      const bridgeGroup = new THREE.Group();

      // Bridge needs to span the river width plus some bank overlap
      const bridgeLength = crossing.width * 1.8;
      const numLogs = 4 + Math.floor(this.rng.next() * 3); // 4-6 logs
      const logSpacing = this.config.pathWidth / numLogs;

      for (let i = 0; i < numLogs; i++) {
        // Offset each log across the path width
        const lateralOffset = (i - (numLogs - 1) / 2) * logSpacing;

        // Log dimensions with some variety
        const logRadius = 0.15 + this.rng.range(0, 0.08);
        const logLength = bridgeLength + this.rng.range(-0.5, 0.5);

        const logGeo = new THREE.CylinderGeometry(logRadius, logRadius * 1.1, logLength, 6);
        const mat = this.rng.chance(0.3) ? darkLogMat : logMat;
        const log = new THREE.Mesh(logGeo, mat);

        // Rotate to lay flat and align with bridge direction
        log.rotation.z = Math.PI / 2;

        // Position along the crossing direction (perpendicular offset)
        const perpX = Math.sin(crossing.angle) * lateralOffset;
        const perpZ = -Math.cos(crossing.angle) * lateralOffset;

        log.position.set(perpX, logRadius * 0.8, perpZ);

        // Slight random rotation for natural look
        log.rotation.x += this.rng.range(-0.05, 0.05);
        log.rotation.y += this.rng.range(-0.1, 0.1);

        log.castShadow = true;
        log.receiveShadow = true;
        bridgeGroup.add(log);
      }

      // Add support posts on the banks
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x3e2723,
        flatShading: true,
      });

      for (let side = -1; side <= 1; side += 2) {
        const postDist = crossing.width * 0.6;
        const postX = Math.cos(crossing.angle) * postDist * side;
        const postZ = Math.sin(crossing.angle) * postDist * side;

        const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 5);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(postX, 0.2, postZ);
        post.rotation.x = this.rng.range(-0.1, 0.1);
        post.rotation.z = this.rng.range(-0.1, 0.1);
        post.castShadow = true;
        bridgeGroup.add(post);
      }

      // Position the whole bridge
      bridgeGroup.position.set(crossing.x, -0.1, crossing.z);
      bridgeGroup.rotation.y = crossing.angle;

      group.add(bridgeGroup);
    }

    return group;
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

        // Normalized Z position (-1 = north, +1 = south)
        const normalizedZ = jz / halfSize;
        const isSouth = normalizedZ > 0.3; // Southern third of map
        const isPortalArea = normalizedZ > 0.7 && Math.abs(jx) < halfSize * 0.4; // Near portal

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

        // What to spawn based on distance, position, and randomness
        const roll = this.rng.next();

        // Southern areas get more rocks, northern areas get more trees
        if (isPortalArea) {
          // Portal area: mostly LOW rocky outcroppings (not towering boulders)
          if (roll < 0.50) {
            // Small rock cluster near portal
            const rock = this.buildRockCluster(height, 0.5); // Use smaller scale multiplier
            rock.position.set(jx, height, jz);
            group.add(rock);
          } else if (roll < 0.80) {
            // Small single rock
            const rock = this.buildRock(height, 0.5); // Use smaller scale multiplier
            rock.position.set(jx, height, jz);
            group.add(rock);
          } else {
            // Occasional bush
            const bush = this.buildBush();
            bush.position.set(jx, height, jz);
            group.add(bush);
          }
        } else if (isSouth) {
          // Southern area: more rocks, fewer trees
          if (roll < 0.30) {
            // Tree
            const tree = this.buildTree(distFromCenter);
            tree.position.set(jx, height, jz);
            group.add(tree);
          } else if (roll < 0.45) {
            // Rock cluster
            const rock = this.buildRockCluster(height);
            rock.position.set(jx, height, jz);
            group.add(rock);
          } else if (roll < 0.70) {
            // Single rock
            const rock = this.buildRock(height);
            rock.position.set(jx, height, jz);
            group.add(rock);
          } else if (roll < 0.85) {
            // Bush
            const bush = this.buildBush();
            bush.position.set(jx, height, jz);
            group.add(bush);
          } else {
            // Flower cluster
            const flowers = this.buildFlowerCluster();
            flowers.position.set(jx, height, jz);
            group.add(flowers);
          }
        } else {
          // Northern area: more trees (mountainous forest)
          if (roll < 0.65) {
            // Tree (most common in mountains)
            const tree = this.buildTree(distFromCenter);
            tree.position.set(jx, height, jz);
            group.add(tree);
          } else if (roll < 0.75) {
            // Bush cluster
            const bush = this.buildBush();
            bush.position.set(jx, height, jz);
            group.add(bush);
          } else if (roll < 0.85) {
            // Rock (some rocks in mountains too)
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
   * Trees are significantly taller for a more impressive forest feel
   */
  private buildTree(distFromCenter: number): THREE.Group {
    const group = new THREE.Group();

    // Trees get much bigger further from center - enhanced scale for taller trees
    const baseScale = 1.2 + (distFromCenter / (this.config.worldSize / 2)) * 1.5;
    const scale = baseScale * this.rng.range(0.7, 1.4);

    // Tree type varies with distance - more variety
    const isConiferArea = distFromCenter > this.config.clearingRadius * 1.5;
    const isGiantTree = this.rng.chance(0.15); // 15% chance for extra tall tree

    // Giant trees are 50% taller
    const heightMultiplier = isGiantTree ? 1.5 : 1.0;

    // Trunk - low poly (4-6 segments)
    const trunkHeight = (isConiferArea ? 4.5 : 3.5) * scale * heightMultiplier;
    const trunkGeo = new THREE.CylinderGeometry(
      0.18 * scale,
      0.35 * scale,
      trunkHeight,
      isConiferArea ? 6 : 4 // Slightly more detail for conifers
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: isConiferArea ? 0x4a3728 : 0x6d4c41,
      flatShading: true,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage colors with more variety
    const foliageColors = isConiferArea
      ? [0x1b5e20, 0x2e7d32, 0x388e3c, 0x1a472a]
      : [0x33691e, 0x43a047, 0x4caf50, 0x558b2f];
    const foliageColor = foliageColors[Math.floor(this.rng.next() * foliageColors.length)];

    const foliageMat = new THREE.MeshStandardMaterial({
      color: foliageColor,
      flatShading: true,
    });

    if (isConiferArea) {
      // Conifer - stacked cones for taller, more impressive pine trees
      const numLayers = isGiantTree ? 4 : 3;
      for (let i = 0; i < numLayers; i++) {
        const layerScale = 1 - (i * 0.2);
        const coneHeight = (2.0 + i * 0.3) * scale * heightMultiplier * 0.5;
        const coneRadius = (1.4 - i * 0.3) * scale * layerScale;
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 6);
        const cone = new THREE.Mesh(coneGeo, foliageMat);
        cone.position.y = trunkHeight + (i * 1.2 * scale * heightMultiplier * 0.4);
        cone.castShadow = true;
        group.add(cone);
      }
    } else {
      // Deciduous - layered foliage for fuller canopy
      const numClusters = isGiantTree ? 3 : 2;
      for (let i = 0; i < numClusters; i++) {
        const clusterScale = 1 - (i * 0.15);
        const foliageGeo = new THREE.IcosahedronGeometry(1.3 * scale * clusterScale, 0);
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = trunkHeight + (0.6 + i * 0.8) * scale * heightMultiplier;
        foliage.position.x = this.rng.range(-0.3, 0.3) * scale;
        foliage.position.z = this.rng.range(-0.3, 0.3) * scale;
        foliage.scale.y = 0.75;
        foliage.castShadow = true;
        group.add(foliage);
      }
    }

    // Add some branches for giant trees
    if (isGiantTree && !isConiferArea) {
      const branchMat = new THREE.MeshStandardMaterial({
        color: 0x5d4037,
        flatShading: true,
      });
      for (let i = 0; i < 3; i++) {
        const branchAngle = (i / 3) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
        const branchGeo = new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, 1.5 * scale, 4);
        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.y = trunkHeight * 0.6;
        branch.position.x = Math.cos(branchAngle) * 0.3 * scale;
        branch.position.z = Math.sin(branchAngle) * 0.3 * scale;
        branch.rotation.z = Math.PI / 3;
        branch.rotation.y = branchAngle;
        branch.castShadow = true;
        group.add(branch);
      }
    }

    return group;
  }

  /**
   * Build a rock
   * @param height - terrain height (used for color)
   * @param scaleMultiplier - optional multiplier for rock size (default 1.0)
   */
  private buildRock(height: number, scaleMultiplier: number = 1.0): THREE.Group {
    const group = new THREE.Group();
    const scale = this.rng.range(0.3, 1.0) * scaleMultiplier;

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
    // No shadows on single rocks
    group.add(rock);

    return group;
  }

  /**
   * Build a cluster of rocks (boulder pile)
   * @param height - terrain height (used for color)
   * @param scaleMultiplier - optional multiplier for rock size (default 1.0)
   */
  private buildRockCluster(height: number, scaleMultiplier: number = 1.0): THREE.Group {
    const group = new THREE.Group();
    const numRocks = 2 + Math.floor(this.rng.next() * 3); // 2-4 rocks (reduced from 3-7)

    // Single material for all rocks in cluster (performance)
    const color = height > 4 ? 0x5a5a5a : 0x757575;
    const rockMat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.95,
    });

    for (let i = 0; i < numRocks; i++) {
      const scale = this.rng.range(0.25, 0.7) * scaleMultiplier;

      // Use dodecahedron for all (consistent, good rock shape)
      const rockGeo = new THREE.DodecahedronGeometry(scale, 0);
      const rock = new THREE.Mesh(rockGeo, rockMat);

      // Position in cluster
      const angle = (i / numRocks) * Math.PI * 2 + this.rng.range(-0.5, 0.5);
      const dist = this.rng.range(0.1, 0.6);
      rock.position.set(
        Math.cos(angle) * dist,
        scale * 0.3,
        Math.sin(angle) * dist
      );

      rock.scale.y = this.rng.range(0.5, 0.8);
      rock.rotation.y = this.rng.next() * Math.PI * 2;
      // No shadows on small rocks
      group.add(rock);
    }

    return group;
  }

  /**
   * Build a bush (leafy shrub)
   */
  private buildBush(): THREE.Group {
    const group = new THREE.Group();
    const baseScale = this.rng.range(0.6, 1.2);

    // Bush foliage colors
    const bushColors = [0x2d5a27, 0x3d6b37, 0x4a7a44, 0x2a4f24, 0x3e6838];
    const mainColor = bushColors[Math.floor(this.rng.next() * bushColors.length)];

    // Create 2-3 overlapping spheres (reduced from 3-6 for performance)
    const numClusters = 2 + Math.floor(this.rng.next() * 2);

    const bushMat = new THREE.MeshStandardMaterial({
      color: mainColor,
      flatShading: true,
      roughness: 0.85,
    });

    for (let i = 0; i < numClusters; i++) {
      const clusterScale = baseScale * this.rng.range(0.6, 1.0);

      // Use icosahedron for low-poly leafy look
      const bushGeo = new THREE.IcosahedronGeometry(clusterScale * 0.6, 0);
      const bush = new THREE.Mesh(bushGeo, bushMat);

      // Position clusters to form bush shape
      const angle = (i / numClusters) * Math.PI * 2;
      const dist = this.rng.range(0.1, 0.3) * baseScale;
      const heightOffset = this.rng.range(0.3, 0.6) * baseScale;

      bush.position.set(
        Math.cos(angle) * dist,
        heightOffset,
        Math.sin(angle) * dist
      );

      bush.scale.y = this.rng.range(0.6, 0.9);
      // No shadows on bushes - too expensive
      group.add(bush);
    }

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
   * Get all bridge crossings for pathfinding
   */
  getBridgeCrossings(): BridgeCrossing[] {
    return this.bridgeCrossings;
  }

  /**
   * Get all paths for pathfinding
   */
  getPaths(): PathNode[][] {
    return this.mainPaths;
  }

  /**
   * Get river segments for collision detection
   */
  getRiverPath(): RiverSegment[] {
    return this.riverPath;
  }

  /**
   * Check if a position is walkable (not in deep water without a bridge)
   */
  isWalkable(x: number, z: number): boolean {
    // Check if on river
    const riverDist = this.getDistanceToRiver(x, z);
    if (riverDist < this.config.riverWidth * 0.5) {
      // In river - only walkable if near a bridge
      for (const crossing of this.bridgeCrossings) {
        const distToBridge = Math.sqrt((x - crossing.x) ** 2 + (z - crossing.z) ** 2);
        if (distToBridge < crossing.width * 0.8) {
          return true; // On a bridge
        }
      }
      return false; // In water, no bridge nearby
    }
    return true; // Not in river, walkable
  }

  /**
   * Find the nearest walkable path point to a position
   */
  getNearestPathPoint(x: number, z: number): { x: number; z: number } | null {
    let nearestDist = Infinity;
    let nearest: { x: number; z: number } | null = null;

    for (const path of this.mainPaths) {
      for (const node of path) {
        const dist = Math.sqrt((x - node.x) ** 2 + (z - node.z) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = { x: node.x, z: node.z };
        }
      }
    }

    return nearest;
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
