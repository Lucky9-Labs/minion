import * as THREE from 'three';

/**
 * Simple seeded random for deterministic rat spawning
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Rat behavior state
 */
type RatState = 'idle' | 'scurrying' | 'fleeing' | 'eating';

/**
 * Individual rat data
 */
interface RatData {
  mesh: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  rotation: number;
  state: RatState;
  idleTimer: number;
  bodyBob: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  seed: number;
  bodyColor: THREE.Color;
}

/**
 * Configuration for rat spawning
 */
export interface RatSpawnerConfig {
  /** Center position for spawning */
  center: THREE.Vector3;
  /** Spawn radius */
  radius?: number;
  /** Number of rats */
  count?: number;
  /** Ground level */
  groundY?: number;
  /** Seed for deterministic spawning */
  seed?: number;
}

/**
 * Creates and manages rats on cobblestone areas
 */
export class RatSystem {
  private rats: RatData[] = [];
  private group: THREE.Group;
  private cameraPosition: THREE.Vector3 = new THREE.Vector3();
  private isFirstPerson: boolean = false;

  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * Spawn rats at the given configuration
   */
  spawnRats(config: RatSpawnerConfig): void {
    const {
      center,
      radius = 8,
      count = 5,
      groundY = 0.02,
      seed = 0,
    } = config;

    const bounds = {
      minX: center.x - radius,
      maxX: center.x + radius,
      minZ: center.z - radius,
      maxZ: center.z + radius,
    };

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seededRandom(i * 100 + seed) * 0.5;
      const dist = radius * 0.3 + seededRandom(i * 200 + seed) * radius * 0.7;

      const position = new THREE.Vector3(
        center.x + Math.cos(angle) * dist,
        groundY,
        center.z + Math.sin(angle) * dist
      );

      const ratSeed = i * 1234 + seed;
      const rat = this.createRat(position, ratSeed, bounds);
      this.rats.push(rat);
      this.group.add(rat.mesh);
    }
  }

  /**
   * Create a single rat mesh
   */
  private createRat(
    position: THREE.Vector3,
    seed: number,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  ): RatData {
    const mesh = new THREE.Group();

    // Generate body color with variation
    const hue = 0.08 + seededRandom(seed + 2) * 0.04; // Brown-gray range
    const sat = 0.2 + seededRandom(seed + 3) * 0.2;
    const light = 0.25 + seededRandom(seed + 4) * 0.1;
    const bodyColor = new THREE.Color().setHSL(hue, sat, light);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.8,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#1a1a1a' });
    const pinkMaterial = new THREE.MeshStandardMaterial({
      color: '#d4a8a8',
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    // Body (capsule approximation with sphere)
    const bodyGeo = new THREE.CapsuleGeometry(0.04, 0.12, 4, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMaterial);
    body.position.set(0, 0.08, 0);
    body.castShadow = true;
    mesh.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.04, 8, 6);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.set(0, 0.09, 0.1);
    head.castShadow = true;
    mesh.add(head);

    // Snout
    const snoutGeo = new THREE.ConeGeometry(0.02, 0.04, 6);
    const snout = new THREE.Mesh(snoutGeo, bodyMaterial);
    snout.position.set(0, 0.07, 0.14);
    snout.rotation.x = 0.3;
    snout.castShadow = true;
    mesh.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.008, 6, 4);
    const nose = new THREE.Mesh(noseGeo, darkMaterial);
    nose.position.set(0, 0.065, 0.16);
    mesh.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.008, 6, 4);
    [-0.015, 0.015].forEach((x) => {
      const eye = new THREE.Mesh(eyeGeo, darkMaterial);
      eye.position.set(x, 0.11, 0.12);
      mesh.add(eye);
    });

    // Ears
    const earGeo = new THREE.CircleGeometry(0.02, 8);
    [-0.025, 0.025].forEach((x) => {
      const ear = new THREE.Mesh(earGeo, pinkMaterial);
      ear.position.set(x, 0.13, 0.08);
      ear.rotation.set(0.3, x > 0 ? 0.3 : -0.3, 0);
      mesh.add(ear);
    });

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.006, 0.003, 0.15, 4);
    const tail = new THREE.Mesh(tailGeo, pinkMaterial);
    tail.position.set(0, 0.06, -0.08);
    tail.rotation.set(0.5, 0, 0);
    mesh.add(tail);

    // Legs (simple bumps)
    const legGeo = new THREE.SphereGeometry(0.015, 4, 4);
    [
      [-0.02, 0.02, 0.04],
      [0.02, 0.02, 0.04],
      [-0.02, 0.02, -0.04],
      [0.02, 0.02, -0.04],
    ].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, bodyMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      mesh.add(leg);
    });

    // Position the mesh
    mesh.position.copy(position);

    return {
      mesh,
      position: position.clone(),
      targetPosition: null,
      rotation: seededRandom(seed) * Math.PI * 2,
      state: 'idle',
      idleTimer: 2 + seededRandom(seed + 1) * 3,
      bodyBob: 0,
      bounds,
      seed,
      bodyColor,
    };
  }

  /**
   * Update rat behavior (call in animation loop)
   */
  update(deltaTime: number, cameraPosition?: THREE.Vector3, isFirstPerson?: boolean): void {
    if (cameraPosition) {
      this.cameraPosition.copy(cameraPosition);
    }
    if (isFirstPerson !== undefined) {
      this.isFirstPerson = isFirstPerson;
    }

    for (const rat of this.rats) {
      // Check distance to player in first person mode
      const distanceToPlayer = rat.position.distanceTo(
        new THREE.Vector3(this.cameraPosition.x, rat.position.y, this.cameraPosition.z)
      );

      // Flee from player in first-person mode
      if (this.isFirstPerson && distanceToPlayer < 4 && rat.state !== 'fleeing') {
        rat.state = 'fleeing';
        const fleeDir = new THREE.Vector3()
          .subVectors(rat.position, new THREE.Vector3(this.cameraPosition.x, rat.position.y, this.cameraPosition.z))
          .normalize();
        const newTarget = rat.position.clone().addScaledVector(fleeDir, 5 + Math.random() * 3);
        // Clamp to bounds
        newTarget.x = Math.max(rat.bounds.minX, Math.min(rat.bounds.maxX, newTarget.x));
        newTarget.z = Math.max(rat.bounds.minZ, Math.min(rat.bounds.maxZ, newTarget.z));
        rat.targetPosition = newTarget;
      }

      // Movement speed based on state
      const speed = rat.state === 'fleeing' ? 4 : rat.state === 'scurrying' ? 2 : 0;

      // State machine
      switch (rat.state) {
        case 'idle':
          rat.idleTimer -= deltaTime;
          rat.bodyBob += deltaTime * 8;
          if (rat.idleTimer <= 0) {
            if (Math.random() < 0.7) {
              rat.state = 'scurrying';
              const angle = Math.random() * Math.PI * 2;
              const dist = 2 + Math.random() * 4;
              const newTarget = rat.position.clone();
              newTarget.x += Math.cos(angle) * dist;
              newTarget.z += Math.sin(angle) * dist;
              newTarget.x = Math.max(rat.bounds.minX, Math.min(rat.bounds.maxX, newTarget.x));
              newTarget.z = Math.max(rat.bounds.minZ, Math.min(rat.bounds.maxZ, newTarget.z));
              rat.targetPosition = newTarget;
            } else {
              rat.state = 'eating';
              rat.idleTimer = 1 + Math.random() * 2;
            }
          }
          break;

        case 'scurrying':
        case 'fleeing':
          if (rat.targetPosition) {
            const direction = new THREE.Vector3().subVectors(rat.targetPosition, rat.position);
            const distance = direction.length();

            if (distance > 0.1) {
              direction.normalize();
              const moveAmount = Math.min(speed * deltaTime, distance);
              rat.position.addScaledVector(direction, moveAmount);
              rat.rotation = Math.atan2(direction.x, direction.z);
              rat.bodyBob += deltaTime * 20;
            } else {
              rat.state = 'idle';
              rat.idleTimer = 1 + Math.random() * 3;
            }
          }
          break;

        case 'eating':
          rat.bodyBob += deltaTime * 4;
          rat.idleTimer -= deltaTime;
          if (rat.idleTimer <= 0) {
            rat.state = 'idle';
            rat.idleTimer = 1 + Math.random() * 2;
          }
          break;
      }

      // Update mesh position and rotation
      rat.mesh.position.copy(rat.position);
      rat.mesh.rotation.y = rat.rotation;

      // Apply body bob animation
      const bobY = Math.sin(rat.bodyBob) * (rat.state === 'scurrying' || rat.state === 'fleeing' ? 0.03 : 0.005);
      rat.mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.position.y += bobY;
        }
      });
    }
  }

  /**
   * Get the group containing all rats
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Dispose of rat meshes
   */
  dispose(): void {
    for (const rat of this.rats) {
      rat.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      this.group.remove(rat.mesh);
    }
    this.rats = [];
  }
}
