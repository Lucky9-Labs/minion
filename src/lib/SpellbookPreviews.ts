import * as THREE from 'three';

/**
 * Creates simplified preview meshes for the spellbook entity selection.
 * These are low-poly iconic representations that spin above the open book.
 */

const PREVIEW_SCALE = 0.06; // Base scale for all previews

// Shared emissive material factory
function createGlowMaterial(color: number, emissiveColor?: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissiveColor ?? color,
    emissiveIntensity: 0.4,
    roughness: 0.6,
    metalness: 0.2,
  });
}

// ============================================
// MINION PREVIEWS
// ============================================

/**
 * Goblin: Green body with pointed ears
 */
export function createGoblinPreview(): THREE.Group {
  const group = new THREE.Group();
  const material = createGlowMaterial(0x4a7c3f, 0x2d5a28);

  // Body (oval)
  const bodyGeometry = new THREE.SphereGeometry(1, 8, 6);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.scale.set(0.8, 1, 0.7);
  group.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.5, 8, 6);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.y = 1.1;
  group.add(head);

  // Ears (cones)
  const earGeometry = new THREE.ConeGeometry(0.15, 0.4, 4);
  const earMaterial = createGlowMaterial(0x5a8c4f, 0x3d6a32);

  const leftEar = new THREE.Mesh(earGeometry, earMaterial);
  leftEar.position.set(-0.35, 1.4, 0);
  leftEar.rotation.z = 0.5;
  group.add(leftEar);

  const rightEar = new THREE.Mesh(earGeometry, earMaterial);
  rightEar.position.set(0.35, 1.4, 0);
  rightEar.rotation.z = -0.5;
  group.add(rightEar);

  // Eyes (small bright spheres)
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.8,
  });
  const eyeGeometry = new THREE.SphereGeometry(0.08, 6, 6);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 1.15, 0.4);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.15, 1.15, 0.4);
  group.add(rightEye);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Penguin: Black and white oval with flippers
 */
export function createPenguinPreview(): THREE.Group {
  const group = new THREE.Group();

  const blackMaterial = createGlowMaterial(0x1a1a2e, 0x0d0d17);
  const whiteMaterial = createGlowMaterial(0xf0f0f0, 0xcccccc);
  const orangeMaterial = createGlowMaterial(0xff8c00, 0xcc6600);

  // Body (black oval)
  const bodyGeometry = new THREE.SphereGeometry(1, 8, 8);
  const body = new THREE.Mesh(bodyGeometry, blackMaterial);
  body.scale.set(0.7, 1, 0.6);
  group.add(body);

  // Belly (white front)
  const bellyGeometry = new THREE.SphereGeometry(0.65, 8, 6);
  const belly = new THREE.Mesh(bellyGeometry, whiteMaterial);
  belly.scale.set(0.6, 0.85, 0.4);
  belly.position.z = 0.25;
  group.add(belly);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.45, 8, 6);
  const head = new THREE.Mesh(headGeometry, blackMaterial);
  head.position.y = 1.0;
  group.add(head);

  // Beak
  const beakGeometry = new THREE.ConeGeometry(0.12, 0.25, 4);
  const beak = new THREE.Mesh(beakGeometry, orangeMaterial);
  beak.position.set(0, 0.95, 0.45);
  beak.rotation.x = Math.PI / 2;
  group.add(beak);

  // Flippers
  const flipperGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.08);

  const leftFlipper = new THREE.Mesh(flipperGeometry, blackMaterial);
  leftFlipper.position.set(-0.65, 0.2, 0);
  leftFlipper.rotation.z = 0.3;
  group.add(leftFlipper);

  const rightFlipper = new THREE.Mesh(flipperGeometry, blackMaterial);
  rightFlipper.position.set(0.65, 0.2, 0);
  rightFlipper.rotation.z = -0.3;
  group.add(rightFlipper);

  // Eyes
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.5,
  });
  const eyeGeometry = new THREE.SphereGeometry(0.08, 6, 6);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 1.05, 0.35);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.15, 1.05, 0.35);
  group.add(rightEye);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Mushroom: Cap and stem
 */
export function createMushroomPreview(): THREE.Group {
  const group = new THREE.Group();

  const capMaterial = createGlowMaterial(0xcc3333, 0x991a1a);
  const stemMaterial = createGlowMaterial(0xf5f0e0, 0xd4cfc0);
  const spotMaterial = createGlowMaterial(0xffffff, 0xeeeeee);

  // Stem
  const stemGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
  const stem = new THREE.Mesh(stemGeometry, stemMaterial);
  stem.position.y = 0.4;
  group.add(stem);

  // Cap
  const capGeometry = new THREE.SphereGeometry(0.7, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  cap.position.y = 0.8;
  group.add(cap);

  // Spots on cap
  const spotGeometry = new THREE.CircleGeometry(0.12, 6);
  const spots = [
    { x: 0, y: 1.4, z: 0.3, rx: -0.5 },
    { x: 0.35, y: 1.2, z: 0.2, rx: -0.3, ry: 0.5 },
    { x: -0.3, y: 1.25, z: 0.15, rx: -0.4, ry: -0.4 },
    { x: 0.15, y: 1.1, z: -0.4, rx: 0.3, ry: 0.2 },
  ];

  for (const spot of spots) {
    const spotMesh = new THREE.Mesh(spotGeometry, spotMaterial);
    spotMesh.position.set(spot.x, spot.y, spot.z);
    spotMesh.rotation.x = spot.rx || 0;
    spotMesh.rotation.y = spot.ry || 0;
    group.add(spotMesh);
  }

  // Eyes on stem
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0x111111,
    emissiveIntensity: 0.2,
  });
  const eyeGeometry = new THREE.SphereGeometry(0.06, 6, 6);

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 0.55, 0.3);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 0.55, 0.3);
  group.add(rightEye);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

// ============================================
// BUILDING PREVIEWS
// ============================================

/**
 * Cottage: Simple house with pitched roof
 */
export function createCottagePreview(): THREE.Group {
  const group = new THREE.Group();

  const wallMaterial = createGlowMaterial(0xd4a574, 0xb38b5d);
  const roofMaterial = createGlowMaterial(0x8b4513, 0x5c2d0e);
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffffcc,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.8,
  });

  // Base/walls
  const wallGeometry = new THREE.BoxGeometry(1.2, 0.8, 1);
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.position.y = 0.4;
  group.add(walls);

  // Roof (triangular prism using extrusion)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.7, 0);
  roofShape.lineTo(0, 0.5);
  roofShape.lineTo(0.7, 0);
  roofShape.lineTo(-0.7, 0);

  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.1,
    bevelEnabled: false,
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, 0.8, -0.55);
  group.add(roof);

  // Window
  const windowGeometry = new THREE.PlaneGeometry(0.2, 0.25);
  const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  window1.position.set(0.3, 0.5, 0.51);
  group.add(window1);

  // Door
  const doorMaterial = createGlowMaterial(0x5c3d2e, 0x3d281e);
  const doorGeometry = new THREE.PlaneGeometry(0.25, 0.4);
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(-0.25, 0.25, 0.51);
  group.add(door);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Workshop: Building with chimney
 */
export function createWorkshopPreview(): THREE.Group {
  const group = new THREE.Group();

  const wallMaterial = createGlowMaterial(0xa0522d, 0x7a3d21);
  const roofMaterial = createGlowMaterial(0x4a4a4a, 0x2d2d2d);
  const chimneyMaterial = createGlowMaterial(0x8b0000, 0x5c0000);

  // Base/walls
  const wallGeometry = new THREE.BoxGeometry(1.4, 0.7, 1.1);
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.position.y = 0.35;
  group.add(walls);

  // Flat-ish roof with slight angle
  const roofGeometry = new THREE.BoxGeometry(1.5, 0.1, 1.2);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 0.75;
  roof.rotation.z = 0.1;
  group.add(roof);

  // Chimney
  const chimneyGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.2);
  const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
  chimney.position.set(0.4, 1.0, 0.3);
  group.add(chimney);

  // Smoke puff
  const smokeMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.5,
  });
  const smokeGeometry = new THREE.SphereGeometry(0.12, 6, 6);
  const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
  smoke.position.set(0.4, 1.35, 0.3);
  group.add(smoke);

  // Large door (workshop entrance)
  const doorMaterial = createGlowMaterial(0x4a3728, 0x2d221a);
  const doorGeometry = new THREE.PlaneGeometry(0.4, 0.5);
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, 0.3, 0.56);
  group.add(door);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Laboratory: Tall building with flask/tower shape
 */
export function createLaboratoryPreview(): THREE.Group {
  const group = new THREE.Group();

  const stoneMaterial = createGlowMaterial(0x696969, 0x4a4a4a);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    emissive: 0x4488cc,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
  });

  // Base
  const baseGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.4, 8);
  const base = new THREE.Mesh(baseGeometry, stoneMaterial);
  base.position.y = 0.2;
  group.add(base);

  // Main tower
  const towerGeometry = new THREE.CylinderGeometry(0.35, 0.5, 1.0, 8);
  const tower = new THREE.Mesh(towerGeometry, stoneMaterial);
  tower.position.y = 0.9;
  group.add(tower);

  // Glass dome top
  const domeGeometry = new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeometry, glassMaterial);
  dome.position.y = 1.4;
  group.add(dome);

  // Glowing orb inside dome
  const orbMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 1.0,
  });
  const orbGeometry = new THREE.SphereGeometry(0.15, 8, 8);
  const orb = new THREE.Mesh(orbGeometry, orbMaterial);
  orb.position.y = 1.5;
  group.add(orb);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Market: Open stall with awning
 */
export function createMarketPreview(): THREE.Group {
  const group = new THREE.Group();

  const woodMaterial = createGlowMaterial(0x8b7355, 0x5c4d3a);
  const awningMaterial = createGlowMaterial(0xcc4444, 0x992d2d);
  const crateMaterial = createGlowMaterial(0xdeb887, 0xb8956d);

  // Counter/base
  const counterGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.6);
  const counter = new THREE.Mesh(counterGeometry, woodMaterial);
  counter.position.y = 0.2;
  group.add(counter);

  // Support posts
  const postGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);

  const post1 = new THREE.Mesh(postGeometry, woodMaterial);
  post1.position.set(-0.6, 0.9, 0.25);
  group.add(post1);

  const post2 = new THREE.Mesh(postGeometry, woodMaterial);
  post2.position.set(0.6, 0.9, 0.25);
  group.add(post2);

  // Awning
  const awningShape = new THREE.Shape();
  awningShape.moveTo(-0.8, 0);
  awningShape.lineTo(-0.8, 0.5);
  awningShape.lineTo(0.8, 0.5);
  awningShape.lineTo(0.8, 0);
  awningShape.quadraticCurveTo(0, -0.15, -0.8, 0);

  const awningGeometry = new THREE.ExtrudeGeometry(awningShape, {
    depth: 0.6,
    bevelEnabled: false,
  });
  const awning = new THREE.Mesh(awningGeometry, awningMaterial);
  awning.position.set(0, 1.3, -0.05);
  awning.rotation.x = -0.2;
  group.add(awning);

  // Crates on counter
  const crateGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.15);
  const crate1 = new THREE.Mesh(crateGeometry, crateMaterial);
  crate1.position.set(-0.3, 0.48, 0);
  group.add(crate1);

  const crate2 = new THREE.Mesh(crateGeometry, crateMaterial);
  crate2.position.set(0.2, 0.48, 0.1);
  group.add(crate2);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

/**
 * Manor: Large multi-story building
 */
export function createManorPreview(): THREE.Group {
  const group = new THREE.Group();

  const wallMaterial = createGlowMaterial(0xe8dcc8, 0xc4b8a4);
  const roofMaterial = createGlowMaterial(0x2f4f4f, 0x1e3232);
  const trimMaterial = createGlowMaterial(0xffd700, 0xb8981a);

  // Main building
  const mainGeometry = new THREE.BoxGeometry(1.2, 0.9, 0.9);
  const main = new THREE.Mesh(mainGeometry, wallMaterial);
  main.position.y = 0.45;
  group.add(main);

  // Wing left
  const wingGeometry = new THREE.BoxGeometry(0.5, 0.7, 0.7);
  const wingLeft = new THREE.Mesh(wingGeometry, wallMaterial);
  wingLeft.position.set(-0.7, 0.35, 0);
  group.add(wingLeft);

  // Wing right
  const wingRight = new THREE.Mesh(wingGeometry, wallMaterial);
  wingRight.position.set(0.7, 0.35, 0);
  group.add(wingRight);

  // Main roof
  const mainRoofShape = new THREE.Shape();
  mainRoofShape.moveTo(-0.7, 0);
  mainRoofShape.lineTo(0, 0.4);
  mainRoofShape.lineTo(0.7, 0);
  mainRoofShape.lineTo(-0.7, 0);

  const mainRoofGeometry = new THREE.ExtrudeGeometry(mainRoofShape, {
    depth: 1,
    bevelEnabled: false,
  });
  const mainRoof = new THREE.Mesh(mainRoofGeometry, roofMaterial);
  mainRoof.position.set(0, 0.9, -0.5);
  group.add(mainRoof);

  // Tower/spire
  const towerGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 6);
  const tower = new THREE.Mesh(towerGeometry, roofMaterial);
  tower.position.set(0, 1.45, 0);
  group.add(tower);

  // Gold trim details
  const trimGeometry = new THREE.BoxGeometry(1.3, 0.03, 0.03);
  const trim = new THREE.Mesh(trimGeometry, trimMaterial);
  trim.position.set(0, 0.9, 0.46);
  group.add(trim);

  group.scale.setScalar(PREVIEW_SCALE);
  return group;
}

// ============================================
// FACTORY FUNCTION
// ============================================

export type PreviewType =
  | 'goblin'
  | 'penguin'
  | 'mushroom'
  | 'cottage'
  | 'workshop'
  | 'laboratory'
  | 'market'
  | 'manor';

const previewFactories: Record<PreviewType, () => THREE.Group> = {
  goblin: createGoblinPreview,
  penguin: createPenguinPreview,
  mushroom: createMushroomPreview,
  cottage: createCottagePreview,
  workshop: createWorkshopPreview,
  laboratory: createLaboratoryPreview,
  market: createMarketPreview,
  manor: createManorPreview,
};

/**
 * Create a preview mesh for the given entity type
 */
export function createPreviewMesh(type: PreviewType): THREE.Group {
  const factory = previewFactories[type];
  if (!factory) {
    throw new Error(`Unknown preview type: ${type}`);
  }
  return factory();
}

/**
 * Get all available preview types
 */
export function getPreviewTypes(): PreviewType[] {
  return Object.keys(previewFactories) as PreviewType[];
}
