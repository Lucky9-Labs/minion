import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { QuestPhase } from '@/types/game';

// Quest phase positions - minions move to different locations based on phase
const PHASE_POSITIONS: Record<QuestPhase, { x: number; y: number; z: number }> = {
  departure: { x: 0, y: 0, z: 2 },      // At tower door
  travel: { x: 3, y: 0, z: 5 },         // Moving away from tower
  work: { x: 6, y: 0, z: 4 },           // Working location
  event: { x: 5, y: 0, z: 3 },          // Event encounter
  resolution: { x: 4, y: 0, z: 2 },     // Wrapping up
  return: { x: 2, y: 0, z: 1 },         // Coming back
  complete: { x: 0, y: 0, z: 3 },       // Back at tower
};

// Narrative events that can happen during quests
const NARRATIVE_EVENTS = {
  flavor: [
    "The path ahead shimmers with ancient runes.",
    "A gentle wind carries the scent of old parchment.",
    "The minion pauses to inspect a curious marking on a stone.",
    "Distant bells chime from an unseen tower.",
    "The stars seem to align in an auspicious pattern.",
    "A friendly crow watches from a nearby branch.",
    "The ground here feels charged with magical energy.",
    "Whispers of past adventurers echo faintly.",
  ],
  modifier: [
    "Found a hidden shortcut through the archives!",
    "Discovered an unexpected connection in the research.",
    "The path was clearer than expected.",
    "A previous quest left helpful breadcrumbs.",
    "The task aligned perfectly with existing knowledge.",
  ],
  social: [
    "Encountered a fellow traveler with useful insights.",
    "Met a spirit guardian who offered guidance.",
    "A passing merchant shared relevant wisdom.",
    "Found traces of another minion's successful journey.",
  ],
};

export function useMinionMovement() {
  const animationRef = useRef<number | null>(null);
  const quests = useGameStore((state) => state.quests);
  const minions = useGameStore((state) => state.minions);
  const updateMinionPosition = useGameStore((state) => state.updateMinionPosition);

  useEffect(() => {
    const activeQuests = quests.filter((q) => q.phase !== 'complete');

    const animate = () => {
      activeQuests.forEach((quest) => {
        const minion = minions.find((m) => m.id === quest.minionId);
        if (!minion) return;

        const targetPos = PHASE_POSITIONS[quest.phase];
        const currentPos = minion.position;

        // Lerp towards target position (halved for proportional movement with smaller minions)
        const lerpFactor = 0.01;
        const newX = currentPos.x + (targetPos.x - currentPos.x) * lerpFactor;
        const newY = currentPos.y + (targetPos.y - currentPos.y) * lerpFactor;
        const newZ = currentPos.z + (targetPos.z - currentPos.z) * lerpFactor;

        // Only update if movement is significant
        if (
          Math.abs(newX - currentPos.x) > 0.001 ||
          Math.abs(newY - currentPos.y) > 0.001 ||
          Math.abs(newZ - currentPos.z) > 0.001
        ) {
          updateMinionPosition(minion.id, { x: newX, y: newY, z: newZ });
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    if (activeQuests.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [quests, minions, updateMinionPosition]);
}

export function getRandomEvent(type: 'flavor' | 'modifier' | 'social'): string {
  const events = NARRATIVE_EVENTS[type];
  return events[Math.floor(Math.random() * events.length)];
}

// Hook for golem movement - moves golems toward their target positions
export function useGolemMovement() {
  const animationRef = useRef<number | null>(null);
  const golems = useGameStore((state) => state.golems);
  const updateGolemPosition = useGameStore((state) => state.updateGolemPosition);
  const updateGolemState = useGameStore((state) => state.updateGolemState);

  useEffect(() => {
    const golemsWithTargets = golems.filter((g) => g.targetPosition);

    const animate = () => {
      golemsWithTargets.forEach((golem) => {
        if (!golem.targetPosition) return;

        const currentPos = golem.position;
        const targetPos = golem.targetPosition;

        // Slower lerp for heavy golem movement
        const lerpFactor = 0.005;
        const newX = currentPos.x + (targetPos.x - currentPos.x) * lerpFactor;
        const newY = currentPos.y + (targetPos.y - currentPos.y) * lerpFactor;
        const newZ = currentPos.z + (targetPos.z - currentPos.z) * lerpFactor;

        // Check if close enough to target
        const distSq =
          (targetPos.x - newX) ** 2 +
          (targetPos.y - newY) ** 2 +
          (targetPos.z - newZ) ** 2;

        if (distSq < 0.01) {
          // Arrived at target
          updateGolemPosition(golem.id, targetPos);
          updateGolemState(golem.id, 'idle');
        } else if (
          Math.abs(newX - currentPos.x) > 0.001 ||
          Math.abs(newY - currentPos.y) > 0.001 ||
          Math.abs(newZ - currentPos.z) > 0.001
        ) {
          updateGolemPosition(golem.id, { x: newX, y: newY, z: newZ });
          // Ensure golem is in traveling state while moving
          if (golem.state !== 'traveling') {
            updateGolemState(golem.id, 'traveling');
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    if (golemsWithTargets.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [golems, updateGolemPosition, updateGolemState]);
}
