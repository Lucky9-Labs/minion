import * as THREE from 'three';

export interface FirstPersonConfig {
  moveSpeed: number;           // Units per second
  sprintMultiplier: number;    // Sprint speed multiplier
  mouseSensitivity: number;    // Radians per pixel
  eyeHeight: number;           // Camera height above ground
  acceleration: number;        // Movement acceleration
  deceleration: number;        // Friction/drag when no input
  pitchLimit: number;          // Max pitch in radians (prevents gimbal lock)
  // Flight configuration
  flightSpeedMultiplier: number;  // Speed reduction while flying (e.g., 0.3)
  flightAscendSpeed: number;      // Vertical ascend speed (units/sec)
  flightDescendSpeed: number;     // Vertical descend speed (units/sec)
  flightHoverHeight: number;      // Minimum hover height above ground
}

export const DEFAULT_FIRST_PERSON_CONFIG: FirstPersonConfig = {
  moveSpeed: 5,
  sprintMultiplier: 1.6,
  mouseSensitivity: 0.002,
  eyeHeight: 1.6,
  acceleration: 20,
  deceleration: 12,
  pitchLimit: Math.PI * 0.45, // ~81 degrees
  // Flight defaults
  flightSpeedMultiplier: 0.3,     // 30% of normal speed
  flightAscendSpeed: 2.5,
  flightDescendSpeed: 3.0,
  flightHoverHeight: 0.75,        // ~0.75 units above ground
};

// Key bindings for movement
const KEY_BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
} as const;

interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  ascend: boolean;   // Space key while flying
  descend: boolean;  // Ctrl key while flying
}

interface HeightProvider {
  getHeightAt(x: number, z: number): number;
}

export class FirstPersonController {
  private config: FirstPersonConfig;

  // Position and rotation state
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private yaw: number;   // Horizontal rotation (around Y axis)
  private pitch: number; // Vertical rotation (around X axis)

  // Input state
  private keys: InputState;
  private mouseDelta: THREE.Vector2;
  private mouseDeltaAccum: THREE.Vector2; // Accumulated delta for smooth application

  // Camera reference (updated externally)
  private camera: THREE.PerspectiveCamera | null = null;

  // View bob state
  private bobPhase: number = 0;
  private bobIntensity: number = 0;

  // Collision settings
  private collisionRadius: number = 0.3;

  // Flight state
  private isFlying: boolean = false;
  private flightVerticalVelocity: number = 0;

  constructor(config: Partial<FirstPersonConfig> = {}) {
    this.config = { ...DEFAULT_FIRST_PERSON_CONFIG, ...config };

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;

    this.keys = {
      forward: false,
      back: false,
      left: false,
      right: false,
      sprint: false,
      ascend: false,
      descend: false,
    };

    this.mouseDelta = new THREE.Vector2();
    this.mouseDeltaAccum = new THREE.Vector2();
  }

  /**
   * Set the camera to control
   */
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  /**
   * Initialize position and rotation
   */
  setPosition(position: THREE.Vector3, yaw: number = 0): void {
    this.position.copy(position);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
  }

  /**
   * Get current position (eye level)
   */
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * Get position at ground level (for character mesh)
   */
  getGroundPosition(): THREE.Vector3 {
    const ground = this.position.clone();
    ground.y -= this.config.eyeHeight;
    return ground;
  }

  /**
   * Get current rotation
   */
  getRotation(): { yaw: number; pitch: number } {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /**
   * Get current velocity for animation purposes
   */
  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  /**
   * Check if currently moving
   */
  isMoving(): boolean {
    return this.velocity.lengthSq() > 0.1;
  }

  /**
   * Get current bob offset for view bobbing
   */
  getBobOffset(): number {
    return Math.sin(this.bobPhase) * this.bobIntensity * 0.05;
  }

  /**
   * Handle keydown events
   */
  handleKeyDown(event: KeyboardEvent): void {
    const code = event.code;

    // Use simple string comparison to avoid TypeScript casting issues
    if (code === 'KeyW' || code === 'ArrowUp') {
      this.keys.forward = true;
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      this.keys.back = true;
    }
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.keys.left = true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      this.keys.right = true;
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.keys.sprint = true;
    }
    if (code === 'Space') {
      this.keys.ascend = true;
    }
    if (code === 'ControlLeft' || code === 'ControlRight') {
      this.keys.descend = true;
    }
  }

  /**
   * Handle keyup events
   */
  handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;

    if (code === 'KeyW' || code === 'ArrowUp') {
      this.keys.forward = false;
    }
    if (code === 'KeyS' || code === 'ArrowDown') {
      this.keys.back = false;
    }
    if (code === 'KeyA' || code === 'ArrowLeft') {
      this.keys.left = false;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      this.keys.right = false;
    }
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      this.keys.sprint = false;
    }
    if (code === 'Space') {
      this.keys.ascend = false;
    }
    if (code === 'ControlLeft' || code === 'ControlRight') {
      this.keys.descend = false;
    }
  }

  /**
   * Handle mouse movement (only call when pointer is locked)
   */
  handleMouseMove(event: MouseEvent): void {
    this.mouseDeltaAccum.x += event.movementX;
    this.mouseDeltaAccum.y += event.movementY;
  }

  /**
   * Reset all input state (call when exiting first person mode)
   */
  resetInput(): void {
    this.keys.forward = false;
    this.keys.back = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.sprint = false;
    this.keys.ascend = false;
    this.keys.descend = false;
    this.mouseDelta.set(0, 0);
    this.mouseDeltaAccum.set(0, 0);
    this.velocity.set(0, 0, 0);
    // Reset flight state
    this.isFlying = false;
    this.flightVerticalVelocity = 0;
  }

  /**
   * Update controller state each frame
   */
  update(
    deltaTime: number,
    heightProvider?: HeightProvider,
    collisionMeshes?: THREE.Mesh[]
  ): void {
    // Apply accumulated mouse movement
    this.mouseDelta.copy(this.mouseDeltaAccum);
    this.mouseDeltaAccum.set(0, 0);

    // Update rotation from mouse input
    this.yaw -= this.mouseDelta.x * this.config.mouseSensitivity;
    this.pitch -= this.mouseDelta.y * this.config.mouseSensitivity;

    // Clamp pitch to prevent gimbal lock
    this.pitch = THREE.MathUtils.clamp(
      this.pitch,
      -this.config.pitchLimit,
      this.config.pitchLimit
    );

    // Calculate movement direction from input
    const inputDir = new THREE.Vector3();

    if (this.keys.forward) inputDir.z -= 1;
    if (this.keys.back) inputDir.z += 1;
    if (this.keys.left) inputDir.x -= 1;
    if (this.keys.right) inputDir.x += 1;

    // Normalize diagonal movement
    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
    }

    // Rotate input direction by yaw (horizontal rotation only)
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const worldDir = new THREE.Vector3(
      inputDir.x * cosYaw + inputDir.z * sinYaw,
      0,
      -inputDir.x * sinYaw + inputDir.z * cosYaw
    );

    // Calculate target velocity (reduced while flying)
    const baseSpeed = this.keys.sprint
      ? this.config.moveSpeed * this.config.sprintMultiplier
      : this.config.moveSpeed;

    const speed = this.isFlying
      ? baseSpeed * this.config.flightSpeedMultiplier
      : baseSpeed;

    const targetVelocity = worldDir.multiplyScalar(speed);

    // Apply acceleration/deceleration
    if (worldDir.lengthSq() > 0) {
      // Accelerate toward target
      this.velocity.lerp(targetVelocity, 1 - Math.exp(-this.config.acceleration * deltaTime));
    } else {
      // Decelerate when no input
      this.velocity.lerp(new THREE.Vector3(), 1 - Math.exp(-this.config.deceleration * deltaTime));
    }

    // Calculate new position
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    let newPosition = this.position.clone().add(movement);

    // Collision detection with slide
    if (collisionMeshes && collisionMeshes.length > 0) {
      newPosition = this.resolveCollisions(newPosition, collisionMeshes);
    }

    // Apply terrain height or flight physics
    if (heightProvider) {
      const groundHeight = heightProvider.getHeightAt(newPosition.x, newPosition.z);

      if (this.isFlying) {
        // Handle vertical movement while flying
        if (this.keys.ascend) {
          this.flightVerticalVelocity = this.config.flightAscendSpeed;
        } else if (this.keys.descend) {
          this.flightVerticalVelocity = -this.config.flightDescendSpeed;
        } else {
          // Gentle hover deceleration
          this.flightVerticalVelocity *= 0.9;
        }

        newPosition.y += this.flightVerticalVelocity * deltaTime;

        // Check ground collision for exit
        const minFlightHeight = groundHeight + this.config.eyeHeight + this.config.flightHoverHeight;

        if (newPosition.y <= minFlightHeight && this.flightVerticalVelocity <= 0) {
          // Landing - exit flight mode
          this.isFlying = false;
          this.flightVerticalVelocity = 0;
          newPosition.y = groundHeight + this.config.eyeHeight;
        }
      } else {
        // Normal ground following
        newPosition.y = groundHeight + this.config.eyeHeight;
      }
    }

    this.position.copy(newPosition);

    // Update view bob (disabled while flying for smooth hover)
    const currentSpeed = this.velocity.length();
    if (!this.isFlying) {
      this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, currentSpeed > 0.5 ? 1 : 0, deltaTime * 8);
      this.bobPhase += deltaTime * currentSpeed * 2.5;
    } else {
      // Smooth fade out of bob while flying
      this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, 0, deltaTime * 4);
    }

    // Update camera if set
    if (this.camera) {
      this.updateCamera();
    }
  }

  /**
   * Resolve collisions using simple sphere vs AABB with slide
   */
  private resolveCollisions(desiredPosition: THREE.Vector3, meshes: THREE.Mesh[]): THREE.Vector3 {
    const result = desiredPosition.clone();
    const testPoint = result.clone();
    testPoint.y -= this.config.eyeHeight - 0.5; // Test at body center, not eye level

    for (const mesh of meshes) {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }

      const box = mesh.geometry.boundingBox!.clone();
      box.applyMatrix4(mesh.matrixWorld);

      // Expand box by collision radius
      box.expandByScalar(this.collisionRadius);

      if (box.containsPoint(testPoint)) {
        // Find closest face and push out
        const center = new THREE.Vector3();
        box.getCenter(center);

        const toCenter = testPoint.clone().sub(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Find which axis has smallest penetration
        const penetrationX = (size.x / 2) - Math.abs(toCenter.x);
        const penetrationZ = (size.z / 2) - Math.abs(toCenter.z);

        // Push out along axis of least penetration (slide along walls)
        if (penetrationX < penetrationZ) {
          result.x = this.position.x; // Revert X movement
        } else {
          result.z = this.position.z; // Revert Z movement
        }
      }
    }

    return result;
  }

  /**
   * Update camera position and rotation
   */
  private updateCamera(): void {
    if (!this.camera) return;

    // Apply position with view bob
    this.camera.position.copy(this.position);
    this.camera.position.y += this.getBobOffset();

    // Calculate look direction from yaw and pitch
    // Create rotation quaternion
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Get hand sway offset based on recent mouse movement
   */
  getHandSway(): THREE.Vector2 {
    return new THREE.Vector2(
      -this.mouseDelta.x * 0.0005,
      -this.mouseDelta.y * 0.0005
    );
  }

  // ==================== Flight API ====================

  /**
   * Start flight mode with initial lift
   */
  startFlight(): void {
    if (!this.isFlying) {
      this.isFlying = true;
      this.flightVerticalVelocity = this.config.flightAscendSpeed * 0.5; // Initial lift
    }
  }

  /**
   * Stop flight mode immediately
   */
  stopFlight(): void {
    this.isFlying = false;
    this.flightVerticalVelocity = 0;
  }

  /**
   * Check if currently flying
   */
  getIsFlying(): boolean {
    return this.isFlying;
  }

  /**
   * Get flight vertical velocity (for effects)
   */
  getFlightVerticalVelocity(): number {
    return this.flightVerticalVelocity;
  }
}
