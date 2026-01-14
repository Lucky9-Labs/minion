import * as THREE from 'three';
import type { SpringConfig } from '@/types/interaction';
import { DEFAULT_SPRING_CONFIG } from '@/types/interaction';

export class ForceGrabController {
  private config: SpringConfig;
  private targetPosition: THREE.Vector3;
  private currentVelocity: THREE.Vector3;
  private grabbedMesh: THREE.Object3D | null = null;
  private grabbedEntityId: string | null = null;
  private isActive: boolean = false;

  // Store original position to restore on cancel
  private originalPosition: THREE.Vector3 = new THREE.Vector3();
  private originalRotation: THREE.Euler = new THREE.Euler();

  // Grab distance from camera
  private grabDistance: number = 3;

  // Throw configuration
  private throwForce: number = 80; // MAXIMUM RUTHLESS velocity for throws

  // Camera reference for throw direction
  private camera: THREE.PerspectiveCamera | null = null;

  // For visual rotation during grab (ragdoll wobble)
  private rotationVelocity: THREE.Vector3 = new THREE.Vector3();
  private wobblePhase: THREE.Vector3 = new THREE.Vector3();
  private wobbleFrequency: THREE.Vector3 = new THREE.Vector3();

  constructor(config?: Partial<SpringConfig>) {
    this.config = { ...DEFAULT_SPRING_CONFIG, ...config };
    this.targetPosition = new THREE.Vector3();
    this.currentVelocity = new THREE.Vector3();
  }

  /**
   * Start grabbing an entity
   */
  grab(entityId: string, mesh: THREE.Object3D): void {
    this.grabbedMesh = mesh;
    this.grabbedEntityId = entityId;
    this.isActive = true;

    // Store original transform
    this.originalPosition.copy(mesh.position);
    this.originalRotation.copy(mesh.rotation);

    // Reset velocity
    this.currentVelocity.set(0, 0, 0);

    // Random rotation velocity for tumbling
    this.rotationVelocity.set(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 6, // More spin on Y axis
      (Math.random() - 0.5) * 4
    );

    // Random wobble parameters for chaotic floating
    this.wobblePhase.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    this.wobbleFrequency.set(
      2 + Math.random() * 3,
      3 + Math.random() * 2,
      2 + Math.random() * 3
    );

    // Set initial target to current position
    this.targetPosition.copy(mesh.position);
  }

  /**
   * Update target position based on camera
   */
  updateTargetFromCamera(camera: THREE.PerspectiveCamera): void {
    if (!this.isActive) return;

    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    this.targetPosition.copy(camera.position).add(direction.multiplyScalar(this.grabDistance));
  }

  /**
   * Set target position directly
   */
  setTargetPosition(position: THREE.Vector3): void {
    this.targetPosition.copy(position);
  }

  /**
   * Set camera reference for throw direction calculation
   */
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  /**
   * Release with optional throw velocity
   */
  release(throwVelocity?: THREE.Vector3): THREE.Vector3 {
    if (!this.grabbedMesh) {
      return new THREE.Vector3();
    }

    const releaseVelocity = throwVelocity || this.currentVelocity.clone();

    this.isActive = false;
    this.grabbedMesh = null;
    this.grabbedEntityId = null;
    this.currentVelocity.set(0, 0, 0);

    return releaseVelocity;
  }

  /**
   * Throw the grabbed entity in the camera's look direction with ruthless force
   * Returns the throw velocity for physics simulation
   */
  throw(): { entityId: string; velocity: THREE.Vector3; position: THREE.Vector3 } | null {
    if (!this.grabbedMesh || !this.isActive || !this.camera) {
      return null;
    }

    // Calculate throw direction from camera
    const throwDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);

    // Add slight upward arc for dramatic effect
    throwDirection.y += 0.15;
    throwDirection.normalize();

    // High velocity throw
    const throwVelocity = throwDirection.multiplyScalar(this.throwForce);

    // Get final position and entity ID
    const entityId = this.grabbedEntityId!;
    const position = this.grabbedMesh.position.clone();

    // Reset state
    this.isActive = false;
    this.grabbedMesh = null;
    this.grabbedEntityId = null;
    this.currentVelocity.set(0, 0, 0);

    return { entityId, velocity: throwVelocity, position };
  }

  /**
   * Cancel grab and restore original position
   */
  cancel(): void {
    if (this.grabbedMesh) {
      this.grabbedMesh.position.copy(this.originalPosition);
      this.grabbedMesh.rotation.copy(this.originalRotation);
    }

    this.isActive = false;
    this.grabbedMesh = null;
    this.grabbedEntityId = null;
    this.currentVelocity.set(0, 0, 0);
  }

  /**
   * Physics update (call in animation loop)
   */
  update(deltaTime: number): void {
    if (!this.grabbedMesh || !this.isActive) return;

    const currentPos = this.grabbedMesh.position;
    const displacement = this.targetPosition.clone().sub(currentPos);

    // Spring force: F = k * x
    const springForce = displacement.clone().multiplyScalar(this.config.stiffness);

    // Critical damping coefficient: c = 2 * sqrt(k * m)
    const criticalDamping = 2 * Math.sqrt(this.config.stiffness * this.config.mass);

    // Damping force: F = -c * v * dampingRatio
    const dampingForce = this.currentVelocity.clone()
      .multiplyScalar(-criticalDamping * this.config.damping);

    // Total acceleration: a = F / m
    const totalForce = springForce.add(dampingForce);
    const acceleration = totalForce.divideScalar(this.config.mass);

    // Integrate velocity
    this.currentVelocity.add(acceleration.multiplyScalar(deltaTime));

    // Clamp velocity
    if (this.currentVelocity.length() > this.config.maxVelocity) {
      this.currentVelocity.normalize().multiplyScalar(this.config.maxVelocity);
    }

    // Integrate position
    currentPos.add(this.currentVelocity.clone().multiplyScalar(deltaTime));

    // Update wobble phase
    this.wobblePhase.x += deltaTime * this.wobbleFrequency.x;
    this.wobblePhase.y += deltaTime * this.wobbleFrequency.y;
    this.wobblePhase.z += deltaTime * this.wobbleFrequency.z;

    // Chaotic rotation - spinning tumble + wobble
    this.grabbedMesh.rotation.x += this.rotationVelocity.x * deltaTime;
    this.grabbedMesh.rotation.y += this.rotationVelocity.y * deltaTime;
    this.grabbedMesh.rotation.z += this.rotationVelocity.z * deltaTime;

    // Add wobble overlay for confused floating effect
    const wobbleAmount = 0.15;
    this.grabbedMesh.rotation.x += Math.sin(this.wobblePhase.x) * wobbleAmount * deltaTime * 5;
    this.grabbedMesh.rotation.z += Math.sin(this.wobblePhase.z) * wobbleAmount * deltaTime * 5;

    // Slowly dampen rotation (but keep some chaos)
    this.rotationVelocity.multiplyScalar(0.995);
  }

  /**
   * Get current position of grabbed entity
   */
  getPosition(): THREE.Vector3 | null {
    return this.grabbedMesh?.position.clone() || null;
  }

  /**
   * Get current velocity
   */
  getVelocity(): THREE.Vector3 {
    return this.currentVelocity.clone();
  }

  isGrabbing(): boolean {
    return this.isActive && this.grabbedMesh !== null;
  }

  getGrabbedEntityId(): string | null {
    return this.grabbedEntityId;
  }

  getGrabbedMesh(): THREE.Object3D | null {
    return this.grabbedMesh;
  }

  setGrabDistance(distance: number): void {
    this.grabDistance = distance;
  }

  setThrowForce(force: number): void {
    this.throwForce = force;
  }

  dispose(): void {
    this.cancel();
  }
}
