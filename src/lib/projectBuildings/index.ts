import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChaudProject } from '@/types/project';

export interface ProjectBuildingMesh {
  group: THREE.Group;
  projectId: string;
  stoneDetailGroup: THREE.Group | null; // Separate group for LOD control
  dispose: () => void;
  setDetailLevel: (highDetail: boolean) => void;
}

// Cottage dimensions - matching the cozy original
const BASE_WIDTH = 6;
const BASE_DEPTH = 5;
const WALL_HEIGHT = 3;
const ROOF_HEIGHT = 2.5;

// Medieval stone colors - gray stone with wood accents
const COLORS = {
  walls: 0x6b7280,     // Gray stone
  wallsLight: 0x9ca3af, // Light gray stone
  wallsDark: 0x4b5563,  // Dark gray stone
  mortar: 0x52525b,     // Mortar between stones
  roof: 0x8b4513,       // Wood plank roof
  roofDark: 0x6b4423,   // Dark wood
  floor: 0x374151,      // Dark stone floor
  door: 0x4a3728,       // Dark stained wood door
  windowFrame: 0x374151, // Dark stone window frame
  chimney: 0x4b5563,    // Gray stone chimney
  trim: 0x6b4423,       // Wood trim
  glass: 0x87ceeb,
  scaffold: 0x8b4513,   // Wood scaffolding
};

// Stone color variations for 3D blocks
const STONE_VARIATIONS = [
  0x6b7280, // base gray
  0x7c8591, // lighter gray
  0x5c636e, // darker gray
  0x757d87, // blue-gray
  0x636b75, // medium gray
];

// Seeded random for consistent procedural generation
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Shared stone material for merged geometry (with vertex colors)
let sharedStoneMaterial: THREE.MeshStandardMaterial | null = null;
function getStoneMaterial(): THREE.MeshStandardMaterial {
  if (!sharedStoneMaterial) {
    sharedStoneMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
    });
  }
  return sharedStoneMaterial;
}

// Add 3D stone blocks to a wall surface (OPTIMIZED - merged geometry)
// faceDirection: 1 for +Z (front), -1 for -Z (back)
function addStoneBlocksToWall(
  group: THREE.Group,
  width: number,
  height: number,
  wallCenterX: number,
  wallBaseY: number,
  wallZ: number,
  faceDirection: number,
  seed: number
): void {
  const random = seededRandom(seed);
  const geometries: THREE.BufferGeometry[] = [];
  const blockHeight = 0.5;
  const rows = Math.floor(height / blockHeight);

  for (let row = 0; row < rows; row++) {
    const y = wallBaseY + row * blockHeight + blockHeight / 2;
    let x = wallCenterX - width / 2;
    if (row % 2 === 1) x += 0.25;

    while (x < wallCenterX + width / 2 - 0.3) {
      const blockWidth = 0.6 + random() * 0.5;
      const blockDepth = 0.15 + random() * 0.15;
      const actualBlockHeight = blockHeight - 0.06;
      const finalWidth = Math.min(blockWidth, wallCenterX + width / 2 - x - 0.03);
      if (finalWidth < 0.2) break;

      const blockGeo = new THREE.BoxGeometry(finalWidth, actualBlockHeight, blockDepth);

      // Add vertex colors
      const color = new THREE.Color(STONE_VARIATIONS[Math.floor(random() * STONE_VARIATIONS.length)]);
      const colors = new Float32Array(blockGeo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      blockGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Position geometry
      blockGeo.translate(x + finalWidth / 2, y, wallZ + faceDirection * (blockDepth / 2));
      geometries.push(blockGeo);

      x += finalWidth + 0.04;
    }
  }

  if (geometries.length > 0) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, getStoneMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    geometries.forEach(g => g.dispose());
  }
}

// Add 3D stone blocks to east/west walls (OPTIMIZED - merged geometry)
function addStoneBlocksToSideWall(
  group: THREE.Group,
  depth: number,
  height: number,
  wallX: number,
  wallBaseY: number,
  faceDirection: number,
  seed: number
): void {
  const random = seededRandom(seed);
  const geometries: THREE.BufferGeometry[] = [];
  const blockHeight = 0.5;
  const rows = Math.floor(height / blockHeight);

  for (let row = 0; row < rows; row++) {
    const y = wallBaseY + row * blockHeight + blockHeight / 2;
    let z = -depth / 2;
    if (row % 2 === 1) z += 0.25;

    while (z < depth / 2 - 0.3) {
      const blockWidth = 0.6 + random() * 0.5;
      const blockDepth = 0.15 + random() * 0.15;
      const actualBlockHeight = blockHeight - 0.06;
      const finalWidth = Math.min(blockWidth, depth / 2 - z - 0.03);
      if (finalWidth < 0.2) break;

      const blockGeo = new THREE.BoxGeometry(blockDepth, actualBlockHeight, finalWidth);

      // Add vertex colors
      const color = new THREE.Color(STONE_VARIATIONS[Math.floor(random() * STONE_VARIATIONS.length)]);
      const colors = new Float32Array(blockGeo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      blockGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      blockGeo.translate(wallX + faceDirection * (blockDepth / 2), y, z + finalWidth / 2);
      geometries.push(blockGeo);

      z += finalWidth + 0.04;
    }
  }

  if (geometries.length > 0) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, getStoneMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    geometries.forEach(g => g.dispose());
  }
}

// Add stone blocks to a wall segment (OPTIMIZED - merged geometry)
function addStoneBlocksToSegment(
  group: THREE.Group,
  width: number,
  height: number,
  centerX: number,
  baseY: number,
  wallZ: number,
  faceDirection: number,
  seed: number
): void {
  if (height < 0.4 || width < 0.3) return;

  const random = seededRandom(seed);
  const geometries: THREE.BufferGeometry[] = [];
  const blockHeight = 0.5;
  const rows = Math.floor(height / blockHeight);

  for (let row = 0; row < rows; row++) {
    const y = baseY + row * blockHeight + blockHeight / 2;
    let x = centerX - width / 2;
    if (row % 2 === 1) x += 0.2;

    while (x < centerX + width / 2 - 0.25) {
      const blockWidth = 0.5 + random() * 0.4;
      const blockDepth = 0.15 + random() * 0.15;
      const actualBlockHeight = blockHeight - 0.06;
      const finalWidth = Math.min(blockWidth, centerX + width / 2 - x - 0.03);
      if (finalWidth < 0.15) break;

      const blockGeo = new THREE.BoxGeometry(finalWidth, actualBlockHeight, blockDepth);

      // Add vertex colors
      const color = new THREE.Color(STONE_VARIATIONS[Math.floor(random() * STONE_VARIATIONS.length)]);
      const colors = new Float32Array(blockGeo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      blockGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      blockGeo.translate(x + finalWidth / 2, y, wallZ + faceDirection * (blockDepth / 2));
      geometries.push(blockGeo);

      x += finalWidth + 0.04;
    }
  }

  if (geometries.length > 0) {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, getStoneMaterial());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    geometries.forEach(g => g.dispose());
  }
}

export function createProjectBuilding(
  project: ChaudProject,
  position: THREE.Vector3
): ProjectBuildingMesh {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = project.building.rotation || 0;
  group.userData.projectId = project.id;
  group.userData.isProjectBuilding = true;

  // Separate group for stone detail (LOD control - hidden in isometric)
  const stoneDetailGroup = new THREE.Group();
  stoneDetailGroup.visible = false; // Start hidden, enable in first-person
  group.add(stoneDetailGroup);

  const { stage, level } = project.building;

  // Calculate floors based on level (merge count) - 1 to 3 floors
  const floors = Math.min(Math.max(1, Math.ceil(level / 3)), 3);
  const totalWallHeight = WALL_HEIGHT * floors;

  const isUnderConstruction = stage === 'scaffolding' || stage === 'foundation';
  const isPlanning = stage === 'planning';

  // Materials - stone has high roughness, wood moderate
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.walls,
    roughness: 0.9,
    metalness: 0.05,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: COLORS.roof,
    roughness: 0.8,
    metalness: 0.02,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    roughness: 0.95,
  });
  const doorMat = new THREE.MeshStandardMaterial({
    color: COLORS.door,
    roughness: 0.75,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: COLORS.trim,
    roughness: 0.8,
  });
  const chimneyMat = new THREE.MeshStandardMaterial({
    color: COLORS.chimney,
    roughness: 0.95,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: COLORS.windowFrame,
    roughness: 0.9,
  });

  const halfW = BASE_WIDTH / 2;
  const halfD = BASE_DEPTH / 2;
  const wallThickness = 0.3;

  // Planning stage: just stakes marking the area
  if (isPlanning) {
    const stakeMat = new THREE.MeshStandardMaterial({ color: COLORS.scaffold, roughness: 0.85 });
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
    return createBuildingMesh(group, project.id, null); // No stone detail in planning stage
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

  // Add 3D stone blocks to north wall (exterior face, facing -Z)
  // Stone blocks go in separate group for LOD (hidden in isometric view)
  if (!isPlanning) {
    addStoneBlocksToWall(
      stoneDetailGroup,
      BASE_WIDTH,
      totalWallHeight,
      0,           // wallCenterX
      0.2,         // wallBaseY
      -halfD,      // wallZ (exterior face)
      -1,          // faceDirection: -Z (outward)
      project.id.charCodeAt(0) * 100 + 1
    );
  }

  // South wall (front) - with door opening
  const doorWidth = 1.2;
  const doorHeight = 2.2;

  // Left of door
  const southLeftWidth = (BASE_WIDTH - doorWidth) / 2;
  const southLeftGeo = new THREE.BoxGeometry(southLeftWidth, totalWallHeight, wallThickness);
  const southLeft = new THREE.Mesh(southLeftGeo, wallMat);
  const southLeftX = -doorWidth / 2 - southLeftWidth / 2;
  southLeft.position.set(southLeftX, totalWallHeight / 2 + 0.2, halfD - wallThickness / 2);
  southLeft.castShadow = true;
  group.add(southLeft);

  // Right of door
  const southRight = new THREE.Mesh(southLeftGeo, wallMat.clone());
  const southRightX = doorWidth / 2 + southLeftWidth / 2;
  southRight.position.set(southRightX, totalWallHeight / 2 + 0.2, halfD - wallThickness / 2);
  southRight.castShadow = true;
  group.add(southRight);

  // Above door
  const aboveDoorHeight = totalWallHeight - doorHeight;
  const aboveDoorGeo = new THREE.BoxGeometry(doorWidth, aboveDoorHeight, wallThickness);
  const aboveDoor = new THREE.Mesh(aboveDoorGeo, wallMat.clone());
  aboveDoor.position.set(0, doorHeight + aboveDoorHeight / 2 + 0.2, halfD - wallThickness / 2);
  aboveDoor.castShadow = true;
  group.add(aboveDoor);

  // Add 3D stone blocks to south wall segments (exterior face, facing +Z)
  if (!isPlanning) {
    const southZ = halfD; // exterior face
    const seedBase = project.id.charCodeAt(0) * 100;

    // Left segment
    addStoneBlocksToSegment(
      stoneDetailGroup,
      southLeftWidth,
      totalWallHeight,
      southLeftX,
      0.2,           // baseY
      southZ,
      1,             // faceDirection: +Z (outward)
      seedBase + 2
    );

    // Right segment
    addStoneBlocksToSegment(
      stoneDetailGroup,
      southLeftWidth,
      totalWallHeight,
      southRightX,
      0.2,           // baseY
      southZ,
      1,             // faceDirection: +Z (outward)
      seedBase + 3
    );

    // Above door segment
    if (aboveDoorHeight > 0.4) {
      addStoneBlocksToSegment(
        stoneDetailGroup,
        doorWidth,
        aboveDoorHeight,
        0,
        doorHeight + 0.2, // baseY starts at door top
        southZ,
        1,             // faceDirection: +Z (outward)
        seedBase + 4
      );
    }
  }

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
  const eastWestSeed = project.id.charCodeAt(0) * 100;
  buildWallWithWindows(group, halfW - wallThickness / 2, 0.2, 0, BASE_DEPTH, totalWallHeight, wallThickness, wallMat, windowFrameMat, floors, -Math.PI / 2, false, eastWestSeed + 10);
  buildWallWithWindows(group, -halfW + wallThickness / 2, 0.2, 0, BASE_DEPTH, totalWallHeight, wallThickness, wallMat, windowFrameMat, floors, Math.PI / 2, false, eastWestSeed + 20);

  // Add 3D stone blocks to east wall (exterior face, facing +X)
  if (!isPlanning) {
    addStoneBlocksToSideWall(
      stoneDetailGroup,
      BASE_DEPTH,
      totalWallHeight,
      halfW,       // wallX (exterior face)
      0.2,         // wallBaseY
      1,           // faceDirection: +X (outward)
      eastWestSeed + 30
    );
  }

  // Add 3D stone blocks to west wall (exterior face, facing -X)
  if (!isPlanning) {
    addStoneBlocksToSideWall(
      stoneDetailGroup,
      BASE_DEPTH,
      totalWallHeight,
      -halfW,      // wallX (exterior face)
      0.2,         // wallBaseY
      -1,          // faceDirection: -X (outward)
      eastWestSeed + 40
    );
  }

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

  // === SCAFFOLDING (only if there are open PRs) ===
  // Workers are rendered as actual minions with buildingAssignment, not here
  const openPRCount = project.openPRs?.length || 0;
  if (stage === 'scaffolding' && openPRCount > 0) {
    addScaffolding(group, BASE_WIDTH, BASE_DEPTH, totalWallHeight, openPRCount);
  }

  // === DECORATED EXTRAS ===
  if (stage === 'decorated') {
    // Warm window glow
    const windowLight = new THREE.PointLight(0xffaa44, 0.5, 8);
    windowLight.position.set(0, WALL_HEIGHT * 0.5 + 0.2, 0);
    group.add(windowLight);
  }

  addSelectionRing(group);
  return createBuildingMesh(group, project.id, stoneDetailGroup);
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
  rotation: number,
  addStoneTexture: boolean = false,
  seed: number = 0
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

    // Add stone blocks to wall segments if enabled
    if (addStoneTexture) {
      const segmentZ = wallThickness / 2 + 0.01;
      const floorSeed = seed + floor * 10;
      const sideWidth = (wallLen - windowWidth) / 2;

      // Below window stones
      addStoneBlocksToWallGroup(
        wallGroup,
        wallLen,
        windowY - 0.2,
        0,
        (windowY - 0.2) / 2 + floorOffset,
        segmentZ,
        floorSeed + 1
      );

      // Above window stones
      const aboveHeight = floorHeight - windowY - windowHeight;
      addStoneBlocksToWallGroup(
        wallGroup,
        wallLen,
        aboveHeight,
        0,
        windowY + windowHeight + aboveHeight / 2 + floorOffset,
        segmentZ,
        floorSeed + 2
      );

      // Left of window stones
      addStoneBlocksToWallGroup(
        wallGroup,
        sideWidth,
        windowHeight,
        -windowWidth / 2 - sideWidth / 2,
        windowY + windowHeight / 2 + floorOffset,
        segmentZ,
        floorSeed + 3
      );

      // Right of window stones
      addStoneBlocksToWallGroup(
        wallGroup,
        sideWidth,
        windowHeight,
        windowWidth / 2 + sideWidth / 2,
        windowY + windowHeight / 2 + floorOffset,
        segmentZ,
        floorSeed + 4
      );
    }
  }

  wallGroup.position.set(x, baseY, z);
  wallGroup.rotation.y = rotation;
  group.add(wallGroup);
}

// Helper to add stone blocks directly to a wall group (for east/west walls)
function addStoneBlocksToWallGroup(
  wallGroup: THREE.Group,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  seed: number
): void {
  if (height < 0.4 || width < 0.4) return;

  const random = seededRandom(seed);
  const blockHeight = 0.5;
  const rows = Math.floor(height / blockHeight);

  for (let row = 0; row < rows; row++) {
    const y = -height / 2 + row * blockHeight + blockHeight / 2;
    let x = -width / 2;

    // Offset every other row for brick pattern
    if (row % 2 === 1) {
      x += 0.2;
    }

    while (x < width / 2 - 0.2) {
      const blockWidth = 0.5 + random() * 0.4;
      const blockDepth = 0.15 + random() * 0.15; // More pronounced: 0.15-0.3
      const actualBlockHeight = blockHeight - 0.06;

      const colorIndex = Math.floor(random() * STONE_VARIATIONS.length);
      const blockMat = new THREE.MeshStandardMaterial({
        color: STONE_VARIATIONS[colorIndex],
        roughness: 0.85 + random() * 0.1,
        metalness: 0.02,
      });

      const finalWidth = Math.min(blockWidth, width / 2 - x - 0.03);
      if (finalWidth < 0.15) break;

      const blockGeo = new THREE.BoxGeometry(finalWidth, actualBlockHeight, blockDepth);
      const block = new THREE.Mesh(blockGeo, blockMat);
      block.position.set(centerX + x + finalWidth / 2, centerY + y, centerZ + blockDepth / 2);
      block.castShadow = true;
      wallGroup.add(block);

      x += finalWidth + 0.04;
    }
  }
}

function addScaffolding(
  group: THREE.Group,
  width: number,
  depth: number,
  wallHeight: number,
  openPRCount: number = 1
): void {
  const scaffoldMat = new THREE.MeshStandardMaterial({
    color: COLORS.scaffold,
    roughness: 0.85,
  });

  const halfW = width / 2;
  const halfD = depth / 2;

  // Scaffolding now wraps around the building at multiple levels
  // Height covers the full building plus extra for workers
  const scaffoldHeight = Math.max(wallHeight, 6);

  // Vertical poles at corners - extend full height
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, scaffoldHeight + 1, 6);
  const polePositions = [
    [-halfW - 1.2, -halfD - 1.2],
    [halfW + 1.2, -halfD - 1.2],
    [-halfW - 1.2, halfD + 1.2],
    [halfW + 1.2, halfD + 1.2],
  ];

  polePositions.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(poleGeo, scaffoldMat);
    pole.position.set(px, scaffoldHeight / 2 + 0.5, pz);
    pole.castShadow = true;
    group.add(pole);
  });

  // Add intermediate poles for longer spans
  const midPoleGeo = new THREE.CylinderGeometry(0.06, 0.08, scaffoldHeight + 1, 6);
  const midPolePositions = [
    [0, -halfD - 1.2],
    [0, halfD + 1.2],
    [-halfW - 1.2, 0],
    [halfW + 1.2, 0],
  ];
  midPolePositions.forEach(([px, pz]) => {
    const pole = new THREE.Mesh(midPoleGeo, scaffoldMat);
    pole.position.set(px, scaffoldHeight / 2 + 0.5, pz);
    pole.castShadow = true;
    group.add(pole);
  });

  // Horizontal planks and platforms at multiple levels
  const plankGeoX = new THREE.BoxGeometry(width + 2.8, 0.1, 0.25);
  const plankGeoZ = new THREE.BoxGeometry(0.25, 0.1, depth + 2.8);

  // Platform planks for workers to stand on - wider platforms
  const platformGeoFront = new THREE.BoxGeometry(width + 2, 0.12, 1.2);
  const platformGeoSide = new THREE.BoxGeometry(1.2, 0.12, depth + 2);

  // Create scaffolding at fixed heights where workers will be placed
  const scaffoldLevels = [2.5, 5.0]; // Match worker Y positions

  scaffoldLevels.forEach((y) => {
    // Horizontal beams on all sides
    [-halfD - 1.2, halfD + 1.2].forEach((pz) => {
      const plank = new THREE.Mesh(plankGeoX, scaffoldMat);
      plank.position.set(0, y, pz);
      plank.castShadow = true;
      group.add(plank);
    });

    [-halfW - 1.2, halfW + 1.2].forEach((px) => {
      const plank = new THREE.Mesh(plankGeoZ, scaffoldMat);
      plank.position.set(px, y, 0);
      plank.castShadow = true;
      group.add(plank);
    });

    // Worker platforms on front and sides
    const platformFront = new THREE.Mesh(platformGeoFront, scaffoldMat);
    platformFront.position.set(0, y, halfD + 1.0);
    platformFront.receiveShadow = true;
    group.add(platformFront);

    const platformBack = new THREE.Mesh(platformGeoFront, scaffoldMat);
    platformBack.position.set(0, y, -halfD - 1.0);
    platformBack.receiveShadow = true;
    group.add(platformBack);

    const platformLeft = new THREE.Mesh(platformGeoSide, scaffoldMat);
    platformLeft.position.set(-halfW - 1.0, y, 0);
    platformLeft.receiveShadow = true;
    group.add(platformLeft);

    const platformRight = new THREE.Mesh(platformGeoSide, scaffoldMat);
    platformRight.position.set(halfW + 1.0, y, 0);
    platformRight.receiveShadow = true;
    group.add(platformRight);

    // Safety rails
    const railGeoX = new THREE.BoxGeometry(width + 2, 0.06, 0.06);
    const railGeoZ = new THREE.BoxGeometry(0.06, 0.06, depth + 2);

    const railFront = new THREE.Mesh(railGeoX, scaffoldMat);
    railFront.position.set(0, y + 0.8, halfD + 1.5);
    group.add(railFront);

    const railBack = new THREE.Mesh(railGeoX, scaffoldMat);
    railBack.position.set(0, y + 0.8, -halfD - 1.5);
    group.add(railBack);

    const railLeft = new THREE.Mesh(railGeoZ, scaffoldMat);
    railLeft.position.set(-halfW - 1.5, y + 0.8, 0);
    group.add(railLeft);

    const railRight = new THREE.Mesh(railGeoZ, scaffoldMat);
    railRight.position.set(halfW + 1.5, y + 0.8, 0);
    group.add(railRight);
  });

  // Add diagonal bracing for visual interest
  const braceLength = Math.sqrt(4 + scaffoldHeight * scaffoldHeight) * 0.4;
  const braceGeo = new THREE.CylinderGeometry(0.04, 0.04, braceLength, 4);
  const braceAngle = Math.atan2(scaffoldHeight * 0.4, 2);

  // Front diagonal braces
  const brace1 = new THREE.Mesh(braceGeo, scaffoldMat);
  brace1.position.set(-halfW * 0.5, scaffoldHeight * 0.4, halfD + 1.2);
  brace1.rotation.z = braceAngle;
  group.add(brace1);

  const brace2 = new THREE.Mesh(braceGeo, scaffoldMat);
  brace2.position.set(halfW * 0.5, scaffoldHeight * 0.4, halfD + 1.2);
  brace2.rotation.z = -braceAngle;
  group.add(brace2);

  // Add stairs connecting ground to platforms and between levels
  addScaffoldStairs(group, halfW, halfD, scaffoldMat);
}

// Add stairs to scaffolding for minion navigation
function addScaffoldStairs(
  group: THREE.Group,
  halfW: number,
  halfD: number,
  scaffoldMat: THREE.MeshStandardMaterial
): void {
  const STAIR_WIDTH = 0.8;
  const STEP_HEIGHT = 0.25;
  const STEP_DEPTH = 0.4;
  const STEPS_PER_LEVEL = 10; // 10 steps * 0.25 = 2.5 units per level

  // Stair levels: ground to L1 (2.5), L1 to L2 (5.0)
  const levels = [
    { baseY: 0, levelIndex: 0 },     // Ground to L1
    { baseY: 2.5, levelIndex: 1 },   // L1 to L2
  ];

  levels.forEach(({ baseY, levelIndex }) => {
    // Alternate left/right for visual variety and to not overlap
    const xOffset = levelIndex % 2 === 0 ? halfW - STAIR_WIDTH / 2 : -halfW + STAIR_WIDTH / 2;
    const stairBaseZ = halfD + 1.6; // Start just beyond front platform

    // Create steps
    for (let step = 0; step < STEPS_PER_LEVEL; step++) {
      const stepY = baseY + step * STEP_HEIGHT + STEP_HEIGHT / 2;
      const stepZ = stairBaseZ + step * STEP_DEPTH;

      // Step tread (the flat part you walk on)
      const treadGeo = new THREE.BoxGeometry(STAIR_WIDTH, 0.08, STEP_DEPTH + 0.05);
      const tread = new THREE.Mesh(treadGeo, scaffoldMat);
      tread.position.set(xOffset, stepY, stepZ);
      tread.receiveShadow = true;
      tread.castShadow = true;
      group.add(tread);
    }

    // Stair stringers (side supports)
    const stringerLength = Math.sqrt(
      (STEPS_PER_LEVEL * STEP_DEPTH) ** 2 +
      (STEPS_PER_LEVEL * STEP_HEIGHT) ** 2
    );
    const stringerAngle = Math.atan2(
      STEPS_PER_LEVEL * STEP_HEIGHT,
      STEPS_PER_LEVEL * STEP_DEPTH
    );

    const stringerGeo = new THREE.BoxGeometry(0.08, 0.15, stringerLength);
    [-1, 1].forEach((side) => {
      const stringer = new THREE.Mesh(stringerGeo, scaffoldMat);
      stringer.position.set(
        xOffset + side * (STAIR_WIDTH / 2 + 0.04),
        baseY + (STEPS_PER_LEVEL * STEP_HEIGHT) / 2,
        stairBaseZ + (STEPS_PER_LEVEL * STEP_DEPTH) / 2
      );
      stringer.rotation.x = -stringerAngle;
      stringer.castShadow = true;
      group.add(stringer);
    });

    // Handrails along the stairs
    const railLength = stringerLength + 0.4;
    const railGeo = new THREE.CylinderGeometry(0.03, 0.03, railLength, 6);
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(railGeo, scaffoldMat);
      rail.position.set(
        xOffset + side * (STAIR_WIDTH / 2 + 0.08),
        baseY + (STEPS_PER_LEVEL * STEP_HEIGHT) / 2 + 0.5,
        stairBaseZ + (STEPS_PER_LEVEL * STEP_DEPTH) / 2
      );
      rail.rotation.x = Math.PI / 2 - stringerAngle;
      group.add(rail);
    });

    // Vertical posts at bottom and top of handrail
    const postGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 6);
    [-1, 1].forEach((side) => {
      // Bottom post
      const bottomPost = new THREE.Mesh(postGeo, scaffoldMat);
      bottomPost.position.set(
        xOffset + side * (STAIR_WIDTH / 2 + 0.08),
        baseY + 0.4,
        stairBaseZ
      );
      group.add(bottomPost);

      // Top post
      const topPost = new THREE.Mesh(postGeo, scaffoldMat);
      topPost.position.set(
        xOffset + side * (STAIR_WIDTH / 2 + 0.08),
        baseY + STEPS_PER_LEVEL * STEP_HEIGHT + 0.4,
        stairBaseZ + STEPS_PER_LEVEL * STEP_DEPTH
      );
      group.add(topPost);
    });

    // Landing platform at top of stairs (connects to main scaffold platform)
    const landingGeo = new THREE.BoxGeometry(STAIR_WIDTH + 0.2, 0.1, 0.6);
    const landing = new THREE.Mesh(landingGeo, scaffoldMat);
    landing.position.set(
      xOffset,
      baseY + STEPS_PER_LEVEL * STEP_HEIGHT,
      stairBaseZ + STEPS_PER_LEVEL * STEP_DEPTH + 0.2
    );
    landing.receiveShadow = true;
    group.add(landing);
  });
}

// Add worker minions on scaffolding platforms - visible at building level
function addScaffoldWorkers(
  group: THREE.Group,
  width: number,
  depth: number,
  wallHeight: number,
  openPRCount: number
): void {
  const halfW = width / 2;
  const halfD = depth / 2;
  const workerScale = 1.5; // Large for visibility

  // Goblin worker colors - VERY bright and distinct
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x66BB6A, // Bright green skin
    flatShading: true,
    emissive: 0x4CAF50,
    emissiveIntensity: 0.4,
  });
  const overallsMat = new THREE.MeshStandardMaterial({
    color: 0x8D6E63, // Lighter brown overalls
    flatShading: true,
    emissive: 0x5D4037,
    emissiveIntensity: 0.2,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0xFFEB3B, // Bright yellow hard hat
    flatShading: true,
    emissive: 0xFFD600,
    emissiveIntensity: 0.7, // Very bright glow
  });

  // Place workers at GROUND LEVEL around the scaffolding exterior
  // This makes them highly visible from the isometric camera angle
  // Workers face inward toward the building (like they're working on it)
  const workerPositions = [
    // Front side workers (+Z) - MOST visible from isometric camera
    { x: -2.0, y: 0.0, z: halfD + 2.0, rot: Math.PI },    // Ground level, front left
    { x: 2.0, y: 0.0, z: halfD + 2.0, rot: Math.PI },     // Ground level, front right
    { x: 0, y: 0.0, z: halfD + 2.5, rot: Math.PI },       // Ground level, front center
    // Right side workers (+X) - also visible
    { x: halfW + 2.0, y: 0.0, z: 1.5, rot: -Math.PI / 2 },  // Ground level, right side
    { x: halfW + 2.0, y: 0.0, z: -1.0, rot: -Math.PI / 2 }, // Ground level, right side back
    // Left side workers (-X)
    { x: -halfW - 2.0, y: 0.0, z: 0, rot: Math.PI / 2 },    // Ground level, left side
    // Workers ON scaffolding platforms (upper levels)
    { x: 0, y: 2.5, z: halfD + 1.8, rot: Math.PI },        // On scaffold platform
  ];

  // Create workers based on PR count - each PR adds workers
  const totalWorkers = Math.min(openPRCount * 2, workerPositions.length);

  for (let i = 0; i < totalWorkers; i++) {
    const pos = workerPositions[i];

    const worker = new THREE.Group();
    worker.position.set(pos.x, pos.y, pos.z);
    worker.rotation.y = pos.rot;
    worker.scale.setScalar(workerScale);
    worker.userData.isScaffoldWorker = true;
    worker.userData.prIndex = Math.floor(i / 2);

    // Head - larger and brighter
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.0;
    head.castShadow = true;
    worker.add(head);

    // Pointy ears (goblin style)
    const earGeo = new THREE.ConeGeometry(0.1, 0.3, 4);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.3, 1.1, 0);
    leftEar.rotation.z = -0.6;
    worker.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.3, 1.1, 0);
    rightEar.rotation.z = 0.6;
    worker.add(rightEar);

    // Body (torso)
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.55, 6);
    const body = new THREE.Mesh(bodyGeo, overallsMat);
    body.position.y = 0.5;
    body.castShadow = true;
    worker.add(body);

    // Arms reaching out (working pose)
    const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5);
    const armMat = skinMat;

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.3, 0.6, 0.15);
    leftArm.rotation.x = -0.8; // Reaching forward
    leftArm.rotation.z = 0.3;
    worker.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.3, 0.6, 0.15);
    rightArm.rotation.x = -0.8;
    rightArm.rotation.z = -0.3;
    worker.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 5);
    const leftLeg = new THREE.Mesh(legGeo, overallsMat);
    leftLeg.position.set(-0.1, 0.12, 0);
    leftLeg.castShadow = true;
    worker.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, overallsMat);
    rightLeg.position.set(0.1, 0.12, 0);
    rightLeg.castShadow = true;
    worker.add(rightLeg);

    // Hard hat - bright yellow, very visible
    const hatGeo = new THREE.SphereGeometry(0.28, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.25;
    hat.castShadow = true;
    worker.add(hat);

    // Hat brim
    const brimGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.y = 1.15;
    worker.add(brim);

    // Add a tool (hammer) to make it look like they're working
    const hammerHandleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true });
    const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: true });

    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5);
    const handle = new THREE.Mesh(handleGeo, hammerHandleMat);
    handle.position.set(0.35, 0.7, 0.25);
    handle.rotation.x = -0.5;
    handle.rotation.z = -0.3;
    worker.add(handle);

    const hammerHeadGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
    const hammerHead = new THREE.Mesh(hammerHeadGeo, hammerHeadMat);
    hammerHead.position.set(0.42, 0.85, 0.35);
    worker.add(hammerHead);

    group.add(worker);
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

function createBuildingMesh(
  group: THREE.Group,
  projectId: string,
  stoneDetailGroup: THREE.Group | null
): ProjectBuildingMesh {
  return {
    group,
    projectId,
    stoneDetailGroup,
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
    setDetailLevel: (highDetail: boolean) => {
      if (stoneDetailGroup) {
        stoneDetailGroup.visible = highDetail;
      }
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

// Update detail level for all buildings (call when view mode changes)
export function updateBuildingsDetailLevel(
  buildings: Map<string, ProjectBuildingMesh>,
  highDetail: boolean
): void {
  buildings.forEach((building) => {
    building.setDetailLevel(highDetail);
  });
}
