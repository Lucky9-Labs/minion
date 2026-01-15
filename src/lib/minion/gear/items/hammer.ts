import * as THREE from 'three';
import type { GearItemConfig } from '@/types/minion';
import { MINION_SCALE } from '../../species/shared';

/**
 * Construction hammer for minions working on building scaffolding
 * - Classic claw hammer design
 * - Brown wooden handle
 * - Gray metal head
 */
export const hammerConfig: GearItemConfig = {
  id: 'hammer',
  name: 'Hammer',
  slot: 'rightTool',
  attachmentPoint: 'right_hand',
  showFaceThrough: false,

  createMesh(): THREE.Group {
    const scale = MINION_SCALE;
    const hammer = new THREE.Group();

    // Handle material - brown wood
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Saddle brown
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
    });

    // Head material - gray metal
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.3,
      metalness: 0.7,
      flatShading: true,
    });

    // Handle
    const handleGeo = new THREE.CylinderGeometry(
      0.03 * scale, // top radius
      0.025 * scale, // bottom radius
      0.35 * scale, // height
      6
    );
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 0, 0);
    handle.castShadow = true;
    hammer.add(handle);

    // Hammer head - main block
    const headGeo = new THREE.BoxGeometry(
      0.12 * scale, // width
      0.08 * scale, // height
      0.06 * scale  // depth
    );
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.18 * scale, 0);
    head.castShadow = true;
    hammer.add(head);

    // Claw part of hammer (back side)
    const clawGeo = new THREE.BoxGeometry(
      0.04 * scale,
      0.06 * scale,
      0.06 * scale
    );
    const claw = new THREE.Mesh(clawGeo, headMat);
    claw.position.set(-0.07 * scale, 0.16 * scale, 0);
    claw.rotation.z = -0.3;
    claw.castShadow = true;
    hammer.add(claw);

    // Position hammer to be held properly
    hammer.rotation.x = Math.PI / 4; // Angle forward slightly
    hammer.position.set(0.02 * scale, -0.1 * scale, 0.05 * scale);

    return hammer;
  },
};
