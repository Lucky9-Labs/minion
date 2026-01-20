// Types
export type { NavCell, NavPath, ObstacleDef, NavGridConfig } from './types';
export { DEFAULT_GRID_CONFIG, STATIC_OBSTACLES } from './types';

// NavGrid
export { NavGrid } from './NavGrid';

// Builder
export { NavGridBuilder, buildNavGrid } from './NavGridBuilder';
export type { TowerNavConfig } from './NavGridBuilder';

// Pathfinder
export { Pathfinder } from './Pathfinder';

// Elevated Surface Navigation (scaffolding, bridges, elevated walkways)
export type {
  ElevatedSurface,
  ElevationConnection,
  ElevatedNavPoint,
} from './ElevatedSurface';
export {
  ElevatedSurfaceRegistry,
  registerScaffoldingSurfaces,
} from './ElevatedSurface';

// Elevated Pathfinder
export type { ElevatedPath } from './ElevatedPathfinder';
export { ElevatedPathfinder } from './ElevatedPathfinder';

// Path Follower (for minion pathing to scaffolding)
export type { PathFollowState } from './PathFollower';
export {
  createPathFollowState,
  updatePathFollow,
  getCurrentWaypoint,
  getFinalDestination,
  isNearTarget,
  moveTowardTarget,
} from './PathFollower';
