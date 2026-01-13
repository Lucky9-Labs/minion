import * as THREE from 'three';
import type { SpeciesBuilder, SpeciesConfig, SpeciesColorPalette, MinionRefs, AttachmentPoint } from '@/types/minion';
import { MINION_SCALE, buildEyes } from './shared';

/**
 * Mushroom minion - a cute fungal helper
 * Spotted cap, stubby body, tiny legs
 */

const MUSHROOM_COLORS: SpeciesColorPalette = {
  primary: 0xdc2626,      // Red cap
  secondary: 0xb91c1c,    // Darker red
  tertiary: 0xfef3c7,     // Cream stem
  eyeWhite: 0xffffff,
  pupil: 0x000000,
  mouth: 0x654321,
  clothing: {
    main: 0xffffff,       // White spots
    accent: 0xfef3c7,
    buckle: 0xfbbf24,
  },
};

const MUSHROOM_CONFIG: SpeciesConfig = {
  id: 'mushroom',
  name: 'Shroomling',
  proportions: {
    headScale: 1.4, // Big cap
    bodyHeight: 0.5,
    legLength: 0.2,
  },
  limbType: 'floatingHand',
  footType: 'foot',
  features: {
    hasEars: false,
    hasNose: false,
    hasTail: false,
    hasEyebrows: false,
    hasTeeth: false,
  },
  colors: MUSHROOM_COLORS,
};

class MushroomBuilder implements SpeciesBuilder {
  config = MUSHROOM_CONFIG;

  build(): { mesh: THREE.Group; refs: MinionRefs } {
    const scale = MINION_SCALE;
    const group = new THREE.Group();
    const { proportions, colors } = this.config;

    // Materials
    const capMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      flatShading: true,
    });
    const stemMat = new THREE.MeshStandardMaterial({
      color: colors.tertiary, // Cream
      flatShading: true,
    });
    const spotMat = new THREE.MeshStandardMaterial({
      color: colors.clothing?.main ?? 0xffffff, // White spots
      flatShading: true,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: colors.eyeWhite,
      flatShading: true,
    });

    // === STEM/BODY ===
    const bodyHeight = 0.35 * scale * proportions.bodyHeight;
    const stemGeo = new THREE.CylinderGeometry(
      0.15 * scale * 0.8,
      0.2 * scale * 0.8,
      0.4 * scale,
      6
    );
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = bodyHeight;
    stem.castShadow = true;
    group.add(stem);

    // === CAP (head) ===
    const headGroup = new THREE.Group();
    const capY = bodyHeight + 0.25 * scale;

    // Main cap dome
    const capGeo = new THREE.SphereGeometry(
      0.35 * scale * proportions.headScale,
      8,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.6
    );
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.castShadow = true;
    headGroup.add(cap);

    // Cap underside (gills)
    const undersideGeo = new THREE.CylinderGeometry(
      0.35 * scale * proportions.headScale,
      0.15 * scale,
      0.08 * scale,
      8
    );
    const underside = new THREE.Mesh(undersideGeo, stemMat);
    underside.position.y = -0.04 * scale;
    headGroup.add(underside);

    // White spots on cap
    const spotGeo = new THREE.SphereGeometry(0.05 * scale, 4, 3);
    const spotPositions = [
      [0, 0.15, 0.2],
      [0.15, 0.1, 0.1],
      [-0.12, 0.12, 0.15],
      [0.08, 0.18, -0.1],
      [-0.1, 0.16, -0.08],
    ];
    spotPositions.forEach(([x, y, z]) => {
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(x * scale, y * scale, z * scale);
      headGroup.add(spot);
    });

    // Face area (lighter patch on front)
    const faceGeo = new THREE.SphereGeometry(0.12 * scale, 5, 4);
    faceGeo.scale(1, 0.8, 0.5);
    const face = new THREE.Mesh(faceGeo, stemMat);
    face.position.set(0, -0.05 * scale, 0.28 * scale);
    headGroup.add(face);

    // Eyes
    const eyeMaterials = {
      primary: capMat,
      secondary: stemMat,
      tertiary: stemMat,
      eyeWhite: eyeWhiteMat,
      pupil: new THREE.MeshBasicMaterial({ color: 0x000000 }),
      mouth: new THREE.MeshBasicMaterial({ color: 0x8b4513 }),
    };
    const { leftEyeGroup, rightEyeGroup, leftPupil, rightPupil, leftEyelid, rightEyelid } = buildEyes(
      eyeMaterials,
      stemMat,
      scale * 0.7
    );
    leftEyeGroup.position.set(0.08 * scale, -0.02 * scale, 0.25 * scale);
    rightEyeGroup.position.set(-0.08 * scale, -0.02 * scale, 0.25 * scale);
    headGroup.add(leftEyeGroup, rightEyeGroup);

    // Cute little mouth
    const mouthGeo = new THREE.BoxGeometry(0.06 * scale, 0.02 * scale, 0.02 * scale);
    const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({ color: 0x654321 }));
    mouth.position.set(0, -0.1 * scale, 0.28 * scale);
    headGroup.add(mouth);

    headGroup.position.y = capY;
    group.add(headGroup);

    // === ARMS (stubby) ===
    const armGeo = new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.15 * scale, 5);

    const leftArm = new THREE.Mesh(armGeo, stemMat);
    leftArm.position.set(0.2 * scale, bodyHeight, 0);
    leftArm.rotation.z = -0.5;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, stemMat);
    rightArm.position.set(-0.2 * scale, bodyHeight, 0);
    rightArm.rotation.z = 0.5;
    rightArm.castShadow = true;
    group.add(rightArm);

    // === FEET (stubby) ===
    const footGeo = new THREE.SphereGeometry(0.06 * scale, 5, 4);
    footGeo.scale(1.2, 0.6, 1.4);

    const leftFoot = new THREE.Mesh(footGeo, stemMat);
    leftFoot.position.set(0.08 * scale, 0.03 * scale, 0.02 * scale);
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, stemMat);
    rightFoot.position.set(-0.08 * scale, 0.03 * scale, 0.02 * scale);
    group.add(rightFoot);

    // === WRAP PARTS IN GROUPS FOR ANIMATION SYSTEM ===
    const bodyGroup = new THREE.Group();
    bodyGroup.add(stem);
    group.add(bodyGroup);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.add(leftFoot);
    const rightLegGroup = new THREE.Group();
    rightLegGroup.add(rightFoot);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.add(leftArm);
    const rightHandGroup = new THREE.Group();
    rightHandGroup.add(rightArm);

    // Mouth placeholder
    const mouthPlaceholderGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const mouthMesh = new THREE.Mesh(mouthPlaceholderGeo, stemMat);
    mouthMesh.visible = false;
    headGroup.add(mouthMesh);

    // === ATTACHMENT POINTS ===
    const attachments = new Map<AttachmentPoint, THREE.Group>();

    const headTop = new THREE.Group();
    headTop.position.set(0, 0.25 * scale, 0);
    headGroup.add(headTop);
    attachments.set('head_top', headTop);

    const leftHandAttach = new THREE.Group();
    leftHandAttach.position.set(0, -0.08 * scale, 0);
    leftArm.add(leftHandAttach);
    attachments.set('left_hand', leftHandAttach);

    const rightHandAttach = new THREE.Group();
    rightHandAttach.position.set(0, -0.08 * scale, 0);
    rightArm.add(rightHandAttach);
    attachments.set('right_hand', rightHandAttach);

    const back = new THREE.Group();
    back.position.set(0, bodyHeight, -0.15 * scale);
    group.add(back);
    attachments.set('back', back);

    // Refs
    const refs: MinionRefs = {
      root: group,
      head: headGroup,
      body: bodyGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      leftHand: leftHandGroup,
      rightHand: rightHandGroup,
      leftPupil,
      rightPupil,
      leftEyelid,
      rightEyelid,
      mouth: mouthMesh,
      attachments,
      species: {},
    };

    return { mesh: group, refs };
  }
}

export const mushroomBuilder = new MushroomBuilder();
