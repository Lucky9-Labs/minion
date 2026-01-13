'use client';

import { useState, useEffect, useCallback } from 'react';
import { SimpleScene } from './SimpleScene';
import { MinionPanel } from './ui/MinionPanel';
import { QuestPanel } from './ui/QuestPanel';
import { VaultPanel } from './ui/VaultPanel';
import { CharacterPanel } from './ui/CharacterPanel';
import { ConversationPanel } from './ui/ConversationPanel';
import { useGameStore } from '@/store/gameStore';
import { TOWER_FLOORS } from '@/types/game';
import { useMinionMovement } from '@/lib/questSimulation';

type ActivePanel = 'minions' | 'quests' | 'vault' | null;

export function GameLayout() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('minions');
  const tower = useGameStore((state) => state.tower);
  const minions = useGameStore((state) => state.minions);
  const activeQuestId = useGameStore((state) => state.activeQuestId);
  const conversation = useGameStore((state) => state.conversation);
  const exitConversation = useGameStore((state) => state.exitConversation);

  // Animate minion movement during quests
  useMinionMovement();

  const togglePanel = (panel: ActivePanel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Handle Escape key to exit conversation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && conversation.active && conversation.phase === 'active') {
      exitConversation();
    }
  }, [conversation.active, conversation.phase, exitConversation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Hide normal UI during conversation
  const inConversation = conversation.active;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Scene - z-0 to be below UI overlays */}
      <div className="absolute inset-0 z-0">
        <SimpleScene />
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🏰</span>
              Mage Tower
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {/* Tower level indicator */}
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-amber-500">⚡</span>
              <span className="text-white font-medium">Level {tower.level}</span>
              <span className="text-gray-500 text-sm">
                ({tower.unlockedFloors.length} floors)
              </span>
            </div>
          </div>

          {/* Minion count */}
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
            <div className="flex items-center gap-2">
              <span>👥</span>
              <span className="text-white">{minions.length} minions</span>
            </div>
          </div>

          {/* Active quest indicator */}
          {activeQuestId && (
            <div className="bg-amber-600/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-amber-500 animate-pulse">
              <span className="text-white font-medium">Quest Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons (hidden during conversation) */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto transition-opacity duration-300 ${inConversation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <NavButton
          icon="👥"
          label="Minions"
          active={activePanel === 'minions'}
          onClick={() => togglePanel('minions')}
        />
        <NavButton
          icon="⚔️"
          label="Quests"
          active={activePanel === 'quests'}
          onClick={() => togglePanel('quests')}
          badge={activeQuestId ? '!' : undefined}
        />
        <NavButton
          icon="📦"
          label="Vault"
          active={activePanel === 'vault'}
          onClick={() => togglePanel('vault')}
        />
      </div>

      {/* Side panels (hidden during conversation) */}
      <div className={`absolute top-20 left-4 bottom-20 flex flex-col gap-4 pointer-events-none transition-opacity duration-300 ${inConversation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="pointer-events-auto">
          {activePanel === 'minions' && <MinionPanel />}
          {activePanel === 'quests' && <QuestPanel />}
          {activePanel === 'vault' && <VaultPanel />}
        </div>
      </div>

      {/* Tower floors legend (hidden during conversation) */}
      <div className={`absolute bottom-20 right-4 pointer-events-auto transition-opacity duration-300 ${inConversation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Tower Floors</h3>
          <div className="space-y-1">
            {tower.unlockedFloors.map((floor) => (
              <div key={floor} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor:
                      floor === 'library'
                        ? '#8b5cf6'
                        : floor === 'workshop'
                        ? '#f59e0b'
                        : floor === 'forge'
                        ? '#ef4444'
                        : floor === 'observatory'
                        ? '#06b6d4'
                        : '#10b981',
                  }}
                />
                <span className="text-white">{TOWER_FLOORS[floor].name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions for new users */}
      {minions.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-6 border border-amber-600/50 max-w-md text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome, Mage!</h2>
            <p className="text-gray-400 mb-4">
              Your tower awaits. Recruit your first minion to begin your journey.
            </p>
            <p className="text-amber-500 text-sm">
              Click "Minions" below to recruit your first helper.
            </p>
          </div>
        </div>
      )}

      {/* Character panel for selected minion */}
      {!inConversation && <CharacterPanel />}

      {/* Conversation panel (shown during minion conversation) */}
      <ConversationPanel />
    </div>
  );
}

interface NavButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}

function NavButton({ icon, label, active, onClick, badge }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 px-6 py-3 rounded-lg transition-all ${
        active
          ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
          : 'bg-gray-900/90 text-gray-300 hover:bg-gray-800 border border-gray-700'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
