// Types for mage staff force grab interaction system
import * as THREE from 'three';

export type TargetType = 'minion' | 'building' | 'ground' | 'none';

export interface Target {
  type: TargetType;
  id: string | null;          // Entity ID if applicable
  position: THREE.Vector3;    // World position of hit
  normal: THREE.Vector3;      // Surface normal
  distance: number;           // Distance from camera
  mesh?: THREE.Object3D;      // Reference to the mesh
  entity?: {                  // Entity-specific data
    name?: string;
    state?: string;
    buildingType?: string;
    personality?: string;
  };
}

export type InteractionMode =
  | 'idle'           // No interaction
  | 'aiming'         // Holding but not locked yet
  | 'menu'           // Circle menu open
  | 'grabbing'       // Force pulling an entity
  | 'drawing';       // Drawing on ground

export interface InteractionState {
  mode: InteractionMode;
  target: Target | null;
  holdStartTime: number | null;
  selectedMenuOption: string | null;
  grabbedEntityId: string | null;
}

export interface MenuOption {
  id: string;
  label: string;
  icon: string;        // Emoji or icon class
  description: string;
  disabled?: boolean;
}

// Menu configurations by target type
export const MINION_MENU_OPTIONS: MenuOption[] = [
  { id: 'chat', label: 'Chat', icon: '💬', description: 'Start conversation' },
  { id: 'quest', label: 'Send on Quest', icon: '📜', description: 'Assign a task' },
  { id: 'grab', label: 'Force Pull', icon: '🤚', description: 'Grab and carry' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];

export const BUILDING_MENU_OPTIONS: MenuOption[] = [
  { id: 'status', label: 'Status', icon: '📊', description: 'View building status' },
  { id: 'workers', label: 'Workers', icon: '👷', description: 'List assigned minions' },
  { id: 'aesthetic', label: 'Aesthetic', icon: '🎨', description: 'Change appearance' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];

export const GROUND_MENU_OPTIONS: MenuOption[] = [
  { id: 'build', label: 'New Building', icon: '🏗️', description: 'Draw foundation' },
  { id: 'cancel', label: 'Cancel', icon: '✕', description: 'Close menu' },
];

export interface DrawnFoundation {
  cells: THREE.Vector2[];     // Grid cells that make up the foundation
  bounds: {
    min: THREE.Vector2;
    max: THREE.Vector2;
  };
  center: THREE.Vector3;      // World center position
  area: number;
  isComplete: boolean;        // True if path closed into a shape
}

export interface SpringConfig {
  stiffness: number;      // Spring constant (higher = snappier)
  damping: number;        // Damping ratio (0-1, higher = less oscillation)
  mass: number;           // Virtual mass of grabbed object
  maxVelocity: number;    // Clamp to prevent explosion
}

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  stiffness: 150,
  damping: 0.7,
  mass: 1,
  maxVelocity: 20,
};

export interface GridConfig {
  cellSize: number;       // Size of each grid cell (1 = 1 unit)
  minSize: number;        // Minimum foundation size (e.g., 3x3)
  maxSize: number;        // Maximum foundation size (e.g., 10x10)
  snapThreshold: number;  // Distance to snap to grid line
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  cellSize: 1,
  minSize: 3,
  maxSize: 10,
  snapThreshold: 0.5,
};

export type StaffState = 'idle' | 'aiming' | 'charging' | 'grabbing' | 'drawing';
