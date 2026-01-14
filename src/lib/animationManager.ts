import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { resetAllPools } from './vectorPool';

/**
 * Centralized animation manager to consolidate all useFrame callbacks.
 *
 * Instead of each component having its own useFrame hook (which creates
 * N separate callbacks for N entities), components register their
 * animation functions here and a single useFrame iterates through them.
 *
 * Usage in a component:
 *   useAnimation('minion-' + minion.id, (time, delta) => {
 *     // Animation logic here
 *   });
 *
 * Usage in the Scene (once):
 *   useAnimationManager();
 */

export type AnimationCallback = (time: number, delta: number) => void;

interface AnimationEntry {
  callback: AnimationCallback;
  priority: number;
}

// Global registry of animation callbacks
const animations = new Map<string, AnimationEntry>();

// Sorted array for iteration (rebuilt when registry changes)
let sortedAnimations: AnimationEntry[] = [];
let isDirty = true;

/**
 * Register an animation callback with the manager.
 * @param id Unique identifier for this animation
 * @param callback Function called each frame with (time, delta)
 * @param priority Lower numbers run first (default: 0)
 */
export function registerAnimation(
  id: string,
  callback: AnimationCallback,
  priority = 0
): void {
  animations.set(id, { callback, priority });
  isDirty = true;
}

/**
 * Unregister an animation callback.
 */
export function unregisterAnimation(id: string): void {
  animations.delete(id);
  isDirty = true;
}

/**
 * Update an existing animation callback without re-sorting.
 */
export function updateAnimation(id: string, callback: AnimationCallback): void {
  const entry = animations.get(id);
  if (entry) {
    entry.callback = callback;
  }
}

/**
 * Check if an animation is registered.
 */
export function hasAnimation(id: string): boolean {
  return animations.has(id);
}

/**
 * Get number of registered animations (for debugging).
 */
export function getAnimationCount(): number {
  return animations.size;
}

/**
 * Run all registered animations. Called internally by useAnimationManager.
 */
function runAnimations(time: number, delta: number): void {
  // Rebuild sorted array if registry changed
  if (isDirty) {
    sortedAnimations = Array.from(animations.values()).sort(
      (a, b) => a.priority - b.priority
    );
    isDirty = false;
  }

  // Reset object pools at start of frame
  resetAllPools();

  // Run all animations
  for (let i = 0; i < sortedAnimations.length; i++) {
    sortedAnimations[i].callback(time, delta);
  }
}

/**
 * Hook to be used ONCE in the main Scene component.
 * This is the single useFrame that drives all animations.
 */
export function useAnimationManager(): void {
  useFrame((state, delta) => {
    runAnimations(state.clock.elapsedTime, delta);
  });
}

/**
 * Hook for components to register their animation logic.
 * Automatically handles cleanup on unmount.
 *
 * @param id Unique identifier (should include entity ID to avoid collisions)
 * @param callback Animation function - receives (time, delta)
 * @param priority Lower numbers run first
 * @param deps Dependencies array - callback is updated when deps change
 */
export function useAnimation(
  id: string,
  callback: AnimationCallback,
  priority = 0,
  deps: React.DependencyList = []
): void {
  // Store callback in ref to avoid re-registering on every render
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register on mount, unregister on unmount
  useEffect(() => {
    const wrappedCallback: AnimationCallback = (time, delta) => {
      callbackRef.current(time, delta);
    };

    registerAnimation(id, wrappedCallback, priority);

    return () => {
      unregisterAnimation(id);
    };
  }, [id, priority]);
}

/**
 * Throttled animation hook - runs callback at reduced frequency.
 *
 * @param id Unique identifier
 * @param callback Animation function
 * @param intervalMs Minimum time between calls in milliseconds
 * @param priority Lower numbers run first
 */
export function useThrottledAnimation(
  id: string,
  callback: AnimationCallback,
  intervalMs: number,
  priority = 0
): void {
  const lastRunRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const intervalSec = intervalMs / 1000;

    const throttledCallback: AnimationCallback = (time, delta) => {
      if (time - lastRunRef.current >= intervalSec) {
        callbackRef.current(time, delta);
        lastRunRef.current = time;
      }
    };

    registerAnimation(id, throttledCallback, priority);

    return () => {
      unregisterAnimation(id);
    };
  }, [id, intervalMs, priority]);
}

/**
 * Animation priorities - use these constants for consistent ordering.
 */
export const ANIMATION_PRIORITY = {
  // System-level updates
  PHYSICS: -100,
  CAMERA: -50,

  // Entity updates
  MINION: 0,
  WILDLIFE: 10,
  EFFECTS: 20,

  // Post-processing
  UI: 50,
  DEBUG: 100,
} as const;
