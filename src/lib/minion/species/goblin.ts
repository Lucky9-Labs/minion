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
  buildEyebrows,
  buildTeeth,
  buildFloatingHand,
  buildLeg,
  buildPointedEars,
  buildBulbousNose,
  createAttachmentPoints,
} from './shared';

/**
 * Goblin color palette
 */
const GOBLIN_COLORS: SpeciesColorPalette = {
  primary: 0x5a9c4e,      // Green skin
  secondary: 0x4a8340,    // Darker green
  tertiary: 0x6eb85e,     // Lighter green
  eyeWhite: 0xe8e8d0,
  pupil: 0x1a1a1a,
  mouth: 0x2d4a28,
  clothing: {
    main: 0x5c4a3d,       // Brown overalls
    accent: 0x6b5a4d,     // Strap color
    buckle: 0xc9a227,     // Gold buckle
  },
};

/**
 * Goblin species configuration
 */
const GOBLIN_CONFIG: SpeciesConfig = {
  id: 'goblin',
  name: 'Goblin',
  proportions: {
    headScale: 1.15,     // Funko Pop-style big head
    bodyHeight: 0.85,    // Visible torso
    legLength: 0.65,     // Short but proportionate legs
  },
  limbType: 'floatingHand',
  footType: 'foot',
  features: {
    hasEars: true,
    earStyle: 'pointed',
    hasNose: true,
    noseStyle: 'bulbous',
    hasTail: false,
    hasEyebrows: true,
    hasTeeth: true,
    teethStyle: 'goblin',
  },
  colors: GOBLIN_COLORS,
};

/**
 * Goblin species builder
 */
export class GoblinBuilder implements SpeciesBuilder {
  config = GOBLIN_CONFIG;

  build(colors?: Partial<SpeciesColorPalette>): { mesh: THREE.Group; refs: MinionRefs } {
    const finalColors = { ...GOBLIN_COLORS, ...colors };
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

    // === BUILD LEGS ===
    const leftLeg = buildLeg(
      materials.primary,
      materials.clothing?.main || null,
      'left',
      scale,
      proportions.legLength
    );
    const rightLeg = buildLeg(
      materials.primary,
      materials.clothing?.main || null,
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

    // === BUILD FLOATING HANDS ===
    const leftHand = buildFloatingHand(materials.tertiary, 'left', scale);
    const rightHand = buildFloatingHand(materials.tertiary, 'right', scale);
    refs.leftHand = leftHand;
    refs.rightHand = rightHand;
    // Floating hands are children of root, not body (for independent animation)
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

    // Shirt/undershirt
    const shirtGeo = new THREE.CylinderGeometry(
      0.2 * scale,
      0.22 * scale,
      0.35 * scale * bodyHeight,
      6
    );
    const shirt = new THREE.Mesh(shirtGeo, materials.clothing?.accent || materials.secondary);
    shirt.position.set(0, 0.4 * scale * bodyHeight, 0);
    shirt.castShadow = true;
    body.add(shirt);

    // Overalls body
    if (materials.clothing) {
      const overallsGeo = new THREE.BoxGeometry(
        0.35 * scale,
        0.28 * scale * bodyHeight,
        0.22 * scale
      );
      const overalls = new THREE.Mesh(overallsGeo, materials.clothing.main);
      overalls.position.set(0, 0.38 * scale * bodyHeight, 0.02 * scale);
      overalls.castShadow = true;
      body.add(overalls);

      // Overall straps
      const strapGeo = new THREE.BoxGeometry(0.05 * scale, 0.15 * scale, 0.035 * scale);

      const leftStrap = new THREE.Mesh(strapGeo, materials.clothing.accent);
      leftStrap.position.set(0.1 * scale, 0.55 * scale * bodyHeight, 0.1 * scale);
      leftStrap.castShadow = true;
      body.add(leftStrap);

      const rightStrap = new THREE.Mesh(strapGeo, materials.clothing.accent);
      rightStrap.position.set(-0.1 * scale, 0.55 * scale * bodyHeight, 0.1 * scale);
      rightStrap.castShadow = true;
      body.add(rightStrap);

      // Buckles
      const buckleGeo = new THREE.BoxGeometry(0.04 * scale, 0.04 * scale, 0.015 * scale);

      const leftBuckle = new THREE.Mesh(buckleGeo, materials.clothing.buckle);
      leftBuckle.position.set(0.1 * scale, 0.52 * scale * bodyHeight, 0.12 * scale);
      body.add(leftBuckle);

      const rightBuckle = new THREE.Mesh(buckleGeo, materials.clothing.buckle);
      rightBuckle.position.set(-0.1 * scale, 0.52 * scale * bodyHeight, 0.12 * scale);
      body.add(rightBuckle);
    }

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

    // Main head (low-poly sphere)
    const headGeo = new THREE.SphereGeometry(0.25 * scale * hs, 6, 5);
    headGeo.scale(1, 0.9, 0.95);
    const headMesh = new THREE.Mesh(headGeo, materials.primary);
    headMesh.castShadow = true;
    head.add(headMesh);

    // Eyes with eyelids
    const eyes = buildEyes(materials, materials.primary, scale * hs);
    head.add(eyes.leftEyeGroup);
    head.add(eyes.rightEyeGroup);
    refs.leftEyelid = eyes.leftEyelid;
    refs.rightEyelid = eyes.rightEyelid;
    refs.leftPupil = eyes.leftPupil;
    refs.rightPupil = eyes.rightPupil;

    // Mouth
    const mouth = buildMouth(materials, scale * hs);
    head.add(mouth);
    refs.mouth = mouth;

    // Eyebrows
    const eyebrows = buildEyebrows(materials.secondary, scale * hs);
    head.add(eyebrows.leftEyebrow);
    head.add(eyebrows.rightEyebrow);
    refs.species.leftEyebrow = eyebrows.leftEyebrow;
    refs.species.rightEyebrow = eyebrows.rightEyebrow;

    // Teeth
    const teeth = buildTeeth(scale * hs);
    head.add(teeth);
    refs.species.teeth = teeth;

    // Pointed ears
    const ears = buildPointedEars(materials.secondary, materials.tertiary, scale * hs);
    head.add(ears.leftEar);
    head.add(ears.rightEar);
    refs.species.leftEar = ears.leftEar;
    refs.species.rightEar = ears.rightEar;

    // Bulbous nose
    const nose = buildBulbousNose(materials.secondary, scale * hs);
    head.add(nose);

    return head;
  }
}

/**
 * Export singleton instance
 */
export const goblinBuilder = new GoblinBuilder();
