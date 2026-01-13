import * as THREE from 'three';
import { SpringArm, SpringArmConfig } from './SpringArm';
import { FirstPersonController, FirstPersonConfig, DEFAULT_FIRST_PERSON_CONFIG } from './FirstPersonController';

export type CameraMode = 'isometric' | 'conversation' | 'firstPerson';

export interface ConversationFraming {
  minionPosition: THREE.Vector3;
  wizardPosition: THREE.Vector3;
}

export interface CameraControllerConfig {
  // Isometric settings
  isometricFrustumSize: number;
  isometricDistance: number;
  isometricPolarAngle: number; // Angle from vertical (radians)

  // Conversation settings
  conversationFov: number;
  conversationDistance: number;
  conversationHeight: number; // How high above ground the camera should be

  // Transition settings
  transitionDuration: number; // seconds

  // Spring arm for collision avoidance
  springArm: SpringArmConfig;

  // First person settings
  firstPerson: FirstPersonConfig;
}

export const DEFAULT_CAMERA_CONFIG: CameraControllerConfig = {
  isometricFrustumSize: 35,
  isometricDistance: 50,
  isometricPolarAngle: Math.PI / 4, // 45 degrees

  conversationFov: 50,
  conversationDistance: 8,
  conversationHeight: 1.5,

  transitionDuration: 0.8,

  springArm: {
    idealDistance: 8,
    minDistance: 3,
    maxDistance: 15,
    collisionRadius: 0.5,
    smoothSpeed: 5,
  },

  firstPerson: DEFAULT_FIRST_PERSON_CONFIG,
};

interface TransitionState {
  active: boolean;
  progress: number; // 0 to 1
  duration: number;

  // Starting values
  startPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  startZoom: number;

  // Ending values
  endPosition: THREE.Vector3;
  endTarget: THREE.Vector3;

  // Camera switch happens at midpoint
  switchedCamera: boolean;
  targetMode: CameraMode;
}

export class CameraController {
  private orthoCamera: THREE.OrthographicCamera;
  private perspCamera: THREE.PerspectiveCamera;
  private activeCamera: THREE.Camera;

  private mode: CameraMode = 'isometric';
  private config: CameraControllerConfig;
  private springArm: SpringArm;
  private firstPersonController: FirstPersonController;

  private transition: TransitionState = {
    active: false,
    progress: 0,
    duration: 0,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    startZoom: 1,
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    switchedCamera: false,
    targetMode: 'isometric',
  };

  // Current camera state (interpolated during transitions)
  private currentPosition = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();

  // Collision meshes for spring arm
  private collisionMeshes: THREE.Mesh[] = [];

  constructor(
    container: HTMLElement,
    config: Partial<CameraControllerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };

    const aspect = container.clientWidth / container.clientHeight;
    const fs = this.config.isometricFrustumSize;

    // Create orthographic camera for isometric view
    this.orthoCamera = new THREE.OrthographicCamera(
      -fs * aspect,
      fs * aspect,
      fs,
      -fs,
      0.1,
      500
    );

    // Create perspective camera for conversation view
    this.perspCamera = new THREE.PerspectiveCamera(
      this.config.conversationFov,
      aspect,
      0.1,
      500
    );

    // Start in isometric mode
    this.activeCamera = this.orthoCamera;
    this.initializeIsometricPosition();

    // Create spring arm for collision avoidance
    this.springArm = new SpringArm(this.config.springArm);

    // Create first person controller
    this.firstPersonController = new FirstPersonController(this.config.firstPerson);
    this.firstPersonController.setCamera(this.perspCamera);
  }

  private initializeIsometricPosition(): void {
    const d = this.config.isometricDistance;
    this.orthoCamera.position.set(d, d * 0.6, d);
    this.orthoCamera.lookAt(0, 2, 0);
    this.orthoCamera.zoom = 1.0;
    this.orthoCamera.updateProjectionMatrix();

    this.currentPosition.copy(this.orthoCamera.position);
    this.currentTarget.set(0, 2, 0);
  }

  /**
   * Get the currently active camera
   */
  getCamera(): THREE.Camera {
    return this.activeCamera;
  }

  /**
   * Get the orthographic camera (for OrbitControls in isometric mode)
   */
  getOrthoCamera(): THREE.OrthographicCamera {
    return this.orthoCamera;
  }

  /**
   * Get the perspective camera (for first-person/conversation modes)
   */
  getPerspCamera(): THREE.PerspectiveCamera {
    return this.perspCamera;
  }

  /**
   * Get current camera mode
   */
  getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Check if currently transitioning
   */
  isTransitioning(): boolean {
    return this.transition.active;
  }

  /**
   * Set collision meshes for spring arm
   */
  setCollisionMeshes(meshes: THREE.Mesh[]): void {
    this.collisionMeshes = meshes;
    this.springArm.setCollisionMeshes(meshes);
  }

  /**
   * Add a collision mesh
   */
  addCollisionMesh(mesh: THREE.Mesh): void {
    this.collisionMeshes.push(mesh);
    this.springArm.setCollisionMeshes(this.collisionMeshes);
  }

  /**
   * Transition to conversation mode focused on a minion
   */
  enterConversation(framing: ConversationFraming): void {
    if (this.transition.active && this.transition.targetMode === 'conversation') {
      // Already transitioning to conversation - update target
      this.calculateConversationCamera(framing);
      return;
    }

    // Calculate target camera position for conversation
    const { position, target } = this.calculateConversationCamera(framing);

    this.startTransition('conversation', position, target);
  }

  /**
   * Smoothly transition to a different minion during conversation
   */
  transitionToMinion(framing: ConversationFraming): void {
    if (this.mode !== 'conversation' && !this.transition.active) {
      // Not in conversation mode, do full enter
      this.enterConversation(framing);
      return;
    }

    const { position, target } = this.calculateConversationCamera(framing);

    // Shorter transition for minion-to-minion
    this.startTransition('conversation', position, target, this.config.transitionDuration * 0.6);
  }

  /**
   * Exit conversation mode and return to isometric view
   */
  exitConversation(orbitTarget?: THREE.Vector3): void {
    // Calculate return position based on current orbit target or default
    const target = orbitTarget || new THREE.Vector3(0, 2, 0);
    const d = this.config.isometricDistance;

    // Return to isometric position looking at target
    const position = new THREE.Vector3(
      target.x + d,
      target.y + d * 0.6,
      target.z + d
    );

    this.startTransition('isometric', position, target);
  }

  /**
   * Enter first person mode at the given position and rotation
   */
  enterFirstPerson(position: THREE.Vector3, yaw: number = 0): void {
    if (this.mode === 'conversation' || this.transition.active) {
      return; // Don't allow first person during conversation or transition
    }

    // Set up first person controller
    this.firstPersonController.setPosition(position, yaw);

    // Start transition - dolly into the position
    const eyePosition = position.clone();
    eyePosition.y += this.config.firstPerson.eyeHeight;

    // Calculate a target point in front of the camera based on yaw
    const lookDir = new THREE.Vector3(
      Math.sin(yaw),
      0,
      Math.cos(yaw)
    );
    const target = eyePosition.clone().add(lookDir.multiplyScalar(10));

    this.startTransition('firstPerson', eyePosition, target, 0.5);
  }

  /**
   * Exit first person mode and return to isometric view
   */
  exitFirstPerson(): void {
    if (this.mode !== 'firstPerson' && this.transition.targetMode !== 'firstPerson') {
      return;
    }

    // Reset first person input state
    this.firstPersonController.resetInput();

    // Get current position from first person controller
    const currentPos = this.firstPersonController.getGroundPosition();

    // Calculate isometric camera position centered on current location
    const d = this.config.isometricDistance;
    const position = new THREE.Vector3(
      currentPos.x + d,
      currentPos.y + d * 0.6,
      currentPos.z + d
    );
    const target = currentPos.clone();
    target.y += 2; // Look slightly above ground

    this.startTransition('isometric', position, target, 0.5);
  }

  /**
   * Get the first person controller for external input handling
   */
  getFirstPersonController(): FirstPersonController {
    return this.firstPersonController;
  }

  /**
   * Check if in first person mode (or transitioning to it)
   */
  isFirstPerson(): boolean {
    return this.mode === 'firstPerson' || this.transition.targetMode === 'firstPerson';
  }

  /**
   * Calculate optimal camera position for conversation framing
   * MMO-style: over-the-shoulder view with wizard in left foreground, minion in right background
   */
  private calculateConversationCamera(framing: ConversationFraming): {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } {
    const { minionPosition, wizardPosition } = framing;

    // Target looks at the minion (slightly above their head)
    const target = minionPosition.clone();
    target.y += 0.8; // Look at minion's upper body/head

    // Direction from wizard to minion
    const wizardToMinion = new THREE.Vector3()
      .subVectors(minionPosition, wizardPosition)
      .normalize();

    // Camera is positioned behind and to the left of the wizard
    // Wider angle for better framing of both characters
    const leftOffset = new THREE.Vector3(-wizardToMinion.z, 0, wizardToMinion.x)
      .normalize()
      .multiplyScalar(3.0); // More offset to the left for wider angle

    const backOffset = wizardToMinion.clone().multiplyScalar(-4.0); // Further behind wizard

    const idealPosition = wizardPosition.clone()
      .add(backOffset)
      .add(leftOffset);
    idealPosition.y = wizardPosition.y + this.config.conversationHeight + 0.8;

    // Apply spring arm collision avoidance
    const safePosition = this.springArm.calculateSafePosition(target, idealPosition);

    return { position: safePosition, target };
  }

  /**
   * Start a camera transition
   */
  private startTransition(
    targetMode: CameraMode,
    endPosition: THREE.Vector3,
    endTarget: THREE.Vector3,
    duration?: number
  ): void {
    this.transition.active = true;
    this.transition.progress = 0;
    this.transition.duration = duration ?? this.config.transitionDuration;
    this.transition.targetMode = targetMode;
    this.transition.switchedCamera = false;

    // Store starting state
    this.transition.startPosition.copy(this.currentPosition);
    this.transition.startTarget.copy(this.currentTarget);
    this.transition.startZoom = this.orthoCamera.zoom;

    // Store ending state
    this.transition.endPosition.copy(endPosition);
    this.transition.endTarget.copy(endTarget);
  }

  /**
   * Update camera each frame
   * @returns true if camera position changed (needs re-render)
   */
  update(deltaTime: number): boolean {
    if (!this.transition.active) {
      return false;
    }

    // Advance transition progress
    this.transition.progress += deltaTime / this.transition.duration;

    if (this.transition.progress >= 1) {
      // Transition complete
      this.transition.progress = 1;
      this.transition.active = false;
      this.mode = this.transition.targetMode;
    }

    // Eased progress (ease in-out cubic)
    const t = this.transition.progress;
    const eased = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Interpolate position and target
    this.currentPosition.lerpVectors(
      this.transition.startPosition,
      this.transition.endPosition,
      eased
    );

    this.currentTarget.lerpVectors(
      this.transition.startTarget,
      this.transition.endTarget,
      eased
    );

    // Switch cameras at midpoint of transition
    if (!this.transition.switchedCamera && this.transition.progress >= 0.5) {
      this.transition.switchedCamera = true;

      if (this.transition.targetMode === 'conversation' || this.transition.targetMode === 'firstPerson') {
        this.activeCamera = this.perspCamera;
      } else {
        this.activeCamera = this.orthoCamera;
      }
    }

    // Apply position to active camera (skip for first person - it manages its own camera)
    if (this.transition.targetMode !== 'firstPerson' || this.transition.active) {
      this.activeCamera.position.copy(this.currentPosition);
      this.activeCamera.lookAt(this.currentTarget);
    }

    if (this.activeCamera === this.orthoCamera) {
      this.orthoCamera.updateProjectionMatrix();
    }

    return true;
  }

  /**
   * Update first person mode each frame
   * Call this separately from update() when in first person mode
   */
  updateFirstPerson(
    deltaTime: number,
    heightProvider?: { getHeightAt(x: number, z: number): number },
    collisionMeshes?: THREE.Mesh[]
  ): void {
    if (this.mode !== 'firstPerson') return;

    this.firstPersonController.update(deltaTime, heightProvider, collisionMeshes);

    // Keep current position/target synced for smooth exit transitions
    this.currentPosition.copy(this.firstPersonController.getPosition());
    const { yaw, pitch } = this.firstPersonController.getRotation();
    const lookDir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    );
    this.currentTarget.copy(this.currentPosition).add(lookDir.multiplyScalar(10));
  }

  /**
   * Sync orthographic camera state from OrbitControls
   * Call this after controls.update() in isometric mode
   */
  syncFromOrbitControls(controlsTarget: THREE.Vector3): void {
    if (this.mode === 'isometric' && !this.transition.active) {
      this.currentPosition.copy(this.orthoCamera.position);
      this.currentTarget.copy(controlsTarget);
    }
  }

  /**
   * Handle window resize
   */
  handleResize(width: number, height: number): void {
    const aspect = width / height;

    // Update orthographic camera
    const fs = this.config.isometricFrustumSize;
    this.orthoCamera.left = -fs * aspect;
    this.orthoCamera.right = fs * aspect;
    this.orthoCamera.top = fs;
    this.orthoCamera.bottom = -fs;
    this.orthoCamera.updateProjectionMatrix();

    // Update perspective camera
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();
  }

  /**
   * Get current target position (for UI or other systems)
   */
  getCurrentTarget(): THREE.Vector3 {
    return this.currentTarget.clone();
  }

  /**
   * Get current camera position
   */
  getCurrentPosition(): THREE.Vector3 {
    return this.currentPosition.clone();
  }

  dispose(): void {
    // Cameras don't need explicit disposal in Three.js
    // but we clear references
    this.collisionMeshes = [];
  }
}
