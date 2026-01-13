import * as THREE from 'three';
import type {
  TowerData,
  TowerMeshRefs,
  TowerColors,
  FloorLayout,
  WindowConfig,
} from './types';
import { DEFAULT_TOWER_COLORS } from './types';

/**
 * Builds Three.js meshes for the procedural tower
 */
export class TowerMeshBuilder {
  private colors: TowerColors;
  private materials: {
    base: THREE.MeshStandardMaterial;
    wallNorth: THREE.MeshStandardMaterial;
    wallSouth: THREE.MeshStandardMaterial;
    wallEast: THREE.MeshStandardMaterial;
    wallWest: THREE.MeshStandardMaterial;
    floor: THREE.MeshStandardMaterial;
    stairs: THREE.MeshStandardMaterial;
    roof: THREE.MeshStandardMaterial;
    spire: THREE.MeshStandardMaterial;
    window: THREE.MeshBasicMaterial;
    windowFrame: THREE.MeshStandardMaterial;
  };

  constructor(colors: TowerColors = DEFAULT_TOWER_COLORS) {
    this.colors = colors;
    this.materials = this.createMaterials();
  }

  /**
   * Create all materials
   */
  private createMaterials() {
    return {
      base: new THREE.MeshStandardMaterial({
        color: this.colors.base,
        flatShading: true,
      }),
      // All walls support transparency for camera-relative culling
      wallNorth: new THREE.MeshStandardMaterial({
        color: this.colors.walls,
        flatShading: true,
        transparent: true,
        opacity: 1.0,
      }),
      wallSouth: new THREE.MeshStandardMaterial({
        color: this.colors.walls,
        flatShading: true,
        transparent: true,
        opacity: 1.0,
      }),
      wallEast: new THREE.MeshStandardMaterial({
        color: this.colors.walls,
        flatShading: true,
        transparent: true,
        opacity: 1.0,
      }),
      wallWest: new THREE.MeshStandardMaterial({
        color: this.colors.wallsLight,
        flatShading: true,
        transparent: true,
        opacity: 1.0,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: this.colors.floor,
        flatShading: true,
      }),
      stairs: new THREE.MeshStandardMaterial({
        color: this.colors.stairs,
        flatShading: true,
      }),
      roof: new THREE.MeshStandardMaterial({
        color: this.colors.roof,
        flatShading: true,
      }),
      spire: new THREE.MeshStandardMaterial({
        color: this.colors.spire,
        emissive: this.colors.spire,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.3,
        flatShading: true,
      }),
      window: new THREE.MeshBasicMaterial({
        color: this.colors.window,
      }),
      windowFrame: new THREE.MeshStandardMaterial({
        color: this.colors.windowFrame,
        flatShading: true,
      }),
    };
  }

  /**
   * Build the complete tower mesh
   */
  build(data: TowerData): TowerMeshRefs {
    const root = new THREE.Group();
    const floors: THREE.Group[] = [];
    const stairs: THREE.Group[] = [];

    const { config } = data;
    const { width, depth } = config.footprint;
    const totalHeight = config.floors * config.floorHeight;

    // Build base
    const base = this.buildBase(width + 0.5, depth + 0.5, config.baseY);
    root.add(base);

    // Build walls (4 walls for the entire tower)
    const wallsResult = this.buildWalls(data);
    root.add(wallsResult.group);

    // Build floor plates and stairs for each floor
    for (let i = 0; i < config.floors; i++) {
      const floorY = config.baseY + i * config.floorHeight;

      // Floor plate
      const floorGroup = this.buildFloorPlate(width, depth, floorY);
      floors.push(floorGroup);
      root.add(floorGroup);

      // Stairs (except top floor)
      if (i < config.floors - 1) {
        const stairGroup = this.buildStairs(data.floors[i], config, floorY);
        stairs.push(stairGroup);
        root.add(stairGroup);
      }

      // Windows for this floor
      const windowGroup = this.buildWindows(data.floors[i], config, floorY);
      root.add(windowGroup);

      // Door on ground floor
      if (data.floors[i].hasDoor) {
        const door = this.buildDoor(config, floorY);
        root.add(door);
      }
    }

    // Build roof
    const roofY = config.baseY + totalHeight;
    const roof = this.buildRoof(width, depth, roofY);
    root.add(roof);

    // Build spire
    const spire = this.buildSpire(roofY + 2);
    root.add(spire);

    return {
      root,
      floors,
      stairs,
      frontWall: wallsResult.front,
      rightWall: wallsResult.right,
      backWall: wallsResult.back,
      leftWall: wallsResult.left,
      roof,
      spire,
      transparentMaterials: [
        this.materials.wallNorth,
        this.materials.wallSouth,
        this.materials.wallEast,
        this.materials.wallWest,
      ],
    };
  }

  /**
   * Build the tower base
   */
  private buildBase(width: number, depth: number, y: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(width, 1.5, depth);
    const mesh = new THREE.Mesh(geo, this.materials.base);
    mesh.position.y = y - 0.75;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Build all walls with camera-relative culling support
   */
  private buildWalls(data: TowerData): {
    group: THREE.Group;
    front: THREE.Mesh;
    back: THREE.Mesh;
    left: THREE.Mesh;
    right: THREE.Mesh;
  } {
    const { config } = data;
    const { width, depth } = config.footprint;
    const height = config.floors * config.floorHeight;
    const wallThickness = 0.15;

    const group = new THREE.Group();

    // Front wall (+Z) = South facing
    const frontGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const front = new THREE.Mesh(frontGeo, this.materials.wallSouth);
    front.position.set(0, config.baseY + height / 2, depth / 2);
    front.castShadow = true;
    front.userData.wallFace = 'south';
    group.add(front);

    // Back wall (-Z) = North facing
    const backGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const back = new THREE.Mesh(backGeo, this.materials.wallNorth);
    back.position.set(0, config.baseY + height / 2, -depth / 2);
    back.castShadow = true;
    back.userData.wallFace = 'north';
    group.add(back);

    // Left wall (-X) = West facing
    const leftGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const left = new THREE.Mesh(leftGeo, this.materials.wallWest);
    left.position.set(-width / 2, config.baseY + height / 2, 0);
    left.castShadow = true;
    left.userData.wallFace = 'west';
    group.add(left);

    // Right wall (+X) = East facing
    const rightGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const right = new THREE.Mesh(rightGeo, this.materials.wallEast);
    right.position.set(width / 2, config.baseY + height / 2, 0);
    right.castShadow = true;
    right.userData.wallFace = 'east';
    group.add(right);

    return { group, front, back, left, right };
  }

  /**
   * Build a floor plate
   */
  private buildFloorPlate(width: number, depth: number, y: number): THREE.Group {
    const group = new THREE.Group();

    const geo = new THREE.BoxGeometry(width - 0.3, 0.1, depth - 0.3);
    const mesh = new THREE.Mesh(geo, this.materials.floor);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  /**
   * Build stairs between floors
   */
  private buildStairs(floor: FloorLayout, config: TowerData['config'], floorY: number): THREE.Group {
    const group = new THREE.Group();
    const { width, depth } = config.footprint;
    const halfW = width / 2 - 0.6;
    const halfD = depth / 2 - 0.6;

    // Position based on stair direction
    let x = 0, z = 0, rotY = 0;
    switch (floor.stairPosition) {
      case 'north': z = -halfD; rotY = Math.PI; break;
      case 'south': z = halfD; rotY = 0; break;
      case 'east': x = halfW; rotY = -Math.PI / 2; break;
      case 'west': x = -halfW; rotY = Math.PI / 2; break;
    }

    // Build stair steps
    const numSteps = 5;
    const stepHeight = config.floorHeight / numSteps;
    const stepDepth = 0.4;
    const stepWidth = 0.8;

    for (let i = 0; i < numSteps; i++) {
      const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight * 0.8, stepDepth);
      const step = new THREE.Mesh(stepGeo, this.materials.stairs);
      step.position.set(0, floorY + stepHeight * (i + 0.5), -stepDepth * i);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    return group;
  }

  /**
   * Build windows for a floor
   */
  private buildWindows(floor: FloorLayout, config: TowerData['config'], floorY: number): THREE.Group {
    const group = new THREE.Group();
    const { width, depth } = config.footprint;

    for (const win of floor.windows) {
      const windowMesh = this.buildWindow(win, width, depth, config.floorHeight, floorY);
      group.add(windowMesh);
    }

    return group;
  }

  /**
   * Build a single window
   */
  private buildWindow(
    win: WindowConfig,
    wallWidth: number,
    wallDepth: number,
    floorHeight: number,
    floorY: number
  ): THREE.Group {
    const group = new THREE.Group();

    // Window glass
    const glassGeo = new THREE.BoxGeometry(win.width, win.height, 0.05);
    const glass = new THREE.Mesh(glassGeo, this.materials.window);

    // Position based on wall
    let x = 0, z = 0, rotY = 0;
    const halfW = wallWidth / 2;
    const halfD = wallDepth / 2;

    switch (win.wall) {
      case 'front':
        x = (win.offsetX - 0.5) * wallWidth * 0.8;
        z = halfD + 0.02;
        break;
      case 'back':
        x = (win.offsetX - 0.5) * wallWidth * 0.8;
        z = -halfD - 0.02;
        rotY = Math.PI;
        break;
      case 'left':
        x = -halfW - 0.02;
        z = (win.offsetX - 0.5) * wallDepth * 0.8;
        rotY = Math.PI / 2;
        break;
      case 'right':
        x = halfW + 0.02;
        z = (win.offsetX - 0.5) * wallDepth * 0.8;
        rotY = -Math.PI / 2;
        break;
    }

    glass.position.set(x, floorY + win.offsetY * floorHeight, z);
    glass.rotation.y = rotY;
    group.add(glass);

    // Window frame
    const frameGeo = new THREE.BoxGeometry(win.width + 0.1, win.height + 0.1, 0.08);
    const frame = new THREE.Mesh(frameGeo, this.materials.windowFrame);
    frame.position.copy(glass.position);
    frame.position.z += (win.wall === 'front' || win.wall === 'right') ? -0.03 : 0.03;
    frame.rotation.y = rotY;
    group.add(frame);

    return group;
  }

  /**
   * Build door on ground floor
   */
  private buildDoor(config: TowerData['config'], floorY: number): THREE.Group {
    const group = new THREE.Group();
    const { depth } = config.footprint;

    // Door frame
    const frameGeo = new THREE.BoxGeometry(1.0, 1.8, 0.15);
    const frame = new THREE.Mesh(frameGeo, this.materials.windowFrame);
    frame.position.set(0, floorY + 0.9, depth / 2 + 0.05);
    frame.castShadow = true;
    group.add(frame);

    // Door (darker)
    const doorGeo = new THREE.BoxGeometry(0.8, 1.6, 0.1);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      flatShading: true,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, floorY + 0.8, depth / 2 + 0.1);
    group.add(door);

    return group;
  }

  /**
   * Build the roof
   */
  private buildRoof(width: number, depth: number, y: number): THREE.Mesh {
    const geo = new THREE.ConeGeometry(Math.max(width, depth) * 0.8, 3.5, 4);
    const mesh = new THREE.Mesh(geo, this.materials.roof);
    mesh.position.set(0, y + 1.75, 0);
    mesh.rotation.y = Math.PI / 4;
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Build the spire
   */
  private buildSpire(y: number): THREE.Mesh {
    const geo = new THREE.ConeGeometry(0.4, 2.5, 8);
    const mesh = new THREE.Mesh(geo, this.materials.spire);
    mesh.position.set(0, y + 1.25, 0);
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * Dispose of all materials
   */
  dispose(): void {
    Object.values(this.materials).forEach(mat => mat.dispose());
  }
}
