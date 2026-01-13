import * as THREE from 'three';
import type { SpeciesMaterials, AttachmentPoint, MinionRefs } from '@/types/minion';

/**
 * Scale factor for all minion geometry
 */
export const MINION_SCALE = 2.5;

/**
 * Create materials from color palette
 */
export function createMaterials(colors: {
  primary: number;
  secondary: number;
  tertiary: number;
  eyeWhite: number;
  pupil: number;
  mouth: number;
  clothing?: { main: number; accent: number; buckle: number };
}): SpeciesMaterials {
  const materials: SpeciesMaterials = {
    primary: new THREE.MeshStandardMaterial({
      color: colors.primary,
      roughness: 0.7,
      flatShading: true,
    }),
    secondary: new THREE.MeshStandardMaterial({
      color: colors.secondary,
      roughness: 0.7,
      flatShading: true,
    }),
    tertiary: new THREE.MeshStandardMaterial({
      color: colors.tertiary,
      roughness: 0.7,
      flatShading: true,
    }),
    eyeWhite: new THREE.MeshStandardMaterial({
      color: colors.eyeWhite,
      roughness: 0.3,
      flatShading: true,
    }),
    pupil: new THREE.MeshBasicMaterial({ color: colors.pupil }),
    mouth: new THREE.MeshBasicMaterial({
      color: colors.mouth,
      side: THREE.DoubleSide,
    }),
  };

  if (colors.clothing) {
    materials.clothing = {
      main: new THREE.MeshStandardMaterial({
        color: colors.clothing.main,
        roughness: 0.9,
        flatShading: true,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: colors.clothing.accent,
        roughness: 0.8,
        flatShading: true,
      }),
      buckle: new THREE.MeshStandardMaterial({
        color: colors.clothing.buckle,
        metalness: 0.6,
        roughness: 0.3,
        flatShading: true,
      }),
    };
  }

  return materials;
}

/**
 * Build eyes with eyelids and pupils
 * Returns the refs needed for animation
 */
export function buildEyes(
  materials: SpeciesMaterials,
  skinMaterial: THREE.MeshStandardMaterial,
  scale: number = MINION_SCALE,
  eyeSpacing: number = 0.08
): {
  leftEyeGroup: THREE.Group;
  rightEyeGroup: THREE.Group;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  leftPupil: THREE.Group;
  rightPupil: THREE.Group;
} {
  // Left Eye
  const leftEyeGroup = new THREE.Group();
  leftEyeGroup.position.set(eyeSpacing * scale, 0.06 * scale, 0.16 * scale);

  const eyeWhiteGeo = new THREE.SphereGeometry(0.055 * scale, 6, 5);
  const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, materials.eyeWhite);
  leftEyeGroup.add(leftEyeWhite);

  // Left pupil group
  const leftPupil = new THREE.Group();
  leftPupil.position.set(0, 0.02 * scale, 0.03 * scale);

  const pupilGeo = new THREE.SphereGeometry(0.03 * scale, 5, 4);
  const leftPupilMesh = new THREE.Mesh(pupilGeo, materials.pupil);
  leftPupil.add(leftPupilMesh);

  // Eye shine
  const shineGeo = new THREE.SphereGeometry(0.008 * scale, 4, 3);
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftShine = new THREE.Mesh(shineGeo, shineMat);
  leftShine.position.set(0.01 * scale, 0.01 * scale, 0.02 * scale);
  leftPupil.add(leftShine);

  leftEyeGroup.add(leftPupil);

  // Left eyelid
  const eyelidGeo = new THREE.SphereGeometry(
    0.055 * scale, 6, 3,
    0, Math.PI * 2,
    0, Math.PI / 2
  );
  const leftEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
  leftEyelid.position.set(0, 0.04 * scale, 0.04 * scale);
  leftEyelid.scale.set(1, 0.1, 1);
  leftEyeGroup.add(leftEyelid);

  // Right Eye (mirror of left)
  const rightEyeGroup = new THREE.Group();
  rightEyeGroup.position.set(-eyeSpacing * scale, 0.06 * scale, 0.16 * scale);

  const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, materials.eyeWhite);
  rightEyeGroup.add(rightEyeWhite);

  const rightPupil = new THREE.Group();
  rightPupil.position.set(0, 0.02 * scale, 0.03 * scale);
  const rightPupilMesh = new THREE.Mesh(pupilGeo, materials.pupil);
  rightPupil.add(rightPupilMesh);
  const rightShine = new THREE.Mesh(shineGeo, shineMat);
  rightShine.position.set(0.01 * scale, 0.01 * scale, 0.02 * scale);
  rightPupil.add(rightShine);
  rightEyeGroup.add(rightPupil);

  const rightEyelid = new THREE.Mesh(eyelidGeo, skinMaterial);
  rightEyelid.position.set(0, 0.04 * scale, 0.04 * scale);
  rightEyelid.scale.set(1, 0.1, 1);
  rightEyeGroup.add(rightEyelid);

  return {
    leftEyeGroup,
    rightEyeGroup,
    leftEyelid,
    rightEyelid,
    leftPupil,
    rightPupil,
  };
}

/**
 * Build mouth mesh
 */
export function buildMouth(
  materials: SpeciesMaterials,
  scale: number = MINION_SCALE
): THREE.Mesh {
  const mouthGeo = new THREE.PlaneGeometry(0.08 * scale, 0.03 * scale);
  const mouth = new THREE.Mesh(mouthGeo, materials.mouth);
  mouth.position.set(0, -0.06 * scale, 0.18 * scale);
  mouth.rotation.set(0, 0, 0.2); // Slight mischievous angle
  mouth.scale.set(0.8, 0.6, 1);
  return mouth;
}

/**
 * Build eyebrows
 */
export function buildEyebrows(
  material: THREE.MeshStandardMaterial,
  scale: number = MINION_SCALE,
  eyeSpacing: number = 0.08
): { leftEyebrow: THREE.Mesh; rightEyebrow: THREE.Mesh } {
  const eyebrowGeo = new THREE.BoxGeometry(0.06 * scale, 0.015 * scale, 0.01 * scale);

  const leftEyebrow = new THREE.Mesh(eyebrowGeo, material);
  leftEyebrow.position.set(eyeSpacing * scale, 0.12 * scale, 0.17 * scale);
  leftEyebrow.rotation.set(0, 0, -0.3);

  const rightEyebrow = new THREE.Mesh(eyebrowGeo, material);
  rightEyebrow.position.set(-eyeSpacing * scale, 0.12 * scale, 0.17 * scale);
  rightEyebrow.rotation.set(0, 0, 0.3);

  return { leftEyebrow, rightEyebrow };
}

/**
 * Build teeth (for mischievous grin)
 */
export function buildTeeth(scale: number = MINION_SCALE): THREE.Group {
  const teethGroup = new THREE.Group();
  teethGroup.visible = false; // Controlled by expression

  const teethMat = new THREE.MeshStandardMaterial({
    color: 0xf0f0e0,
    roughness: 0.3,
    flatShading: true,
  });

  const toothGeo = new THREE.BoxGeometry(0.015 * scale, 0.02 * scale, 0.01 * scale);

  const leftTooth = new THREE.Mesh(toothGeo, teethMat);
  leftTooth.position.set(0.02 * scale, -0.06 * scale, 0.19 * scale);
  teethGroup.add(leftTooth);

  const rightTooth = new THREE.Mesh(toothGeo, teethMat);
  rightTooth.position.set(-0.02 * scale, -0.06 * scale, 0.19 * scale);
  teethGroup.add(rightTooth);

  return teethGroup;
}

/**
 * Build floating hand (orb shape)
 */
export function buildFloatingHand(
  material: THREE.MeshStandardMaterial,
  side: 'left' | 'right',
  scale: number = MINION_SCALE
): THREE.Group {
  const hand = new THREE.Group();
  const xOffset = side === 'left' ? 0.45 : -0.45;

  // Position floating near body
  hand.position.set(xOffset * scale, 0.7 * scale, 0.1 * scale);

  // Simple orb hand (low poly)
  const handGeo = new THREE.SphereGeometry(0.1 * scale, 5, 4);
  const handMesh = new THREE.Mesh(handGeo, material);
  handMesh.castShadow = true;
  hand.add(handMesh);

  // Tool attachment point at center
  const toolAttach = new THREE.Group();
  toolAttach.name = `${side}_tool_attach`;
  hand.add(toolAttach);

  return hand;
}

/**
 * Build stubby leg
 */
export function buildLeg(
  skinMaterial: THREE.MeshStandardMaterial,
  clothingMaterial: THREE.MeshStandardMaterial | null,
  side: 'left' | 'right',
  scale: number = MINION_SCALE,
  legLength: number = 0.5
): THREE.Group {
  const leg = new THREE.Group();
  const xOffset = side === 'left' ? 0.1 : -0.1;
  leg.position.set(xOffset * scale, 0.15 * scale * legLength, 0);

  // Upper leg (can be clothed or bare)
  const upperLegGeo = new THREE.CylinderGeometry(
    0.08 * scale,
    0.06 * scale,
    0.2 * scale * legLength,
    5
  );
  const upperLeg = new THREE.Mesh(upperLegGeo, clothingMaterial || skinMaterial);
  upperLeg.position.set(0, -0.1 * scale * legLength, 0);
  upperLeg.castShadow = true;
  leg.add(upperLeg);

  // Foot
  const footGeo = new THREE.BoxGeometry(0.1 * scale, 0.06 * scale, 0.14 * scale);
  const foot = new THREE.Mesh(footGeo, skinMaterial);
  foot.position.set(0, -0.22 * scale * legLength, 0.02 * scale);
  foot.castShadow = true;
  leg.add(foot);

  return leg;
}

/**
 * Build pointed ears (goblin/gnome style)
 */
export function buildPointedEars(
  outerMaterial: THREE.MeshStandardMaterial,
  innerMaterial: THREE.MeshStandardMaterial,
  scale: number = MINION_SCALE
): { leftEar: THREE.Group; rightEar: THREE.Group } {
  // Left ear
  const leftEar = new THREE.Group();
  leftEar.position.set(0.2 * scale, 0.05 * scale, 0);
  leftEar.rotation.set(0, 0.3, 0.3);

  const earGeo = new THREE.ConeGeometry(0.06 * scale, 0.18 * scale, 4);
  const leftEarMesh = new THREE.Mesh(earGeo, outerMaterial);
  leftEarMesh.castShadow = true;
  leftEar.add(leftEarMesh);

  const innerEarGeo = new THREE.ConeGeometry(0.03 * scale, 0.12 * scale, 4);
  const leftInnerEar = new THREE.Mesh(innerEarGeo, innerMaterial);
  leftInnerEar.position.set(0, 0, 0.02 * scale);
  leftEar.add(leftInnerEar);

  // Right ear
  const rightEar = new THREE.Group();
  rightEar.position.set(-0.2 * scale, 0.05 * scale, 0);
  rightEar.rotation.set(0, -0.3, -0.3);

  const rightEarMesh = new THREE.Mesh(earGeo, outerMaterial);
  rightEarMesh.castShadow = true;
  rightEar.add(rightEarMesh);

  const rightInnerEar = new THREE.Mesh(innerEarGeo, innerMaterial);
  rightInnerEar.position.set(0, 0, 0.02 * scale);
  rightEar.add(rightInnerEar);

  return { leftEar, rightEar };
}

/**
 * Build bulbous nose (goblin style)
 */
export function buildBulbousNose(
  material: THREE.MeshStandardMaterial,
  scale: number = MINION_SCALE
): THREE.Group {
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, -0.02 * scale, 0.2 * scale);

  // Main nose
  const noseGeo = new THREE.SphereGeometry(0.08 * scale, 5, 4);
  const nose = new THREE.Mesh(noseGeo, material);
  nose.castShadow = true;
  noseGroup.add(nose);

  // Nose tip
  const noseTipGeo = new THREE.SphereGeometry(0.04 * scale, 4, 3);
  const noseTip = new THREE.Mesh(noseTipGeo, material);
  noseTip.position.set(0, -0.02 * scale, 0.05 * scale);
  noseTip.castShadow = true;
  noseGroup.add(noseTip);

  // Nostrils
  const nostrilGeo = new THREE.SphereGeometry(0.015 * scale, 4, 3);
  const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x2d4a28 });

  const leftNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
  leftNostril.position.set(0.03 * scale, -0.04 * scale, 0.02 * scale);
  noseGroup.add(leftNostril);

  const rightNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
  rightNostril.position.set(-0.03 * scale, -0.04 * scale, 0.02 * scale);
  noseGroup.add(rightNostril);

  return noseGroup;
}

/**
 * Create attachment point groups and map
 */
export function createAttachmentPoints(
  head: THREE.Group,
  body: THREE.Group,
  leftHand: THREE.Group,
  rightHand: THREE.Group,
  scale: number = MINION_SCALE
): Map<AttachmentPoint, THREE.Group> {
  const attachments = new Map<AttachmentPoint, THREE.Group>();

  // Head top (helmets, hats)
  const headTop = new THREE.Group();
  headTop.position.set(0, 0.2 * scale, 0);
  head.add(headTop);
  attachments.set('head_top', headTop);

  // Head face (masks, goggles)
  const headFace = new THREE.Group();
  headFace.position.set(0, 0, 0.15 * scale);
  head.add(headFace);
  attachments.set('head_face', headFace);

  // Back (backpacks, capes)
  const back = new THREE.Group();
  back.position.set(0, 0.3 * scale, -0.15 * scale);
  body.add(back);
  attachments.set('back', back);

  // Hands (find or create tool attach points)
  let leftToolAttach = leftHand.getObjectByName('left_tool_attach') as THREE.Group;
  if (!leftToolAttach) {
    leftToolAttach = new THREE.Group();
    leftToolAttach.name = 'left_tool_attach';
    leftHand.add(leftToolAttach);
  }
  attachments.set('left_hand', leftToolAttach);

  let rightToolAttach = rightHand.getObjectByName('right_tool_attach') as THREE.Group;
  if (!rightToolAttach) {
    rightToolAttach = new THREE.Group();
    rightToolAttach.name = 'right_tool_attach';
    rightHand.add(rightToolAttach);
  }
  attachments.set('right_hand', rightToolAttach);

  return attachments;
}
