/**
 * Modular Building System
 * Procedurally generates wizarding-themed buildings with adaptive roofs and walls
 */

export * from './types';
export { LayoutGenerator } from './LayoutGenerator';
export { RoomMeshBuilder } from './RoomMeshBuilder';
export type { BuildingRefs, RoomMeshRefs, InteriorLight } from './RoomMeshBuilder';
export { InteriorDecorBuilder, InteriorDecorSystem, interiorDecorSystem, ROOM_PRESETS } from './InteriorDecorSystem';
export type { DecorType, RoomType, DecorItem, RoomPreset } from './InteriorDecorSystem';
export { ExteriorDetailBuilder, addExteriorDetails, exteriorDetailBuilder } from './ExteriorDetails';
export type { ExteriorDetailType } from './ExteriorDetails';
