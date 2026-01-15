'use client';

import { useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';

/**
 * Hook to poll for project changes (worktrees, PRs) at regular intervals
 * @param intervalMs - Polling interval in milliseconds (default: 30000 = 30 seconds)
 */
export function useProjectPolling(intervalMs: number = 30000) {
  const { scanProjects, isScanning } = useProjectStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial scan on mount
    scanProjects();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      // Don't start a new scan if one is already in progress
      if (!isScanning) {
        scanProjects();
      }
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, scanProjects, isScanning]);
}

export default useProjectPolling;
