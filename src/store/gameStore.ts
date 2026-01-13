import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  GameState,
  Minion,
  Quest,
  Artifact,
  Postcard,
  MinionRole,
  MinionTrait,
  QuestPhase,
  TowerFloor,
  ArtifactType,
} from '@/types/game';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

interface GameStore extends GameState {
  // Minion actions
  recruitMinion: (name: string, role: MinionRole, traits: MinionTrait[]) => Minion;
  updateMinionState: (minionId: string, state: Minion['state']) => void;
  updateMinionPosition: (minionId: string, position: { x: number; y: number; z: number }) => void;

  // Quest actions
  createQuest: (title: string, description: string, minionId: string) => Quest;
  updateQuestPhase: (questId: string, phase: QuestPhase) => void;
  updateQuestProgress: (questId: string, progress: number) => void;
  addQuestEvent: (questId: string, type: 'flavor' | 'modifier' | 'social', text: string) => void;
  completeQuest: (questId: string) => void;

  // Artifact actions
  createArtifact: (
    name: string,
    type: ArtifactType,
    description: string,
    content: string,
    questId: string,
    minionId: string,
    tags: string[]
  ) => Artifact;

  // Postcard actions
  createPostcard: (
    questId: string,
    minionId: string,
    narrativeText: string,
    outcomeSummary: string,
    artifactIds: string[]
  ) => Postcard;

  // Tower actions
  unlockFloor: (floor: TowerFloor) => void;

  // UI state
  setActiveQuest: (questId: string | null) => void;
  selectedMinionId: string | null;
  setSelectedMinion: (minionId: string | null) => void;

  // Reset
  resetGame: () => void;
}

// Default starter minion if none exist
const starterMinion: Minion = {
  id: 'starter_goblin_1',
  name: 'Grix',
  role: 'scout' as MinionRole,
  traits: ['curious', 'loyal'] as MinionTrait[],
  state: 'idle' as const,
  memories: [],
  position: { x: 5, y: 0, z: 5 },
  skinId: 'default',
  currentQuestId: null,
  createdAt: Date.now(),
};

const initialState: GameState = {
  tower: {
    unlockedFloors: ['library'],
    level: 1,
  },
  minions: [starterMinion],
  quests: [],
  artifacts: [],
  postcards: [],
  activeQuestId: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      selectedMinionId: null,

      recruitMinion: (name, role, traits) => {
        const minion: Minion = {
          id: generateId(),
          name,
          role,
          traits,
          state: 'idle',
          memories: [],
          position: { x: 0, y: 0, z: 0 },
          skinId: 'default',
          currentQuestId: null,
          createdAt: Date.now(),
        };
        set((state) => ({ minions: [...state.minions, minion] }));
        return minion;
      },

      updateMinionState: (minionId, newState) => {
        set((state) => ({
          minions: state.minions.map((m) =>
            m.id === minionId ? { ...m, state: newState } : m
          ),
        }));
      },

      updateMinionPosition: (minionId, position) => {
        set((state) => ({
          minions: state.minions.map((m) =>
            m.id === minionId ? { ...m, position } : m
          ),
        }));
      },

      createQuest: (title, description, minionId) => {
        const quest: Quest = {
          id: generateId(),
          title,
          description,
          minionId,
          phase: 'departure',
          progress: 0,
          events: [],
          startedAt: Date.now(),
          completedAt: null,
          artifactIds: [],
        };
        set((state) => ({
          quests: [...state.quests, quest],
          activeQuestId: quest.id,
          minions: state.minions.map((m) =>
            m.id === minionId
              ? { ...m, state: 'traveling' as const, currentQuestId: quest.id }
              : m
          ),
        }));
        return quest;
      },

      updateQuestPhase: (questId, phase) => {
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, phase } : q
          ),
        }));
      },

      updateQuestProgress: (questId, progress) => {
        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, progress: Math.min(100, Math.max(0, progress)) } : q
          ),
        }));
      },

      addQuestEvent: (questId, type, text) => {
        const quest = get().quests.find((q) => q.id === questId);
        if (!quest) return;

        const event = {
          id: generateId(),
          type,
          text,
          phase: quest.phase,
          timestamp: Date.now(),
        };

        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, events: [...q.events, event] } : q
          ),
        }));
      },

      completeQuest: (questId) => {
        const quest = get().quests.find((q) => q.id === questId);
        if (!quest) return;

        set((state) => ({
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, phase: 'complete', progress: 100, completedAt: Date.now() } : q
          ),
          minions: state.minions.map((m) =>
            m.id === quest.minionId
              ? { ...m, state: 'idle' as const, currentQuestId: null }
              : m
          ),
          activeQuestId: null,
        }));
      },

      createArtifact: (name, type, description, content, questId, minionId, tags) => {
        const artifact: Artifact = {
          id: generateId(),
          name,
          type,
          description,
          content,
          questId,
          minionId,
          createdAt: Date.now(),
          tags,
        };
        set((state) => ({
          artifacts: [...state.artifacts, artifact],
          quests: state.quests.map((q) =>
            q.id === questId ? { ...q, artifactIds: [...q.artifactIds, artifact.id] } : q
          ),
        }));
        return artifact;
      },

      createPostcard: (questId, minionId, narrativeText, outcomeSummary, artifactIds) => {
        const postcard: Postcard = {
          id: generateId(),
          questId,
          minionId,
          imageSnapshot: '', // Will be set when screenshot is taken
          narrativeText,
          outcomeSummary,
          artifactIds,
          createdAt: Date.now(),
        };
        set((state) => ({ postcards: [...state.postcards, postcard] }));
        return postcard;
      },

      unlockFloor: (floor) => {
        set((state) => {
          if (state.tower.unlockedFloors.includes(floor)) return state;
          return {
            tower: {
              ...state.tower,
              unlockedFloors: [...state.tower.unlockedFloors, floor],
              level: state.tower.level + 1,
            },
          };
        });
      },

      setActiveQuest: (questId) => {
        set({ activeQuestId: questId });
      },

      setSelectedMinion: (minionId) => {
        set({ selectedMinionId: minionId });
      },

      resetGame: () => {
        set({ ...initialState, selectedMinionId: null });
      },
    }),
    {
      name: 'mage-tower-game',
      storage: createJSONStorage(() => localStorage),
      // Ensure at least one minion exists after loading from storage
      merge: (persistedState, currentState) => {
        const merged = { ...currentState, ...(persistedState as Partial<GameStore>) };
        // If no minions exist, add the starter minion
        if (!merged.minions || merged.minions.length === 0) {
          merged.minions = [starterMinion];
        }
        return merged;
      },
    }
  )
);
