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
 * Mushroom minion - a cute fungal helper
 * Uses same skeleton rig as goblin for animation compatibility
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
    headScale: 1.3, // Big mushroom cap
    bodyHeight: 0.85,
    legLength: 0.65,
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

  build(colors?: Partial<SpeciesColorPalette>): { mesh: THREE.Group; refs: MinionRefs } {
    const finalColors = { ...MUSHROOM_COLORS, ...colors };
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

    // === BUILD BODY (STEM) ===
    const body = this.buildBody(materials, scale, proportions.bodyHeight);
    refs.body = body;
    root.add(body);

    // === BUILD LEGS (use shared buildLeg) ===
    const leftLeg = buildLeg(
      materials.tertiary, // Cream colored feet
      materials.tertiary, // Cream legs
      'left',
      scale,
      proportions.legLength
    );
    const rightLeg = buildLeg(
      materials.tertiary,
      materials.tertiary,
      'right',
      scale,
      proportions.legLength
    );
    refs.leftLeg = leftLeg;
    refs.rightLeg = rightLeg;
    body.add(leftLeg);
    body.add(rightLeg);

    // === BUILD HEAD (CAP) ===
    const head = this.buildHead(materials, scale, proportions.headScale, refs);
    refs.head = head;
    // Position cap above stem
    head.position.y = 0.62 * scale * proportions.bodyHeight;
    root.add(head);

    // === BUILD FLOATING HANDS ===
    const leftHand = buildFloatingHand(materials.tertiary, 'left', scale);
    const rightHand = buildFloatingHand(materials.tertiary, 'right', scale);
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

    // Stem (cream colored cylinder, wider at bottom)
    const stemGeo = new THREE.CylinderGeometry(
      0.18 * scale,
      0.22 * scale,
      0.35 * scale * bodyHeight,
      6
    );
    const stem = new THREE.Mesh(stemGeo, materials.tertiary);
    stem.position.set(0, 0.4 * scale * bodyHeight, 0);
    stem.castShadow = true;
    body.add(stem);

    // Stem collar (ring where cap meets stem)
    const collarGeo = new THREE.CylinderGeometry(
      0.22 * scale,
      0.18 * scale,
      0.06 * scale,
      6
    );
    const collar = new THREE.Mesh(collarGeo, materials.tertiary);
    collar.position.set(0, 0.58 * scale * bodyHeight, 0);
    body.add(collar);

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

    // Main cap dome (red, half sphere)
    const capGeo = new THREE.SphereGeometry(
      0.28 * scale * hs,
      6,
      4,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.55
    );
    const cap = new THREE.Mesh(capGeo, materials.primary);
    cap.castShadow = true;
    head.add(cap);

    // Cap underside (gills - cream colored ring)
    const undersideGeo = new THREE.CylinderGeometry(
      0.28 * scale * hs,
      0.16 * scale * hs,
      0.08 * scale,
      6
    );
    const underside = new THREE.Mesh(undersideGeo, materials.tertiary);
    underside.position.y = -0.04 * scale;
    head.add(underside);

    // White spots on cap
    const spotGeo = new THREE.SphereGeometry(0.05 * scale * hs, 4, 3);
    const spotMat = materials.clothing?.main || materials.tertiary;
    const spotPositions = [
      [0, 0.14, 0.15],
      [0.14, 0.1, 0.08],
      [-0.12, 0.12, 0.1],
      [0.08, 0.16, -0.1],
      [-0.1, 0.15, -0.08],
      [0.05, 0.18, 0],
    ];
    spotPositions.forEach(([x, y, z]) => {
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.position.set(x * scale * hs, y * scale * hs, z * scale * hs);
      head.add(spot);
    });

    // Face area (lighter cream patch on front of cap)
    const faceGeo = new THREE.SphereGeometry(0.12 * scale * hs, 5, 4);
    faceGeo.scale(1, 0.9, 0.5);
    const face = new THREE.Mesh(faceGeo, materials.tertiary);
    face.position.set(0, -0.02 * scale * hs, 0.22 * scale * hs);
    head.add(face);

    // Eyes with eyelids
    const eyes = buildEyes(materials, materials.tertiary, scale * hs * 0.7);
    eyes.leftEyeGroup.position.set(0.06 * scale * hs, 0, 0.2 * scale * hs);
    eyes.rightEyeGroup.position.set(-0.06 * scale * hs, 0, 0.2 * scale * hs);
    head.add(eyes.leftEyeGroup);
    head.add(eyes.rightEyeGroup);
    refs.leftEyelid = eyes.leftEyelid;
    refs.rightEyelid = eyes.rightEyelid;
    refs.leftPupil = eyes.leftPupil;
    refs.rightPupil = eyes.rightPupil;

    // Mouth
    const mouth = buildMouth(materials, scale * hs * 0.6);
    mouth.position.set(0, -0.08 * scale * hs, 0.22 * scale * hs);
    head.add(mouth);
    refs.mouth = mouth;

    return head;
  }
}

export const mushroomBuilder = new MushroomBuilder();
