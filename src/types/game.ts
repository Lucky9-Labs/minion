// Core game types for Mage Tower

export type MinionRole = 'scout' | 'scribe' | 'artificer';
export type MinionState = 'idle' | 'traveling' | 'working' | 'stuck' | 'returning' | 'conversing';

// Minion personality types for conversation reactions
export type MinionPersonality = 'friendly' | 'cautious' | 'grumpy';

// Conversation state
export type ConversationPhase = 'entering' | 'active' | 'exiting';

export interface ConversationState {
  active: boolean;
  minionId: string | null;
  phase: ConversationPhase | null;
  previousMinionState: MinionState | null; // To restore after conversation
}
export type MinionTrait = 'curious' | 'cautious' | 'opinionated' | 'reckless' | 'methodical';

// Building assignment for minions working on scaffolding
export interface BuildingAssignment {
  projectId: string;
  prNumber: number;
  scaffoldPosition: { x: number; y: number; z: number }; // Position on scaffolding
  isActive: boolean;
}

export interface Minion {
  id: string;
  name: string;
  role: MinionRole;
  traits: MinionTrait[];
  state: MinionState;
  memories: Memory[];
  position: { x: number; y: number; z: number };
  skinId: string;
  currentQuestId: string | null;
  createdAt: number;
  // Building work assignment (optional)
  buildingAssignment?: BuildingAssignment;
}

export interface Memory {
  id: string;
  content: string;
  questId: string;
  createdAt: number;
}

export type QuestPhase = 'departure' | 'travel' | 'work' | 'event' | 'resolution' | 'return' | 'complete';

export interface Quest {
  id: string;
  title: string;
  description: string;
  minionId: string;
  phase: QuestPhase;
  progress: number; // 0-100
  events: QuestEvent[];
  startedAt: number;
  completedAt: number | null;
  artifactIds: string[];
}

export interface QuestEvent {
  id: string;
  type: 'flavor' | 'modifier' | 'social';
  text: string;
  phase: QuestPhase;
  timestamp: number;
}

export type ArtifactType = 'scroll' | 'artifact' | 'rune';

export interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  description: string;
  content: string; // The actual output (code, text, config, etc.)
  questId: string;
  minionId: string;
  createdAt: number;
  tags: string[];
}

export interface Postcard {
  id: string;
  questId: string;
  minionId: string;
  imageSnapshot: string; // Base64 or URL
  narrativeText: string;
  outcomeSummary: string;
  artifactIds: string[];
  createdAt: number;
}

export type TowerFloor = 'library' | 'workshop' | 'forge' | 'observatory' | 'portal';

export interface Tower {
  unlockedFloors: TowerFloor[];
  level: number;
}

// Wizard (player character) state
export interface Wizard {
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface GameState {
  tower: Tower;
  wizard: Wizard;
  minions: Minion[];
  quests: Quest[];
  artifacts: Artifact[];
  postcards: Postcard[];
  activeQuestId: string | null;
}

// Minion role configurations
export const MINION_ROLES: Record<MinionRole, { name: string; description: string; color: string }> = {
  scout: {
    name: 'Scout',
    description: 'Excels at research and exploration',
    color: '#4ade80', // green
  },
  scribe: {
    name: 'Scribe',
    description: 'Masters documentation and specifications',
    color: '#60a5fa', // blue
  },
  artificer: {
    name: 'Artificer',
    description: 'Builds and crafts code',
    color: '#f59e0b', // amber
  },
};

// Tower floor configurations
export const TOWER_FLOORS: Record<TowerFloor, { name: string; description: string; level: number }> = {
  library: {
    name: 'Library',
    description: 'Memory, style guide, context',
    level: 1,
  },
  workshop: {
    name: 'Workshop',
    description: 'Code execution',
    level: 2,
  },
  forge: {
    name: 'Forge',
    description: 'Testing and refinement',
    level: 3,
  },
  observatory: {
    name: 'Observatory',
    description: 'Monitoring and scheduled tasks',
    level: 4,
  },
  portal: {
    name: 'Portal',
    description: 'Integrations',
    level: 5,
  },
};
