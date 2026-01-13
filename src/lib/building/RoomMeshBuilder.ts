import * as THREE from 'three';
import type {
  RoomData,
  BuildingLayout,
  Direction,
  RoofType,
  WallStyle,
} from './types';
import {
  WALL_STYLE_COLORS,
  ROOF_COLORS,
  ROOM_TYPE_CONFIGS,
} from './types';

/**
 * Interior light fixture data
 */
export interface InteriorLight {
  light: THREE.PointLight;
  fixture: THREE.Group; // Visual mesh (torch/lamp)
  type: 'torch' | 'ceiling_lamp' | 'hearth';
}

/**
 * References to building meshes for wall transparency control
 */
export interface BuildingRefs {
  root: THREE.Group;
  rooms: Map<string, RoomMeshRefs>;
  floor: THREE.Mesh;
  allLights: InteriorLight[]; // All interior lights for day/night control
}

export interface RoomMeshRefs {
  group: THREE.Group;
  walls: {
    north?: THREE.Group;
    south?: THREE.Group;
    east?: THREE.Group;
    west?: THREE.Group;
  };
  roof: THREE.Group;
  interior: THREE.Group;
  lights: InteriorLight[];
  label?: THREE.Sprite;
}

/**
 * Builds 3D meshes for modular building layouts
 */
export class RoomMeshBuilder {
  private materials: Map<string, THREE.Material> = new Map();

  /**
   * Build meshes for entire building layout
   */
  build(layout: BuildingLayout): BuildingRefs {
    const root = new THREE.Group();
    const roomRefs = new Map<string, RoomMeshRefs>();
    const allLights: InteriorLight[] = [];

    // Build shared floor
    const floor = this.buildFloor(layout);
    root.add(floor);

    // Build each room
    for (const room of layout.rooms.values()) {
      const roomRef = this.buildRoom(room, layout);
      roomRefs.set(room.config.id, roomRef);
      root.add(roomRef.group);

      // Collect all lights for day/night control
      allLights.push(...roomRef.lights);
    }

    // Add connecting passages between rooms
    this.buildConnections(root, layout);

    return { root, rooms: roomRefs, floor, allLights };
  }

  /**
   * Build shared floor platform
   */
  private buildFloor(layout: BuildingLayout): THREE.Mesh {
    const { minX, maxX, minZ, maxZ } = layout.bounds;
    const padding = 1;

    const width = maxX - minX + padding * 2;
    const depth = maxZ - minZ + padding * 2;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const geo = new THREE.BoxGeometry(width, 0.3, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      flatShading: true,
    });

    const floor = new THREE.Mesh(geo, mat);
    floor.position.set(centerX, 0.15, centerZ);
    floor.receiveShadow = true;

    return floor;
  }

  /**
   * Build a single room
   */
  private buildRoom(room: RoomData, layout: BuildingLayout): RoomMeshRefs {
    const group = new THREE.Group();
    group.position.copy(room.worldPosition);

    const { width, depth, height } = room.config;
    const wallStyle = room.config.wallStyle;
    const colors = WALL_STYLE_COLORS[wallStyle];

    // Build walls (only exterior ones)
    const walls: RoomMeshRefs['walls'] = {};

    for (const dir of room.exteriorWalls) {
      const wallGroup = this.buildWall(room, dir, width, depth, height, colors);
      walls[dir] = wallGroup;
      group.add(wallGroup);
    }

    // Build interior floor and decorations
    const interiorGroup = this.buildInterior(room, layout.isCottage);
    group.add(interiorGroup);

    // Build roof
    const roofGroup = this.buildRoof(room, layout);
    group.add(roofGroup);

    // Add interior lighting (wall torches + ceiling lamp)
    const lights = this.buildInteriorLighting(room, group);

    // Add room label
    const label = this.buildLabel(room);
    if (label) {
      group.add(label);
    }

    return { group, walls, roof: roofGroup, interior: interiorGroup, lights, label: label ?? undefined };
  }

  /**
   * Build a wall for a direction
   */
  private buildWall(
    room: RoomData,
    dir: Direction,
    width: number,
    depth: number,
    height: number,
    colors: { primary: number; trim: number }
  ): THREE.Group {
    const wallGroup = new THREE.Group();
    const wallThickness = 0.2;

    // Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    this.materials.set(`wall_${room.config.id}_${dir}`, wallMat);

    // Wall dimensions and position based on direction
    let wallWidth: number, wallDepth: number;
    let posX = 0, posZ = 0;

    switch (dir) {
      case 'north':
        wallWidth = width;
        wallDepth = wallThickness;
        posZ = -depth / 2 + wallThickness / 2;
        break;
      case 'south':
        wallWidth = width;
        wallDepth = wallThickness;
        posZ = depth / 2 - wallThickness / 2;
        break;
      case 'east':
        wallWidth = wallThickness;
        wallDepth = depth;
        posX = width / 2 - wallThickness / 2;
        break;
      case 'west':
        wallWidth = wallThickness;
        wallDepth = depth;
        posX = -width / 2 + wallThickness / 2;
        break;
    }

    // Main wall
    const wallGeo = new THREE.BoxGeometry(wallWidth, height, wallDepth);
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(posX, height / 2 + 0.3, posZ);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.userData.wallFace = dir;
    wallGroup.add(wall);

    // Add window if room has windows and this is an exterior wall
    if (room.config.hasWindow && (dir === 'north' || dir === 'south')) {
      const window = this.buildWindow(dir, height);
      window.position.set(posX, height / 2 + 0.3, posZ);
      wallGroup.add(window);
    }

    // Add door if this is south wall (entrance direction)
    if (dir === 'south' && room.exteriorWalls.length < 4) {
      // Only add door if not completely isolated
      const door = this.buildDoor(height);
      door.position.set(posX, 0.3, posZ + 0.05);
      wallGroup.add(door);
    }

    // Trim at top
    const trimGeo = new THREE.BoxGeometry(wallWidth + 0.1, 0.15, wallDepth + 0.1);
    const trimMat = new THREE.MeshStandardMaterial({
      color: colors.trim,
      flatShading: true,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(posX, height + 0.35, posZ);
    wallGroup.add(trim);

    wallGroup.userData.wallFace = dir;
    return wallGroup;
  }

  /**
   * Build a window
   */
  private buildWindow(dir: Direction, wallHeight: number): THREE.Group {
    const windowGroup = new THREE.Group();

    const windowWidth = 0.8;
    const windowHeight = 1.0;
    const frameThickness = 0.08;

    // Frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      flatShading: true,
    });

    // Horizontal bars
    const hBarGeo = new THREE.BoxGeometry(windowWidth, frameThickness, 0.1);
    const topBar = new THREE.Mesh(hBarGeo, frameMat);
    topBar.position.y = windowHeight / 2;
    windowGroup.add(topBar);

    const bottomBar = new THREE.Mesh(hBarGeo, frameMat);
    bottomBar.position.y = -windowHeight / 2;
    windowGroup.add(bottomBar);

    // Vertical bars
    const vBarGeo = new THREE.BoxGeometry(frameThickness, windowHeight, 0.1);
    const leftBar = new THREE.Mesh(vBarGeo, frameMat);
    leftBar.position.x = -windowWidth / 2;
    windowGroup.add(leftBar);

    const rightBar = new THREE.Mesh(vBarGeo, frameMat);
    rightBar.position.x = windowWidth / 2;
    windowGroup.add(rightBar);

    // Cross bars
    const midH = new THREE.Mesh(hBarGeo, frameMat);
    windowGroup.add(midH);

    const midV = new THREE.Mesh(vBarGeo, frameMat);
    windowGroup.add(midV);

    // Glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.4,
    });
    const glassGeo = new THREE.BoxGeometry(windowWidth - 0.1, windowHeight - 0.1, 0.05);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    windowGroup.add(glass);

    // Position offset from wall center
    if (dir === 'north') {
      windowGroup.position.z = -0.15;
    } else {
      windowGroup.position.z = 0.15;
    }

    return windowGroup;
  }

  /**
   * Build a door
   */
  private buildDoor(wallHeight: number): THREE.Group {
    const doorGroup = new THREE.Group();

    const doorWidth = 1.0;
    const doorHeight = 2.0;

    // Door frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      flatShading: true,
    });

    const frameGeo = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.1, 0.15);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = doorHeight / 2;
    doorGroup.add(frame);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      flatShading: true,
    });
    const doorGeo = new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.1, 0.1);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.y = doorHeight / 2;
    door.position.z = -0.03;
    doorGroup.add(door);

    // Door handle
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      flatShading: true,
    });
    const handleGeo = new THREE.SphereGeometry(0.06, 6, 4);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(doorWidth / 2 - 0.15, doorHeight / 2, 0.08);
    doorGroup.add(handle);

    return doorGroup;
  }

  /**
   * Build interior floor and details
   */
  private buildInterior(room: RoomData, isCottage?: boolean): THREE.Group {
    const interior = new THREE.Group();
    const { width, depth } = room.config;
    const typeConfig = ROOM_TYPE_CONFIGS[room.config.type];

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({
      color: typeConfig.interiorColor,
      flatShading: true,
    });
    const floorGeo = new THREE.BoxGeometry(width - 0.4, 0.1, depth - 0.4);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.35;
    floor.receiveShadow = true;
    interior.add(floor);

    // Add room-specific details - use cottage decorations for single cottage
    if (isCottage) {
      this.addCottageDecorations(interior, room);
    } else {
      this.addRoomDetails(interior, room);
    }

    return interior;
  }

  /**
   * Add room type specific interior details
   */
  private addRoomDetails(interior: THREE.Group, room: RoomData): void {
    const { width, depth } = room.config;
    const halfW = width / 2 - 0.5;
    const halfD = depth / 2 - 0.5;

    switch (room.config.type) {
      case 'study':
      case 'library':
        // Desk
        this.addDesk(interior, 0, halfD - 0.5);
        // Bookshelf
        this.addBookshelf(interior, -halfW + 0.3, 0);
        break;

      case 'potion_lab':
        // Cauldron
        this.addCauldron(interior, 0, 0);
        // Shelves
        this.addShelf(interior, halfW - 0.3, 0);
        break;

      case 'bedroom':
        // Bed
        this.addBed(interior, 0, halfD - 0.8);
        break;

      case 'kitchen':
        // Hearth
        this.addHearth(interior, 0, -halfD + 0.5);
        // Table
        this.addTable(interior, 0, halfD - 0.5);
        break;

      case 'workshop':
        // Workbench
        this.addWorkbench(interior, 0, 0);
        break;
    }
  }

  /**
   * Add cozy cottage decorations - more detailed single room
   */
  private addCottageDecorations(interior: THREE.Group, room: RoomData): void {
    const { width, depth, height } = room.config;
    const halfW = width / 2 - 0.8;
    const halfD = depth / 2 - 0.8;

    // === RUG in center ===
    this.addRug(interior, 0, 0, 3, 2);

    // === HEARTH on back wall ===
    this.addLargeHearth(interior, 0, -halfD + 0.3);

    // === BOOKSHELVES along one wall ===
    this.addBookshelf(interior, -halfW + 0.3, -1);
    this.addBookshelf(interior, -halfW + 0.3, 1);

    // === DESK with chair ===
    this.addDesk(interior, halfW - 1, 0);
    this.addChair(interior, halfW - 1.8, 0);

    // === BARRELS in corner ===
    this.addBarrel(interior, halfW - 0.5, halfD - 0.5);
    this.addBarrel(interior, halfW - 1.2, halfD - 0.5);
    this.addBarrel(interior, halfW - 0.8, halfD - 1.3);

    // === HAY BALES in another corner ===
    this.addHayBale(interior, -halfW + 0.5, halfD - 0.5);
    this.addHayBale(interior, -halfW + 0.5, halfD - 1.3);

    // === CRATES/BOXES ===
    this.addCrate(interior, -halfW + 1.5, halfD - 0.5);
    this.addCrate(interior, -halfW + 1.5, halfD - 1.1);

    // === CEILING BEAMS (interior scaffolding) ===
    this.addCeilingBeams(interior, width, depth, height);

    // === POTION TABLE with bottles ===
    this.addPotionTable(interior, -halfW + 2.5, -halfD + 1);

    // === WEAPON RACK ===
    this.addWeaponRack(interior, halfW - 0.3, -1.5);

    // === HANGING HERBS ===
    this.addHangingHerbs(interior, -2, height - 0.5, 0);
    this.addHangingHerbs(interior, 2, height - 0.5, -1);

    // === FLOOR LANTERN ===
    this.addFloorLantern(interior, halfW - 0.5, -halfD + 0.5);
  }

  private addRug(parent: THREE.Group, x: number, z: number, w: number, d: number): void {
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x8b0000, // Deep red
      flatShading: true,
    });
    const rugGeo = new THREE.BoxGeometry(w, 0.05, d);
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.position.set(x, 0.4, z);
    rug.receiveShadow = true;
    parent.add(rug);

    // Decorative border
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xdaa520, // Gold
      flatShading: true,
    });
    const borderGeo = new THREE.BoxGeometry(w + 0.1, 0.02, d + 0.1);
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(x, 0.38, z);
    parent.add(border);
  }

  private addLargeHearth(parent: THREE.Group, x: number, z: number): void {
    // Stone surround
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x505050, flatShading: true });

    // Back wall
    const backGeo = new THREE.BoxGeometry(2.5, 2.5, 0.4);
    const back = new THREE.Mesh(backGeo, stoneMat);
    back.position.set(x, 1.6, z);
    parent.add(back);

    // Side pillars
    const pillarGeo = new THREE.BoxGeometry(0.4, 2.5, 0.5);
    const leftPillar = new THREE.Mesh(pillarGeo, stoneMat);
    leftPillar.position.set(x - 1.2, 1.6, z + 0.2);
    parent.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo.clone(), stoneMat);
    rightPillar.position.set(x + 1.2, 1.6, z + 0.2);
    parent.add(rightPillar);

    // Mantle
    const mantleGeo = new THREE.BoxGeometry(3, 0.2, 0.6);
    const mantle = new THREE.Mesh(mantleGeo, stoneMat);
    mantle.position.set(x, 2.5, z + 0.3);
    parent.add(mantle);

    // Fire pit
    const pitGeo = new THREE.BoxGeometry(1.8, 0.3, 0.4);
    const pit = new THREE.Mesh(pitGeo, stoneMat);
    pit.position.set(x, 0.5, z + 0.3);
    parent.add(pit);

    // Fire
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const fireGeo = new THREE.ConeGeometry(0.4, 0.6, 6);
    const fire1 = new THREE.Mesh(fireGeo, fireMat);
    fire1.position.set(x - 0.3, 0.9, z + 0.3);
    parent.add(fire1);
    const fire2 = new THREE.Mesh(fireGeo.clone(), fireMat);
    fire2.position.set(x + 0.3, 0.8, z + 0.3);
    fire2.scale.set(0.8, 0.9, 0.8);
    parent.add(fire2);

    // Logs
    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, flatShading: true });
    const logGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    logGeo.rotateZ(Math.PI / 2);
    const log1 = new THREE.Mesh(logGeo, logMat);
    log1.position.set(x, 0.55, z + 0.35);
    parent.add(log1);
  }

  private addChair(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.set(x, 0.75, z);
    parent.add(seat);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.06, 0.35, 0.06);
    const positions = [
      [x - 0.2, 0.55, z - 0.2],
      [x + 0.2, 0.55, z - 0.2],
      [x - 0.2, 0.55, z + 0.2],
      [x + 0.2, 0.55, z + 0.2],
    ];
    for (const [lx, ly, lz] of positions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, ly, lz);
      parent.add(leg);
    }

    // Back
    const backGeo = new THREE.BoxGeometry(0.5, 0.6, 0.06);
    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(x, 1.1, z - 0.22);
    parent.add(back);
  }

  private addBarrel(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const barrelGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.8, 8);
    const barrel = new THREE.Mesh(barrelGeo, mat);
    barrel.position.set(x, 0.75, z);
    barrel.castShadow = true;
    parent.add(barrel);

    // Metal bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x404040, flatShading: true });
    const bandGeo = new THREE.TorusGeometry(0.33, 0.03, 4, 8);
    const band1 = new THREE.Mesh(bandGeo, bandMat);
    band1.rotation.x = Math.PI / 2;
    band1.position.set(x, 0.5, z);
    parent.add(band1);
    const band2 = new THREE.Mesh(bandGeo.clone(), bandMat);
    band2.rotation.x = Math.PI / 2;
    band2.position.set(x, 1.0, z);
    parent.add(band2);
  }

  private addHayBale(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0xdaa520, flatShading: true });
    const hayGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const hay = new THREE.Mesh(hayGeo, mat);
    hay.position.set(x, 0.6, z);
    hay.rotation.y = Math.random() * 0.3;
    hay.castShadow = true;
    parent.add(hay);

    // Straw strands
    const strandMat = new THREE.MeshStandardMaterial({ color: 0xf0e68c, flatShading: true });
    for (let i = 0; i < 5; i++) {
      const strandGeo = new THREE.BoxGeometry(0.02, 0.15, 0.02);
      const strand = new THREE.Mesh(strandGeo, strandMat);
      strand.position.set(
        x + (Math.random() - 0.5) * 0.6,
        0.9,
        z + (Math.random() - 0.5) * 0.4
      );
      strand.rotation.z = (Math.random() - 0.5) * 0.5;
      parent.add(strand);
    }
  }

  private addCrate(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b7355, flatShading: true });
    const crateGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6);
    const crate = new THREE.Mesh(crateGeo, mat);
    crate.position.set(x, 0.6, z);
    crate.castShadow = true;
    parent.add(crate);

    // Slat lines
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
    const slatGeo = new THREE.BoxGeometry(0.62, 0.04, 0.62);
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.set(x, 0.85, z);
    parent.add(slat);
  }

  private addCeilingBeams(parent: THREE.Group, width: number, depth: number, height: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
    const beamGeo = new THREE.BoxGeometry(0.2, 0.25, depth - 0.5);

    // Main beams across the ceiling
    const numBeams = 3;
    for (let i = 0; i < numBeams; i++) {
      const beam = new THREE.Mesh(beamGeo, mat);
      const xPos = (i - (numBeams - 1) / 2) * (width / (numBeams + 1));
      beam.position.set(xPos, height - 0.3, 0);
      beam.castShadow = true;
      parent.add(beam);
    }

    // Cross beams
    const crossGeo = new THREE.BoxGeometry(width - 0.5, 0.15, 0.15);
    const cross1 = new THREE.Mesh(crossGeo, mat);
    cross1.position.set(0, height - 0.5, -depth / 4);
    parent.add(cross1);
    const cross2 = new THREE.Mesh(crossGeo.clone(), mat);
    cross2.position.set(0, height - 0.5, depth / 4);
    parent.add(cross2);
  }

  private addPotionTable(parent: THREE.Group, x: number, z: number): void {
    // Table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
    const tableGeo = new THREE.BoxGeometry(1.2, 0.1, 0.6);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(x, 1.0, z);
    parent.add(table);

    // Bottles
    const colors = [0x4169e1, 0x32cd32, 0xff6347, 0x9932cc];
    for (let i = 0; i < 4; i++) {
      const bottleMat = new THREE.MeshStandardMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.7,
      });
      const bottleGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.2, 6);
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(x - 0.4 + i * 0.25, 1.15, z);
      parent.add(bottle);
    }

    // Mortar and pestle
    const mortarMat = new THREE.MeshStandardMaterial({ color: 0x696969, flatShading: true });
    const mortarGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.12, 8);
    const mortar = new THREE.Mesh(mortarGeo, mortarMat);
    mortar.position.set(x + 0.4, 1.1, z);
    parent.add(mortar);
  }

  private addWeaponRack(parent: THREE.Group, x: number, z: number): void {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });

    // Back board
    const boardGeo = new THREE.BoxGeometry(0.1, 1.2, 0.8);
    const board = new THREE.Mesh(boardGeo, woodMat);
    board.position.set(x, 1.4, z);
    parent.add(board);

    // Pegs
    const pegGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    pegGeo.rotateZ(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const peg = new THREE.Mesh(pegGeo, woodMat);
      peg.position.set(x - 0.08, 1.2 + i * 0.3, z - 0.2 + i * 0.2);
      parent.add(peg);
    }

    // Simple sword
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, flatShading: true });
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.8, 0.1);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.set(x - 0.15, 1.5, z);
    blade.rotation.z = 0.2;
    parent.add(blade);
  }

  private addHangingHerbs(parent: THREE.Group, x: number, y: number, z: number): void {
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x228b22, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x32cd32, flatShading: true });

    // Hanging string
    const stringMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, flatShading: true });
    const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4);
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.set(x, y, z);
    parent.add(string);

    // Herb bundle
    for (let i = 0; i < 5; i++) {
      const stemGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.3, 4);
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(
        x + (Math.random() - 0.5) * 0.1,
        y - 0.3,
        z + (Math.random() - 0.5) * 0.1
      );
      stem.rotation.x = Math.PI + (Math.random() - 0.5) * 0.3;
      parent.add(stem);

      const leafGeo = new THREE.SphereGeometry(0.04, 4, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(stem.position.x, y - 0.5, stem.position.z);
      parent.add(leaf);
    }
  }

  private addFloorLantern(parent: THREE.Group, x: number, z: number): void {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, flatShading: true });

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.1, 6);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.set(x, 0.42, z);
    parent.add(base);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.set(x, 0.75, z);
    parent.add(pole);

    // Lantern cage
    const cageGeo = new THREE.BoxGeometry(0.2, 0.25, 0.2);
    const cage = new THREE.Mesh(cageGeo, metalMat);
    cage.position.set(x, 1.15, z);
    parent.add(cage);

    // Glass (glowing)
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.6,
    });
    const glassGeo = new THREE.BoxGeometry(0.15, 0.18, 0.15);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(x, 1.15, z);
    parent.add(glass);
  }

  private addDesk(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const topGeo = new THREE.BoxGeometry(1.2, 0.1, 0.6);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.set(x, 1.1, z);
    parent.add(top);
  }

  private addBookshelf(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
    const shelfGeo = new THREE.BoxGeometry(0.3, 2, 1);
    const shelf = new THREE.Mesh(shelfGeo, mat);
    shelf.position.set(x, 1.4, z);
    parent.add(shelf);

    // Books
    const bookMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, flatShading: true });
    const bookGeo = new THREE.BoxGeometry(0.25, 0.3, 0.8);
    const books = new THREE.Mesh(bookGeo, bookMat);
    books.position.set(x, 1.8, z);
    parent.add(books);
  }

  private addCauldron(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2f2f2f, flatShading: true });
    const cauldronGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.5, 8);
    const cauldron = new THREE.Mesh(cauldronGeo, mat);
    cauldron.position.set(x, 0.65, z);
    parent.add(cauldron);

    // Glowing contents
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const glowGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 8);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(x, 0.85, z);
    parent.add(glow);
  }

  private addShelf(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
    const shelfGeo = new THREE.BoxGeometry(0.3, 1.5, 0.8);
    const shelf = new THREE.Mesh(shelfGeo, mat);
    shelf.position.set(x, 1.15, z);
    parent.add(shelf);

    // Bottles
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x4169e1,
      transparent: true,
      opacity: 0.7,
    });
    for (let i = 0; i < 3; i++) {
      const bottleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6);
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      bottle.position.set(x, 1.5 + i * 0.35, z + (i - 1) * 0.2);
      parent.add(bottle);
    }
  }

  private addBed(parent: THREE.Group, x: number, z: number): void {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
    const frameGeo = new THREE.BoxGeometry(1.2, 0.4, 2);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, 0.55, z);
    parent.add(frame);

    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, flatShading: true });
    const mattressGeo = new THREE.BoxGeometry(1.1, 0.2, 1.8);
    const mattress = new THREE.Mesh(mattressGeo, mattressMat);
    mattress.position.set(x, 0.85, z);
    parent.add(mattress);
  }

  private addHearth(parent: THREE.Group, x: number, z: number): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x696969, flatShading: true });
    const hearthGeo = new THREE.BoxGeometry(1.5, 1.2, 0.6);
    const hearth = new THREE.Mesh(hearthGeo, stoneMat);
    hearth.position.set(x, 0.95, z);
    parent.add(hearth);

    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
    const fireGeo = new THREE.BoxGeometry(0.8, 0.4, 0.3);
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(x, 0.6, z + 0.1);
    parent.add(fire);
  }

  private addTable(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const topGeo = new THREE.BoxGeometry(1, 0.1, 0.8);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.set(x, 1.0, z);
    parent.add(top);

    const legGeo = new THREE.BoxGeometry(0.1, 0.6, 0.1);
    const positions = [
      [x - 0.4, 0.65, z - 0.3],
      [x + 0.4, 0.65, z - 0.3],
      [x - 0.4, 0.65, z + 0.3],
      [x + 0.4, 0.65, z + 0.3],
    ];
    for (const [lx, ly, lz] of positions) {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, ly, lz);
      parent.add(leg);
    }
  }

  private addWorkbench(parent: THREE.Group, x: number, z: number): void {
    const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const topGeo = new THREE.BoxGeometry(2, 0.15, 1);
    const top = new THREE.Mesh(topGeo, mat);
    top.position.set(x, 1.1, z);
    parent.add(top);

    // Tools
    const toolMat = new THREE.MeshStandardMaterial({ color: 0x808080, flatShading: true });
    const toolGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
    const tool = new THREE.Mesh(toolGeo, toolMat);
    tool.position.set(x + 0.5, 1.35, z);
    tool.rotation.z = 0.3;
    parent.add(tool);
  }

  /**
   * Build interior lighting fixtures for a room
   * Creates wall torches and optional ceiling lamp
   */
  private buildInteriorLighting(room: RoomData, parent: THREE.Group): InteriorLight[] {
    const lights: InteriorLight[] = [];
    const { width, depth, height } = room.config;
    const halfW = width / 2 - 0.3;
    const halfD = depth / 2 - 0.3;

    // Determine room lighting based on type
    const hasHearth = room.config.type === 'kitchen';
    const isLargeRoom = width >= 4 && depth >= 4;

    // Wall torches - place on exterior walls
    const torchPositions: { x: number; z: number; y: number }[] = [];

    // Add torches based on room size and walls
    if (room.exteriorWalls.includes('west')) {
      torchPositions.push({ x: -halfW + 0.1, z: 0, y: height * 0.6 });
    }
    if (room.exteriorWalls.includes('east')) {
      torchPositions.push({ x: halfW - 0.1, z: 0, y: height * 0.6 });
    }
    if (room.exteriorWalls.includes('north') && !hasHearth) {
      torchPositions.push({ x: 0, z: -halfD + 0.1, y: height * 0.6 });
    }

    // Create wall torches
    for (const pos of torchPositions) {
      const torch = this.buildWallTorch(pos.x, pos.y, pos.z);
      parent.add(torch.fixture);
      lights.push(torch);
    }

    // Ceiling lamp for larger rooms
    if (isLargeRoom && !hasHearth) {
      const ceilingLamp = this.buildCeilingLamp(0, height - 0.3, 0);
      parent.add(ceilingLamp.fixture);
      lights.push(ceilingLamp);
    }

    // Hearth fire light (for kitchens)
    if (hasHearth) {
      const hearthLight = this.buildHearthLight(0, 0.8, -halfD + 0.5);
      parent.add(hearthLight.fixture);
      lights.push(hearthLight);
    }

    return lights;
  }

  /**
   * Build a wall-mounted torch fixture
   */
  private buildWallTorch(x: number, y: number, z: number): InteriorLight {
    const fixture = new THREE.Group();
    fixture.position.set(x, y, z);

    // Torch bracket (metal)
    const bracketMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      flatShading: true,
    });
    const bracketGeo = new THREE.BoxGeometry(0.08, 0.15, 0.08);
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.y = -0.1;
    fixture.add(bracket);

    // Torch stick
    const stickMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      flatShading: true,
    });
    const stickGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 4);
    const stick = new THREE.Mesh(stickGeo, stickMat);
    stick.position.y = 0.05;
    fixture.add(stick);

    // Flame (tetrahedron)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff9944,
      transparent: true,
      opacity: 0.9,
    });
    const flameGeo = new THREE.TetrahedronGeometry(0.08, 0);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.25;
    fixture.add(flame);

    // Point light (no shadows to stay within WebGL texture limits)
    const light = new THREE.PointLight(0xff9944, 0, 6, 2);
    light.position.y = 0.25;
    fixture.add(light);

    return { light, fixture, type: 'torch' };
  }

  /**
   * Build a hanging ceiling lamp
   */
  private buildCeilingLamp(x: number, y: number, z: number): InteriorLight {
    const fixture = new THREE.Group();
    fixture.position.set(x, y, z);

    // Chain
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      flatShading: true,
    });
    const chainGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
    const chain = new THREE.Mesh(chainGeo, chainMat);
    chain.position.y = 0.15;
    fixture.add(chain);

    // Lamp holder (ring)
    const holderMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      flatShading: true,
    });
    const holderGeo = new THREE.TorusGeometry(0.15, 0.03, 4, 6);
    const holder = new THREE.Mesh(holderGeo, holderMat);
    holder.rotation.x = Math.PI / 2;
    fixture.add(holder);

    // Candles (3 around the ring)
    const candleMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5dc,
      flatShading: true,
    });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const cx = Math.sin(angle) * 0.12;
      const cz = Math.cos(angle) * 0.12;

      const candleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 4);
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(cx, 0.06, cz);
      fixture.add(candle);

      const flameGeo = new THREE.ConeGeometry(0.02, 0.05, 4);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(cx, 0.15, cz);
      fixture.add(flame);
    }

    // Point light (no shadows to stay within WebGL texture limits)
    const light = new THREE.PointLight(0xffaa44, 0, 8, 2);
    light.position.y = 0;
    fixture.add(light);

    return { light, fixture, type: 'ceiling_lamp' };
  }

  /**
   * Build hearth/fireplace light
   */
  private buildHearthLight(x: number, y: number, z: number): InteriorLight {
    const fixture = new THREE.Group();
    fixture.position.set(x, y, z);

    // No additional mesh - the hearth fire is already built in addHearth
    // Just add the light

    // Point light with warm fire color (no shadows to stay within WebGL texture limits)
    const light = new THREE.PointLight(0xff6622, 0, 10, 2);
    fixture.add(light);

    return { light, fixture, type: 'hearth' };
  }

  /**
   * Build roof based on type
   */
  private buildRoof(room: RoomData, layout: BuildingLayout): THREE.Group {
    const roofGroup = new THREE.Group();
    const { width, depth, height } = room.config;

    switch (room.roofType) {
      case 'peaked':
        this.buildPeakedRoof(roofGroup, width, depth, height);
        break;
      case 'pitched':
        this.buildPitchedRoof(roofGroup, room, width, depth, height);
        break;
      case 'flat':
        this.buildFlatRoof(roofGroup, width, depth, height);
        break;
      case 'dome':
        this.buildDomeRoof(roofGroup, width, depth, height);
        break;
      case 'conical':
        this.buildConicalRoof(roofGroup, width, depth, height);
        break;
      case 'none':
        // No roof
        break;
    }

    return roofGroup;
  }

  private buildPeakedRoof(group: THREE.Group, width: number, depth: number, height: number): void {
    const roofMat = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS.thatch,
      flatShading: true,
    });

    const roofHeight = Math.min(width, depth) * 0.5;
    const overhang = 0.4;

    // Create peaked roof shape
    const shape = new THREE.Shape();
    shape.moveTo(-(width / 2 + overhang), 0);
    shape.lineTo(0, roofHeight);
    shape.lineTo(width / 2 + overhang, 0);
    shape.lineTo(-(width / 2 + overhang), 0);

    const extrudeSettings = {
      depth: depth + overhang * 2,
      bevelEnabled: false,
    };

    const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    roofGeo.rotateX(-Math.PI / 2);
    roofGeo.translate(0, 0, (depth + overhang * 2) / 2);

    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.3;
    roof.castShadow = true;
    group.add(roof);
  }

  private buildPitchedRoof(group: THREE.Group, room: RoomData, width: number, depth: number, height: number): void {
    const roofMat = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS.shingle,
      flatShading: true,
    });

    const roofHeight = 1.5;
    const overhang = 0.3;

    // Determine pitch direction based on connections
    const pitchNS = room.adjacency.east || room.adjacency.west;

    if (pitchNS) {
      // Pitch north-south
      const roofGeo = new THREE.BoxGeometry(width + overhang * 2, 0.2, depth + overhang * 2);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = height + 0.4 + roofHeight / 2;
      roof.rotation.x = 0.2;
      roof.castShadow = true;
      group.add(roof);
    } else {
      // Pitch east-west
      const roofGeo = new THREE.BoxGeometry(width + overhang * 2, 0.2, depth + overhang * 2);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = height + 0.4 + roofHeight / 2;
      roof.rotation.z = 0.2;
      roof.castShadow = true;
      group.add(roof);
    }
  }

  private buildFlatRoof(group: THREE.Group, width: number, depth: number, height: number): void {
    const roofMat = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS.slate,
      flatShading: true,
    });

    // Flat top
    const roofGeo = new THREE.BoxGeometry(width + 0.2, 0.2, depth + 0.2);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + 0.4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Parapet walls
    const parapetMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      flatShading: true,
    });
    const parapetHeight = 0.4;

    for (const [px, pz, pw, pd] of [
      [0, -depth / 2, width + 0.2, 0.15],
      [0, depth / 2, width + 0.2, 0.15],
      [-width / 2, 0, 0.15, depth + 0.2],
      [width / 2, 0, 0.15, depth + 0.2],
    ]) {
      const parapetGeo = new THREE.BoxGeometry(pw, parapetHeight, pd);
      const parapet = new THREE.Mesh(parapetGeo, parapetMat);
      parapet.position.set(px, height + 0.5 + parapetHeight / 2, pz);
      group.add(parapet);
    }
  }

  private buildDomeRoof(group: THREE.Group, width: number, depth: number, height: number): void {
    const roofMat = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS.copper,
      flatShading: true,
    });

    const radius = Math.min(width, depth) / 2;
    const domeGeo = new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, roofMat);
    dome.position.y = height + 0.3;
    dome.castShadow = true;
    group.add(dome);
  }

  private buildConicalRoof(group: THREE.Group, width: number, depth: number, height: number): void {
    const roofMat = new THREE.MeshStandardMaterial({
      color: ROOF_COLORS.slate,
      flatShading: true,
    });

    const radius = Math.max(width, depth) / 2 + 0.3;
    const roofHeight = radius * 1.5;

    const coneGeo = new THREE.ConeGeometry(radius, roofHeight, 8);
    const cone = new THREE.Mesh(coneGeo, roofMat);
    cone.position.y = height + 0.3 + roofHeight / 2;
    cone.castShadow = true;
    group.add(cone);

    // Spire
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      flatShading: true,
    });
    const spireGeo = new THREE.ConeGeometry(0.1, 0.6, 4);
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = height + 0.3 + roofHeight + 0.3;
    group.add(spire);
  }

  /**
   * Build room label sprite
   */
  private buildLabel(room: RoomData): THREE.Sprite | null {
    if (!room.config.label) return null;

    // Create canvas for label
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.config.label, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(2, 0.5, 1);
    sprite.position.y = room.config.height + 2;

    return sprite;
  }

  /**
   * Build connecting passages between rooms
   */
  private buildConnections(root: THREE.Group, layout: BuildingLayout): void {
    const processedPairs = new Set<string>();

    for (const room of layout.rooms.values()) {
      for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
        const neighborId = room.adjacency[dir];
        if (!neighborId) continue;

        // Create unique pair key to avoid duplicates
        const pairKey = [room.config.id, neighborId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const neighbor = layout.rooms.get(neighborId);
        if (!neighbor) continue;

        // Build archway between rooms
        const archway = this.buildArchway(room, neighbor, dir);
        root.add(archway);
      }
    }
  }

  /**
   * Build archway connection between two rooms
   */
  private buildArchway(room1: RoomData, room2: RoomData, dir: Direction): THREE.Group {
    const archGroup = new THREE.Group();

    // Position between rooms
    const midX = (room1.worldPosition.x + room2.worldPosition.x) / 2;
    const midZ = (room1.worldPosition.z + room2.worldPosition.z) / 2;

    const archMat = new THREE.MeshStandardMaterial({
      color: 0x808080,
      flatShading: true,
    });

    const archHeight = Math.min(room1.config.height, room2.config.height) - 0.5;
    const archWidth = 1.5;

    // Arch frame
    const frameGeo = new THREE.BoxGeometry(
      dir === 'east' || dir === 'west' ? 0.3 : archWidth + 0.4,
      archHeight,
      dir === 'north' || dir === 'south' ? 0.3 : archWidth + 0.4
    );
    const frame = new THREE.Mesh(frameGeo, archMat);
    frame.position.set(midX, archHeight / 2 + 0.3, midZ);
    archGroup.add(frame);

    return archGroup;
  }

  /**
   * Dispose of all materials
   */
  dispose(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
  }
}
