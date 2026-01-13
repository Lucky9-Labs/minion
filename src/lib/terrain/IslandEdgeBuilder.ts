import * as THREE from 'three';

/**
 * Configuration for island edge/cliff generation
 */
export interface IslandEdgeConfig {
  /** Radius of the island surface */
  islandRadius: number;
  /** Depth of cliffs below surface */
  cliffDepth: number;
  /** Height of rim rocks above surface */
  rimHeight: number;
  /** Number of segments for the bowl geometry */
  bowlSegments: number;
  /** Position of waterfall gap (angle in radians) */
  waterfallAngle: number;
  /** Width of waterfall gap (in radians) */
  waterfallWidth: number;
}

export const DEFAULT_ISLAND_EDGE_CONFIG: IslandEdgeConfig = {
  islandRadius: 50,
  cliffDepth: 35,
  rimHeight: 12,
  bowlSegments: 12,
  waterfallAngle: Math.PI * 0.75,
  waterfallWidth: 0.4,
};

/**
 * Builds a low-poly bowl shape underneath the floating island
 * with rocky rim outcroppings that push up vertically
 */
export class IslandEdgeBuilder {
  private config: IslandEdgeConfig;

  constructor(config: IslandEdgeConfig = DEFAULT_ISLAND_EDGE_CONFIG) {
    this.config = config;
  }

  /**
   * Build the complete island edge - bowl shape with rim rocks
   */
  build(getHeightAt: (x: number, z: number) => number): THREE.Group {
    const group = new THREE.Group();

    // Build the main bowl/underside geometry
    const bowl = this.buildBowl();
    group.add(bowl);

    // Build rim rocks that push up around the edge
    const rim = this.buildRimRocks(getHeightAt);
    group.add(rim);

    // Build floating crystal at bottom
    const crystal = this.buildFloatingCrystal();
    group.add(crystal);

    return group;
  }

  /**
   * Build the main bowl geometry - very low poly
   * Extends beyond terrain edge to ensure no gaps
   */
  private buildBowl(): THREE.Group {
    const group = new THREE.Group();
    const { islandRadius, cliffDepth, bowlSegments, waterfallAngle, waterfallWidth } = this.config;

    // Create a simple bowl using a lathe geometry approach
    // Define the profile: starts OUTSIDE the edge, curves down to a point
    const points: THREE.Vector2[] = [];

    // Top edge - extend beyond terrain to hide edges
    points.push(new THREE.Vector2(islandRadius * 1.15, 2)); // Above terrain level, outside
    points.push(new THREE.Vector2(islandRadius * 1.08, 0));
    points.push(new THREE.Vector2(islandRadius * 1.0, -3));
    // Curve inward
    points.push(new THREE.Vector2(islandRadius * 0.75, -cliffDepth * 0.25));
    points.push(new THREE.Vector2(islandRadius * 0.5, -cliffDepth * 0.5));
    points.push(new THREE.Vector2(islandRadius * 0.3, -cliffDepth * 0.7));
    // Bottom point
    points.push(new THREE.Vector2(islandRadius * 0.1, -cliffDepth * 0.9));
    points.push(new THREE.Vector2(0, -cliffDepth));

    // Create lathe geometry with low segment count
    const bowlGeometry = new THREE.LatheGeometry(points, bowlSegments);

    // Create vertex colors for depth-based coloring
    const colors = new Float32Array(bowlGeometry.attributes.position.count * 3);
    const positions = bowlGeometry.attributes.position.array;

    for (let i = 0; i < bowlGeometry.attributes.position.count; i++) {
      const y = positions[i * 3 + 1];
      // Clamp depth between 0 and 1, accounting for points above y=0
      const depth = Math.max(0, Math.min(1, -y / cliffDepth));

      // Color gradient from earthy brown to dark stone
      const color = this.getColorForDepth(depth);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    bowlGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const bowlMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Cut out waterfall section by adding a dark plane there
    // (Simple approach - just darken that area with the waterfall effect)

    return group;
  }

  /**
   * Build rim rocks that push up vertically around the island edge
   * DENSE coverage - no gaps, completely hides the map edge
   */
  private buildRimRocks(getHeightAt: (x: number, z: number) => number): THREE.Group {
    const group = new THREE.Group();
    const { islandRadius, rimHeight, waterfallAngle, waterfallWidth } = this.config;

    // First layer: Continuous edge wall (low-poly rim that completely covers the edge)
    const edgeWall = this.buildEdgeWall();
    group.add(edgeWall);

    // Second layer: Dense chunky rocks on top of the wall
    // Many more rock points for complete coverage
    const totalRockPoints = 60; // High density

    for (let i = 0; i < totalRockPoints; i++) {
      const angle = (i / totalRockPoints) * Math.PI * 2;

      // Check if this is near waterfall - add framing rocks instead of skipping
      const angleDiff = Math.abs(angle - waterfallAngle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
      const isWaterfallArea = normalizedDiff < waterfallWidth * 0.8;

      if (isWaterfallArea) {
        // Add framing rocks on the sides of the waterfall
        if (normalizedDiff > waterfallWidth * 0.4 && normalizedDiff < waterfallWidth * 0.9) {
          this.addWaterfallFrameRocks(group, angle, islandRadius, rimHeight, getHeightAt);
        }
        continue;
      }

      // Get height for positioning
      const sampleX = Math.cos(angle) * islandRadius * 0.8;
      const sampleZ = Math.sin(angle) * islandRadius * 0.8;
      const baseY = getHeightAt(sampleX, sampleZ);

      // Create 2-4 rocks per point at varying radii for dense coverage
      const rockLayers = 2 + Math.floor(Math.random() * 2);

      for (let layer = 0; layer < rockLayers; layer++) {
        // Vary radius - some rocks inside edge, some at edge, some slightly outside
        const radiusVariation = 0.88 + layer * 0.06 + (Math.random() - 0.5) * 0.05;
        const edgeRadius = islandRadius * radiusVariation;
        const x = Math.cos(angle) * edgeRadius;
        const z = Math.sin(angle) * edgeRadius;

        // Scale based on layer - outer rocks taller
        const rockScale = 0.8 + layer * 0.3 + Math.random() * 0.4;
        const rock = this.buildSimpleRock(rimHeight * rockScale);

        // Position with height variation
        const heightOffset = layer * rimHeight * 0.2;

        rock.position.set(
          x + (Math.random() - 0.5) * 2,
          baseY + heightOffset + rimHeight * 0.1,
          z + (Math.random() - 0.5) * 2
        );

        // Rotate to face outward
        rock.rotation.y = angle + Math.PI + (Math.random() - 0.5) * 0.5;
        rock.rotation.x = (Math.random() - 0.5) * 0.15;
        rock.rotation.z = (Math.random() - 0.5) * 0.1;

        group.add(rock);
      }
    }

    return group;
  }

  /**
   * Build a continuous low-poly wall around the edge to hide any gaps
   * This wall is TALL and extends below the terrain to hide everything
   */
  private buildEdgeWall(): THREE.Group {
    const group = new THREE.Group();
    const { islandRadius, rimHeight, cliffDepth } = this.config;

    // Create a ring of connected wall segments - taller and thicker
    const segments = 32;
    const wallHeight = rimHeight * 1.2; // Taller wall
    const wallThickness = 8; // Thicker wall

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;

      // Skip waterfall area
      const { waterfallAngle, waterfallWidth } = this.config;
      const angleDiff = Math.abs(angle - waterfallAngle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
      if (normalizedDiff < waterfallWidth * 0.5) continue;

      // Create wall segment as a box
      const segmentLength = (2 * Math.PI * islandRadius) / segments + 4;
      const geometry = new THREE.BoxGeometry(segmentLength, wallHeight, wallThickness);

      // Color - darker rocky tone
      const color = new THREE.Color().setHSL(0.08, 0.3, 0.22 + Math.random() * 0.08);
      const material = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.95,
      });

      const segment = new THREE.Mesh(geometry, material);

      // Position at edge - slightly outside terrain
      const midAngle = (angle + nextAngle) / 2;
      const x = Math.cos(midAngle) * islandRadius * 1.02;
      const z = Math.sin(midAngle) * islandRadius * 1.02;

      // Position wall so it extends both above and below terrain level
      segment.position.set(x, wallHeight * 0.2, z);
      segment.rotation.y = -midAngle + Math.PI / 2;

      segment.castShadow = true;
      segment.receiveShadow = true;
      group.add(segment);
    }

    // Add a lower "skirt" wall that extends down to cover any gaps
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const nextAngle = ((i + 1) / segments) * Math.PI * 2;

      // Skip waterfall area
      const { waterfallAngle, waterfallWidth } = this.config;
      const angleDiff = Math.abs(angle - waterfallAngle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
      if (normalizedDiff < waterfallWidth * 0.5) continue;

      const segmentLength = (2 * Math.PI * islandRadius) / segments + 4;
      const skirtHeight = cliffDepth * 0.3;
      const geometry = new THREE.BoxGeometry(segmentLength, skirtHeight, wallThickness * 1.5);

      const color = new THREE.Color().setHSL(0.07, 0.25, 0.18 + Math.random() * 0.05);
      const material = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.95,
      });

      const skirt = new THREE.Mesh(geometry, material);
      const midAngle = (angle + nextAngle) / 2;
      const x = Math.cos(midAngle) * islandRadius * 1.03;
      const z = Math.sin(midAngle) * islandRadius * 1.03;

      skirt.position.set(x, -skirtHeight * 0.4, z);
      skirt.rotation.y = -midAngle + Math.PI / 2;

      skirt.castShadow = true;
      group.add(skirt);
    }

    return group;
  }

  /**
   * Add tall rocks to frame the waterfall opening
   */
  private addWaterfallFrameRocks(
    group: THREE.Group,
    angle: number,
    islandRadius: number,
    rimHeight: number,
    getHeightAt: (x: number, z: number) => number
  ): void {
    const sampleX = Math.cos(angle) * islandRadius * 0.85;
    const sampleZ = Math.sin(angle) * islandRadius * 0.85;
    const baseY = getHeightAt(sampleX, sampleZ);

    // Create taller framing rocks
    for (let i = 0; i < 3; i++) {
      const radiusOffset = 0.9 + i * 0.05;
      const x = Math.cos(angle) * islandRadius * radiusOffset;
      const z = Math.sin(angle) * islandRadius * radiusOffset;

      const rock = this.buildSimpleRock(rimHeight * (1.2 + i * 0.3));
      rock.position.set(
        x + (Math.random() - 0.5) * 2,
        baseY + i * rimHeight * 0.15,
        z + (Math.random() - 0.5) * 2
      );
      rock.rotation.y = angle + Math.PI;

      group.add(rock);
    }
  }

  /**
   * Build a simple, very low-poly rock
   * Uses box or simple polyhedron with minimal faces - BIG and chunky
   */
  private buildSimpleRock(height: number): THREE.Mesh {
    // Randomly choose between box-ish and wedge-ish shapes
    const shapeType = Math.random();
    let geometry: THREE.BufferGeometry;

    if (shapeType < 0.4) {
      // Simple box, stretched vertically - BIGGER
      geometry = new THREE.BoxGeometry(
        5 + Math.random() * 6,
        height * (0.8 + Math.random() * 0.6),
        4 + Math.random() * 5
      );
      // Distort top vertices to make it more natural
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        if (positions[i + 1] > 0) { // Top vertices
          positions[i] += (Math.random() - 0.5) * 3;
          positions[i + 1] += (Math.random() - 0.3) * 3;
          positions[i + 2] += (Math.random() - 0.5) * 2;
        }
      }
    } else if (shapeType < 0.7) {
      // Tetrahedron - very low poly, scaled up
      geometry = new THREE.TetrahedronGeometry(height * 0.8, 0);
      geometry.scale(1.2, 1.8, 1.0);
    } else {
      // Simple wedge using a modified box - bigger
      geometry = new THREE.BoxGeometry(6, height, 5);
      const positions = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        // Taper one side
        if (positions[i] > 0) {
          positions[i + 1] *= 0.5 + positions[i] / 10;
        }
      }
    }

    geometry.computeVertexNormals();

    // Color based on height - earthy/rocky tones
    const baseHue = 0.07 + Math.random() * 0.05; // Brown-gray range
    const saturation = 0.25 + Math.random() * 0.2;
    const lightness = 0.3 + Math.random() * 0.15;

    const color = new THREE.Color().setHSL(baseHue, saturation, lightness);

    const material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.05,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Get color for depth (0 = top, 1 = bottom)
   */
  private getColorForDepth(t: number): THREE.Color {
    const color = new THREE.Color();

    if (t < 0.2) {
      // Top - grass green to earthy brown
      color.setHex(0x5a6a4a).lerp(new THREE.Color(0x5d4a3a), t / 0.2);
    } else if (t < 0.5) {
      // Middle - brown earth
      color.setHex(0x5d4a3a).lerp(new THREE.Color(0x6a5a4a), (t - 0.2) / 0.3);
    } else if (t < 0.8) {
      // Lower - gray stone
      color.setHex(0x6a5a4a).lerp(new THREE.Color(0x4a4a4a), (t - 0.5) / 0.3);
    } else {
      // Bottom - dark stone
      color.setHex(0x4a4a4a).lerp(new THREE.Color(0x2a2a2a), (t - 0.8) / 0.2);
    }

    // Add slight variation
    const variation = (Math.random() - 0.5) * 0.1;
    color.r = Math.max(0, Math.min(1, color.r + variation));
    color.g = Math.max(0, Math.min(1, color.g + variation));
    color.b = Math.max(0, Math.min(1, color.b + variation));

    return color;
  }

  /**
   * Build floating crystal at island bottom
   */
  private buildFloatingCrystal(): THREE.Group {
    const group = new THREE.Group();
    const { cliffDepth } = this.config;

    // Main crystal - simple octahedron
    const crystalGeometry = new THREE.OctahedronGeometry(2.5, 0);
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.position.y = -cliffDepth - 8;
    crystal.userData.isCrystal = true;
    group.add(crystal);

    // Glow light
    const light = new THREE.PointLight(0xa78bfa, 4, 25);
    light.position.copy(crystal.position);
    group.add(light);

    // Small orbiting crystals
    for (let i = 0; i < 3; i++) {
      const smallGeometry = new THREE.OctahedronGeometry(0.6, 0);
      const small = new THREE.Mesh(smallGeometry, crystalMaterial);
      const angle = (i / 3) * Math.PI * 2;
      small.position.set(
        Math.cos(angle) * 5,
        crystal.position.y + 1,
        Math.sin(angle) * 5
      );
      small.userData.orbitAngle = angle;
      small.userData.orbitRadius = 5;
      small.userData.orbitSpeed = 0.4 + Math.random() * 0.2;
      small.userData.baseY = crystal.position.y + 1;
      group.add(small);
    }

    return group;
  }

  /**
   * Get the waterfall exit position
   */
  getWaterfallPosition(): { x: number; z: number; angle: number } {
    const { islandRadius, waterfallAngle } = this.config;
    return {
      x: Math.cos(waterfallAngle) * islandRadius,
      z: Math.sin(waterfallAngle) * islandRadius,
      angle: waterfallAngle,
    };
  }

  /**
   * Update animated elements (crystals)
   */
  update(group: THREE.Group, deltaTime: number, elapsedTime: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.userData.orbitAngle !== undefined) {
          // Orbiting crystal
          child.userData.orbitAngle += child.userData.orbitSpeed * deltaTime;
          const radius = child.userData.orbitRadius;
          child.position.x = Math.cos(child.userData.orbitAngle) * radius;
          child.position.z = Math.sin(child.userData.orbitAngle) * radius;
          child.position.y = child.userData.baseY + Math.sin(elapsedTime * 2) * 0.5;
          child.rotation.y += deltaTime * 2;
        } else if (child.userData.isCrystal) {
          // Main crystal gentle rotation
          child.rotation.y += deltaTime * 0.3;
          child.position.y += Math.sin(elapsedTime) * 0.003;
        }
      }
    });
  }
}
