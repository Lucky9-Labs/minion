// Types for Chaud project village integration

export type BuildingType = 'cottage' | 'market' | 'workshop' | 'laboratory' | 'manor' | 'tower';
export type BuildingStage = 'planning' | 'foundation' | 'scaffolding' | 'constructed' | 'decorated';

export interface Building {
  type: BuildingType;
  aesthetic: string; // LLM-generated description
  stage: BuildingStage;
  level: number; // Height based on merge count
  position: { x: number; z: number };
  rotation?: number; // Y-axis rotation in radians (for facing street)
}

export interface Worktree {
  id: string;
  branch: string;
  path: string;
  minionId: string | null;
  isActive: boolean;
  createdAt: number;
}

export interface ChaudProject {
  id: string;
  path: string; // e.g., "/Users/lucky/Code/restart"
  name: string; // e.g., "restart"
  building: Building;
  worktrees: Worktree[];
  mergeCount: number;
  lastScanned: number;
}

export interface ProjectContext {
  name: string;
  readme: string;
  packageJson: {
    name?: string;
    description?: string;
    keywords?: string[];
    dependencies?: Record<string, string>;
  } | null;
}

// Building type descriptions for LLM context
export const BUILDING_TYPE_DESCRIPTIONS: Record<BuildingType, string> = {
  cottage: 'A cozy home with a chimney - for internal tools and utilities',
  market: 'A merchant stall or shop with an awning - for marketing/sales pages',
  workshop: "An artificer's workshop with anvil and tools - for developer tools",
  laboratory: "An alchemist's lab with bubbling potions - for AI/ML/research projects",
  manor: 'A large multi-story manor house - for large platforms/apps',
  tower: "A wizard's tower - the central hub (minion project itself)",
};

// Stage visual descriptions
export const BUILDING_STAGE_DESCRIPTIONS: Record<BuildingStage, string> = {
  planning: 'Surveyor stakes in the ground marking the building footprint',
  foundation: 'Stone foundation blocks laid out',
  scaffolding: 'Wooden scaffolding with partial walls and workers',
  constructed: 'Complete walls and roof, awaiting final touches',
  decorated: 'Fully finished with banners, lights, and details',
};
