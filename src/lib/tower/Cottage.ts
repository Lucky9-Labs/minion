import * as THREE from 'three';

/**
 * Cottage configuration
 */
export interface CottageConfig {
  width: number;
  depth: number;
  wallHeight: number;
  roofHeight: number;
}

export const DEFAULT_COTTAGE_CONFIG: CottageConfig = {
  width: 6,
  depth: 5,
  wallHeight: 3,
  roofHeight: 2.5,
};

/**
 * References to cottage mesh parts for wall transparency
 */
export interface CottageRefs {
  root: THREE.Group;
  walls: {
    north: THREE.Mesh;
    south: THREE.Mesh;
    east: THREE.Mesh;
    west: THREE.Mesh;
  };
  roof: THREE.Group;
  floor: THREE.Mesh;
  interior: THREE.Group;
}

/**
 * Builds a humble cottage for level 1
 */
export class CottageBuilder {
  private config: CottageConfig;
  private materials: Map<string, THREE.Material> = new Map();

  constructor(config: CottageConfig = DEFAULT_COTTAGE_CONFIG) {
    this.config = config;
  }

  build(): CottageRefs {
    const root = new THREE.Group();
    const { width, depth, wallHeight, roofHeight } = this.config;

    // Materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd4a574, // Warm wood/plaster
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Dark brown thatch
      flatShading: true,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355, // Wood floor
      flatShading: true,
    });
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x654321, // Dark wood door
      flatShading: true,
    });
    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      flatShading: true,
    });

    this.materials.set('wall', wallMat);
    this.materials.set('roof', roofMat);
    this.materials.set('floor', floorMat);

    // Floor
    const floorGeo = new THREE.BoxGeometry(width, 0.2, depth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.1;
    floor.receiveShadow = true;
    root.add(floor);

    // Walls
    const wallThickness = 0.3;
    const halfW = width / 2;
    const halfD = depth / 2;

    // North wall (back) - solid
    const northGeo = new THREE.BoxGeometry(width, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northGeo, wallMat.clone());
    northWall.position.set(0, wallHeight / 2 + 0.2, -halfD + wallThickness / 2);
    northWall.userData.wallFace = 'north';
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    root.add(northWall);

    // South wall (front) - with door opening
    const southWallGroup = new THREE.Group();
    const doorWidth = 1.2;
    const doorHeight = 2.2;

    // Left of door
    const southLeftGeo = new THREE.BoxGeometry((width - doorWidth) / 2, wallHeight, wallThickness);
    const southLeft = new THREE.Mesh(southLeftGeo, wallMat.clone());
    southLeft.position.set(-doorWidth / 2 - (width - doorWidth) / 4, wallHeight / 2, 0);
    southWallGroup.add(southLeft);

    // Right of door
    const southRight = new THREE.Mesh(southLeftGeo, wallMat.clone());
    southRight.position.set(doorWidth / 2 + (width - doorWidth) / 4, wallHeight / 2, 0);
    southWallGroup.add(southRight);

    // Above door
    const aboveDoorGeo = new THREE.BoxGeometry(doorWidth, wallHeight - doorHeight, wallThickness);
    const aboveDoor = new THREE.Mesh(aboveDoorGeo, wallMat.clone());
    aboveDoor.position.set(0, doorHeight + (wallHeight - doorHeight) / 2, 0);
    southWallGroup.add(aboveDoor);

    // Door frame
    const doorFrameGeo = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.1, wallThickness + 0.1);
    const doorFrame = new THREE.Mesh(doorFrameGeo, doorMat);
    doorFrame.position.set(0, doorHeight / 2 + 0.05, 0.05);
    southWallGroup.add(doorFrame);

    // Actual door (slightly recessed)
    const doorGeo = new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.1, 0.1);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, doorHeight / 2, -0.1);
    southWallGroup.add(door);

    southWallGroup.position.set(0, 0.2, halfD - wallThickness / 2);
    southWallGroup.userData.wallFace = 'south';
    root.add(southWallGroup);

    // Create a combined south wall mesh for transparency control
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(width, wallHeight, wallThickness),
      wallMat.clone()
    );
    southWall.visible = false; // Invisible, just for reference
    southWall.userData.wallFace = 'south';
    southWall.userData.wallGroup = southWallGroup;

    // East wall - with window
    const eastWallGroup = this.buildWallWithWindow(width, depth, wallHeight, wallThickness, wallMat, windowFrameMat);
    eastWallGroup.position.set(halfW - wallThickness / 2, 0.2, 0);
    eastWallGroup.rotation.y = -Math.PI / 2;
    eastWallGroup.userData.wallFace = 'east';
    root.add(eastWallGroup);

    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, depth),
      wallMat.clone()
    );
    eastWall.visible = false;
    eastWall.userData.wallFace = 'east';
    eastWall.userData.wallGroup = eastWallGroup;

    // West wall - with window
    const westWallGroup = this.buildWallWithWindow(width, depth, wallHeight, wallThickness, wallMat, windowFrameMat);
    westWallGroup.position.set(-halfW + wallThickness / 2, 0.2, 0);
    westWallGroup.rotation.y = Math.PI / 2;
    westWallGroup.userData.wallFace = 'west';
    root.add(westWallGroup);

    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, depth),
      wallMat.clone()
    );
    westWall.visible = false;
    westWall.userData.wallFace = 'west';
    westWall.userData.wallGroup = westWallGroup;

    // Roof group
    const roofGroup = new THREE.Group();

    // Main roof - simple pitched roof
    const roofWidth = width + 1;
    const roofDepth = depth + 0.8;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-roofWidth / 2, 0);
    roofShape.lineTo(0, roofHeight);
    roofShape.lineTo(roofWidth / 2, 0);
    roofShape.lineTo(-roofWidth / 2, 0);

    const extrudeSettings = {
      depth: roofDepth,
      bevelEnabled: false,
    };

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    roofGeo.rotateX(-Math.PI / 2);
    roofGeo.translate(0, 0, roofDepth / 2);

    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = wallHeight + 0.2;
    roof.castShadow = true;
    roofGroup.add(roof);

    // Roof overhang trim
    const trimGeo = new THREE.BoxGeometry(roofWidth + 0.2, 0.15, 0.2);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });

    const frontTrim = new THREE.Mesh(trimGeo, trimMat);
    frontTrim.position.set(0, wallHeight + 0.15, halfD + 0.5);
    roofGroup.add(frontTrim);

    const backTrim = new THREE.Mesh(trimGeo, trimMat);
    backTrim.position.set(0, wallHeight + 0.15, -halfD - 0.5);
    roofGroup.add(backTrim);

    root.add(roofGroup);

    // Chimney
    const chimneyGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, flatShading: true });
    const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
    chimney.position.set(halfW - 1.2, wallHeight + roofHeight - 0.3, -halfD + 1);
    chimney.castShadow = true;
    root.add(chimney);

    // Interior
    const interior = this.buildInterior(width, depth, wallHeight);
    root.add(interior);

    // Set shadows
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return {
      root,
      walls: {
        north: northWall,
        south: southWall,
        east: eastWall,
        west: westWall,
      },
      roof: roofGroup,
      floor,
      interior,
    };
  }

  private buildWallWithWindow(
    wallWidth: number,
    wallDepth: number,
    wallHeight: number,
    wallThickness: number,
    wallMat: THREE.MeshStandardMaterial,
    windowMat: THREE.MeshStandardMaterial
  ): THREE.Group {
    const group = new THREE.Group();
    const windowWidth = 1;
    const windowHeight = 1.2;
    const windowY = 1.5;

    // Wall sections around window
    const wallLen = wallDepth;

    // Below window
    const belowGeo = new THREE.BoxGeometry(wallLen, windowY - 0.2, wallThickness);
    const below = new THREE.Mesh(belowGeo, wallMat.clone());
    below.position.set(0, (windowY - 0.2) / 2, 0);
    group.add(below);

    // Above window
    const aboveHeight = wallHeight - windowY - windowHeight;
    const aboveGeo = new THREE.BoxGeometry(wallLen, aboveHeight, wallThickness);
    const above = new THREE.Mesh(aboveGeo, wallMat.clone());
    above.position.set(0, windowY + windowHeight + aboveHeight / 2, 0);
    group.add(above);

    // Left of window
    const sideWidth = (wallLen - windowWidth) / 2;
    const leftGeo = new THREE.BoxGeometry(sideWidth, windowHeight, wallThickness);
    const left = new THREE.Mesh(leftGeo, wallMat.clone());
    left.position.set(-windowWidth / 2 - sideWidth / 2, windowY + windowHeight / 2, 0);
    group.add(left);

    // Right of window
    const right = new THREE.Mesh(leftGeo, wallMat.clone());
    right.position.set(windowWidth / 2 + sideWidth / 2, windowY + windowHeight / 2, 0);
    group.add(right);

    // Window frame
    const frameThickness = 0.1;
    const frameGeo = new THREE.BoxGeometry(windowWidth + frameThickness * 2, windowHeight + frameThickness * 2, wallThickness + 0.05);
    const frame = new THREE.Mesh(frameGeo, windowMat);
    frame.position.set(0, windowY + windowHeight / 2, 0);
    group.add(frame);

    // Window glass (translucent)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.3,
    });
    const glassGeo = new THREE.BoxGeometry(windowWidth - 0.1, windowHeight - 0.1, 0.05);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, windowY + windowHeight / 2, 0);
    group.add(glass);

    // Window cross
    const crossMat = windowMat;
    const vCrossGeo = new THREE.BoxGeometry(0.08, windowHeight - 0.1, 0.08);
    const vCross = new THREE.Mesh(vCrossGeo, crossMat);
    vCross.position.set(0, windowY + windowHeight / 2, 0.05);
    group.add(vCross);

    const hCrossGeo = new THREE.BoxGeometry(windowWidth - 0.1, 0.08, 0.08);
    const hCross = new THREE.Mesh(hCrossGeo, crossMat);
    hCross.position.set(0, windowY + windowHeight / 2, 0.05);
    group.add(hCross);

    return group;
  }

  private buildInterior(width: number, depth: number, wallHeight: number): THREE.Group {
    const interior = new THREE.Group();
    const halfW = width / 2;
    const halfD = depth / 2;

    // Fireplace (back wall)
    const fireplaceGeo = new THREE.BoxGeometry(1.5, 1.8, 0.6);
    const fireplaceMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
    const fireplace = new THREE.Mesh(fireplaceGeo, fireplaceMat);
    fireplace.position.set(halfW - 1.2, 0.9, -halfD + 0.6);
    interior.add(fireplace);

    // Fire glow
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6b35 });
    const fireGeo = new THREE.BoxGeometry(0.8, 0.6, 0.3);
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(halfW - 1.2, 0.5, -halfD + 0.5);
    interior.add(fire);

    // Table
    const tableTopGeo = new THREE.BoxGeometry(1.5, 0.1, 1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
    tableTop.position.set(-halfW + 1.5, 1, 0);
    interior.add(tableTop);

    // Table legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const legPositions = [
      [-halfW + 0.9, 0.5, -0.4],
      [-halfW + 0.9, 0.5, 0.4],
      [-halfW + 2.1, 0.5, -0.4],
      [-halfW + 2.1, 0.5, 0.4],
    ];
    for (const [x, y, z] of legPositions) {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(x, y, z);
      interior.add(leg);
    }

    // Chair
    const chairSeatGeo = new THREE.BoxGeometry(0.6, 0.1, 0.6);
    const chairSeat = new THREE.Mesh(chairSeatGeo, tableMat);
    chairSeat.position.set(-halfW + 1.5, 0.6, 0.9);
    interior.add(chairSeat);

    const chairBackGeo = new THREE.BoxGeometry(0.6, 0.8, 0.1);
    const chairBack = new THREE.Mesh(chairBackGeo, tableMat);
    chairBack.position.set(-halfW + 1.5, 1, 1.15);
    interior.add(chairBack);

    // Bed (simple)
    const bedFrameGeo = new THREE.BoxGeometry(2, 0.4, 1.2);
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
    const bedFrame = new THREE.Mesh(bedFrameGeo, bedFrameMat);
    bedFrame.position.set(halfW - 1.5, 0.4, halfD - 1);
    interior.add(bedFrame);

    const mattressGeo = new THREE.BoxGeometry(1.8, 0.3, 1);
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, flatShading: true });
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.set(halfW - 1.5, 0.7, halfD - 1);
    interior.add(mattress);

    // Pillow
    const pillowGeo = new THREE.BoxGeometry(0.4, 0.2, 0.8);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(halfW - 0.6, 0.9, halfD - 1);
    interior.add(pillow);

    return interior;
  }

  /**
   * Get the bounds of the cottage for collision avoidance
   */
  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number; radius: number } {
    const { width, depth } = this.config;
    return {
      minX: -width / 2 - 1,
      maxX: width / 2 + 1,
      minZ: -depth / 2 - 1,
      maxZ: depth / 2 + 1,
      radius: Math.max(width, depth) / 2 + 2,
    };
  }

  /**
   * Get the door position for character spawning
   */
  getDoorPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 0.2, this.config.depth / 2 + 0.5);
  }

  dispose(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
  }
}
