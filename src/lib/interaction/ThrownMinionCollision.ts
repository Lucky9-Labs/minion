/**
 * Collision detection for thrown minions hitting project buildings.
 * Uses raycast-based detection similar to the TargetingSystem.
 */

import * as THREE from 'three';
import type { ProjectBuildingMesh } from '@/lib/projectBuildings';

export interface CollisionResult {
  hit: boolean;
  buildingId: string | null;
  projectId: string | null;
  hitPoint: THREE.Vector3 | null;
  buildingPosition: THREE.Vector3 | null;
}

export class ThrownMinionCollisionDetector {
  private raycaster: THREE.Raycaster;
  private projectBuildings: Map<string, ProjectBuildingMesh>;

  // Collision detection parameters
  private readonly MINION_RADIUS = 0.5; // Approximate minion collision radius
  private readonly BUILDING_COLLISION_RADIUS = 4; // Broad phase check radius
  private readonly RAY_LENGTH = 2; // How far ahead to check for collision

  constructor(projectBuildings: Map<string, ProjectBuildingMesh>) {
    this.projectBuildings = projectBuildings;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.RAY_LENGTH;
  }

  /**
   * Update the project buildings reference (called when buildings change)
   */
  updateBuildingsRef(projectBuildings: Map<string, ProjectBuildingMesh>): void {
    this.projectBuildings = projectBuildings;
  }

  /**
   * Check if a thrown minion at the given position/velocity collides with a project building.
   *
   * @param position Current minion position
   * @param velocity Current minion velocity
   * @param _deltaTime Time since last frame (reserved for future predictive collision)
   * @returns CollisionResult with hit info if collision detected
   */
  checkCollision(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    _deltaTime: number
  ): CollisionResult {
    const noHit: CollisionResult = {
      hit: false,
      buildingId: null,
      projectId: null,
      hitPoint: null,
      buildingPosition: null,
    };

    if (this.projectBuildings.size === 0) {
      return noHit;
    }

    // Broad phase: Check distance to all project buildings
    const candidateBuildings: Array<{ id: string; mesh: ProjectBuildingMesh; distance: number }> = [];

    this.projectBuildings.forEach((building, buildingId) => {
      const buildingPos = building.group.position;
      const distance = position.distanceTo(buildingPos);

      // Only consider buildings within collision range
      if (distance < this.BUILDING_COLLISION_RADIUS + this.MINION_RADIUS) {
        candidateBuildings.push({ id: buildingId, mesh: building, distance });
      }
    });

    if (candidateBuildings.length === 0) {
      return noHit;
    }

    // Sort by distance (check closest first)
    candidateBuildings.sort((a, b) => a.distance - b.distance);

    // Narrow phase: Raycast against candidate building meshes
    const velocityNormalized = velocity.clone().normalize();

    // Cast ray from minion position in direction of travel
    this.raycaster.set(position, velocityNormalized);

    for (const candidate of candidateBuildings) {
      const building = candidate.mesh;

      // Raycast against all meshes in the building group
      const intersects = this.raycaster.intersectObject(building.group, true);

      if (intersects.length > 0) {
        const hit = intersects[0];

        // Verify this is a project building mesh (not decoration, etc.)
        let isProjectBuilding = false;
        let current: THREE.Object3D | null = hit.object;
        while (current) {
          if (current.userData?.isProjectBuilding) {
            isProjectBuilding = true;
            break;
          }
          current = current.parent;
        }

        if (isProjectBuilding) {
          return {
            hit: true,
            buildingId: candidate.id,
            projectId: building.projectId,
            hitPoint: hit.point.clone(),
            buildingPosition: building.group.position.clone(),
          };
        }
      }
    }

    // Also do a sphere-based collision check as backup
    // (raycast might miss if minion passes through in one frame)
    for (const candidate of candidateBuildings) {
      const building = candidate.mesh;
      const buildingPos = building.group.position;

      // Simple sphere collision with building center
      // Buildings are roughly 6x5 units, so use ~3 unit radius
      const buildingRadius = 3;
      const combinedRadius = this.MINION_RADIUS + buildingRadius;

      if (candidate.distance < combinedRadius) {
        // Calculate approximate hit point
        const direction = buildingPos.clone().sub(position).normalize();
        const hitPoint = position.clone().add(direction.multiplyScalar(this.MINION_RADIUS));

        return {
          hit: true,
          buildingId: candidate.id,
          projectId: building.projectId,
          hitPoint,
          buildingPosition: buildingPos.clone(),
        };
      }
    }

    return noHit;
  }

  /**
   * Get the scaffold entry position for a building.
   * This is where the minion should path to after collision.
   */
  getScaffoldEntryPosition(buildingId: string): THREE.Vector3 | null {
    const building = this.projectBuildings.get(buildingId);
    if (!building) return null;

    const buildingPos = building.group.position;

    // Scaffold entry is typically at the front of the building
    // Buildings face +Z by default, stairs are on the -Z side (front)
    // Offset slightly to be at the base of the stairs
    return new THREE.Vector3(
      buildingPos.x,
      buildingPos.y,
      buildingPos.z - 3.5 // Front of building, near scaffold stairs
    );
  }
}
