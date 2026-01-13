import * as THREE from 'three';
import { SpringArm, SpringArmConfig } from './SpringArm';

export type CameraMode = 'isometric' | 'conversation';

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
   * Calculate optimal camera position for conversation framing
   */
  private calculateConversationCamera(framing: ConversationFraming): {
    position: THREE.Vector3;
    target: THREE.Vector3;
  } {
    const { minionPosition, wizardPosition } = framing;

    // Target is the midpoint between wizard and minion, slightly elevated
    const target = new THREE.Vector3()
      .addVectors(minionPosition, wizardPosition)
      .multiplyScalar(0.5);
    target.y = Math.max(minionPosition.y, wizardPosition.y) + 0.5;

    // Camera should be positioned to show:
    // - Wizard on left (back to camera)
    // - Minion on right (facing camera)

    // Direction from wizard to minion
    const wizardToMinion = new THREE.Vector3()
      .subVectors(minionPosition, wizardPosition)
      .normalize();

    // Camera position: perpendicular to the wizard-minion line, facing both
    // We want to be slightly behind and to the side of the midpoint
    const perpendicular = new THREE.Vector3(-wizardToMinion.z, 0, wizardToMinion.x);

    // Camera is perpendicular to the conversation line, at conversation distance
    let idealPosition = new THREE.Vector3()
      .copy(target)
      .add(perpendicular.clone().multiplyScalar(this.config.conversationDistance));
    idealPosition.y = target.y + this.config.conversationHeight;

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

      if (this.transition.targetMode === 'conversation') {
        this.activeCamera = this.perspCamera;
      } else {
        this.activeCamera = this.orthoCamera;
      }
    }

    // Apply position to active camera
    this.activeCamera.position.copy(this.currentPosition);
    this.activeCamera.lookAt(this.currentTarget);

    if (this.activeCamera === this.orthoCamera) {
      this.orthoCamera.updateProjectionMatrix();
    }

    return true;
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
