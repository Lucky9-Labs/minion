'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useProjectStore } from '@/store/projectStore';

/**
 * Inner dialog content component - re-mounts when dialogKey changes to reset state
 */
function DialogContent({
  minionName,
  projectName,
  queueLength,
  onSubmit,
  onDismiss,
}: {
  minionName: string;
  projectName: string;
  queueLength: number;
  onSubmit: (instructions: string) => void;
  onDismiss: () => void;
}) {
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Define handleSubmit BEFORE the useEffect that uses it
  const handleSubmit = useCallback(() => {
    if (!instructions.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(instructions.trim());
  }, [instructions, isSubmitting, onSubmit]);

  // Focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, onDismiss]);

  return (
    <div className="relative bg-slate-900/95 backdrop-blur-sm border-2 border-amber-600/60 rounded-lg shadow-2xl w-[500px] max-w-[90vw] animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-amber-600/30 bg-amber-900/30 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-600/30 flex items-center justify-center">
            <span className="text-amber-200 text-sm">
              {minionName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-amber-200 font-medium text-sm tracking-wide block">
              {minionName}
            </span>
            <span className="text-amber-400/60 text-xs">
              arrived at {projectName}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <p className="text-slate-300 text-sm mb-4 leading-relaxed">
          <span className="text-amber-200">{minionName}</span> has landed at{' '}
          <span className="text-amber-200">{projectName}</span> and is ready to work.
          What would you like them to do?
        </p>

        {/* Instructions input */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Enter instructions for the minion..."
            className="w-full h-32 px-3 py-2 bg-slate-800/80 border border-slate-600/50 rounded-lg text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 resize-none"
            disabled={isSubmitting}
          />
          <div className="absolute bottom-2 right-2 text-xs text-slate-500">
            {instructions.length > 0 && (
              <span className="text-amber-400/60">{instructions.length} chars</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-amber-600/30 bg-slate-800/50 rounded-b-lg flex items-center justify-between">
        <button
          onClick={onDismiss}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {queueLength > 1 && (
            <span className="text-xs text-slate-500">
              +{queueLength - 1} more
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!instructions.trim() || isSubmitting}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${instructions.trim() && !isSubmitting
                ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-600/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/30 rounded-b-lg">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 mr-1">
              Esc
            </kbd>
            to cancel
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400 mr-1">
              {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter
            </kbd>
            to submit
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Dialog that appears when a minion is thrown at a project building.
 * Allows the user to provide instructions for what the minion should work on.
 * Dialogs are queued and shown one at a time.
 */
export function CollisionInstructionDialog() {
  // Store state
  const collisionDialogQueue = useGameStore((state) => state.collisionDialogQueue);
  const minions = useGameStore((state) => state.minions);
  const projects = useProjectStore((state) => state.projects);
  const dequeueCollisionDialog = useGameStore((state) => state.dequeueCollisionDialog);
  const dismissCollisionDialog = useGameStore((state) => state.dismissCollisionDialog);
  const assignMinionToBuildingWithPath = useGameStore((state) => state.assignMinionToBuildingWithPath);
  const conversation = useGameStore((state) => state.conversation);

  // Get current dialog entry (first in queue)
  const currentDialog = collisionDialogQueue.length > 0 ? collisionDialogQueue[0] : null;

  // Get minion and project info
  const minion = currentDialog
    ? minions.find((m) => m.id === currentDialog.minionId)
    : null;
  const project = currentDialog
    ? projects.find((p) => p.id === currentDialog.projectId)
    : null;

  const handleSubmit = useCallback(async (instructions: string) => {
    if (!currentDialog) return;

    // Get the project path from the project store
    const projectPath = project?.path;

    // Assign minion to building with instructions
    assignMinionToBuildingWithPath(
      currentDialog.minionId,
      currentDialog.projectId,
      currentDialog.buildingPosition,
      instructions
    );

    // Remove from queue
    dequeueCollisionDialog();

    // Run chaud work --local with the instructions
    if (projectPath) {
      try {
        console.log(`[CollisionDialog] Starting chaud work for project: ${projectPath}`);
        const response = await fetch('/api/work', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectPath, instructions }),
        });

        const result = await response.json();
        if (result.error) {
          console.error('[CollisionDialog] chaud work error:', result.error);
        } else {
          console.log('[CollisionDialog] chaud work completed:', result.stdout);
        }
      } catch (error) {
        console.error('[CollisionDialog] Failed to run chaud work:', error);
      }
    }
  }, [currentDialog, project, assignMinionToBuildingWithPath, dequeueCollisionDialog]);

  const handleDismiss = useCallback(() => {
    if (!currentDialog) return;

    // Dismiss and return minion to idle
    dismissCollisionDialog(currentDialog.minionId);
  }, [currentDialog, dismissCollisionDialog]);

  // Don't show if no dialog in queue or if already in a conversation
  if (!currentDialog || conversation.active) return null;

  const minionName = minion?.name || 'Minion';
  const projectName = project?.name || 'this building';

  // Use a key based on minionId+projectId to force remount when dialog changes
  // This naturally resets the internal state (instructions, isSubmitting)
  const dialogKey = `${currentDialog.minionId}-${currentDialog.projectId}-${currentDialog.timestamp}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Dialog content - key forces remount on dialog change */}
      <DialogContent
        key={dialogKey}
        minionName={minionName}
        projectName={projectName}
        queueLength={collisionDialogQueue.length}
        onSubmit={handleSubmit}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
