import * as THREE from 'three';

/**
 * Helper to create invisible collision meshes for buildings
 * This reduces code duplication across building components
 */

const COLLISION_MATERIAL = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });

export interface BuildingWallDimensions {
  frontWidth: number;
  sideWidth: number;
  wallHeight: number;
  wallThickness?: number;
  frontZ: number;
  backZ: number;
  leftX: number;
  rightX: number;
  centerY: number;
}

export interface DoorOpening {
  width: number;
  height: number;
  centerY: number;
}

/**
 * Create collision meshes for a simple rectangular building
 * Handles door openings in the front wall
 */
export function createBuildingCollisionMeshes(
  group: THREE.Group,
  dimensions: BuildingWallDimensions,
  doorOpening?: DoorOpening
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const thickness = dimensions.wallThickness ?? 0.15;

  // Front wall - potentially split for door
  if (doorOpening) {
    // Left section of front wall
    const leftWidth = (dimensions.frontWidth - doorOpening.width) / 2;
    const frontLeftGeo = new THREE.BoxGeometry(leftWidth, dimensions.wallHeight, thickness);
    const frontLeft = new THREE.Mesh(frontLeftGeo, COLLISION_MATERIAL);
    frontLeft.position.set(
      -(doorOpening.width / 2 + leftWidth / 2),
      dimensions.centerY + dimensions.wallHeight / 2,
      dimensions.frontZ
    );
    frontLeft.userData.isCollisionMesh = true;
    group.add(frontLeft);
    meshes.push(frontLeft);

    // Right section of front wall
    const frontRight = new THREE.Mesh(frontLeftGeo, COLLISION_MATERIAL);
    frontRight.position.set(
      doorOpening.width / 2 + leftWidth / 2,
      dimensions.centerY + dimensions.wallHeight / 2,
      dimensions.frontZ
    );
    frontRight.userData.isCollisionMesh = true;
    group.add(frontRight);
    meshes.push(frontRight);

    // Above door section
    const aboveHeight = dimensions.wallHeight - doorOpening.height;
    const aboveDoorGeo = new THREE.BoxGeometry(doorOpening.width, aboveHeight, thickness);
    const aboveDoor = new THREE.Mesh(aboveDoorGeo, COLLISION_MATERIAL);
    aboveDoor.position.set(
      0,
      dimensions.centerY + doorOpening.height + aboveHeight / 2,
      dimensions.frontZ
    );
    aboveDoor.userData.isCollisionMesh = true;
    group.add(aboveDoor);
    meshes.push(aboveDoor);
  } else {
    // No door - solid front wall
    const frontWallGeo = new THREE.BoxGeometry(dimensions.frontWidth, dimensions.wallHeight, thickness);
    const frontWall = new THREE.Mesh(frontWallGeo, COLLISION_MATERIAL);
    frontWall.position.set(0, dimensions.centerY + dimensions.wallHeight / 2, dimensions.frontZ);
    frontWall.userData.isCollisionMesh = true;
    group.add(frontWall);
    meshes.push(frontWall);
  }

  // Back wall - solid
  const backWallGeo = new THREE.BoxGeometry(dimensions.frontWidth, dimensions.wallHeight, thickness);
  const backWall = new THREE.Mesh(backWallGeo, COLLISION_MATERIAL);
  backWall.position.set(0, dimensions.centerY + dimensions.wallHeight / 2, dimensions.backZ);
  backWall.userData.isCollisionMesh = true;
  group.add(backWall);
  meshes.push(backWall);

  // Left wall - solid
  const leftWallGeo = new THREE.BoxGeometry(thickness, dimensions.wallHeight, dimensions.sideWidth);
  const leftWall = new THREE.Mesh(leftWallGeo, COLLISION_MATERIAL);
  leftWall.position.set(dimensions.leftX, dimensions.centerY + dimensions.wallHeight / 2, 0);
  leftWall.userData.isCollisionMesh = true;
  group.add(leftWall);
  meshes.push(leftWall);

  // Right wall - solid
  const rightWall = new THREE.Mesh(leftWallGeo, COLLISION_MATERIAL);
  rightWall.position.set(dimensions.rightX, dimensions.centerY + dimensions.wallHeight / 2, 0);
  rightWall.userData.isCollisionMesh = true;
  group.add(rightWall);
  meshes.push(rightWall);

  return meshes;
}

/**
 * Create collision mesh for a roof
 */
export function createRoofCollisionMesh(
  group: THREE.Group,
  width: number,
  depth: number,
  y: number
): THREE.Mesh {
  const roofGeo = new THREE.BoxGeometry(width, 0.3, depth);
  const roof = new THREE.Mesh(roofGeo, COLLISION_MATERIAL);
  roof.position.set(0, y, 0);
  roof.userData.isCollisionMesh = true;
  group.add(roof);
  return roof;
}

/**
 * Create collision meshes for scaffolding
 */
export function createScaffoldingCollisionMeshes(
  group: THREE.Group,
  positions: Array<[number, number]>,
  centerY: number,
  totalHeight: number
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];

  // Vertical poles
  for (const [x, z] of positions) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, totalHeight + 1, 8);
    const pole = new THREE.Mesh(poleGeo, COLLISION_MATERIAL);
    pole.position.set(x, centerY + (totalHeight + 1) / 2, z);
    pole.userData.isCollisionMesh = true;
    group.add(pole);
    meshes.push(pole);
  }

  return meshes;
}

/**
 * Dispose of collision meshes
 */
export function disposeCollisionMeshes(meshes: THREE.Mesh[], group: THREE.Group): void {
  meshes.forEach((mesh) => {
    group.remove(mesh);
    mesh.geometry.dispose();
    // Don't dispose material - it's shared
  });
}
