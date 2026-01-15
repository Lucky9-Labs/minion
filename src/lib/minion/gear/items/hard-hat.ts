import * as THREE from 'three';
import type { GearItemConfig } from '@/types/minion';
import { MINION_SCALE } from '../../species/shared';

/**
 * Construction hard hat for minions working on building scaffolding
 * - Classic safety yellow color
 * - Dome shape with brim
 * - Simple, functional design
 */
export const hardHatConfig: GearItemConfig = {
  id: 'hard_hat',
  name: 'Hard Hat',
  slot: 'helmet',
  attachmentPoint: 'head_top',
  showFaceThrough: true,

  createMesh(): THREE.Group {
    const scale = MINION_SCALE;
    const hardHat = new THREE.Group();

    // Safety yellow material
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Golden yellow
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true,
    });

    // Darker yellow for inner details
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xccaa00,
      roughness: 0.6,
      metalness: 0.0,
      flatShading: true,
    });

    // Black for straps
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
    });

    // Main dome (top of hard hat)
    const domeGeo = new THREE.SphereGeometry(
      0.2 * scale,
      8,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5
    );
    const dome = new THREE.Mesh(domeGeo, yellowMat);
    dome.position.set(0, 0.08 * scale, 0);
    dome.castShadow = true;
    hardHat.add(dome);

    // Brim (wide rim around the hat)
    const brimGeo = new THREE.CylinderGeometry(
      0.26 * scale, // top radius
      0.28 * scale, // bottom radius
      0.025 * scale, // height
      12
    );
    const brim = new THREE.Mesh(brimGeo, yellowMat);
    brim.position.set(0, 0.02 * scale, 0);
    brim.castShadow = true;
    hardHat.add(brim);

    // Ridge on top (central reinforcement)
    const ridgeGeo = new THREE.BoxGeometry(
      0.04 * scale,
      0.03 * scale,
      0.3 * scale
    );
    const ridge = new THREE.Mesh(ridgeGeo, yellowMat);
    ridge.position.set(0, 0.16 * scale, 0);
    ridge.castShadow = true;
    hardHat.add(ridge);

    // Inner suspension ring (visible from below)
    const innerRingGeo = new THREE.TorusGeometry(0.12 * scale, 0.015 * scale, 4, 8);
    const innerRing = new THREE.Mesh(innerRingGeo, innerMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(0, 0.01 * scale, 0);
    hardHat.add(innerRing);

    // Chin strap attachment points
    const attachGeo = new THREE.BoxGeometry(
      0.02 * scale,
      0.04 * scale,
      0.02 * scale
    );

    const leftAttach = new THREE.Mesh(attachGeo, strapMat);
    leftAttach.position.set(0.22 * scale, 0.01 * scale, 0);
    hardHat.add(leftAttach);

    const rightAttach = new THREE.Mesh(attachGeo, strapMat);
    rightAttach.position.set(-0.22 * scale, 0.01 * scale, 0);
    hardHat.add(rightAttach);

    // Position the hard hat to sit properly on head
    hardHat.position.y = 0.02 * scale;

    return hardHat;
  },
};
