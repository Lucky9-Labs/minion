import * as THREE from 'three';

export interface SpringArmConfig {
  idealDistance: number; // Desired distance from target
  minDistance: number; // Closest allowed
  maxDistance: number; // Furthest allowed
  collisionRadius: number; // Sphere radius for collision checks
  smoothSpeed: number; // How fast to adjust (lerp factor per second)
}

/**
 * Spring arm camera collision avoidance system.
 * Prevents camera from clipping through geometry by casting rays
 * and pulling the camera closer when obstacles are detected.
 */
export class SpringArm {
  private config: SpringArmConfig;
  private raycaster: THREE.Raycaster;
  private collisionMeshes: THREE.Mesh[] = [];

  // Current actual distance (smoothly adjusts toward target distance)
  private currentDistance: number;
  private targetDistance: number;

  // Ray directions for cone-based collision detection
  private rayDirections: THREE.Vector3[] = [];

  constructor(config: SpringArmConfig) {
    this.config = config;
    this.raycaster = new THREE.Raycaster();
    this.currentDistance = config.idealDistance;
    this.targetDistance = config.idealDistance;

    // Pre-compute ray directions for cone pattern
    this.initRayDirections();
  }

  /**
   * Initialize ray directions for multi-ray collision detection.
   * Uses a cone pattern around the main ray for more robust detection.
   */
  private initRayDirections(): void {
    // Main ray (center)
    this.rayDirections.push(new THREE.Vector3(0, 0, -1));

    // Additional rays in a cone pattern (8 directions)
    const coneAngle = Math.PI / 12; // 15 degrees
    const rayCount = 8;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const dir = new THREE.Vector3(
        Math.sin(coneAngle) * Math.cos(angle),
        Math.sin(coneAngle) * Math.sin(angle),
        -Math.cos(coneAngle)
      );
      this.rayDirections.push(dir.normalize());
    }
  }

  /**
   * Set the meshes to check for collisions
   */
  setCollisionMeshes(meshes: THREE.Mesh[]): void {
    this.collisionMeshes = meshes;
  }

  /**
   * Calculate a safe camera position that avoids collisions.
   * Uses multi-ray casting for robust obstacle detection.
   *
   * @param target - The point the camera should look at
   * @param idealPosition - The ideal camera position (before collision adjustment)
   * @returns Safe camera position
   */
  calculateSafePosition(
    target: THREE.Vector3,
    idealPosition: THREE.Vector3
  ): THREE.Vector3 {
    if (this.collisionMeshes.length === 0) {
      return idealPosition.clone();
    }

    // Direction from target to ideal camera position
    const toCamera = new THREE.Vector3()
      .subVectors(idealPosition, target)
      .normalize();

    const idealDistance = idealPosition.distanceTo(target);

    // Create a rotation matrix to transform our local ray directions
    // to world space (aligned with the target-to-camera direction)
    const rotationMatrix = new THREE.Matrix4();
    const up = new THREE.Vector3(0, 1, 0);

    // Handle edge case where toCamera is parallel to up
    if (Math.abs(toCamera.dot(up)) > 0.99) {
      up.set(1, 0, 0);
    }

    const lookAtMatrix = new THREE.Matrix4().lookAt(
      new THREE.Vector3(),
      toCamera.clone().negate(),
      up
    );
    rotationMatrix.extractRotation(lookAtMatrix);

    // Find the minimum safe distance across all rays
    let minSafeDistance = idealDistance;

    for (const localDir of this.rayDirections) {
      // Transform local ray direction to world space
      const worldDir = localDir.clone().applyMatrix4(rotationMatrix);

      // Cast ray from target toward camera direction
      this.raycaster.set(target, worldDir);
      this.raycaster.far = idealDistance + this.config.collisionRadius;

      const intersects = this.raycaster.intersectObjects(
        this.collisionMeshes,
        true
      );

      if (intersects.length > 0) {
        // Found obstacle - calculate safe distance
        const hitDistance = intersects[0].distance - this.config.collisionRadius;
        minSafeDistance = Math.min(
          minSafeDistance,
          Math.max(hitDistance, this.config.minDistance)
        );
      }
    }

    // Clamp to configured bounds
    minSafeDistance = THREE.MathUtils.clamp(
      minSafeDistance,
      this.config.minDistance,
      this.config.maxDistance
    );

    // Update target distance for smooth interpolation
    this.targetDistance = minSafeDistance;

    // Calculate safe position
    return new THREE.Vector3()
      .copy(target)
      .add(toCamera.multiplyScalar(minSafeDistance));
  }

  /**
   * Update for smooth distance interpolation.
   * Call this each frame for gradual camera distance adjustments.
   *
   * @param deltaTime - Time since last frame in seconds
   * @returns Current interpolated distance
   */
  update(deltaTime: number): number {
    const lerpFactor = 1 - Math.exp(-this.config.smoothSpeed * deltaTime);
    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance,
      this.targetDistance,
      lerpFactor
    );
    return this.currentDistance;
  }

  /**
   * Get the current (smoothed) distance
   */
  getCurrentDistance(): number {
    return this.currentDistance;
  }

  /**
   * Get the target distance (before smoothing)
   */
  getTargetDistance(): number {
    return this.targetDistance;
  }

  /**
   * Immediately set distance without interpolation
   */
  setDistanceImmediate(distance: number): void {
    this.currentDistance = distance;
    this.targetDistance = distance;
  }

  /**
   * Check if camera would collide at a given position
   */
  wouldCollide(target: THREE.Vector3, cameraPosition: THREE.Vector3): boolean {
    if (this.collisionMeshes.length === 0) {
      return false;
    }

    const direction = new THREE.Vector3()
      .subVectors(cameraPosition, target)
      .normalize();
    const distance = cameraPosition.distanceTo(target);

    this.raycaster.set(target, direction);
    this.raycaster.far = distance;

    const intersects = this.raycaster.intersectObjects(
      this.collisionMeshes,
      true
    );

    return intersects.length > 0;
  }
}
