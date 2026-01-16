import * as THREE from 'three';

export type BuildingMovePhase = 'idle' | 'lifting' | 'moving' | 'committing' | 'cancelling';

interface BuildingMoveState {
  buildingId: string;
  buildingMesh: THREE.Object3D;
  originalPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  footprint: { width: number; depth: number };
}

const LIFT_HEIGHT = 2.5;
const LIFT_SPEED = 8; // units per second
const MOVE_SPEED = 12; // units per second for commit animation

export class BuildingMoveController {
  private phase: BuildingMovePhase = 'idle';
  private state: BuildingMoveState | null = null;
  private currentLiftHeight: number = 0;
  private liftedPosition: THREE.Vector3 = new THREE.Vector3();

  // Grid snapping
  private cellSize: number = 1;

  // Callbacks
  private onCommitCallback: ((buildingId: string, newPosition: { x: number; z: number }) => void) | null = null;
  private onCancelCallback: ((buildingId: string) => void) | null = null;

  constructor(cellSize: number = 1) {
    this.cellSize = cellSize;
  }

  /**
   * Set callback for when move is committed
   */
  setOnCommit(callback: (buildingId: string, newPosition: { x: number; z: number }) => void): void {
    this.onCommitCallback = callback;
  }

  /**
   * Set callback for when move is cancelled
   */
  setOnCancel(callback: (buildingId: string) => void): void {
    this.onCancelCallback = callback;
  }

  /**
   * Start moving a building - begins lift animation
   */
  startMove(buildingId: string, buildingMesh: THREE.Object3D): void {
    // Calculate footprint from mesh bounds
    const box = new THREE.Box3().setFromObject(buildingMesh);
    const size = box.getSize(new THREE.Vector3());

    this.state = {
      buildingId,
      buildingMesh,
      originalPosition: buildingMesh.position.clone(),
      targetPosition: buildingMesh.position.clone(),
      footprint: {
        width: size.x,
        depth: size.z,
      },
    };

    this.currentLiftHeight = 0;
    this.liftedPosition.copy(buildingMesh.position);
    this.phase = 'lifting';
  }

  /**
   * Update target position (called when cursor moves)
   */
  updateTargetPosition(worldPos: THREE.Vector3): void {
    if (!this.state || this.phase === 'idle' || this.phase === 'committing' || this.phase === 'cancelling') {
      return;
    }

    // Snap to grid
    this.state.targetPosition.x = Math.round(worldPos.x / this.cellSize) * this.cellSize;
    this.state.targetPosition.z = Math.round(worldPos.z / this.cellSize) * this.cellSize;
    this.state.targetPosition.y = 0; // Ground level
  }

  /**
   * Get the current snapped target position for ghost preview
   */
  getTargetPosition(): THREE.Vector3 | null {
    if (!this.state) return null;
    return this.state.targetPosition.clone();
  }

  /**
   * Get the building footprint for ghost preview
   */
  getFootprint(): { width: number; depth: number } | null {
    if (!this.state) return null;
    return { ...this.state.footprint };
  }

  /**
   * Get the original position (for reference)
   */
  getOriginalPosition(): THREE.Vector3 | null {
    if (!this.state) return null;
    return this.state.originalPosition.clone();
  }

  /**
   * Get current phase
   */
  getPhase(): BuildingMovePhase {
    return this.phase;
  }

  /**
   * Get building ID being moved
   */
  getBuildingId(): string | null {
    return this.state?.buildingId ?? null;
  }

  /**
   * Check if actively moving
   */
  isActive(): boolean {
    return this.phase !== 'idle';
  }

  /**
   * Check if in moving phase (ready to place)
   */
  isMoving(): boolean {
    return this.phase === 'moving';
  }

  /**
   * Commit the move - animate to target position
   */
  commit(): void {
    if (!this.state || this.phase !== 'moving') return;
    this.phase = 'committing';
  }

  /**
   * Cancel the move - animate back to original position
   */
  cancel(): void {
    if (!this.state || this.phase === 'idle') return;
    this.phase = 'cancelling';
  }

  /**
   * Update animations
   * Returns true if still animating, false if done
   */
  update(deltaTime: number): boolean {
    if (!this.state || this.phase === 'idle') return false;

    switch (this.phase) {
      case 'lifting':
        return this.updateLift(deltaTime);
      case 'moving':
        return this.updateMoving(deltaTime);
      case 'committing':
        return this.updateCommit(deltaTime);
      case 'cancelling':
        return this.updateCancel(deltaTime);
      default:
        return false;
    }
  }

  private updateLift(deltaTime: number): boolean {
    if (!this.state) return false;

    // Animate lift
    this.currentLiftHeight = Math.min(
      this.currentLiftHeight + deltaTime * LIFT_SPEED,
      LIFT_HEIGHT
    );

    // Update building position
    this.liftedPosition.y = this.state.originalPosition.y + this.currentLiftHeight;
    this.state.buildingMesh.position.y = this.liftedPosition.y;

    // Transition to moving phase when lift is complete
    if (this.currentLiftHeight >= LIFT_HEIGHT) {
      this.phase = 'moving';
    }

    return true;
  }

  private updateMoving(_deltaTime: number): boolean {
    if (!this.state) return false;

    // Keep building at lifted height
    // The XZ position stays at original during moving phase
    // Ghost preview shows where it will land
    this.state.buildingMesh.position.y = this.state.originalPosition.y + LIFT_HEIGHT;

    return true;
  }

  private updateCommit(deltaTime: number): boolean {
    if (!this.state) return false;

    const building = this.state.buildingMesh;
    const target = this.state.targetPosition.clone();
    target.y = this.state.originalPosition.y; // Ground level (preserve original Y)

    // Calculate direction and distance
    const current = building.position.clone();
    const direction = target.clone().sub(current);
    const distance = direction.length();

    if (distance < 0.05) {
      // Snap to final position
      building.position.copy(target);

      // Fire callback and reset
      const buildingId = this.state.buildingId;
      const newPosition = { x: target.x, z: target.z };
      this.reset();
      this.onCommitCallback?.(buildingId, newPosition);
      return false;
    }

    // Move toward target
    direction.normalize();
    const moveAmount = Math.min(deltaTime * MOVE_SPEED, distance);
    building.position.add(direction.multiplyScalar(moveAmount));

    return true;
  }

  private updateCancel(deltaTime: number): boolean {
    if (!this.state) return false;

    const building = this.state.buildingMesh;
    const target = this.state.originalPosition;

    // Calculate direction and distance
    const current = building.position.clone();
    const direction = target.clone().sub(current);
    const distance = direction.length();

    if (distance < 0.05) {
      // Snap to original position
      building.position.copy(target);

      // Fire callback and reset
      const buildingId = this.state.buildingId;
      this.reset();
      this.onCancelCallback?.(buildingId);
      return false;
    }

    // Move toward original
    direction.normalize();
    const moveAmount = Math.min(deltaTime * MOVE_SPEED, distance);
    building.position.add(direction.multiplyScalar(moveAmount));

    return true;
  }

  private reset(): void {
    this.state = null;
    this.phase = 'idle';
    this.currentLiftHeight = 0;
  }

  dispose(): void {
    this.reset();
  }
}
