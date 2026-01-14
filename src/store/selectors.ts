import { useGameStore } from './gameStore';
import { useShallow } from 'zustand/shallow';
import type { Minion, Quest } from '@/types/game';

/**
 * Optimized selectors for the game store.
 *
 * Using shallow equality comparisons to prevent unnecessary re-renders
 * when object references change but values don't.
 *
 * Usage:
 *   // Instead of multiple separate useGameStore calls:
 *   const { minions, selectedMinionId } = useSceneState();
 */

/**
 * Combined selector for SimpleScene component.
 * Groups related state to reduce subscription overhead.
 */
export function useSceneState() {
  return useGameStore(
    useShallow((state) => ({
      minions: state.minions,
      selectedMinionId: state.selectedMinionId,
      setSelectedMinion: state.setSelectedMinion,
      conversation: state.conversation,
      cameraMode: state.cameraMode,
      viewMode: state.viewMode,
    }))
  );
}

/**
 * Selector for minion-specific state.
 */
export function useMinionState(minionId: string) {
  return useGameStore(
    useShallow((state) => {
      const minion = state.minions.find((m) => m.id === minionId);
      return {
        minion,
        isSelected: state.selectedMinionId === minionId,
        isConversing: state.conversation.active && state.conversation.minionId === minionId,
      };
    })
  );
}

/**
 * Selector for GameLayout component.
 */
export function useGameLayoutState() {
  return useGameStore(
    useShallow((state) => ({
      tower: state.tower,
      minions: state.minions,
      activeQuestId: state.activeQuestId,
      conversationActive: state.conversation.active,
      conversationPhase: state.conversation.phase,
      exitConversation: state.exitConversation,
      cameraMode: state.cameraMode,
    }))
  );
}

/**
 * Selector for conversation state only.
 */
export function useConversationState() {
  return useGameStore(
    useShallow((state) => ({
      active: state.conversation.active,
      minionId: state.conversation.minionId,
      phase: state.conversation.phase,
      enterConversation: state.enterConversation,
      exitConversation: state.exitConversation,
      setConversationPhase: state.setConversationPhase,
      transitionToMinion: state.transitionToMinion,
    }))
  );
}

/**
 * Selector for camera mode only (changes frequently during transitions).
 */
export function useCameraMode() {
  return useGameStore((state) => state.cameraMode);
}

/**
 * Selector for view mode only.
 */
export function useViewMode() {
  return useGameStore((state) => state.viewMode);
}

/**
 * Selector for selected minion ID only.
 */
export function useSelectedMinionId() {
  return useGameStore((state) => state.selectedMinionId);
}

/**
 * Selector for minion actions (stable references).
 */
export function useMinionActions() {
  return useGameStore(
    useShallow((state) => ({
      setSelectedMinion: state.setSelectedMinion,
      updateMinionState: state.updateMinionState,
      updateMinionPosition: state.updateMinionPosition,
      recruitMinion: state.recruitMinion,
    }))
  );
}

/**
 * Get all minions (read-only, for iteration).
 */
export function useMinions(): Minion[] {
  return useGameStore((state) => state.minions);
}

/**
 * Get a specific minion by ID.
 */
export function useMinion(minionId: string): Minion | undefined {
  return useGameStore((state) => state.minions.find((m) => m.id === minionId));
}

/**
 * Get active quests.
 */
export function useActiveQuests(): Quest[] {
  return useGameStore((state) =>
    state.quests.filter((q) => q.phase !== 'complete')
  );
}

/**
 * Non-reactive access to store state.
 * Use for animation loops where you don't want React re-renders.
 */
export function getStoreState() {
  return useGameStore.getState();
}

/**
 * Subscribe to specific state changes outside of React.
 * Returns unsubscribe function.
 */
export function subscribeToState<T>(
  selector: (state: ReturnType<typeof useGameStore.getState>) => T,
  callback: (value: T) => void
): () => void {
  return useGameStore.subscribe((state) => {
    callback(selector(state));
  });
}
