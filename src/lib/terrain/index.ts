// Types
export type {
  PlotCoord,
  PlotConfig,
  BiomeType,
  PathDirection,
  TerrainConfig,
  ContinuousTerrainConfig,
  RiverSegment,
  PathNode,
  ExclusionZone,
} from './types';

export {
  DEFAULT_TERRAIN_CONFIG,
  DEFAULT_CONTINUOUS_CONFIG,
  BIOME_COLORS,
  BIOME_TREE_CONFIG,
} from './types';

// Plot generation (legacy floating islands)
export { PlotGenerator } from './PlotGenerator';

// Mesh building (legacy floating islands)
export { PlotMeshBuilder } from './PlotMeshBuilder';

// Plot management (legacy floating islands)
export { PlotManager } from './PlotManager';

// Continuous terrain (new unified ground system)
export { ContinuousTerrainBuilder } from './ContinuousTerrainBuilder';

// Island edge/cliff generation
export { IslandEdgeBuilder, DEFAULT_ISLAND_EDGE_CONFIG } from './IslandEdgeBuilder';
export type { IslandEdgeConfig } from './IslandEdgeBuilder';

// Portal gateway (spawn point at true south)
export { PortalGateway, DEFAULT_PORTAL_CONFIG } from './PortalGateway';
export type { PortalGatewayConfig } from './PortalGateway';
