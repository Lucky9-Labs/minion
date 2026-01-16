import * as THREE from 'three';

/**
 * First-person camera controller for Golem possession mode.
 * Features heavy stompy camera movement with exaggerated bob and screen shake.
 */

export interface GolemCameraConfig {
  eyeHeight: number;          // Camera height (much higher for golem)
  moveSpeed: number;          // Movement speed (slower for heavy creature)
  mouseSensitivity: number;   // Look sensitivity

  // Stompy effects
  stompBobIntensity: number;  // Vertical bob amplitude
  stompBobFrequency: number;  // Steps per second
  screenShakeIntensity: number; // Shake intensity on step impact
  screenShakeDecay: number;   // How fast shake decays (0-1)
  stepDuration: number;       // Time per step in seconds
}

export const DEFAULT_GOLEM_CAMERA_CONFIG: GolemCameraConfig = {
  eyeHeight: 8.0,             // Much higher than normal (1.6)
  moveSpeed: 3.0,             // Slower than normal (5.0)
  mouseSensitivity: 0.002,

  // Stompy effects
  stompBobIntensity: 0.25,    // Exaggerated vertical bob
  stompBobFrequency: 1.2,     // Slower steps (heavy creature)
  screenShakeIntensity: 0.025, // Subtle but noticeable shake
  screenShakeDecay: 0.85,     // Quick falloff
  stepDuration: 0.6,          // ~1.7 steps per second
};

interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export class GolemCameraController {
  private config: GolemCameraConfig;

  // Position and rotation
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private yaw: number;
  private pitch: number;

  // Input state
  private keys: InputState;
  private mouseDeltaAccum: THREE.Vector2;

  // Stomp animation state
  private stepPhase: number = 0;
  private screenShake: THREE.Vector3;
  private lastStepImpact: number = 0; // Time of last step impact for shake

  // Camera reference
  private camera: THREE.PerspectiveCamera | null = null;

  constructor(config: Partial<GolemCameraConfig> = {}) {
    this.config = { ...DEFAULT_GOLEM_CAMERA_CONFIG, ...config };

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;

    this.keys = {
      forward: false,
      back: false,
      left: false,
      right: false,
    };

    this.mouseDeltaAccum = new THREE.Vector2();
    this.screenShake = new THREE.Vector3();
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  /**
   * Initialize position from golem world position
   */
  setPosition(golemPosition: THREE.Vector3): void {
    this.position.set(
      golemPosition.x,
      golemPosition.y + this.config.eyeHeight,
      golemPosition.z
    );
    this.velocity.set(0, 0, 0);
  }

  /**
   * Set initial yaw (facing direction)
   */
  setYaw(yaw: number): void {
    this.yaw = yaw;
    this.pitch = 0;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getGroundPosition(): THREE.Vector3 {
    const ground = this.position.clone();
    ground.y -= this.config.eyeHeight;
    return ground;
  }

  isMoving(): boolean {
    return this.velocity.lengthSq() > 0.1;
  }

  handleKeyDown(event: KeyboardEvent): void {
    const code = event.code;

    if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = true;
    if (code === 'KeyS' || code === 'ArrowDown') this.keys.back = true;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;
  }

  handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;

    if (code === 'KeyW' || code === 'ArrowUp') this.keys.forward = false;
    if (code === 'KeyS' || code === 'ArrowDown') this.keys.back = false;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
  }

  handleMouseMove(event: MouseEvent): void {
    this.mouseDeltaAccum.x += event.movementX;
    this.mouseDeltaAccum.y += event.movementY;
  }

  resetInput(): void {
    this.keys.forward = false;
    this.keys.back = false;
    this.keys.left = false;
    this.keys.right = false;
    this.mouseDeltaAccum.set(0, 0);
    this.velocity.set(0, 0, 0);
    this.stepPhase = 0;
    this.screenShake.set(0, 0, 0);
  }

  /**
   * Update controller state each frame
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Apply mouse rotation
    this.yaw -= this.mouseDeltaAccum.x * this.config.mouseSensitivity;
    this.pitch -= this.mouseDeltaAccum.y * this.config.mouseSensitivity;
    this.mouseDeltaAccum.set(0, 0);

    // Clamp pitch
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.45, Math.PI * 0.45);

    // Calculate movement direction
    const inputDir = new THREE.Vector3();
    if (this.keys.forward) inputDir.z -= 1;
    if (this.keys.back) inputDir.z += 1;
    if (this.keys.left) inputDir.x -= 1;
    if (this.keys.right) inputDir.x += 1;

    if (inputDir.lengthSq() > 0) {
      inputDir.normalize();
    }

    // Rotate by yaw
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);
    const worldDir = new THREE.Vector3(
      inputDir.x * cosYaw + inputDir.z * sinYaw,
      0,
      -inputDir.x * sinYaw + inputDir.z * cosYaw
    );

    // Calculate velocity (slower acceleration for heavy golem)
    const targetVelocity = worldDir.multiplyScalar(this.config.moveSpeed);

    if (worldDir.lengthSq() > 0) {
      // Slower acceleration - heavy creature
      this.velocity.lerp(targetVelocity, 1 - Math.exp(-5 * deltaTime));
    } else {
      // Slower deceleration - momentum
      this.velocity.lerp(new THREE.Vector3(), 1 - Math.exp(-3 * deltaTime));
    }

    // Update position
    const movement = this.velocity.clone().multiplyScalar(deltaTime);
    this.position.add(movement);

    // Keep at ground level + eye height (simplified - no terrain following for now)
    // In a real implementation, you'd want to check terrain height here
    this.position.y = this.config.eyeHeight;

    // Update stomp animation when moving
    const speed = this.velocity.length();
    if (speed > 0.5) {
      // Advance step phase based on movement speed
      const previousPhase = this.stepPhase;
      this.stepPhase += deltaTime * this.config.stompBobFrequency;
      this.stepPhase %= 1;

      // Detect step impact (phase crossing 0 or 0.5)
      const crossedZero = previousPhase > 0.9 && this.stepPhase < 0.1;
      const crossedHalf = previousPhase < 0.5 && this.stepPhase >= 0.5;

      if (crossedZero || crossedHalf) {
        // Trigger screen shake on step impact
        this.triggerStepShake();
      }
    } else {
      // Smoothly reset phase when stopped
      this.stepPhase = THREE.MathUtils.lerp(this.stepPhase, 0, deltaTime * 3);
    }

    // Decay screen shake
    this.screenShake.multiplyScalar(this.config.screenShakeDecay);

    // Update camera
    if (this.camera) {
      this.updateCamera(speed);
    }
  }

  /**
   * Trigger screen shake effect on step impact
   */
  private triggerStepShake(): void {
    // Add random shake impulse
    this.screenShake.x += (Math.random() - 0.5) * this.config.screenShakeIntensity;
    this.screenShake.y += Math.random() * this.config.screenShakeIntensity * 0.5; // Mostly downward
    this.screenShake.z += (Math.random() - 0.5) * this.config.screenShakeIntensity;
  }

  /**
   * Update camera with stompy effects
   */
  private updateCamera(speed: number): void {
    if (!this.camera) return;

    // Base position
    this.camera.position.copy(this.position);

    // Apply stompy vertical bob when moving
    if (speed > 0.5) {
      // Sine wave bob synced to step phase
      const bobOffset = Math.sin(this.stepPhase * Math.PI * 2) * this.config.stompBobIntensity;
      this.camera.position.y += bobOffset;

      // Slight side-to-side sway (like a heavy creature shifting weight)
      const swayOffset = Math.sin(this.stepPhase * Math.PI) * 0.1;
      this.camera.position.x += swayOffset * Math.cos(this.yaw);
      this.camera.position.z += swayOffset * Math.sin(this.yaw);
    }

    // Apply screen shake
    this.camera.position.add(this.screenShake);

    // Set rotation
    const euler = new THREE.Euler(
      this.pitch + this.screenShake.y * 2, // Shake affects pitch
      this.yaw,
      this.screenShake.x * 2, // Shake affects roll
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(euler);
  }

  /**
   * Get hand sway for viewmodel animation
   */
  getHandSway(): THREE.Vector2 {
    const speed = this.velocity.length();

    // More pronounced sway when stomping
    const bobSway = speed > 0.5 ? Math.sin(this.stepPhase * Math.PI * 2) * 0.1 : 0;

    return new THREE.Vector2(
      this.screenShake.x + bobSway,
      this.screenShake.y + Math.abs(bobSway) * 0.5
    );
  }

  /**
   * Get current step phase for hand animation sync
   */
  getStepPhase(): number {
    return this.stepPhase;
  }
}
