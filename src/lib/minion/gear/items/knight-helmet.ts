import * as THREE from 'three';
import type { GearItemConfig } from '@/types/minion';
import { MINION_SCALE } from '../../species/shared';

/**
 * Knight helmet configuration
 * - Dome shape on top
 * - Side guards that don't cover face
 * - Nose guard
 * - Red plume on top
 */
export const knightHelmetConfig: GearItemConfig = {
  id: 'knight_helmet',
  name: 'Knight Helmet',
  slot: 'helmet',
  attachmentPoint: 'head_top',
  showFaceThrough: true,

  createMesh(): THREE.Group {
    const scale = MINION_SCALE;
    const helmet = new THREE.Group();

    // Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x6a6a6a,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: true,
    });

    const metalDarkMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      metalness: 0.6,
      roughness: 0.4,
      flatShading: true,
    });

    const plumeMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.8,
      flatShading: true,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: 0.8,
      roughness: 0.2,
      flatShading: true,
    });

    // Main dome (sits on top of head)
    const domeGeo = new THREE.SphereGeometry(
      0.22 * scale,
      6,
      4,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.6
    );
    const dome = new THREE.Mesh(domeGeo, metalMat);
    dome.position.set(0, 0.05 * scale, 0);
    dome.castShadow = true;
    helmet.add(dome);

    // Rim around the dome
    const rimGeo = new THREE.TorusGeometry(0.22 * scale, 0.02 * scale, 4, 8);
    const rim = new THREE.Mesh(rimGeo, goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.02 * scale, 0);
    helmet.add(rim);

    // Left side guard (ear protector)
    const sideGuardGeo = new THREE.BoxGeometry(
      0.04 * scale,
      0.15 * scale,
      0.12 * scale
    );
    const leftGuard = new THREE.Mesh(sideGuardGeo, metalDarkMat);
    leftGuard.position.set(0.2 * scale, -0.02 * scale, 0);
    leftGuard.rotation.z = 0.2;
    leftGuard.castShadow = true;
    helmet.add(leftGuard);

    // Right side guard
    const rightGuard = new THREE.Mesh(sideGuardGeo, metalDarkMat);
    rightGuard.position.set(-0.2 * scale, -0.02 * scale, 0);
    rightGuard.rotation.z = -0.2;
    rightGuard.castShadow = true;
    helmet.add(rightGuard);

    // Nose guard (vertical strip down center, doesn't cover face)
    const noseGuardGeo = new THREE.BoxGeometry(
      0.03 * scale,
      0.12 * scale,
      0.02 * scale
    );
    const noseGuard = new THREE.Mesh(noseGuardGeo, metalMat);
    noseGuard.position.set(0, -0.04 * scale, 0.22 * scale);
    noseGuard.castShadow = true;
    helmet.add(noseGuard);

    // Plume holder (small cylinder on top)
    const plumeHolderGeo = new THREE.CylinderGeometry(
      0.03 * scale,
      0.04 * scale,
      0.04 * scale,
      5
    );
    const plumeHolder = new THREE.Mesh(plumeHolderGeo, goldMat);
    plumeHolder.position.set(0, 0.18 * scale, -0.02 * scale);
    helmet.add(plumeHolder);

    // Plume (red feathers)
    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(0, 0.2 * scale, -0.02 * scale);

    // Main plume shape (multiple cones for feathery look)
    for (let i = 0; i < 3; i++) {
      const plumeGeo = new THREE.ConeGeometry(
        0.04 * scale * (1 - i * 0.2),
        0.2 * scale * (1 - i * 0.15),
        4
      );
      const plumePiece = new THREE.Mesh(plumeGeo, plumeMat);
      plumePiece.position.set(
        (i - 1) * 0.02 * scale,
        0.1 * scale + i * 0.02 * scale,
        -i * 0.01 * scale
      );
      plumePiece.rotation.x = -0.2;
      plumePiece.castShadow = true;
      plumeGroup.add(plumePiece);
    }

    helmet.add(plumeGroup);

    // Position the helmet so it sits properly on the head
    helmet.position.y = 0.02 * scale;

    return helmet;
  },
};
