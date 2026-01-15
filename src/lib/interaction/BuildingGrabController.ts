import * as THREE from 'three';

// Grid configuration for building placement
const GRID_SIZE = 2; // 2 unit grid cells
const HOVER_HEIGHT = 3; // Height above ground when moving

export class BuildingGrabController {
  private isActive: boolean = false;
  private projectId: string | null = null;
  private buildingMesh: THREE.Object3D | null = null;
  private originalPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera | null = null;

  // Ground plane for raycasting
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  /**
   * Start moving a building
   */
  grab(projectId: string, buildingMesh: THREE.Object3D): void {
    this.projectId = projectId;
    this.buildingMesh = buildingMesh;
    this.isActive = true;

    // Store original position
    this.originalPosition.copy(buildingMesh.position);
    this.currentPosition.copy(buildingMesh.position);
    this.targetPosition.copy(buildingMesh.position);
    this.targetPosition.y = HOVER_HEIGHT;
  }

  /**
   * Set camera reference for raycasting
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Update target position based on mouse/screen position
   */
  updateTargetFromMouse(mouseX: number, mouseY: number): void {
    if (!this.isActive || !this.camera) return;

    // Create normalized device coordinates
    const ndc = new THREE.Vector2(mouseX, mouseY);

    // Raycast to ground plane
    this.raycaster.setFromCamera(ndc, this.camera);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);

    if (intersectPoint) {
      // Snap to grid
      this.targetPosition.x = Math.round(intersectPoint.x / GRID_SIZE) * GRID_SIZE;
      this.targetPosition.z = Math.round(intersectPoint.z / GRID_SIZE) * GRID_SIZE;
      this.targetPosition.y = HOVER_HEIGHT;
    }
  }

  /**
   * Get the current snapped grid position
   */
  getSnappedPosition(): { x: number; z: number } {
    return {
      x: this.targetPosition.x,
      z: this.targetPosition.z,
    };
  }

  /**
   * Physics update - smooth movement toward target
   */
  update(deltaTime: number): void {
    if (!this.buildingMesh || !this.isActive) return;

    // Smooth interpolation toward target
    const lerpFactor = Math.min(1, deltaTime * 10);
    this.currentPosition.lerp(this.targetPosition, lerpFactor);

    // Update mesh position
    this.buildingMesh.position.copy(this.currentPosition);
  }

  /**
   * Drop the building at current position
   */
  drop(): { projectId: string; newPosition: { x: number; z: number } } | null {
    if (!this.projectId || !this.buildingMesh || !this.isActive) {
      return null;
    }

    const result = {
      projectId: this.projectId,
      newPosition: {
        x: this.targetPosition.x,
        z: this.targetPosition.z,
      },
    };

    // Set final position on ground
    this.buildingMesh.position.x = this.targetPosition.x;
    this.buildingMesh.position.y = 0;
    this.buildingMesh.position.z = this.targetPosition.z;

    // Reset state
    this.isActive = false;
    this.projectId = null;
    this.buildingMesh = null;

    return result;
  }

  /**
   * Cancel move and restore original position
   */
  cancel(): void {
    if (this.buildingMesh) {
      this.buildingMesh.position.copy(this.originalPosition);
    }

    this.isActive = false;
    this.projectId = null;
    this.buildingMesh = null;
  }

  isMoving(): boolean {
    return this.isActive && this.buildingMesh !== null;
  }

  getMovingProjectId(): string | null {
    return this.projectId;
  }

  getMovingMesh(): THREE.Object3D | null {
    return this.buildingMesh;
  }

  getTargetPosition(): THREE.Vector3 {
    return this.targetPosition.clone();
  }

  dispose(): void {
    this.cancel();
  }
}
