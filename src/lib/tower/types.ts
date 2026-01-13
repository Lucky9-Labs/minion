import * as THREE from 'three';

/**
 * Tower configuration
 */
export interface TowerConfig {
  /** Seed for procedural generation */
  seed: number;
  /** Number of floors */
  floors: number;
  /** Height of each floor in world units */
  floorHeight: number;
  /** Tower footprint */
  footprint: { width: number; depth: number };
  /** Base Y position (on top of island) */
  baseY: number;
}

/**
 * Default tower configuration
 */
export const DEFAULT_TOWER_CONFIG: TowerConfig = {
  seed: 12345,
  floors: 4,
  floorHeight: 2.5,
  footprint: { width: 4.5, depth: 4.5 },
  baseY: 0.75,
};

/**
 * Stair position options
 */
export type StairPosition = 'north' | 'south' | 'east' | 'west';

/**
 * Window configuration
 */
export interface WindowConfig {
  wall: 'front' | 'back' | 'left' | 'right';
  offsetX: number;  // Normalized 0-1 along wall
  offsetY: number;  // Normalized 0-1 along floor height
  width: number;
  height: number;
}

/**
 * Floor layout configuration
 */
export interface FloorLayout {
  floorIndex: number;
  stairPosition: StairPosition;
  windows: WindowConfig[];
  hasBalcony: boolean;
  hasDoor: boolean;  // Only ground floor
}

/**
 * Generated tower data
 */
export interface TowerData {
  config: TowerConfig;
  floors: FloorLayout[];
}

/**
 * Tower mesh references for animation/transparency
 */
export interface TowerMeshRefs {
  root: THREE.Group;
  floors: THREE.Group[];
  stairs: THREE.Group[];
  frontWall: THREE.Mesh;
  rightWall: THREE.Mesh;
  backWall: THREE.Mesh;
  leftWall: THREE.Mesh;
  roof: THREE.Mesh;
  spire: THREE.Mesh;
  /** Materials that need transparency control */
  transparentMaterials: THREE.MeshStandardMaterial[];
}

/**
 * Color scheme for tower
 */
export interface TowerColors {
  base: number;
  walls: number;
  wallsLight: number;
  floor: number;
  stairs: number;
  roof: number;
  spire: number;
  window: number;
  windowFrame: number;
}

/**
 * Default tower colors (purple wizard tower theme)
 */
export const DEFAULT_TOWER_COLORS: TowerColors = {
  base: 0x4a4a4a,
  walls: 0x6d28d9,
  wallsLight: 0x7c3aed,
  floor: 0x5c4a3d,
  stairs: 0x5c4a3d,
  roof: 0x1e3a5f,
  spire: 0xfbbf24,
  window: 0x1a1a2e,
  windowFrame: 0x8b7355,
};
