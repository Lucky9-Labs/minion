/**
 * Room types for the tower
 */

export type RoomType = 'bedroom' | 'workshop' | 'study' | 'storage' | 'throne';

export interface Room {
  id: string;
  floorIndex: number;
  ownerId: string | null;  // Minion ID or null if unassigned
  roomType: RoomType;
  customizations?: RoomCustomization;
}

export interface RoomCustomization {
  carpetColor?: number;
  wallAccentColor?: number;
  hasTorch?: boolean;
  hasBanner?: boolean;
}

export interface RoomFurniture {
  type: 'bed' | 'desk' | 'shelf' | 'chest' | 'throne' | 'cauldron';
  position: { x: number; y: number; z: number };
  rotation: number;
}

// Floor interaction data for click detection
export interface FloorInteraction {
  floorIndex: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}
