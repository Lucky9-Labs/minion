import * as THREE from 'three';
import type { SpeciesBuilder, SpeciesConfig, MinionRefs, SpeciesColorPalette } from '../../../types/minion';
import { buildEyes, buildMouth } from './shared';

/**
 * Mage customization options
 */
export interface MageCustomization {
  variant: 'wizard' | 'witch';
  robeColor: number;
  hatColor: number;
  trimColor: number;
  beardColor?: number;      // Wizard only
  hairColor?: number;       // Witch only
  staffOrbColor: number;
}

export const DEFAULT_WIZARD_CUSTOMIZATION: MageCustomization = {
  variant: 'wizard',
  robeColor: 0x4a3f6b,      // Deep purple
  hatColor: 0x3b2d5c,       // Darker purple
  trimColor: 0xfbbf24,      // Gold
  beardColor: 0xd1d5db,     // Silver gray
  staffOrbColor: 0x8b5cf6,  // Violet
};

export const DEFAULT_WITCH_CUSTOMIZATION: MageCustomization = {
  variant: 'witch',
  robeColor: 0x1f1f23,      // Near black
  hatColor: 0x0f0f12,       // Black
  trimColor: 0x10b981,      // Emerald green
  hairColor: 0x1c1917,      // Dark brown
  staffOrbColor: 0x22c55e,  // Green
};

const MAGE_COLORS: SpeciesColorPalette = {
  primary: 0x4a3f6b,
  secondary: 0x2d2645,
  tertiary: 0x6b5f9b,
  eyeWhite: 0xf5f5f5,
  pupil: 0x1a1a1a,
  mouth: 0x3d2d4d,
  clothing: {
    main: 0x6d28d9,
    accent: 0xfbbf24,
    buckle: 0xfbbf24,
  },
};

const WIZARD_CONFIG: SpeciesConfig = {
  id: 'wizard',
  name: 'Wizard',
  proportions: {
    headScale: 0.9,        // Slightly smaller head than Funko Pop
    bodyHeight: 1.4,       // Taller body
    legLength: 0.9,        // Hidden by robe anyway
  },
  limbType: 'floatingHand',
  footType: 'foot',
  features: {
    hasEars: false,        // Hidden by hood/hat
    hasNose: true,
    noseStyle: 'button',
    hasTail: false,
    hasEyebrows: true,
    hasTeeth: false,
  },
  colors: MAGE_COLORS,
};

const WITCH_CONFIG: SpeciesConfig = {
  id: 'witch',
  name: 'Witch',
  proportions: {
    headScale: 0.85,       // Slightly smaller head
    bodyHeight: 1.35,      // Slightly shorter than wizard
    legLength: 0.85,
  },
  limbType: 'floatingHand',
  footType: 'foot',
  features: {
    hasEars: false,
    hasNose: true,
    noseStyle: 'button',
    hasTail: false,
    hasEyebrows: true,
    hasTeeth: false,
  },
  colors: MAGE_COLORS,
};

/**
 * Mage species builder - creates wizard or witch characters
 */
export class MageBuilder implements SpeciesBuilder {
  config: SpeciesConfig;
  private customization: MageCustomization;

  constructor(customization: MageCustomization = DEFAULT_WIZARD_CUSTOMIZATION) {
    this.customization = customization;
    this.config = customization.variant === 'wizard' ? WIZARD_CONFIG : WITCH_CONFIG;
  }

  /**
   * Set customization options
   */
  setCustomization(customization: Partial<MageCustomization>): void {
    this.customization = { ...this.customization, ...customization };
  }

  build(colors?: Partial<SpeciesColorPalette>): { mesh: THREE.Group; refs: MinionRefs } {
    const finalColors = { ...MAGE_COLORS, ...colors };
    const scale = 1.0;
    const { proportions } = this.config;

    const root = new THREE.Group();
    const body = new THREE.Group();
    const head = new THREE.Group();

    // Materials based on customization
    const robeMaterial = new THREE.MeshStandardMaterial({
      color: this.customization.robeColor,
      flatShading: true,
    });
    const hatMaterial = new THREE.MeshStandardMaterial({
      color: this.customization.hatColor,
      flatShading: true,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: this.customization.trimColor,
      metalness: 0.3,
      roughness: 0.5,
      flatShading: true,
    });
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfcd5b8,
      flatShading: true,
    });

    // === BODY (ROBE) ===
    const robeGroup = this.buildRobe(robeMaterial, trimMaterial, scale, proportions.bodyHeight);
    body.add(robeGroup);

    // === HEAD ===
    const headGroup = new THREE.Group();

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.5 * scale * proportions.headScale, 8, 6);
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headGroup.add(headMesh);

    // Eyes - create materials for buildEyes
    const eyeMaterials = {
      primary: skinMaterial,
      secondary: skinMaterial,
      tertiary: skinMaterial,
      eyeWhite: new THREE.MeshStandardMaterial({ color: finalColors.eyeWhite, flatShading: true }),
      pupil: new THREE.MeshBasicMaterial({ color: finalColors.pupil }),
      mouth: new THREE.MeshBasicMaterial({ color: finalColors.mouth }),
    };
    const { leftEyeGroup, rightEyeGroup, leftPupil, rightPupil, leftEyelid, rightEyelid } = buildEyes(
      eyeMaterials,
      skinMaterial,
      scale * proportions.headScale
    );
    headGroup.add(leftEyeGroup, rightEyeGroup);

    // Nose (simple button nose for mage)
    const nose = this.buildButtonNose(skinMaterial, scale * proportions.headScale);
    headGroup.add(nose);

    // Mouth
    const mouth = buildMouth(eyeMaterials, scale * proportions.headScale);
    headGroup.add(mouth);

    // Eyebrows
    const eyebrows = this.buildEyebrows(scale * proportions.headScale);
    headGroup.add(eyebrows);

    // Hat/Hood based on variant
    if (this.customization.variant === 'wizard') {
      const wizardHat = this.buildWizardHat(hatMaterial, trimMaterial, scale * proportions.headScale);
      headGroup.add(wizardHat);

      // Wizard beard
      const beard = this.buildBeard(scale * proportions.headScale);
      headGroup.add(beard);
    } else {
      const witchHat = this.buildWitchHat(hatMaterial, trimMaterial, scale * proportions.headScale);
      headGroup.add(witchHat);

      // Witch hair
      const hair = this.buildHair(scale * proportions.headScale);
      headGroup.add(hair);
    }

    // Position head on body
    headGroup.position.y = 0.8 * scale * proportions.bodyHeight;
    head.add(headGroup);

    // === FLOATING HANDS ===
    const { leftHand, rightHand } = this.buildFloatingHands(skinMaterial, scale);

    // Staff in right hand
    const staff = this.buildStaff(scale);
    rightHand.add(staff);

    // === ASSEMBLY ===
    body.position.y = 0;
    root.add(body);
    root.add(head);
    root.add(leftHand);
    root.add(rightHand);

    // Position hands
    leftHand.position.set(-0.6 * scale, 0.5 * scale, 0.15 * scale);
    rightHand.position.set(0.6 * scale, 0.5 * scale, 0.15 * scale);

    // Store customization in userData for click-to-customize
    root.userData.mageCustomization = this.customization;
    root.userData.isMage = true;

    const refs: MinionRefs = {
      root,
      body,
      head,
      leftLeg: new THREE.Group(),  // Hidden by robe
      rightLeg: new THREE.Group(),
      leftHand,
      rightHand,
      leftEyelid,
      rightEyelid,
      leftPupil,
      rightPupil,
      mouth,
      attachments: new Map([
        ['head_top', headGroup],
        ['back', body],
        ['left_hand', leftHand],
        ['right_hand', rightHand],
      ]),
      species: {
        staff,
        robe: robeGroup,
      },
    };

    return { mesh: root, refs };
  }

  private buildRobe(
    robeMaterial: THREE.Material,
    trimMaterial: THREE.Material,
    scale: number,
    bodyHeight: number
  ): THREE.Group {
    const group = new THREE.Group();

    // Main robe body - wider at bottom
    const robeGeo = new THREE.CylinderGeometry(
      0.35 * scale,    // Top radius
      0.6 * scale,     // Bottom radius
      1.2 * scale * bodyHeight,
      8
    );
    const robe = new THREE.Mesh(robeGeo, robeMaterial);
    robe.position.y = 0.6 * scale * bodyHeight;
    group.add(robe);

    // Gold trim at hem
    const hemGeo = new THREE.TorusGeometry(0.58 * scale, 0.04 * scale, 8, 16);
    const hem = new THREE.Mesh(hemGeo, trimMaterial);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.02 * scale;
    group.add(hem);

    // Gold belt
    const beltGeo = new THREE.TorusGeometry(0.38 * scale, 0.035 * scale, 8, 16);
    const belt = new THREE.Mesh(beltGeo, trimMaterial);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.5 * scale * bodyHeight;
    group.add(belt);

    // Belt buckle (gem)
    const buckleGeo = new THREE.OctahedronGeometry(0.06 * scale);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: this.customization.staffOrbColor,
      emissive: this.customization.staffOrbColor,
      emissiveIntensity: 0.4,
      flatShading: true,
    });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.5 * scale * bodyHeight, 0.38 * scale);
    group.add(buckle);

    // Collar
    const collarGeo = new THREE.TorusGeometry(0.36 * scale, 0.03 * scale, 8, 16);
    const collar = new THREE.Mesh(collarGeo, trimMaterial);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.15 * scale * bodyHeight;
    group.add(collar);

    return group;
  }

  private buildButtonNose(material: THREE.Material, scale: number): THREE.Group {
    const group = new THREE.Group();

    // Simple small button nose
    const noseGeo = new THREE.SphereGeometry(0.06 * scale, 8, 6);
    const nose = new THREE.Mesh(noseGeo, material);
    nose.position.set(0, -0.05 * scale, 0.45 * scale);
    group.add(nose);

    return group;
  }

  private buildWizardHat(
    hatMaterial: THREE.Material,
    trimMaterial: THREE.Material,
    scale: number
  ): THREE.Group {
    const group = new THREE.Group();

    // Brim
    const brimGeo = new THREE.CylinderGeometry(0.7 * scale, 0.7 * scale, 0.05 * scale, 8);
    const brim = new THREE.Mesh(brimGeo, hatMaterial);
    brim.position.y = 0.45 * scale;
    group.add(brim);

    // Cone
    const coneGeo = new THREE.ConeGeometry(0.4 * scale, 0.9 * scale, 6);
    const cone = new THREE.Mesh(coneGeo, hatMaterial);
    cone.position.y = 0.9 * scale;
    // Slight bend at top
    cone.rotation.z = 0.15;
    group.add(cone);

    // Gold band
    const bandGeo = new THREE.TorusGeometry(0.42 * scale, 0.03 * scale, 8, 16);
    const band = new THREE.Mesh(bandGeo, trimMaterial);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.5 * scale;
    group.add(band);

    // Star decoration
    const starGeo = new THREE.OctahedronGeometry(0.06 * scale);
    const star = new THREE.Mesh(starGeo, trimMaterial);
    star.position.set(0, 0.5 * scale, 0.44 * scale);
    group.add(star);

    return group;
  }

  private buildWitchHat(
    hatMaterial: THREE.Material,
    trimMaterial: THREE.Material,
    scale: number
  ): THREE.Group {
    const group = new THREE.Group();

    // Wider, floppier brim
    const brimGeo = new THREE.CylinderGeometry(0.8 * scale, 0.75 * scale, 0.04 * scale, 8);
    const brim = new THREE.Mesh(brimGeo, hatMaterial);
    brim.position.y = 0.45 * scale;
    group.add(brim);

    // Taller, pointier cone
    const coneGeo = new THREE.ConeGeometry(0.35 * scale, 1.1 * scale, 6);
    const cone = new THREE.Mesh(coneGeo, hatMaterial);
    cone.position.y = 1.0 * scale;
    // More dramatic bend
    cone.rotation.z = 0.25;
    cone.rotation.x = 0.1;
    group.add(cone);

    // Decorative band with buckle
    const bandGeo = new THREE.TorusGeometry(0.38 * scale, 0.04 * scale, 8, 16);
    const band = new THREE.Mesh(bandGeo, trimMaterial);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.5 * scale;
    group.add(band);

    return group;
  }

  private buildBeard(scale: number): THREE.Group {
    const group = new THREE.Group();
    const beardMat = new THREE.MeshStandardMaterial({
      color: this.customization.beardColor || 0xd1d5db,
      flatShading: true,
    });

    // Main beard body
    const mainGeo = new THREE.ConeGeometry(0.25 * scale, 0.5 * scale, 8);
    const main = new THREE.Mesh(mainGeo, beardMat);
    main.position.set(0, -0.4 * scale, 0.2 * scale);
    main.rotation.x = -0.3;
    group.add(main);

    // Mustache
    const mustacheGeo = new THREE.CapsuleGeometry(0.08 * scale, 0.2 * scale, 4, 8);
    const mustacheL = new THREE.Mesh(mustacheGeo, beardMat);
    mustacheL.position.set(-0.15 * scale, -0.1 * scale, 0.4 * scale);
    mustacheL.rotation.z = 0.3;
    group.add(mustacheL);

    const mustacheR = mustacheL.clone();
    mustacheR.position.x = 0.15 * scale;
    mustacheR.rotation.z = -0.3;
    group.add(mustacheR);

    return group;
  }

  private buildHair(scale: number): THREE.Group {
    const group = new THREE.Group();
    const hairMat = new THREE.MeshStandardMaterial({
      color: this.customization.hairColor || 0x1c1917,
      flatShading: true,
    });

    // Long flowing hair strands
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const strandGeo = new THREE.CapsuleGeometry(0.06 * scale, 0.4 * scale, 4, 8);
      const strand = new THREE.Mesh(strandGeo, hairMat);

      const x = Math.sin(angle) * 0.35 * scale;
      const z = Math.cos(angle) * 0.35 * scale;
      strand.position.set(x, -0.2 * scale, z);
      strand.rotation.x = 0.3;
      strand.rotation.z = Math.sin(angle) * 0.2;
      group.add(strand);
    }

    return group;
  }

  private buildEyebrows(scale: number): THREE.Group {
    const group = new THREE.Group();
    const browMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      flatShading: true,
    });

    const browGeo = new THREE.BoxGeometry(0.15 * scale, 0.03 * scale, 0.04 * scale);

    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.15 * scale, 0.22 * scale, 0.42 * scale);
    leftBrow.rotation.z = -0.2;
    group.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.15 * scale, 0.22 * scale, 0.42 * scale);
    rightBrow.rotation.z = 0.2;
    group.add(rightBrow);

    return group;
  }

  private buildFloatingHands(skinMaterial: THREE.Material, scale: number): {
    leftHand: THREE.Group;
    rightHand: THREE.Group;
  } {
    const createHand = (): THREE.Group => {
      const hand = new THREE.Group();

      // Palm
      const palmGeo = new THREE.SphereGeometry(0.12 * scale, 8, 6);
      const palm = new THREE.Mesh(palmGeo, skinMaterial);
      hand.add(palm);

      // Fingers (3 visible)
      for (let i = 0; i < 3; i++) {
        const fingerGeo = new THREE.CapsuleGeometry(0.025 * scale, 0.06 * scale, 4, 8);
        const finger = new THREE.Mesh(fingerGeo, skinMaterial);
        finger.position.set((i - 1) * 0.05 * scale, 0.1 * scale, 0);
        finger.rotation.x = -0.3;
        hand.add(finger);
      }

      // Thumb
      const thumbGeo = new THREE.CapsuleGeometry(0.025 * scale, 0.04 * scale, 4, 8);
      const thumb = new THREE.Mesh(thumbGeo, skinMaterial);
      thumb.position.set(0.08 * scale, 0.02 * scale, 0.05 * scale);
      thumb.rotation.z = 0.5;
      hand.add(thumb);

      return hand;
    };

    return {
      leftHand: createHand(),
      rightHand: createHand(),
    };
  }

  private buildStaff(scale: number): THREE.Group {
    const group = new THREE.Group();

    // Staff shaft
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      flatShading: true,
    });
    const shaftGeo = new THREE.CylinderGeometry(0.03 * scale, 0.035 * scale, 1.8 * scale, 8);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.5 * scale;
    group.add(shaft);

    // Ornate top holder
    const holderGeo = new THREE.TorusGeometry(0.08 * scale, 0.02 * scale, 8, 16);
    const holderMat = new THREE.MeshStandardMaterial({
      color: this.customization.trimColor,
      metalness: 0.5,
      roughness: 0.3,
      flatShading: true,
    });
    const holder = new THREE.Mesh(holderGeo, holderMat);
    holder.position.y = 1.4 * scale;
    group.add(holder);

    // Glowing orb
    const orbMat = new THREE.MeshStandardMaterial({
      color: this.customization.staffOrbColor,
      emissive: this.customization.staffOrbColor,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    const orbGeo = new THREE.SphereGeometry(0.1 * scale, 6, 5);
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.4 * scale;
    group.add(orb);

    // Inner glow
    const innerGlowGeo = new THREE.SphereGeometry(0.06 * scale, 8, 6);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    innerGlow.position.y = 1.4 * scale;
    group.add(innerGlow);

    // Rotate staff to be held
    group.rotation.x = 0.2;
    group.position.set(0.1 * scale, 0.3 * scale, 0);

    return group;
  }
}

// Export pre-configured builders
export const wizardBuilder = new MageBuilder(DEFAULT_WIZARD_CUSTOMIZATION);
export const witchBuilder = new MageBuilder(DEFAULT_WITCH_CUSTOMIZATION);
