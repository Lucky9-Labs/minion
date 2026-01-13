import * as THREE from 'three';
import type { ChaudProject } from '@/types/project';

export interface ProjectBuildingMesh {
  group: THREE.Group;
  projectId: string;
  dispose: () => void;
}

// Cottage dimensions - matching the cozy original
const BASE_WIDTH = 6;
const BASE_DEPTH = 5;
const WALL_HEIGHT = 3;
const ROOF_HEIGHT = 2.5;

// Cozy cottage colors - warm and inviting
const COLORS = {
  walls: 0xd4a574,     // Warm wood/plaster
  roof: 0x8b4513,      // Dark brown thatch
  floor: 0x8b7355,     // Wood floor
  door: 0x654321,      // Dark wood door
  windowFrame: 0x4a3728,
  chimney: 0x8b7355,
  trim: 0x5d4037,
  glass: 0x87ceeb,
  scaffold: 0xc4a35a,  // Light wood scaffolding
};

export function createProjectBuilding(
  project: ChaudProject,
  position: THREE.Vector3
): ProjectBuildingMesh {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = project.building.rotation || 0;
  group.userData.projectId = project.id;
  group.userData.isProjectBuilding = true;

  const { stage, level } = project.building;

  // Calculate floors based on level (merge count) - 1 to 3 floors
  const floors = Math.min(Math.max(1, Math.ceil(level / 3)), 3);
  const totalWallHeight = WALL_HEIGHT * floors;

  const isUnderConstruction = stage === 'scaffolding' || stage === 'foundation';
  const isPlanning = stage === 'planning';

  // Materials
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.walls,
    flatShading: true,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: COLORS.roof,
    flatShading: true,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    flatShading: true,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: COLORS.door,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: COLORS.trim,
    flatShading: true,
  });
  const chimneyMat = new THREE.MeshStandardMaterial({
    color: COLORS.chimney,
    flatShading: true,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: COLORS.windowFrame,
    flatShading: true,
  });

  const halfW = BASE_WIDTH / 2;
  const halfD = BASE_DEPTH / 2;
  const wallThickness = 0.3;

  // Planning stage: just stakes marking the area
  if (isPlanning) {
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
    const stakeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1);
    const corners = [
      [-halfW - 0.3, -halfD - 0.3],
      [halfW + 0.3, -halfD - 0.3],
      [-halfW - 0.3, halfD + 0.3],
      [halfW + 0.3, halfD + 0.3],
    ];
    corners.forEach(([x, z]) => {
      const stake = new THREE.Mesh(stakeGeo, stakeMat);
      stake.position.set(x, 0.5, z);
      stake.castShadow = true;
      group.add(stake);
    });

    addSelectionRing(group);
    return createBuildingMesh(group, project.id);
  }

  // === FLOOR ===
  const floorGeo = new THREE.BoxGeometry(BASE_WIDTH, 0.2, BASE_DEPTH);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  group.add(floor);

  // === WALLS ===

  // North wall (back) - solid
  const northGeo = new THREE.BoxGeometry(BASE_WIDTH, totalWallHeight, wallThickness);
  const northWall = new THREE.Mesh(northGeo, wallMat);
  northWall.position.set(0, totalWallHeight / 2 + 0.2, -halfD + wallThickness / 2);
  northWall.castShadow = true;
  northWall.receiveShadow = true;
  group.add(northWall);

  // South wall (front) - with door opening
  const doorWidth = 1.2;
  const doorHeight = 2.2;

  // Left of door
  const southLeftGeo = new THREE.BoxGeometry((BASE_WIDTH - doorWidth) / 2, totalWallHeight, wallThickness);
  const southLeft = new THREE.Mesh(southLeftGeo, wallMat);
  southLeft.position.set(-doorWidth / 2 - (BASE_WIDTH - doorWidth) / 4, totalWallHeight / 2 + 0.2, halfD - wallThickness / 2);
  southLeft.castShadow = true;
  group.add(southLeft);

  // Right of door
  const southRight = new THREE.Mesh(southLeftGeo, wallMat.clone());
  southRight.position.set(doorWidth / 2 + (BASE_WIDTH - doorWidth) / 4, totalWallHeight / 2 + 0.2, halfD - wallThickness / 2);
  southRight.castShadow = true;
  group.add(southRight);

  // Above door
  const aboveDoorGeo = new THREE.BoxGeometry(doorWidth, totalWallHeight - doorHeight, wallThickness);
  const aboveDoor = new THREE.Mesh(aboveDoorGeo, wallMat.clone());
  aboveDoor.position.set(0, doorHeight + (totalWallHeight - doorHeight) / 2 + 0.2, halfD - wallThickness / 2);
  aboveDoor.castShadow = true;
  group.add(aboveDoor);

  // Door frame
  const doorFrameGeo = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.1, wallThickness + 0.1);
  const doorFrame = new THREE.Mesh(doorFrameGeo, doorMat);
  doorFrame.position.set(0, doorHeight / 2 + 0.25, halfD - wallThickness / 2 + 0.05);
  group.add(doorFrame);

  // Actual door
  const doorGeo = new THREE.BoxGeometry(doorWidth - 0.1, doorHeight - 0.1, 0.1);
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, doorHeight / 2 + 0.2, halfD - wallThickness / 2 - 0.1);
  door.castShadow = true;
  group.add(door);

  // East and West walls with windows
  buildWallWithWindows(group, halfW - wallThickness / 2, 0.2, 0, BASE_DEPTH, totalWallHeight, wallThickness, wallMat, windowFrameMat, floors, -Math.PI / 2);
  buildWallWithWindows(group, -halfW + wallThickness / 2, 0.2, 0, BASE_DEPTH, totalWallHeight, wallThickness, wallMat, windowFrameMat, floors, Math.PI / 2);

  // === ROOF (pitched, like original cottage) ===
  // Roof dimensions with overhang
  const roofWidth = BASE_WIDTH + 1;   // Along X-axis (ridge direction)
  const roofDepth = BASE_DEPTH + 0.8; // Along Z-axis (gable width)

  // Create roof using two angled planes (simpler and more reliable)
  // Ridge runs along X-axis, slopes descend toward front (+Z) and back (-Z)
  const roofSlope = Math.atan2(ROOF_HEIGHT, roofDepth / 2);
  const roofSlopeLength = Math.sqrt(ROOF_HEIGHT * ROOF_HEIGHT + (roofDepth / 2) * (roofDepth / 2));

  // Front slope (descending toward +Z, door side)
  const slopeGeo = new THREE.PlaneGeometry(roofWidth, roofSlopeLength);

  const frontSlope = new THREE.Mesh(slopeGeo, roofMat);
  // PlaneGeometry starts vertical facing +Z. Rotate to horizontal (-90°), then tilt forward
  frontSlope.rotation.x = -Math.PI / 2 + roofSlope;
  frontSlope.position.set(0, totalWallHeight + 0.2 + ROOF_HEIGHT / 2, roofDepth / 4);
  frontSlope.castShadow = true;
  group.add(frontSlope);

  // Back slope (descending toward -Z)
  const backSlope = new THREE.Mesh(slopeGeo.clone(), roofMat);
  // Rotate to horizontal, tilt backward, flip to face the other way
  backSlope.rotation.x = Math.PI / 2 - roofSlope;
  backSlope.position.set(0, totalWallHeight + 0.2 + ROOF_HEIGHT / 2, -roofDepth / 4);
  backSlope.castShadow = true;
  group.add(backSlope);

  // Gable ends (triangular walls at left and right ends of ridge)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-roofDepth / 2, 0);
  gableShape.lineTo(0, ROOF_HEIGHT);
  gableShape.lineTo(roofDepth / 2, 0);
  gableShape.closePath();

  const gableGeo = new THREE.ShapeGeometry(gableShape);

  // Left gable (at -X end of ridge)
  const leftGable = new THREE.Mesh(gableGeo, wallMat);
  leftGable.rotation.y = Math.PI / 2; // Rotate to face left
  leftGable.position.set(-halfW, totalWallHeight + 0.2, 0);
  group.add(leftGable);

  // Right gable (at +X end of ridge)
  const rightGable = new THREE.Mesh(gableGeo.clone(), wallMat);
  rightGable.rotation.y = -Math.PI / 2; // Rotate to face right
  rightGable.position.set(halfW, totalWallHeight + 0.2, 0);
  group.add(rightGable);

  // Roof trim (fascia boards) - along the eaves (front and back)
  const trimGeo = new THREE.BoxGeometry(roofWidth + 0.2, 0.15, 0.2);
  const frontTrim = new THREE.Mesh(trimGeo, trimMat);
  frontTrim.position.set(0, totalWallHeight + 0.35, halfD + 0.4);
  group.add(frontTrim);

  const backTrim = new THREE.Mesh(trimGeo, trimMat);
  backTrim.position.set(0, totalWallHeight + 0.35, -halfD - 0.4);
  group.add(backTrim);

  // Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
  const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
  chimney.position.set(halfW - 1.2, totalWallHeight + ROOF_HEIGHT - 0.3, -halfD + 1);
  chimney.castShadow = true;
  group.add(chimney);

  // === SCAFFOLDING (if under construction) ===
  if (isUnderConstruction) {
    addScaffolding(group, BASE_WIDTH, BASE_DEPTH, totalWallHeight);
  }

  // === DECORATED EXTRAS ===
  if (stage === 'decorated') {
    // Warm window glow
    const windowLight = new THREE.PointLight(0xffaa44, 0.5, 8);
    windowLight.position.set(0, WALL_HEIGHT * 0.5 + 0.2, 0);
    group.add(windowLight);
  }

  addSelectionRing(group);
  return createBuildingMesh(group, project.id);
}

function buildWallWithWindows(
  group: THREE.Group,
  x: number,
  baseY: number,
  z: number,
  wallLen: number,
  wallHeight: number,
  wallThickness: number,
  wallMat: THREE.MeshStandardMaterial,
  windowFrameMat: THREE.MeshStandardMaterial,
  floors: number,
  rotation: number
): void {
  const windowWidth = 1;
  const windowHeight = 1.2;
  const windowY = 1.5;
  const floorHeight = 3; // WALL_HEIGHT

  const wallGroup = new THREE.Group();

  for (let floor = 0; floor < floors; floor++) {
    const floorOffset = floor * floorHeight;

    // Below window
    const belowGeo = new THREE.BoxGeometry(wallLen, windowY - 0.2, wallThickness);
    const below = new THREE.Mesh(belowGeo, wallMat.clone());
    below.position.set(0, (windowY - 0.2) / 2 + floorOffset, 0);
    below.castShadow = true;
    wallGroup.add(below);

    // Above window
    const aboveHeight = floorHeight - windowY - windowHeight;
    const aboveGeo = new THREE.BoxGeometry(wallLen, aboveHeight, wallThickness);
    const above = new THREE.Mesh(aboveGeo, wallMat.clone());
    above.position.set(0, windowY + windowHeight + aboveHeight / 2 + floorOffset, 0);
    above.castShadow = true;
    wallGroup.add(above);

    // Left of window
    const sideWidth = (wallLen - windowWidth) / 2;
    const leftGeo = new THREE.BoxGeometry(sideWidth, windowHeight, wallThickness);
    const left = new THREE.Mesh(leftGeo, wallMat.clone());
    left.position.set(-windowWidth / 2 - sideWidth / 2, windowY + windowHeight / 2 + floorOffset, 0);
    left.castShadow = true;
    wallGroup.add(left);

    // Right of window
    const right = new THREE.Mesh(leftGeo, wallMat.clone());
    right.position.set(windowWidth / 2 + sideWidth / 2, windowY + windowHeight / 2 + floorOffset, 0);
    right.castShadow = true;
    wallGroup.add(right);

    // Window frame
    const frameGeo = new THREE.BoxGeometry(windowWidth + 0.2, windowHeight + 0.2, wallThickness + 0.05);
    const frame = new THREE.Mesh(frameGeo, windowFrameMat);
    frame.position.set(0, windowY + windowHeight / 2 + floorOffset, 0);
    wallGroup.add(frame);

    // Window glass
    const glassMat = new THREE.MeshStandardMaterial({
      color: COLORS.glass,
      transparent: true,
      opacity: 0.3,
    });
    const glassGeo = new THREE.BoxGeometry(windowWidth - 0.1, windowHeight - 0.1, 0.05);
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, windowY + windowHeight / 2 + floorOffset, 0);
    wallGroup.add(glass);

    // Window cross
    const vCrossGeo = new THREE.BoxGeometry(0.08, windowHeight - 0.1, 0.08);
    const vCross = new THREE.Mesh(vCrossGeo, windowFrameMat);
    vCross.position.set(0, windowY + windowHeight / 2 + floorOffset, 0.05);
    wallGroup.add(vCross);

    const hCrossGeo = new THREE.BoxGeometry(windowWidth - 0.1, 0.08, 0.08);
    const hCross = new THREE.Mesh(hCrossGeo, windowFrameMat);
    hCross.position.set(0, windowY + windowHeight / 2 + floorOffset, 0.05);
    wallGroup.add(hCross);
  }

  wallGroup.position.set(x, baseY, z);
  wallGroup.rotation.y = rotation;
  group.add(wallGroup);
}

function addScaffolding(
  group: THREE.Group,
  width: number,
  depth: number,
  wallHeight: number
): void {
  const scaffoldMat = new THREE.MeshStandardMaterial({
    color: COLORS.scaffold,
    flatShading: true,
  });

  const halfW = width / 2;
  const halfD = depth / 2;

  // Vertical poles
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, wallHeight + 2, 6);
  const polePositions = [
    [-halfW - 0.8, -halfD - 0.8],
    [halfW + 0.8, -halfD - 0.8],
    [-halfW - 0.8, halfD + 0.8],
    [halfW + 0.8, halfD + 0.8],
  ];

  polePositions.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, scaffoldMat);
    pole.position.set(px, (wallHeight + 2) / 2 + 0.2, pz);
    pole.castShadow = true;
    group.add(pole);
  });

  // Horizontal planks at intervals
  const plankGeoX = new THREE.BoxGeometry(width + 2, 0.1, 0.3);
  const plankGeoZ = new THREE.BoxGeometry(0.3, 0.1, depth + 2);

  const levels = Math.ceil(wallHeight / 2.5);
  for (let i = 1; i <= levels; i++) {
    const y = i * 2.5 + 0.2;

    [-halfD - 0.8, halfD + 0.8].forEach((pz) => {
      const plank = new THREE.Mesh(plankGeoX, scaffoldMat);
      plank.position.set(0, y, pz);
      plank.castShadow = true;
      group.add(plank);
    });

    [-halfW - 0.8, halfW + 0.8].forEach((px) => {
      const plank = new THREE.Mesh(plankGeoZ, scaffoldMat);
      plank.position.set(px, y, 0);
      plank.castShadow = true;
      group.add(plank);
    });
  }
}

function addSelectionRing(group: THREE.Group): void {
  const ringGeo = new THREE.RingGeometry(BASE_WIDTH * 0.6, BASE_WIDTH * 0.7, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4ade80,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.1;
  ring.userData.isSelectionRing = true;
  group.add(ring);
}

function createBuildingMesh(group: THREE.Group, projectId: string): ProjectBuildingMesh {
  return {
    group,
    projectId,
    dispose: () => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    },
  };
}

// Update selection state
export function setProjectBuildingSelected(
  building: ProjectBuildingMesh,
  selected: boolean
): void {
  building.group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.userData.isSelectionRing) {
      (child.material as THREE.MeshBasicMaterial).opacity = selected ? 0.5 : 0;
    }
  });
}

// Position buildings in a grid layout
export function calculateBuildingPosition(
  index: number,
  totalBuildings: number,
  spacing: number = 14
): THREE.Vector3 {
  if (index === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  const gridSize = Math.ceil(Math.sqrt(totalBuildings));
  const gridIndex = index - 1;
  const col = gridIndex % gridSize;
  const row = Math.floor(gridIndex / gridSize);

  const offsetX = (col - (gridSize - 1) / 2) * spacing;
  const offsetZ = (row + 1) * spacing;

  return new THREE.Vector3(offsetX, 0, offsetZ);
}
