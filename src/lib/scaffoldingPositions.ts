/**
 * Scaffolding Position Utilities
 * Calculates where minions should be positioned on building scaffolding
 */

export interface ScaffoldPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate the position for a minion on a scaffolding floor
 *
 * @param floor - Zero-based floor index (0 = first PR/lowest floor)
 * @param baseHeight - Base Y position of the scaffolding
 * @param floorHeight - Height of each floor level (typically 2)
 * @param buildingWidth - Width of the building
 * @param buildingDepth - Depth of the building
 * @param offset - Scaffolding offset from building edge (default 0.3)
 * @returns Position {x, y, z} for the minion
 */
export function calculateScaffoldPosition(
  floor: number,
  baseHeight: number,
  floorHeight: number,
  buildingWidth: number,
  buildingDepth: number,
  offset: number = 0.3
): ScaffoldPosition {
  // Y position: standing on the platform of the floor
  // baseHeight + (floor + 1) * floorHeight positions at the platform level
  const y = baseHeight + (floor + 1) * floorHeight + 0.1;

  // Z position: front of building (negative because front is toward camera)
  const z = -(buildingDepth / 2 + offset + 0.5);

  // X position: center (will be spread in the component)
  const x = 0;

  return { x, y, z };
}

/**
 * Calculate spread position for multiple minions on the same floor
 * Distributes minions across the front platform width
 *
 * @param floor - Zero-based floor index
 * @param minionIndexOnFloor - Which minion this is on this floor (0-based)
 * @param totalMinionsOnFloor - Total number of minions on this floor
 * @param baseHeight - Base Y position
 * @param floorHeight - Height of each floor
 * @param buildingWidth - Width of the building
 * @param buildingDepth - Depth of the building
 * @param offset - Scaffolding offset
 * @returns Position with X spread
 */
export function calculateSpreadScaffoldPosition(
  floor: number,
  minionIndexOnFloor: number,
  totalMinionsOnFloor: number,
  baseHeight: number,
  floorHeight: number,
  buildingWidth: number,
  buildingDepth: number,
  offset: number = 0.3
): ScaffoldPosition {
  const basePos = calculateScaffoldPosition(
    floor,
    baseHeight,
    floorHeight,
    buildingWidth,
    buildingDepth,
    offset
  );

  // Spread minions across the front platform
  const platformWidth = buildingWidth + offset * 2;
  const spacing = platformWidth / (totalMinionsOnFloor + 1);
  const xOffset = -platformWidth / 2 + spacing * (minionIndexOnFloor + 1);

  return {
    ...basePos,
    x: xOffset,
  };
}

/**
 * Get the Y position of a scaffolding floor's platform
 */
export function getFloorPlatformHeight(
  floor: number,
  baseHeight: number,
  floorHeight: number
): number {
  return baseHeight + (floor + 1) * floorHeight + 0.1;
}

/**
 * Get the Z position of the front platform
 */
export function getFrontPlatformZ(buildingDepth: number, offset: number = 0.3): number {
  return -(buildingDepth / 2 + offset + 0.5);
}

/**
 * Calculate the walking range (X axis bounds) for a minion on scaffolding
 */
export function getWalkingRange(
  buildingWidth: number,
  offset: number = 0.3
): { min: number; max: number } {
  const halfWidth = buildingWidth / 2 + offset;
  return {
    min: -halfWidth,
    max: halfWidth,
  };
}
