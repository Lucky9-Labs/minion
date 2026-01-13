/**
 * Modular building system types
 * Rooms connect together, roofs and walls adapt to adjacency
 */

import * as THREE from 'three';

// Direction for adjacency
export type Direction = 'north' | 'south' | 'east' | 'west';

// Room types with wizarding theme
export type RoomType =
  | 'study'        // Books, desk, magical research
  | 'library'      // Tall shelves, lots of books
  | 'potion_lab'   // Cauldrons, shelves of ingredients
  | 'bedroom'      // Bed, wardrobe, personal space
  | 'kitchen'      // Hearth, cooking supplies
  | 'storage'      // Crates, barrels, supplies
  | 'workshop'     // Crafting tables, tools
  | 'tower'        // Vertical room, observatory
  | 'entrance'     // Main door, foyer
  | 'garden'       // Open air, plants (no roof);

// Roof types based on adjacency
export type RoofType =
  | 'peaked'       // Classic pointed roof (isolated)
  | 'pitched'      // Slanted one direction (one side connected)
  | 'flat'         // Flat with parapet (multiple connections)
  | 'dome'         // Rounded dome (special rooms)
  | 'conical'      // Cone shape (tower)
  | 'none';        // No roof (garden, open)

// Wall style
export type WallStyle =
  | 'stone'        // Gray stone blocks
  | 'wood'         // Wooden planks
  | 'plaster'      // White/cream plaster
  | 'brick';       // Red/brown brick

// Room configuration
export interface RoomConfig {
  id: string;
  type: RoomType;
  width: number;      // X dimension
  depth: number;      // Z dimension
  height: number;     // Wall height
  gridX: number;      // Grid position X
  gridZ: number;      // Grid position Z
  wallStyle: WallStyle;
  hasWindow: boolean;
  label?: string;     // Procedurally generated name
}

// Adjacency info for a room
export interface RoomAdjacency {
  north: string | null;  // Room ID or null
  south: string | null;
  east: string | null;
  west: string | null;
}

// Complete room data with computed values
export interface RoomData {
  config: RoomConfig;
  adjacency: RoomAdjacency;
  roofType: RoofType;
  worldPosition: THREE.Vector3;
  exteriorWalls: Direction[];  // Which walls are exterior
}

// Building layout
export interface BuildingLayout {
  rooms: Map<string, RoomData>;
  gridSize: number;         // Size of each grid cell
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  isCottage?: boolean;      // Flag for single-room cottage mode
}

// Room type configurations (defaults)
export const ROOM_TYPE_CONFIGS: Record<RoomType, {
  defaultWidth: number;
  defaultDepth: number;
  defaultHeight: number;
  defaultWallStyle: WallStyle;
  hasWindow: boolean;
  preferredRoofType: RoofType;
  interiorColor: number;
  labels: string[];  // Possible procedural names
}> = {
  study: {
    defaultWidth: 5,
    defaultDepth: 5,
    defaultHeight: 3.5,
    defaultWallStyle: 'wood',
    hasWindow: true,
    preferredRoofType: 'peaked',
    interiorColor: 0x8b4513,
    labels: ['Study', 'Scriptorium', 'Reading Nook', 'Scholar\'s Den'],
  },
  library: {
    defaultWidth: 6,
    defaultDepth: 5,
    defaultHeight: 4.5,
    defaultWallStyle: 'wood',
    hasWindow: true,
    preferredRoofType: 'peaked',
    interiorColor: 0x654321,
    labels: ['Library', 'Archive', 'Tome Chamber', 'Bibliotheca'],
  },
  potion_lab: {
    defaultWidth: 5,
    defaultDepth: 6,
    defaultHeight: 4,
    defaultWallStyle: 'stone',
    hasWindow: true,
    preferredRoofType: 'dome',
    interiorColor: 0x2f4f4f,
    labels: ['Potion Lab', 'Alchemy Chamber', 'Brew Room', 'Elixir Workshop'],
  },
  bedroom: {
    defaultWidth: 4,
    defaultDepth: 5,
    defaultHeight: 3.5,
    defaultWallStyle: 'plaster',
    hasWindow: true,
    preferredRoofType: 'peaked',
    interiorColor: 0xdeb887,
    labels: ['Bedroom', 'Quarters', 'Rest Chamber', 'Sleeping Nook'],
  },
  kitchen: {
    defaultWidth: 5,
    defaultDepth: 5,
    defaultHeight: 3.5,
    defaultWallStyle: 'stone',
    hasWindow: true,
    preferredRoofType: 'pitched',
    interiorColor: 0xcd853f,
    labels: ['Kitchen', 'Hearth Room', 'Pantry', 'Cookery'],
  },
  storage: {
    defaultWidth: 4,
    defaultDepth: 4,
    defaultHeight: 3,
    defaultWallStyle: 'stone',
    hasWindow: false,
    preferredRoofType: 'flat',
    interiorColor: 0x696969,
    labels: ['Storage', 'Cellar', 'Supply Room', 'Vault'],
  },
  workshop: {
    defaultWidth: 6,
    defaultDepth: 5,
    defaultHeight: 4,
    defaultWallStyle: 'wood',
    hasWindow: true,
    preferredRoofType: 'pitched',
    interiorColor: 0xa0522d,
    labels: ['Workshop', 'Forge', 'Crafting Hall', 'Artificer\'s Den'],
  },
  tower: {
    defaultWidth: 4,
    defaultDepth: 4,
    defaultHeight: 7,
    defaultWallStyle: 'stone',
    hasWindow: true,
    preferredRoofType: 'conical',
    interiorColor: 0x4a4a4a,
    labels: ['Tower', 'Spire', 'Observatory', 'Watchtower'],
  },
  entrance: {
    defaultWidth: 4,
    defaultDepth: 4,
    defaultHeight: 3.5,
    defaultWallStyle: 'stone',
    hasWindow: false,
    preferredRoofType: 'peaked',
    interiorColor: 0x808080,
    labels: ['Entrance', 'Foyer', 'Vestibule', 'Gateway'],
  },
  garden: {
    defaultWidth: 5,
    defaultDepth: 5,
    defaultHeight: 1.5,
    defaultWallStyle: 'stone',
    hasWindow: false,
    preferredRoofType: 'none',
    interiorColor: 0x228b22,
    labels: ['Garden', 'Herb Patch', 'Greenhouse', 'Grove'],
  },
};

// Wall style colors
export const WALL_STYLE_COLORS: Record<WallStyle, {
  primary: number;
  trim: number;
  interior: number;
}> = {
  stone: {
    primary: 0x808080,
    trim: 0x606060,
    interior: 0xa0a0a0,
  },
  wood: {
    primary: 0x8b4513,
    trim: 0x654321,
    interior: 0xdeb887,
  },
  plaster: {
    primary: 0xf5f5dc,
    trim: 0x8b4513,
    interior: 0xfaf0e6,
  },
  brick: {
    primary: 0xb22222,
    trim: 0x8b0000,
    interior: 0xcd5c5c,
  },
};

// Roof colors
export const ROOF_COLORS = {
  thatch: 0x8b7355,
  slate: 0x708090,
  shingle: 0x654321,
  copper: 0xb87333,
};
