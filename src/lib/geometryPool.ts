import * as THREE from 'three';

/**
 * Shared geometry and material pool for minions and other entities.
 * Geometries are created once and reused via scaling/transformations.
 *
 * Usage:
 *   import { SharedGeometry, SharedMaterial } from '@/lib/geometryPool';
 *
 *   <mesh geometry={SharedGeometry.sphere} scale={[0.22, 0.2, 0.21]}>
 *     <primitive object={SharedMaterial.goblinSkin} attach="material" />
 *   </mesh>
 */

// Base geometries - unit size, scaled at render time
export const SharedGeometry = {
  // Sphere with low poly count for stylized look
  sphere: new THREE.SphereGeometry(1, 6, 5),
  sphereMedium: new THREE.SphereGeometry(1, 8, 6),
  sphereHigh: new THREE.SphereGeometry(1, 12, 8),

  // Capsule for simplified LOD
  capsule: new THREE.CapsuleGeometry(1, 1, 4, 6),

  // Cylinders for limbs
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 6),
  cylinderTapered: new THREE.CylinderGeometry(0.8, 1, 1, 6),

  // Box for various uses
  box: new THREE.BoxGeometry(1, 1, 1),

  // Cone for ears, hats
  cone: new THREE.ConeGeometry(1, 1, 6),

  // Plane for billboards, shadows
  plane: new THREE.PlaneGeometry(1, 1),
  planeSubdivided: new THREE.PlaneGeometry(1, 1, 4, 4),

  // Circle for shadows, effects
  circle: new THREE.CircleGeometry(1, 8),
  circleHigh: new THREE.CircleGeometry(1, 16),

  // Ring for selection indicators
  ring: new THREE.RingGeometry(0.8, 1, 16),
  ringLow: new THREE.RingGeometry(0.8, 1, 8),

  // Torus for decorative elements
  torus: new THREE.TorusGeometry(1, 0.2, 6, 12),
};

// Goblin color palette
export const GOBLIN_COLORS = {
  skin: '#5a9c4e',
  skinDark: '#4a8340',
  skinLight: '#6eb85e',
  nose: '#4a8340',
  ears: '#4a8340',
  eyes: '#1a1a1a',
  eyeWhite: '#e8e8d0',
  pupil: '#1a1a1a',
  mouth: '#2d4a28',
  overallsMain: '#5c4a3d',
  overallsStrap: '#6b5a4d',
  overallsBuckle: '#c9a227',
  shirt: '#8b7355',
} as const;

// Shared materials - reused across all instances
export const SharedMaterial = {
  // Goblin materials
  goblinSkin: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.skin,
    roughness: 0.8,
    metalness: 0.1,
  }),
  goblinSkinDark: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.skinDark,
    roughness: 0.8,
    metalness: 0.1,
  }),
  goblinSkinLight: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.skinLight,
    roughness: 0.8,
    metalness: 0.1,
  }),
  goblinNose: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.nose,
    roughness: 0.7,
    metalness: 0.1,
  }),
  goblinEyes: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.eyeWhite,
    roughness: 0.3,
    metalness: 0,
  }),
  goblinPupil: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.pupil,
    roughness: 0.5,
    metalness: 0,
  }),
  goblinMouth: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.mouth,
    roughness: 0.9,
    metalness: 0,
  }),

  // Clothing materials
  overallsMain: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.overallsMain,
    roughness: 0.9,
    metalness: 0,
  }),
  overallsStrap: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.overallsStrap,
    roughness: 0.85,
    metalness: 0,
  }),
  overallsBuckle: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.overallsBuckle,
    roughness: 0.3,
    metalness: 0.8,
  }),
  shirt: new THREE.MeshStandardMaterial({
    color: GOBLIN_COLORS.shirt,
    roughness: 0.9,
    metalness: 0,
  }),

  // Utility materials
  shadow: new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  }),
  selectionRing: new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  }),
  hoverGlow: new THREE.MeshBasicMaterial({
    color: 0xffffcc,
    transparent: true,
    opacity: 0.4,
  }),

  // LOD billboard material (will be updated with sprite texture)
  billboard: new THREE.SpriteMaterial({
    color: 0xffffff,
  }),
};

// Pre-scaled geometries for common minion parts (avoids scale transforms)
export const MinionGeometry = {
  // Head: sphere scaled to 0.22, 0.2, 0.21
  head: (() => {
    const geo = SharedGeometry.sphere.clone();
    geo.scale(0.22, 0.2, 0.21);
    return geo;
  })(),

  // Body: sphere scaled for torso
  body: (() => {
    const geo = SharedGeometry.sphere.clone();
    geo.scale(0.18, 0.22, 0.16);
    return geo;
  })(),

  // Limbs
  arm: (() => {
    const geo = SharedGeometry.cylinder.clone();
    geo.scale(0.04, 0.15, 0.04);
    return geo;
  })(),

  leg: (() => {
    const geo = SharedGeometry.cylinder.clone();
    geo.scale(0.05, 0.12, 0.05);
    return geo;
  })(),

  // Ear
  ear: (() => {
    const geo = SharedGeometry.cone.clone();
    geo.scale(0.08, 0.15, 0.04);
    geo.rotateZ(Math.PI / 2);
    return geo;
  })(),

  // Nose
  nose: (() => {
    const geo = SharedGeometry.sphere.clone();
    geo.scale(0.08, 0.06, 0.08);
    return geo;
  })(),

  // Eye
  eye: (() => {
    const geo = SharedGeometry.sphere.clone();
    geo.scale(0.06, 0.05, 0.04);
    return geo;
  })(),

  // Pupil
  pupil: (() => {
    const geo = SharedGeometry.sphere.clone();
    geo.scale(0.025, 0.025, 0.025);
    return geo;
  })(),

  // Simplified LOD capsule
  lodCapsule: (() => {
    const geo = SharedGeometry.capsule.clone();
    geo.scale(0.15, 0.25, 0.15);
    return geo;
  })(),
};

// Cleanup function for when app unmounts
export function disposeSharedResources(): void {
  Object.values(SharedGeometry).forEach((geo) => geo.dispose());
  Object.values(SharedMaterial).forEach((mat) => mat.dispose());
  Object.values(MinionGeometry).forEach((geo) => geo.dispose());
}

/**
 * LOD levels for minions based on camera distance.
 */
export const LOD_CONFIG = {
  HIGH: {
    maxDistance: 10,
    useFullMesh: true,
    animateEars: true,
    animateEyes: true,
    shadowQuality: 'high',
  },
  MEDIUM: {
    maxDistance: 25,
    useFullMesh: true,
    animateEars: false,
    animateEyes: false,
    shadowQuality: 'low',
  },
  LOW: {
    maxDistance: 50,
    useFullMesh: false, // Use capsule
    animateEars: false,
    animateEyes: false,
    shadowQuality: 'none',
  },
  CULL: {
    maxDistance: Infinity,
    useFullMesh: false,
    animateEars: false,
    animateEyes: false,
    shadowQuality: 'none',
  },
} as const;

export type LODLevel = keyof typeof LOD_CONFIG;

/**
 * Determine LOD level based on distance to camera.
 */
export function getLODLevel(distance: number): LODLevel {
  if (distance < LOD_CONFIG.HIGH.maxDistance) return 'HIGH';
  if (distance < LOD_CONFIG.MEDIUM.maxDistance) return 'MEDIUM';
  if (distance < LOD_CONFIG.LOW.maxDistance) return 'LOW';
  return 'CULL';
}
