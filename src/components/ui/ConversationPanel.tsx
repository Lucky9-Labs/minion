'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

interface ConversationPanelProps {
  minionName?: string;
}

export function ConversationPanel({ minionName }: ConversationPanelProps) {
  const conversation = useGameStore((state) => state.conversation);
  const exitConversation = useGameStore((state) => state.exitConversation);
  const minions = useGameStore((state) => state.minions);

  const handleLeave = useCallback(() => {
    exitConversation();
  }, [exitConversation]);

  // Don't show if not in conversation
  if (!conversation.active) return null;

  // Get minion name
  const minion = minions.find((m) => m.id === conversation.minionId);
  const name = minionName || minion?.name || 'Minion';

  // Show minimal UI during entering/exiting phases
  const isTransitioning = conversation.phase === 'entering' || conversation.phase === 'exiting';

  return (
    <div
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2
        transition-all duration-300
        ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
      `}
    >
      {/* RPG-style conversation box */}
      <div className="bg-slate-900/90 backdrop-blur-sm border-2 border-amber-600/60 rounded-lg shadow-2xl min-w-[400px]">
        {/* Header with minion name */}
        <div className="px-4 py-2 border-b border-amber-600/30 bg-amber-900/30">
          <span className="text-amber-200 font-medium text-sm tracking-wide">
            {name}
          </span>
        </div>

        {/* Speech content area */}
        <div className="px-4 py-3 min-h-[60px]">
          <p className="text-slate-200 text-sm leading-relaxed">
            {conversation.phase === 'entering' && (
              <span className="text-slate-400 italic">*approaches*</span>
            )}
            {conversation.phase === 'active' && (
              <span>Hello, master! What can I help you with today?</span>
            )}
            {conversation.phase === 'exiting' && (
              <span className="text-slate-400 italic">*waves goodbye*</span>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-4 py-2 border-t border-amber-600/30 bg-slate-800/50">
          <button
            onClick={handleLeave}
            disabled={isTransitioning}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded
              transition-all duration-150
              ${isTransitioning
                ? 'text-slate-500 cursor-not-allowed'
                : 'text-amber-200 hover:bg-amber-600/20 hover:text-amber-100'
              }
            `}
          >
            <span className="text-amber-400">{'>'}</span>
            <span className="text-sm font-medium">Leave Conversation</span>
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="mt-2 text-center">
        <span className="text-xs text-slate-500">
          Press <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">Esc</kbd> to leave
        </span>
      </div>
    </div>
  );
}
