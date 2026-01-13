import * as THREE from 'three';
import type {
  SpeciesBuilder,
  SpeciesConfig,
  SpeciesColorPalette,
  MinionRefs,
  SpeciesMaterials,
} from '@/types/minion';
import {
  MINION_SCALE,
  createMaterials,
  buildEyes,
  buildMouth,
  buildFloatingHand,
  buildLeg,
  createAttachmentPoints,
} from './shared';

/**
 * Penguin minion - waddles around, good for cold tasks
 * Uses same skeleton rig as goblin for animation compatibility
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
    headScale: 1.0,
    bodyHeight: 0.85,
    legLength: 0.65,
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

  build(colors?: Partial<SpeciesColorPalette>): { mesh: THREE.Group; refs: MinionRefs } {
    const finalColors = { ...PENGUIN_COLORS, ...colors };
    const materials = createMaterials(finalColors);
    const scale = MINION_SCALE;
    const { proportions } = this.config;

    const root = new THREE.Group();

    // Initialize refs
    const refs: MinionRefs = {
      root,
      body: new THREE.Group(),
      head: new THREE.Group(),
      leftLeg: new THREE.Group(),
      rightLeg: new THREE.Group(),
      leftHand: new THREE.Group(),
      rightHand: new THREE.Group(),
      leftEyelid: null as unknown as THREE.Mesh,
      rightEyelid: null as unknown as THREE.Mesh,
      leftPupil: null as unknown as THREE.Group,
      rightPupil: null as unknown as THREE.Group,
      mouth: null as unknown as THREE.Mesh,
      attachments: new Map(),
      species: {},
    };

    // === BUILD BODY ===
    const body = this.buildBody(materials, scale, proportions.bodyHeight);
    refs.body = body;
    root.add(body);

    // === BUILD LEGS (use shared buildLeg with orange feet) ===
    const leftLeg = buildLeg(
      materials.clothing?.main || materials.primary, // Orange for penguin feet
      materials.primary, // Dark for upper leg
      'left',
      scale,
      proportions.legLength
    );
    const rightLeg = buildLeg(
      materials.clothing?.main || materials.primary,
      materials.primary,
      'right',
      scale,
      proportions.legLength
    );
    refs.leftLeg = leftLeg;
    refs.rightLeg = rightLeg;
    body.add(leftLeg);
    body.add(rightLeg);

    // === BUILD HEAD ===
    const head = this.buildHead(materials, scale, proportions.headScale, refs);
    refs.head = head;
    // Position head above body
    head.position.y = 0.62 * scale * proportions.bodyHeight;
    root.add(head);

    // === BUILD FLOATING HANDS (flippers use same rig) ===
    const leftHand = buildFloatingHand(materials.primary, 'left', scale);
    const rightHand = buildFloatingHand(materials.primary, 'right', scale);
    refs.leftHand = leftHand;
    refs.rightHand = rightHand;
    root.add(leftHand);
    root.add(rightHand);

    // === CREATE ATTACHMENT POINTS ===
    refs.attachments = createAttachmentPoints(head, body, leftHand, rightHand, scale);

    return { mesh: root, refs };
  }

  private buildBody(
    materials: SpeciesMaterials,
    scale: number,
    bodyHeight: number
  ): THREE.Group {
    const body = new THREE.Group();

    // Main body (oval/egg shape) - dark blue-black
    const bodyGeo = new THREE.CylinderGeometry(
      0.2 * scale,
      0.22 * scale,
      0.35 * scale * bodyHeight,
      6
    );
    const bodyMesh = new THREE.Mesh(bodyGeo, materials.primary);
    bodyMesh.position.set(0, 0.4 * scale * bodyHeight, 0);
    bodyMesh.castShadow = true;
    body.add(bodyMesh);

    // White belly patch (front)
    const bellyGeo = new THREE.BoxGeometry(
      0.28 * scale,
      0.28 * scale * bodyHeight,
      0.1 * scale
    );
    const belly = new THREE.Mesh(bellyGeo, materials.tertiary);
    belly.position.set(0, 0.38 * scale * bodyHeight, 0.1 * scale);
    belly.castShadow = true;
    body.add(belly);

    return body;
  }

  private buildHead(
    materials: SpeciesMaterials,
    scale: number,
    headScale: number,
    refs: MinionRefs
  ): THREE.Group {
    const head = new THREE.Group();
    const hs = headScale;

    // Main head (dark, low-poly sphere)
    const headGeo = new THREE.SphereGeometry(0.25 * scale * hs, 6, 5);
    headGeo.scale(1, 0.9, 0.95);
    const headMesh = new THREE.Mesh(headGeo, materials.primary);
    headMesh.castShadow = true;
    head.add(headMesh);

    // White face patch
    const facePatchGeo = new THREE.SphereGeometry(0.16 * scale * hs, 5, 4);
    facePatchGeo.scale(0.9, 0.9, 0.5);
    const facePatch = new THREE.Mesh(facePatchGeo, materials.tertiary);
    facePatch.position.set(0, 0, 0.12 * scale * hs);
    head.add(facePatch);

    // Eyes with eyelids
    const eyes = buildEyes(materials, materials.primary, scale * hs);
    head.add(eyes.leftEyeGroup);
    head.add(eyes.rightEyeGroup);
    refs.leftEyelid = eyes.leftEyelid;
    refs.rightEyelid = eyes.rightEyelid;
    refs.leftPupil = eyes.leftPupil;
    refs.rightPupil = eyes.rightPupil;

    // Beak (orange cone)
    const beakGroup = new THREE.Group();
    beakGroup.position.set(0, -0.04 * scale * hs, 0.2 * scale * hs);

    const beakGeo = new THREE.ConeGeometry(0.06 * scale * hs, 0.12 * scale * hs, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, materials.clothing?.main || materials.secondary);
    beak.castShadow = true;
    beakGroup.add(beak);

    head.add(beakGroup);
    refs.species.beak = beakGroup;

    // Mouth (hidden, for animation system)
    const mouth = buildMouth(materials, scale * hs);
    mouth.visible = false;
    head.add(mouth);
    refs.mouth = mouth;

    return head;
  }
}

export const penguinBuilder = new PenguinBuilder();
