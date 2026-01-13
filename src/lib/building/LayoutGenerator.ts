import * as THREE from 'three';
import type {
  RoomConfig,
  RoomData,
  RoomAdjacency,
  RoomType,
  RoofType,
  Direction,
  BuildingLayout,
  WallStyle,
} from './types';
import { ROOM_TYPE_CONFIGS } from './types';

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

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

// Opposite direction helper
const OPPOSITE: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

// Direction to grid offset
const DIR_OFFSET: Record<Direction, { dx: number; dz: number }> = {
  north: { dx: 0, dz: -1 },
  south: { dx: 0, dz: 1 },
  east: { dx: 1, dz: 0 },
  west: { dx: -1, dz: 0 },
};

/**
 * Generates procedural building layouts
 */
export class LayoutGenerator {
  private rng: SeededRandom;
  private gridSize: number;

  constructor(seed: number, gridSize: number = 4) {
    this.rng = new SeededRandom(seed);
    this.gridSize = gridSize;
  }

  /**
   * Generate a single cozy cottage layout
   * One large room with interior decorations
   */
  generateCottage(): BuildingLayout {
    const rooms: Map<string, RoomData> = new Map();

    // Create single large cottage room
    const cottageConfig: RoomConfig = {
      id: 'cottage_main',
      type: 'study', // Use study as base type for cozy interior
      width: 10,     // Large width
      depth: 8,      // Decent depth
      height: 4.5,   // Taller ceiling for coziness
      gridX: 0,
      gridZ: 0,
      wallStyle: 'wood',
      hasWindow: true,
      label: "Wizard's Cottage",
    };

    const cottageRoom: RoomData = {
      config: cottageConfig,
      adjacency: { north: null, south: null, east: null, west: null },
      roofType: 'peaked',
      worldPosition: new THREE.Vector3(0, 0, 0),
      exteriorWalls: ['north', 'south', 'east', 'west'],
    };

    rooms.set(cottageConfig.id, cottageRoom);

    // Compute bounds (simple for single room)
    const halfW = cottageConfig.width / 2;
    const halfD = cottageConfig.depth / 2;
    const bounds = {
      minX: -halfW,
      maxX: halfW,
      minZ: -halfD,
      maxZ: halfD,
    };

    return {
      rooms,
      gridSize: this.gridSize,
      bounds,
      isCottage: true, // Flag for special handling
    };
  }

  /**
   * Generate a building layout based on level
   * Higher levels = more rooms, more complex layouts
   */
  generate(level: number): BuildingLayout {
    // Determine number of rooms based on level - more generous for cozy buildings
    const baseRooms = 2;
    const roomsPerLevel = 1.5;
    const maxRooms = Math.min(Math.floor(baseRooms + level * roomsPerLevel), 12);
    const numRooms = Math.max(2, this.rng.nextInt(maxRooms - 1, maxRooms));

    // Grid to track occupied cells
    const grid: Map<string, string> = new Map(); // "x,z" -> roomId

    // Start with entrance at origin
    const rooms: Map<string, RoomData> = new Map();
    let roomCount = 0;

    // Room type selection based on level
    const availableTypes = this.getAvailableRoomTypes(level);

    // Place first room (entrance or study)
    const firstType: RoomType = level === 1 ? 'study' : 'entrance';
    const firstRoom = this.createRoom(`room_${roomCount}`, firstType, 0, 0);
    rooms.set(firstRoom.config.id, firstRoom);
    grid.set('0,0', firstRoom.config.id);
    roomCount++;

    // Grow building by adding connected rooms
    const frontier: Array<{ roomId: string; dir: Direction }> = [];

    // Add initial expansion options
    for (const dir of this.rng.shuffle(['north', 'south', 'east', 'west'] as Direction[])) {
      frontier.push({ roomId: firstRoom.config.id, dir });
    }

    while (roomCount < numRooms && frontier.length > 0) {
      // Pick a random frontier cell
      const idx = this.rng.nextInt(0, frontier.length - 1);
      const { roomId, dir } = frontier[idx];
      frontier.splice(idx, 1);

      const parentRoom = rooms.get(roomId);
      if (!parentRoom) continue;

      // Calculate new position
      const offset = DIR_OFFSET[dir];
      const newX = parentRoom.config.gridX + offset.dx;
      const newZ = parentRoom.config.gridZ + offset.dz;
      const gridKey = `${newX},${newZ}`;

      // Skip if occupied
      if (grid.has(gridKey)) continue;

      // Pick a room type
      const roomType = this.rng.pick(availableTypes);
      const newRoom = this.createRoom(`room_${roomCount}`, roomType, newX, newZ);

      // Connect rooms
      parentRoom.adjacency[dir] = newRoom.config.id;
      newRoom.adjacency[OPPOSITE[dir]] = parentRoom.config.id;

      rooms.set(newRoom.config.id, newRoom);
      grid.set(gridKey, newRoom.config.id);
      roomCount++;

      // Add new frontier options
      for (const newDir of this.rng.shuffle(['north', 'south', 'east', 'west'] as Direction[])) {
        if (newDir !== OPPOSITE[dir]) { // Don't go back immediately
          frontier.push({ roomId: newRoom.config.id, dir: newDir });
        }
      }
    }

    // Check for additional connections between adjacent rooms
    this.addCrossConnections(rooms, grid);

    // Compute exterior walls and roof types
    this.computeRoomProperties(rooms);

    // Compute bounds
    const bounds = this.computeBounds(rooms);

    return {
      rooms,
      gridSize: this.gridSize,
      bounds,
    };
  }

  /**
   * Get available room types based on level
   */
  private getAvailableRoomTypes(level: number): RoomType[] {
    const types: RoomType[] = ['study', 'bedroom', 'storage'];

    if (level >= 2) {
      types.push('kitchen', 'workshop');
    }
    if (level >= 3) {
      types.push('library', 'potion_lab');
    }
    if (level >= 5) {
      types.push('tower');
    }
    if (level >= 4) {
      types.push('garden');
    }

    return types;
  }

  /**
   * Create a room with default config
   */
  private createRoom(id: string, type: RoomType, gridX: number, gridZ: number): RoomData {
    const typeConfig = ROOM_TYPE_CONFIGS[type];

    // Add some size variation
    const widthVar = this.rng.nextInt(-1, 1) * 0.5;
    const depthVar = this.rng.nextInt(-1, 1) * 0.5;

    const config: RoomConfig = {
      id,
      type,
      width: Math.max(2, typeConfig.defaultWidth + widthVar),
      depth: Math.max(2, typeConfig.defaultDepth + depthVar),
      height: typeConfig.defaultHeight,
      gridX,
      gridZ,
      wallStyle: typeConfig.defaultWallStyle,
      hasWindow: typeConfig.hasWindow,
      label: this.rng.pick(typeConfig.labels),
    };

    return {
      config,
      adjacency: { north: null, south: null, east: null, west: null },
      roofType: typeConfig.preferredRoofType,
      worldPosition: new THREE.Vector3(
        gridX * this.gridSize,
        0,
        gridZ * this.gridSize
      ),
      exteriorWalls: [],
    };
  }

  /**
   * Add connections between adjacent rooms that aren't already connected
   */
  private addCrossConnections(rooms: Map<string, RoomData>, grid: Map<string, string>): void {
    for (const room of rooms.values()) {
      for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
        if (room.adjacency[dir]) continue; // Already connected

        const offset = DIR_OFFSET[dir];
        const neighborKey = `${room.config.gridX + offset.dx},${room.config.gridZ + offset.dz}`;
        const neighborId = grid.get(neighborKey);

        if (neighborId && this.rng.chance(0.5)) {
          // Connect these rooms
          room.adjacency[dir] = neighborId;
          const neighbor = rooms.get(neighborId);
          if (neighbor) {
            neighbor.adjacency[OPPOSITE[dir]] = room.config.id;
          }
        }
      }
    }
  }

  /**
   * Compute exterior walls and roof type based on adjacency
   */
  private computeRoomProperties(rooms: Map<string, RoomData>): void {
    for (const room of rooms.values()) {
      // Find exterior walls (directions without connections)
      const exteriorWalls: Direction[] = [];
      let connectionCount = 0;

      for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
        if (!room.adjacency[dir]) {
          exteriorWalls.push(dir);
        } else {
          connectionCount++;
        }
      }

      room.exteriorWalls = exteriorWalls;

      // Determine roof type based on connections
      room.roofType = this.determineRoofType(room, connectionCount);
    }
  }

  /**
   * Determine roof type based on room type and connections
   */
  private determineRoofType(room: RoomData, connectionCount: number): RoofType {
    const typeConfig = ROOM_TYPE_CONFIGS[room.config.type];

    // Special cases
    if (room.config.type === 'garden') return 'none';
    if (room.config.type === 'tower') return 'conical';

    // Preferred roof if isolated
    if (connectionCount === 0) {
      return typeConfig.preferredRoofType;
    }

    // One connection - pitched roof away from connection
    if (connectionCount === 1) {
      if (typeConfig.preferredRoofType === 'dome') return 'dome';
      return 'pitched';
    }

    // Two connections on opposite sides - pitched
    if (connectionCount === 2) {
      const hasNS = room.adjacency.north && room.adjacency.south;
      const hasEW = room.adjacency.east && room.adjacency.west;
      if (hasNS || hasEW) {
        return 'pitched';
      }
      // Corner connection
      return 'flat';
    }

    // Three or more connections - flat
    return 'flat';
  }

  /**
   * Compute bounding box of all rooms
   */
  private computeBounds(rooms: Map<string, RoomData>): BuildingLayout['bounds'] {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const room of rooms.values()) {
      const halfW = room.config.width / 2;
      const halfD = room.config.depth / 2;
      const wx = room.worldPosition.x;
      const wz = room.worldPosition.z;

      minX = Math.min(minX, wx - halfW);
      maxX = Math.max(maxX, wx + halfW);
      minZ = Math.min(minZ, wz - halfD);
      maxZ = Math.max(maxZ, wz + halfD);
    }

    return { minX, maxX, minZ, maxZ };
  }
}
