/**
 * Active PR Scanner
 * Detects which PRs/worktrees are currently active
 * Used to sync minion assignments with PR state
 */

import type { ChaudProject, OpenPR } from '@/types/project';

export interface ActivePRScan {
  projectId: string;
  projectName: string;
  activePRNumbers: number[];
  timestamp: number;
  prCount: number;
}

/**
 * Extract active PR numbers from a project
 * A PR is "active" if it has an associated worktree and is in openPRs
 */
export function getActivePRNumbers(project: ChaudProject): number[] {
  if (!project.openPRs || project.openPRs.length === 0) {
    return [];
  }

  return project.openPRs.map((pr: OpenPR) => pr.number);
}

/**
 * Scan a single project for active PRs
 */
export function scanProjectForActivePRs(project: ChaudProject): ActivePRScan {
  const activePRNumbers = getActivePRNumbers(project);

  return {
    projectId: project.id,
    projectName: project.name,
    activePRNumbers,
    timestamp: Date.now(),
    prCount: activePRNumbers.length,
  };
}

/**
 * Scan all projects for active PRs
 * Returns map of projectId -> active PR numbers
 */
export function scanAllProjectsForActivePRs(
  projects: ChaudProject[]
): Record<string, ActivePRScan> {
  const results: Record<string, ActivePRScan> = {};

  for (const project of projects) {
    const scan = scanProjectForActivePRs(project);
    results[project.id] = scan;
  }

  return results;
}

/**
 * Detect which PRs have closed since the last scan
 */
export function detectClosedPRs(
  previousActivePRs: number[],
  currentActivePRs: number[]
): number[] {
  const currentSet = new Set(currentActivePRs);
  return previousActivePRs.filter((pr) => !currentSet.has(pr));
}

/**
 * Detect which PRs have opened since the last scan
 */
export function detectNewPRs(
  previousActivePRs: number[],
  currentActivePRs: number[]
): number[] {
  const previousSet = new Set(previousActivePRs);
  return currentActivePRs.filter((pr) => !previousSet.has(pr));
}

/**
 * Check if PR state has changed between scans
 */
export function hasActivePRsChanged(
  previousActivePRs: number[],
  currentActivePRs: number[]
): boolean {
  if (previousActivePRs.length !== currentActivePRs.length) {
    return true;
  }

  const previousSet = new Set(previousActivePRs);
  return !currentActivePRs.every((pr) => previousSet.has(pr));
}
