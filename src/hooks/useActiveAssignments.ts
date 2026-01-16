/**
 * useActiveAssignments Hook
 * Syncs minion assignments with active PRs
 * Handles assignment lifecycle and periodic polling
 */

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useProjectStore } from '@/store/projectStore';
import {
  getActivePRNumbers,
  hasActivePRsChanged,
  detectClosedPRs,
} from '@/lib/activePRScanner';

export interface UseActiveAssignmentsOptions {
  projectId?: string;
  pollingIntervalMs?: number; // How often to check for PR changes (default: 30 seconds)
  autoSync?: boolean; // Auto sync on mount and with polling (default: true)
}

/**
 * Hook to manage minion assignments to active PRs
 * Automatically syncs assignments when PR state changes
 */
export function useActiveAssignments(options: UseActiveAssignmentsOptions = {}) {
  const {
    projectId,
    pollingIntervalMs = 30000,
    autoSync = true,
  } = options;

  const gameStore = useGameStore();
  const projectStore = useProjectStore();
  const lastSyncRef = useRef<{ [key: string]: number[] }>({});
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Perform sync for a specific project or all projects
  const performSync = (targetProjectId?: string) => {
    // Get projects to scan
    const projectsToScan = targetProjectId
      ? projectStore.projects.filter((p) => p.id === targetProjectId)
      : projectStore.projects;

    for (const project of projectsToScan) {
      const currentActivePRs = getActivePRNumbers(project);
      const previousActivePRs = lastSyncRef.current[project.id] || [];

      // Check if PR state has changed
      if (hasActivePRsChanged(previousActivePRs, currentActivePRs)) {
        // Sync the assignments in game store
        gameStore.syncActiveAssignments(currentActivePRs);

        // Update our reference
        lastSyncRef.current[project.id] = currentActivePRs;
      }
    }
  };

  // Initial sync on mount
  useEffect(() => {
    if (!autoSync) return;

    // Only sync if projects have been loaded
    if (projectStore.projects.length === 0) return;

    performSync(projectId);
  }, [autoSync, projectId]); // projectStore.projects not in deps to avoid constant syncing

  // Set up periodic polling
  useEffect(() => {
    if (!autoSync || pollingIntervalMs <= 0) return;

    // Initial sync
    performSync(projectId);

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      performSync(projectId);
    }, pollingIntervalMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [autoSync, pollingIntervalMs, projectId]);

  return {
    assignments: gameStore.activeScaffoldingAssignments,
    idleMinions: gameStore.getIdleMinions(),
    allMinions: gameStore.minions,
    // Manual sync trigger if needed
    forceSync: () => performSync(projectId),
  };
}
