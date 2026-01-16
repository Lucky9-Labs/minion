import * as THREE from 'three';

// Golem is 5x larger than minions (minion scale is 0.5, so golem is 2.5)
const GOLEM_SCALE = 2.5;

// Golem color palette - rocky with crystal accents
const GOLEM_COLORS = {
  rockBase: 0x5c5247,
  rockDark: 0x4a433b,
  rockLight: 0x6e6459,
  crystalOrange: 0xff6b35,
  crystalBlue: 0x4da6ff,
  eyeCore: 0xff6b35,
};

// Deterministic pseudo-random for consistent geometry
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export interface GolemInstance {
  mesh: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  eyeLight: THREE.PointLight;
  dispose: () => void;
}

/**
 * Creates a vanilla Three.js golem mesh - a large rocky creature with crystal accents
 */
export function createGolem(): GolemInstance {
  const group = new THREE.Group();
  group.scale.setScalar(GOLEM_SCALE);

  // Materials
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: GOLEM_COLORS.rockBase,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });

  const rockDarkMaterial = new THREE.MeshStandardMaterial({
    color: GOLEM_COLORS.rockDark,
    roughness: 0.95,
    metalness: 0.1,
    flatShading: true,
  });

  const crystalOrangeMaterial = new THREE.MeshStandardMaterial({
    color: GOLEM_COLORS.crystalOrange,
    emissive: GOLEM_COLORS.crystalOrange,
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.2,
  });

  const crystalBlueMaterial = new THREE.MeshStandardMaterial({
    color: GOLEM_COLORS.crystalBlue,
    emissive: GOLEM_COLORS.crystalBlue,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.2,
  });

  // === TORSO (massive, rocky) ===
  const torsoGeometry = new THREE.BoxGeometry(1.2, 1.6, 0.8, 2, 2, 2);
  const torsoPositions = torsoGeometry.attributes.position;
  for (let i = 0; i < torsoPositions.count; i++) {
    torsoPositions.setX(i, torsoPositions.getX(i) + seededRandom(i * 3) * 0.08);
    torsoPositions.setY(i, torsoPositions.getY(i) + seededRandom(i * 3 + 1) * 0.08);
    torsoPositions.setZ(i, torsoPositions.getZ(i) + seededRandom(i * 3 + 2) * 0.08);
  }
  torsoGeometry.computeVertexNormals();
  const torso = new THREE.Mesh(torsoGeometry, rockMaterial);
  torso.position.y = 0.8;
  torso.castShadow = true;
  group.add(torso);

  // Crystal embedded in chest
  const chestCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.15, 0),
    crystalOrangeMaterial
  );
  chestCrystal.position.set(0, 0.7, 0.45);
  chestCrystal.rotation.set(0.3, 0.5, 0);
  chestCrystal.castShadow = true;
  group.add(chestCrystal);

  // === HEAD (tiny ball on massive torso) ===
  const headGeometry = new THREE.SphereGeometry(0.2, 6, 6);
  const head = new THREE.Mesh(headGeometry, rockDarkMaterial);
  head.position.set(0, 1.8, 0);
  head.castShadow = true;
  group.add(head);

  // Eye (crystal)
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    crystalOrangeMaterial
  );
  eye.position.set(0, 1.85, 0.15);
  group.add(eye);

  // Eye glow light
  const eyeLight = new THREE.PointLight(GOLEM_COLORS.eyeCore, 1, 3);
  eyeLight.position.copy(eye.position);
  group.add(eyeLight);

  // === FLOATING HANDS (chunky rock fists) ===
  function createHand(isLeft: boolean): THREE.Group {
    const hand = new THREE.Group();
    const xOffset = isLeft ? -1.0 : 1.0;

    // Main fist
    const fistGeo = new THREE.BoxGeometry(0.35, 0.3, 0.25, 2, 2, 2);
    const fistPositions = fistGeo.attributes.position;
    for (let i = 0; i < fistPositions.count; i++) {
      fistPositions.setX(i, fistPositions.getX(i) + seededRandom(i * 5 + (isLeft ? 0 : 100)) * 0.03);
      fistPositions.setY(i, fistPositions.getY(i) + seededRandom(i * 5 + 1 + (isLeft ? 0 : 100)) * 0.03);
      fistPositions.setZ(i, fistPositions.getZ(i) + seededRandom(i * 5 + 2 + (isLeft ? 0 : 100)) * 0.03);
    }
    fistGeo.computeVertexNormals();
    const fist = new THREE.Mesh(fistGeo, rockMaterial);
    fist.castShadow = true;
    hand.add(fist);

    // Finger bumps (3 knuckle-like protrusions)
    for (let i = 0; i < 3; i++) {
      const knuckle = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.15, 0.08),
        rockDarkMaterial
      );
      knuckle.position.set((i - 1) * 0.1, -0.15, 0.1);
      knuckle.castShadow = true;
      hand.add(knuckle);
    }

    // Crystal accent
    const handCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05, 0),
      isLeft ? crystalBlueMaterial : crystalOrangeMaterial
    );
    handCrystal.position.set(0, 0.12, 0.1);
    handCrystal.rotation.set(0.3, 0.5, 0);
    hand.add(handCrystal);

    hand.position.set(xOffset, 0.5, 0.2);
    return hand;
  }

  const leftHand = createHand(true);
  const rightHand = createHand(false);
  group.add(leftHand);
  group.add(rightHand);

  // === STUMP LEGS (short rocky pillars) ===
  function createLeg(isLeft: boolean): THREE.Group {
    const leg = new THREE.Group();
    const xOffset = isLeft ? -0.35 : 0.35;

    const legGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.5, 6);
    const legMesh = new THREE.Mesh(legGeo, rockDarkMaterial);
    legMesh.castShadow = true;
    leg.add(legMesh);

    // Foot (wider base)
    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 0.15, 6),
      rockMaterial
    );
    foot.position.y = -0.3;
    foot.castShadow = true;
    leg.add(foot);

    leg.position.set(xOffset, -0.2, 0);
    return leg;
  }

  const leftLeg = createLeg(true);
  const rightLeg = createLeg(false);
  group.add(leftLeg);
  group.add(rightLeg);

  // === SHOULDER CRYSTALS ===
  const leftShoulderCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1, 0),
    crystalBlueMaterial
  );
  leftShoulderCrystal.position.set(-0.7, 1.3, 0);
  leftShoulderCrystal.rotation.set(0.5, 0.3, 0.2);
  group.add(leftShoulderCrystal);

  const rightShoulderCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.12, 0),
    crystalOrangeMaterial
  );
  rightShoulderCrystal.position.set(0.7, 1.4, 0.1);
  rightShoulderCrystal.rotation.set(0.3, -0.5, -0.2);
  group.add(rightShoulderCrystal);

  // Disposal function
  const dispose = () => {
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
  };

  return {
    mesh: group,
    leftHand,
    rightHand,
    leftLeg,
    rightLeg,
    eyeLight,
    dispose,
  };
}

/**
 * Update golem animation based on state
 */
export function updateGolemAnimation(
  instance: GolemInstance,
  state: 'idle' | 'traveling' | 'stomping',
  time: number,
  baseY: number
): void {
  const { mesh, leftHand, rightHand, leftLeg, rightLeg, eyeLight } = instance;

  switch (state) {
    case 'idle':
      // Very subtle breathing motion
      mesh.position.y = baseY + Math.sin(time * 0.8) * 0.02 * GOLEM_SCALE;

      // Floating hands gentle bob
      leftHand.position.y = 0.5 + Math.sin(time * 1.2) * 0.05;
      rightHand.position.y = 0.5 + Math.sin(time * 1.2 + Math.PI) * 0.05;

      // Eye glow pulse
      eyeLight.intensity = 0.8 + Math.sin(time * 2) * 0.3;
      break;

    case 'traveling':
      const walkCycle = time * 2;
      const stomp = Math.abs(Math.sin(walkCycle)) * 0.08 * GOLEM_SCALE;
      mesh.position.y = baseY + stomp;

      // Heavy body sway
      mesh.rotation.z = Math.sin(walkCycle) * 0.03;

      // Leg movement
      leftLeg.position.y = -0.2 + Math.max(0, Math.sin(walkCycle)) * 0.15;
      rightLeg.position.y = -0.2 + Math.max(0, Math.sin(walkCycle + Math.PI)) * 0.15;

      // Floating hands swing
      leftHand.position.y = 0.5 + Math.sin(walkCycle) * 0.1;
      leftHand.position.z = 0.2 + Math.sin(walkCycle) * 0.15;
      rightHand.position.y = 0.5 + Math.sin(walkCycle + Math.PI) * 0.1;
      rightHand.position.z = 0.2 + Math.sin(walkCycle + Math.PI) * 0.15;

      // Eye intensifies
      eyeLight.intensity = 1.2 + Math.sin(time * 3) * 0.2;
      break;

    case 'stomping':
      const stompCycle = time * 4;
      const pound = Math.abs(Math.sin(stompCycle)) * 0.15 * GOLEM_SCALE;
      mesh.position.y = baseY + pound;

      // Hands slam
      const armSlam = Math.sin(stompCycle) > 0 ? 0.2 : 0.6;
      leftHand.position.y = armSlam;
      rightHand.position.y = armSlam;

      // Eye flares
      eyeLight.intensity = 1.5 + Math.abs(Math.sin(stompCycle)) * 0.5;
      break;
  }
}
