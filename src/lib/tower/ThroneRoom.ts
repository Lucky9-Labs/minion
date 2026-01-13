import * as THREE from 'three';

/**
 * Configuration for the throne room
 */
export interface ThroneRoomConfig {
  width: number;       // Wider than tower floors
  depth: number;
  height: number;      // Grand ceiling height
  hasArches: boolean;
  hasPillars: boolean;
  floorMaterial?: number;
  wallMaterial?: number;
  trimColor?: number;
}

export const DEFAULT_THRONE_ROOM_CONFIG: ThroneRoomConfig = {
  width: 8.0,
  depth: 8.0,
  height: 4.5,
  hasArches: true,
  hasPillars: true,
  floorMaterial: 0x4a3f6b,  // Deep purple
  wallMaterial: 0x3d3d4d,   // Dark stone
  trimColor: 0xfbbf24,      // Gold
};

/**
 * Mesh refs for the throne room
 */
export interface ThroneRoomRefs {
  root: THREE.Group;
  floor: THREE.Mesh;
  walls: THREE.Group;
  pillars: THREE.Group;
  throne: THREE.Group;
  platform: THREE.Group;
  decorations: THREE.Group;
  ceiling: THREE.Mesh;
}

/**
 * Builds the grand throne room where the mage resides
 */
export class ThroneRoomBuilder {
  private config: ThroneRoomConfig;
  private materials: {
    floor: THREE.MeshStandardMaterial;
    wall: THREE.MeshStandardMaterial;
    wallTransparent: THREE.MeshStandardMaterial;
    pillar: THREE.MeshStandardMaterial;
    trim: THREE.MeshStandardMaterial;
    throne: THREE.MeshStandardMaterial;
    carpet: THREE.MeshStandardMaterial;
    ceiling: THREE.MeshStandardMaterial;
  };

  constructor(config: ThroneRoomConfig = DEFAULT_THRONE_ROOM_CONFIG) {
    this.config = config;
    this.materials = this.createMaterials();
  }

  private createMaterials() {
    return {
      floor: new THREE.MeshStandardMaterial({
        color: this.config.floorMaterial,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: this.config.wallMaterial,
        flatShading: true,
      }),
      wallTransparent: new THREE.MeshStandardMaterial({
        color: this.config.wallMaterial,
        flatShading: true,
        transparent: true,
        opacity: 1.0,
      }),
      pillar: new THREE.MeshStandardMaterial({
        color: 0x6b6b7b,
        flatShading: true,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: this.config.trimColor,
        metalness: 0.4,
        roughness: 0.4,
        flatShading: true,
      }),
      throne: new THREE.MeshStandardMaterial({
        color: 0x2d2645,
        flatShading: true,
      }),
      carpet: new THREE.MeshStandardMaterial({
        color: 0x7c2d12,
        flatShading: true,
      }),
      ceiling: new THREE.MeshStandardMaterial({
        color: 0x4a4a5a,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
    };
  }

  /**
   * Build the complete throne room
   */
  build(): ThroneRoomRefs {
    const root = new THREE.Group();
    const { width, depth, height } = this.config;

    // Floor
    const floor = this.buildFloor(width, depth);
    root.add(floor);

    // Walls with arched openings
    const walls = this.buildWalls(width, depth, height);
    root.add(walls);

    // Corner pillars
    const pillars = this.buildPillars(width, depth, height);
    root.add(pillars);

    // Raised platform with steps
    const platform = this.buildPlatform();
    root.add(platform);

    // The throne
    const throne = this.buildThrone();
    throne.position.set(0, 0.6, -depth / 2 + 1.5);
    root.add(throne);

    // Decorations (carpet, banners, torches)
    const decorations = this.buildDecorations(width, depth, height);
    root.add(decorations);

    // Ceiling
    const ceiling = this.buildCeiling(width, depth, height);
    root.add(ceiling);

    return {
      root,
      floor,
      walls,
      pillars,
      throne,
      platform,
      decorations,
      ceiling,
    };
  }

  private buildFloor(width: number, depth: number): THREE.Mesh {
    // Stone floor with pattern
    const floorGeo = new THREE.BoxGeometry(width, 0.2, depth);
    const floor = new THREE.Mesh(floorGeo, this.materials.floor);
    floor.position.y = -0.1;
    floor.receiveShadow = true;

    // Add floor pattern (checkerboard tiles)
    const tileSize = 1.0;
    const tilesX = Math.floor(width / tileSize);
    const tilesZ = Math.floor(depth / tileSize);

    for (let x = 0; x < tilesX; x++) {
      for (let z = 0; z < tilesZ; z++) {
        if ((x + z) % 2 === 0) {
          const tileGeo = new THREE.BoxGeometry(tileSize * 0.95, 0.02, tileSize * 0.95);
          const tileMat = new THREE.MeshStandardMaterial({
            color: 0x5a4f7b,
            flatShading: true,
          });
          const tile = new THREE.Mesh(tileGeo, tileMat);
          tile.position.set(
            (x - tilesX / 2 + 0.5) * tileSize,
            0.02,
            (z - tilesZ / 2 + 0.5) * tileSize
          );
          floor.add(tile);
        }
      }
    }

    return floor;
  }

  private buildWalls(width: number, depth: number, height: number): THREE.Group {
    const group = new THREE.Group();
    const wallThickness = 0.3;

    // Back wall (solid with window)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, wallThickness),
      this.materials.wall
    );
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.userData.wallFace = 'north';
    group.add(backWall);

    // Front wall (transparent, with large arch opening)
    const frontWall = this.buildWallWithArch(width, height, wallThickness, 3.0);
    frontWall.position.set(0, 0, depth / 2);
    frontWall.userData.wallFace = 'south';
    group.add(frontWall);

    // Side walls (with smaller arches)
    const leftWall = this.buildWallWithArch(depth, height, wallThickness, 2.0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-width / 2, 0, 0);
    leftWall.userData.wallFace = 'west';
    group.add(leftWall);

    const rightWall = this.buildWallWithArch(depth, height, wallThickness, 2.0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(width / 2, 0, 0);
    rightWall.userData.wallFace = 'east';
    group.add(rightWall);

    return group;
  }

  private buildWallWithArch(width: number, height: number, thickness: number, archWidth: number): THREE.Group {
    const group = new THREE.Group();
    const archHeight = height * 0.7;

    // Left section
    const leftWidth = (width - archWidth) / 2;
    if (leftWidth > 0) {
      const leftSection = new THREE.Mesh(
        new THREE.BoxGeometry(leftWidth, height, thickness),
        this.materials.wallTransparent
      );
      leftSection.position.set(-width / 2 + leftWidth / 2, height / 2, 0);
      group.add(leftSection);
    }

    // Right section
    const rightWidth = (width - archWidth) / 2;
    if (rightWidth > 0) {
      const rightSection = new THREE.Mesh(
        new THREE.BoxGeometry(rightWidth, height, thickness),
        this.materials.wallTransparent
      );
      rightSection.position.set(width / 2 - rightWidth / 2, height / 2, 0);
      group.add(rightSection);
    }

    // Top section above arch
    const topHeight = height - archHeight;
    const topSection = new THREE.Mesh(
      new THREE.BoxGeometry(archWidth, topHeight, thickness),
      this.materials.wallTransparent
    );
    topSection.position.set(0, height - topHeight / 2, 0);
    group.add(topSection);

    // Arch trim
    const archTrim = new THREE.Mesh(
      new THREE.TorusGeometry(archWidth / 2, 0.08, 8, 16, Math.PI),
      this.materials.trim
    );
    archTrim.rotation.z = Math.PI;
    archTrim.position.set(0, archHeight, thickness / 2 + 0.05);
    group.add(archTrim);

    return group;
  }

  private buildPillars(width: number, depth: number, height: number): THREE.Group {
    const group = new THREE.Group();
    const pillarRadius = 0.35;
    const positions = [
      [-width / 2 + 0.5, -depth / 2 + 0.5],
      [width / 2 - 0.5, -depth / 2 + 0.5],
      [-width / 2 + 0.5, depth / 2 - 0.5],
      [width / 2 - 0.5, depth / 2 - 0.5],
    ];

    for (const [x, z] of positions) {
      const pillar = this.buildPillar(pillarRadius, height);
      pillar.position.set(x, 0, z);
      group.add(pillar);
    }

    return group;
  }

  private buildPillar(radius: number, height: number): THREE.Group {
    const group = new THREE.Group();

    // Base
    const baseGeo = new THREE.CylinderGeometry(radius * 1.3, radius * 1.4, 0.3, 8);
    const base = new THREE.Mesh(baseGeo, this.materials.pillar);
    base.position.y = 0.15;
    group.add(base);

    // Main shaft
    const shaftGeo = new THREE.CylinderGeometry(radius, radius, height - 0.6, 8);
    const shaft = new THREE.Mesh(shaftGeo, this.materials.pillar);
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    group.add(shaft);

    // Capital
    const capitalGeo = new THREE.CylinderGeometry(radius * 1.4, radius * 1.2, 0.3, 8);
    const capital = new THREE.Mesh(capitalGeo, this.materials.pillar);
    capital.position.y = height - 0.15;
    group.add(capital);

    // Gold ring
    const ringGeo = new THREE.TorusGeometry(radius * 1.1, 0.05, 8, 16);
    const ring = new THREE.Mesh(ringGeo, this.materials.trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = height * 0.3;
    group.add(ring);

    return group;
  }

  private buildPlatform(): THREE.Group {
    const group = new THREE.Group();
    const { depth } = this.config;

    // Three-step platform
    const steps = [
      { width: 5.0, depth: 1.5, height: 0.2 },
      { width: 4.0, depth: 1.2, height: 0.2 },
      { width: 3.0, depth: 1.0, height: 0.2 },
    ];

    let y = 0;
    let z = -depth / 2 + 2.5;

    for (const step of steps) {
      const stepGeo = new THREE.BoxGeometry(step.width, step.height, step.depth);
      const stepMesh = new THREE.Mesh(stepGeo, this.materials.pillar);
      stepMesh.position.set(0, y + step.height / 2, z);
      stepMesh.receiveShadow = true;
      group.add(stepMesh);

      y += step.height;
      z -= step.depth * 0.4;
    }

    return group;
  }

  private buildThrone(): THREE.Group {
    const group = new THREE.Group();

    // Seat
    const seatGeo = new THREE.BoxGeometry(1.2, 0.15, 0.8);
    const seat = new THREE.Mesh(seatGeo, this.materials.throne);
    seat.position.y = 0.5;
    group.add(seat);

    // Back (tall and ornate)
    const backGeo = new THREE.BoxGeometry(1.3, 1.8, 0.15);
    const back = new THREE.Mesh(backGeo, this.materials.throne);
    back.position.set(0, 1.4, -0.35);
    group.add(back);

    // Pointed top
    const topGeo = new THREE.ConeGeometry(0.3, 0.6, 4);
    const top = new THREE.Mesh(topGeo, this.materials.throne);
    top.position.set(0, 2.6, -0.35);
    top.rotation.y = Math.PI / 4;
    group.add(top);

    // Armrests
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.6);
    const leftArm = new THREE.Mesh(armGeo, this.materials.throne);
    leftArm.position.set(-0.55, 0.7, -0.05);
    group.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.55;
    group.add(rightArm);

    // Gold trim on back
    const trimGeo = new THREE.BoxGeometry(1.1, 0.1, 0.2);
    const trim = new THREE.Mesh(trimGeo, this.materials.trim);
    trim.position.set(0, 2.2, -0.35);
    group.add(trim);

    // Gem in center
    const gemGeo = new THREE.OctahedronGeometry(0.15);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.5,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 2.0, -0.25);
    group.add(gem);

    // Cushion
    const cushionGeo = new THREE.BoxGeometry(1.0, 0.15, 0.6);
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      flatShading: true,
    });
    const cushion = new THREE.Mesh(cushionGeo, cushionMat);
    cushion.position.set(0, 0.65, 0);
    group.add(cushion);

    return group;
  }

  private buildDecorations(width: number, depth: number, height: number): THREE.Group {
    const group = new THREE.Group();

    // Carpet runner to throne
    const carpetGeo = new THREE.BoxGeometry(1.8, 0.02, depth * 0.6);
    const carpet = new THREE.Mesh(carpetGeo, this.materials.carpet);
    carpet.position.set(0, 0.02, depth * 0.1);
    group.add(carpet);

    // Carpet border
    const borderGeo = new THREE.BoxGeometry(2.0, 0.015, depth * 0.6 + 0.2);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      flatShading: true,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, 0.01, depth * 0.1);
    group.add(border);

    // Torches on walls
    const torchPositions = [
      [-width / 2 + 0.3, height * 0.6, -depth / 4],
      [width / 2 - 0.3, height * 0.6, -depth / 4],
      [-width / 2 + 0.3, height * 0.6, depth / 4],
      [width / 2 - 0.3, height * 0.6, depth / 4],
    ];

    for (const [x, y, z] of torchPositions) {
      const torch = this.buildTorch();
      torch.position.set(x, y, z);
      group.add(torch);
    }

    return group;
  }

  private buildTorch(): THREE.Group {
    const group = new THREE.Group();

    // Bracket
    const bracketGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      flatShading: true,
    });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    group.add(bracket);

    // Torch holder
    const holderGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8);
    const holder = new THREE.Mesh(holderGeo, bracketMat);
    holder.position.set(0, -0.1, 0.15);
    holder.rotation.x = -0.3;
    group.add(holder);

    // Flame
    const flameGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
    });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.05, 0.25);
    group.add(flame);

    // Glow light
    const light = new THREE.PointLight(0xff6600, 0.5, 3);
    light.position.set(0, 0.1, 0.25);
    group.add(light);

    return group;
  }

  private buildCeiling(width: number, depth: number, height: number): THREE.Mesh {
    const ceilingGeo = new THREE.BoxGeometry(width - 0.1, 0.15, depth - 0.1);
    const ceiling = new THREE.Mesh(ceilingGeo, this.materials.ceiling);
    ceiling.position.y = height;
    return ceiling;
  }

  /**
   * Get the Y position where the tower should sit on top of the throne room
   */
  getTowerBaseY(): number {
    return this.config.height;
  }

  /**
   * Get mage spawn position (in front of throne)
   */
  getMagePosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 0.1, -this.config.depth / 2 + 2.5);
  }

  dispose(): void {
    Object.values(this.materials).forEach(mat => mat.dispose());
  }
}
