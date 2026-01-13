import * as THREE from 'three';
import type { SpeciesBuilder, SpeciesConfig, SpeciesColorPalette, MinionRefs, AttachmentPoint } from '@/types/minion';
import { MINION_SCALE, buildEyes } from './shared';

/**
 * Penguin minion - waddles around, good for cold tasks
 * Cute, round body with flippers and a beak
 */

const PENGUIN_COLORS: SpeciesColorPalette = {
  primary: 0x1a1a2e,      // Dark blue-black body
  secondary: 0x0f0f1a,    // Darker shade
  tertiary: 0xffffff,     // White belly
  eyeWhite: 0xffffff,
  pupil: 0x000000,
  mouth: 0xff9500,        // Orange beak
  clothing: {
    main: 0xff9500,       // Orange (feet/beak)
    accent: 0xffb347,
    buckle: 0xffd700,
  },
};

const PENGUIN_CONFIG: SpeciesConfig = {
  id: 'penguin',
  name: 'Penguin',
  proportions: {
    headScale: 0.9,
    bodyHeight: 0.8,
    legLength: 0.3,
  },
  limbType: 'floatingHand',
  footType: 'foot',
  features: {
    hasEars: false,
    hasNose: true,
    noseStyle: 'beak',
    hasTail: false,
    hasEyebrows: false,
    hasTeeth: false,
  },
  colors: PENGUIN_COLORS,
};

class PenguinBuilder implements SpeciesBuilder {
  config = PENGUIN_CONFIG;

  build(): { mesh: THREE.Group; refs: MinionRefs } {
    const scale = MINION_SCALE;
    const group = new THREE.Group();
    const { proportions, colors } = this.config;

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      flatShading: true,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: colors.tertiary, // White belly
      flatShading: true,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: colors.clothing?.main ?? 0xff9500, // Orange
      flatShading: true,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: colors.eyeWhite,
      flatShading: true,
    });

    // === BODY (oval/egg shape) ===
    const bodyHeight = 0.7 * scale * proportions.bodyHeight;
    const bodyGeo = new THREE.SphereGeometry(0.35 * scale * 1.2, 8, 6); // Round body
    bodyGeo.scale(1, 1.3, 0.9); // Taller, slightly flat
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyHeight;
    body.castShadow = true;
    group.add(body);

    // Belly (white front)
    const bellyGeo = new THREE.SphereGeometry(0.28 * scale, 6, 5);
    bellyGeo.scale(0.8, 1.2, 0.5);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, bodyHeight - 0.05 * scale, 0.15 * scale);
    group.add(belly);

    // === HEAD ===
    const headGroup = new THREE.Group();
    const headY = bodyHeight + 0.4 * scale;

    const headGeo = new THREE.SphereGeometry(0.22 * scale * proportions.headScale, 6, 5);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.castShadow = true;
    headGroup.add(head);

    // White face patch
    const facePatchGeo = new THREE.SphereGeometry(0.15 * scale, 5, 4);
    facePatchGeo.scale(0.8, 0.9, 0.5);
    const facePatch = new THREE.Mesh(facePatchGeo, bellyMat);
    facePatch.position.set(0, 0.02 * scale, 0.12 * scale);
    headGroup.add(facePatch);

    // Eyes
    const eyeMaterials = {
      primary: bodyMat,
      secondary: bellyMat,
      tertiary: bellyMat,
      eyeWhite: eyeWhiteMat,
      pupil: new THREE.MeshBasicMaterial({ color: colors.pupil }),
      mouth: new THREE.MeshBasicMaterial({ color: colors.mouth }),
    };
    const { leftEyeGroup, rightEyeGroup, leftPupil, rightPupil, leftEyelid, rightEyelid } = buildEyes(
      eyeMaterials,
      bellyMat,
      scale * 0.8
    );
    leftEyeGroup.position.set(0.08 * scale, 0.05 * scale, 0.15 * scale);
    rightEyeGroup.position.set(-0.08 * scale, 0.05 * scale, 0.15 * scale);
    headGroup.add(leftEyeGroup, rightEyeGroup);

    // Beak (orange cone)
    const beakGeo = new THREE.ConeGeometry(0.04 * scale, 0.1 * scale, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, accentMat);
    beak.position.set(0, -0.02 * scale, 0.2 * scale);
    headGroup.add(beak);

    headGroup.position.y = headY;
    group.add(headGroup);

    // === FLIPPERS (arms) ===
    const flipperGeo = new THREE.BoxGeometry(0.08 * scale, 0.25 * scale, 0.15 * scale);

    const leftFlipper = new THREE.Mesh(flipperGeo, bodyMat);
    leftFlipper.position.set(0.35 * scale, bodyHeight, 0);
    leftFlipper.rotation.z = -0.3;
    leftFlipper.castShadow = true;
    group.add(leftFlipper);

    const rightFlipper = new THREE.Mesh(flipperGeo, bodyMat);
    rightFlipper.position.set(-0.35 * scale, bodyHeight, 0);
    rightFlipper.rotation.z = 0.3;
    rightFlipper.castShadow = true;
    group.add(rightFlipper);

    // === FEET (orange) ===
    const footGeo = new THREE.BoxGeometry(0.12 * scale, 0.04 * scale, 0.15 * scale);

    const leftFoot = new THREE.Mesh(footGeo, accentMat);
    leftFoot.position.set(0.1 * scale, 0.02 * scale, 0.03 * scale);
    group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, accentMat);
    rightFoot.position.set(-0.1 * scale, 0.02 * scale, 0.03 * scale);
    group.add(rightFoot);

    // === WRAP PARTS IN GROUPS FOR ANIMATION SYSTEM ===
    const bodyGroup = new THREE.Group();
    bodyGroup.add(body);
    bodyGroup.add(belly);
    group.add(bodyGroup);

    const leftLegGroup = new THREE.Group();
    leftLegGroup.add(leftFoot);
    const rightLegGroup = new THREE.Group();
    rightLegGroup.add(rightFoot);

    const leftHandGroup = new THREE.Group();
    leftHandGroup.add(leftFlipper);
    const rightHandGroup = new THREE.Group();
    rightHandGroup.add(rightFlipper);

    // Mouth placeholder
    const mouthGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const mouthMesh = new THREE.Mesh(mouthGeo, accentMat);
    mouthMesh.visible = false;
    headGroup.add(mouthMesh);

    // === ATTACHMENT POINTS ===
    const attachments = new Map<AttachmentPoint, THREE.Group>();

    const headTop = new THREE.Group();
    headTop.position.set(0, 0.2 * scale, 0);
    headGroup.add(headTop);
    attachments.set('head_top', headTop);

    const leftHandAttach = new THREE.Group();
    leftHandAttach.position.set(0, -0.12 * scale, 0);
    leftFlipper.add(leftHandAttach);
    attachments.set('left_hand', leftHandAttach);

    const rightHandAttach = new THREE.Group();
    rightHandAttach.position.set(0, -0.12 * scale, 0);
    rightFlipper.add(rightHandAttach);
    attachments.set('right_hand', rightHandAttach);

    const back = new THREE.Group();
    back.position.set(0, bodyHeight, -0.3 * scale);
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

export const penguinBuilder = new PenguinBuilder();
