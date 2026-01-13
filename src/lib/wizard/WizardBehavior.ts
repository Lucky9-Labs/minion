import * as THREE from 'three';

export type WizardState = 'idle' | 'wandering' | 'teleporting' | 'conversing';

export interface WizardBehaviorConfig {
  wanderRadius: number;      // How far from home position
  homePosition: THREE.Vector3;
  idleDurationMin: number;   // Min seconds to idle
  idleDurationMax: number;   // Max seconds to idle
  wanderSpeed: number;       // Movement speed
}

export const DEFAULT_WIZARD_CONFIG: WizardBehaviorConfig = {
  wanderRadius: 8,
  homePosition: new THREE.Vector3(0, 0, 2),
  idleDurationMin: 2,
  idleDurationMax: 5,
  wanderSpeed: 1.5,
};

interface WanderTarget {
  position: THREE.Vector3;
  reached: boolean;
}

/**
 * Manages wizard wandering behavior when not in conversation
 */
export class WizardBehavior {
  private config: WizardBehaviorConfig;
  private state: WizardState = 'idle';
  private idleTimer = 0;
  private target: WanderTarget | null = null;
  private isMoving = false;

  // Callback for checking if position is valid (not inside building, on terrain)
  private getGroundHeight: ((x: number, z: number) => number) | null = null;
  private isInsideBuilding: ((x: number, z: number) => boolean) | null = null;

  constructor(config: Partial<WizardBehaviorConfig> = {}) {
    this.config = { ...DEFAULT_WIZARD_CONFIG, ...config };
    this.resetIdleTimer();
  }

  /**
   * Set callbacks for terrain/building checks
   */
  setCallbacks(
    getGroundHeight: (x: number, z: number) => number,
    isInsideBuilding: (x: number, z: number) => boolean
  ): void {
    this.getGroundHeight = getGroundHeight;
    this.isInsideBuilding = isInsideBuilding;
  }

  /**
   * Get current state
   */
  getState(): WizardState {
    return this.state;
  }

  /**
   * Check if wizard is currently moving
   */
  getIsMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Enter conversation mode (stops wandering)
   */
  enterConversation(): void {
    this.state = 'conversing';
    this.isMoving = false;
    this.target = null;
  }

  /**
   * Exit conversation mode (resume wandering)
   */
  exitConversation(): void {
    this.state = 'idle';
    this.resetIdleTimer();
    this.isMoving = false;
  }

  /**
   * Set teleporting state (during teleport effect)
   */
  setTeleporting(isTeleporting: boolean): void {
    if (isTeleporting) {
      this.state = 'teleporting';
      this.isMoving = false;
    } else if (this.state === 'teleporting') {
      // Return to previous state after teleport
      this.state = 'idle';
      this.resetIdleTimer();
    }
  }

  private resetIdleTimer(): void {
    const { idleDurationMin, idleDurationMax } = this.config;
    this.idleTimer = idleDurationMin + Math.random() * (idleDurationMax - idleDurationMin);
  }

  private selectNewTarget(): void {
    const { wanderRadius, homePosition } = this.config;

    // Try to find a valid position
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Random angle and distance
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * wanderRadius;

      const targetX = homePosition.x + Math.cos(angle) * distance;
      const targetZ = homePosition.z + Math.sin(angle) * distance;

      // Check if position is valid
      if (this.isInsideBuilding && this.isInsideBuilding(targetX, targetZ)) {
        attempts++;
        continue;
      }

      // Get ground height
      const targetY = this.getGroundHeight
        ? this.getGroundHeight(targetX, targetZ)
        : homePosition.y;

      this.target = {
        position: new THREE.Vector3(targetX, targetY, targetZ),
        reached: false,
      };

      this.state = 'wandering';
      this.isMoving = true;
      return;
    }

    // Couldn't find valid target, stay idle longer
    this.resetIdleTimer();
  }

  /**
   * Update wizard behavior
   * @returns Object with movement info if wizard should move, null otherwise
   */
  update(
    deltaTime: number,
    currentPosition: THREE.Vector3
  ): { targetPosition: THREE.Vector3; isMoving: boolean; reachedTarget: boolean } | null {
    // Don't do anything while conversing or teleporting
    if (this.state === 'conversing' || this.state === 'teleporting') {
      return null;
    }

    if (this.state === 'idle') {
      // Count down idle timer
      this.idleTimer -= deltaTime;

      if (this.idleTimer <= 0) {
        // Time to wander to a new spot
        this.selectNewTarget();
      }

      return null;
    }

    if (this.state === 'wandering' && this.target) {
      // Move toward target
      const direction = new THREE.Vector3()
        .subVectors(this.target.position, currentPosition);
      const horizontalDir = new THREE.Vector3(direction.x, 0, direction.z);
      const horizontalDist = horizontalDir.length();

      const moveDistance = this.config.wanderSpeed * deltaTime;

      if (horizontalDist < moveDistance) {
        // Reached target
        this.target.reached = true;
        this.state = 'idle';
        this.isMoving = false;
        this.resetIdleTimer();

        return {
          targetPosition: this.target.position.clone(),
          isMoving: false,
          reachedTarget: true,
        };
      }

      // Calculate new position
      horizontalDir.normalize().multiplyScalar(moveDistance);
      const newX = currentPosition.x + horizontalDir.x;
      const newZ = currentPosition.z + horizontalDir.z;
      const newY = this.getGroundHeight
        ? this.getGroundHeight(newX, newZ)
        : currentPosition.y;

      return {
        targetPosition: new THREE.Vector3(newX, newY, newZ),
        isMoving: true,
        reachedTarget: false,
      };
    }

    return null;
  }

  /**
   * Get the current wander target (for debugging)
   */
  getTarget(): THREE.Vector3 | null {
    return this.target?.position.clone() || null;
  }

  /**
   * Force return to home position
   */
  returnHome(): void {
    this.target = {
      position: this.config.homePosition.clone(),
      reached: false,
    };
    this.state = 'wandering';
    this.isMoving = true;
  }
}
