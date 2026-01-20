/**
 * Path following utility for minions navigating to scaffolding.
 * Works with ElevatedPath from ElevatedPathfinder.
 */

import * as THREE from 'three';
import type { ElevatedPath } from './ElevatedPathfinder';
import type { ElevatedNavPoint } from './ElevatedSurface';

export interface PathFollowState {
  path: ElevatedPath;
  currentWaypointIndex: number;
  isComplete: boolean;
  totalDistance: number;
  distanceTraveled: number;
}

/**
 * Create a new path follow state from an elevated path.
 */
export function createPathFollowState(path: ElevatedPath): PathFollowState {
  // Calculate total path distance
  let totalDistance = 0;
  for (let i = 1; i < path.points.length; i++) {
    const prev = path.points[i - 1];
    const curr = path.points[i];
    totalDistance += Math.sqrt(
      (curr.x - prev.x) ** 2 +
      (curr.y - prev.y) ** 2 +
      (curr.z - prev.z) ** 2
    );
  }

  return {
    path,
    currentWaypointIndex: 0,
    isComplete: path.points.length === 0,
    totalDistance,
    distanceTraveled: 0,
  };
}

/**
 * Update path following and return the new position.
 * Returns null if path is complete.
 */
export function updatePathFollow(
  state: PathFollowState,
  currentPosition: THREE.Vector3,
  speed: number,
  deltaTime: number
): { newPosition: THREE.Vector3; isComplete: boolean; progress: number } {
  if (state.isComplete || state.path.points.length === 0) {
    return {
      newPosition: currentPosition.clone(),
      isComplete: true,
      progress: 1,
    };
  }

  const points = state.path.points;
  const targetWaypoint = points[state.currentWaypointIndex];

  // Calculate direction to current waypoint
  const targetPos = new THREE.Vector3(targetWaypoint.x, targetWaypoint.y, targetWaypoint.z);
  const direction = targetPos.clone().sub(currentPosition);
  const distanceToWaypoint = direction.length();

  // How far we can move this frame
  const moveDistance = speed * deltaTime;

  if (distanceToWaypoint <= moveDistance) {
    // Reached current waypoint
    state.distanceTraveled += distanceToWaypoint;
    state.currentWaypointIndex++;

    if (state.currentWaypointIndex >= points.length) {
      // Path complete
      state.isComplete = true;
      return {
        newPosition: targetPos,
        isComplete: true,
        progress: 1,
      };
    }

    // Move remaining distance toward next waypoint
    const remainingDistance = moveDistance - distanceToWaypoint;
    const nextWaypoint = points[state.currentWaypointIndex];
    const nextPos = new THREE.Vector3(nextWaypoint.x, nextWaypoint.y, nextWaypoint.z);
    const nextDirection = nextPos.clone().sub(targetPos).normalize();
    const newPosition = targetPos.clone().add(nextDirection.multiplyScalar(remainingDistance));
    state.distanceTraveled += remainingDistance;

    return {
      newPosition,
      isComplete: false,
      progress: state.totalDistance > 0 ? state.distanceTraveled / state.totalDistance : 0,
    };
  }

  // Move toward current waypoint
  direction.normalize();
  const newPosition = currentPosition.clone().add(direction.multiplyScalar(moveDistance));
  state.distanceTraveled += moveDistance;

  return {
    newPosition,
    isComplete: false,
    progress: state.totalDistance > 0 ? state.distanceTraveled / state.totalDistance : 0,
  };
}

/**
 * Get the current target waypoint.
 */
export function getCurrentWaypoint(state: PathFollowState): ElevatedNavPoint | null {
  if (state.isComplete || state.currentWaypointIndex >= state.path.points.length) {
    return null;
  }
  return state.path.points[state.currentWaypointIndex];
}

/**
 * Get the final destination of the path.
 */
export function getFinalDestination(state: PathFollowState): ElevatedNavPoint | null {
  if (state.path.points.length === 0) {
    return null;
  }
  return state.path.points[state.path.points.length - 1];
}

/**
 * Check if position is close enough to a target (for arrival detection).
 */
export function isNearTarget(
  position: THREE.Vector3,
  target: { x: number; y: number; z: number },
  threshold: number = 0.5
): boolean {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold;
}

/**
 * Simple linear interpolation toward a target position (for ground-level pathing
 * before reaching scaffolding stairs).
 */
export function moveTowardTarget(
  currentPosition: THREE.Vector3,
  target: THREE.Vector3,
  speed: number,
  deltaTime: number
): { newPosition: THREE.Vector3; arrived: boolean } {
  const direction = target.clone().sub(currentPosition);
  const distance = direction.length();
  const moveDistance = speed * deltaTime;

  if (distance <= moveDistance) {
    return { newPosition: target.clone(), arrived: true };
  }

  direction.normalize();
  const newPosition = currentPosition.clone().add(direction.multiplyScalar(moveDistance));
  return { newPosition, arrived: false };
}
