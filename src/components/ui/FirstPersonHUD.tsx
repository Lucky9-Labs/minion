'use client';

import { useGameStore } from '@/store/gameStore';

interface FirstPersonHUDProps {
  visible: boolean;
}

export function FirstPersonHUD({ visible }: FirstPersonHUDProps) {
  const possessedGolemId = useGameStore((state) => state.possessedGolemId);
  const golems = useGameStore((state) => state.golems);
  const possessGolem = useGameStore((state) => state.possessGolem);

  if (!visible) return null;

  const isGolemMode = !!possessedGolemId;
  const possessedGolem = golems.find((g) => g.id === possessedGolemId);

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Crosshair - larger for golem mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {isGolemMode ? (
          // Golem crosshair - chunky square
          <div className="w-3 h-3 border-2 border-orange-400/60 rotate-45 shadow-lg" />
        ) : (
          // Wizard crosshair - subtle dot
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full shadow-sm" />
        )}
      </div>

      {/* Controls hint - auto-fades via CSS animation */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-out-delayed"
        style={{
          animation: 'fadeOutDelayed 5s forwards',
        }}
      >
        <div className={`backdrop-blur-sm rounded-lg px-4 py-2 text-sm flex items-center gap-4 ${
          isGolemMode ? 'bg-orange-900/50 text-orange-100/80' : 'bg-black/50 text-white/80'
        }`}>
          <span className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-xs ${isGolemMode ? 'bg-orange-400/20' : 'bg-white/10'}`}>W</kbd>
            <kbd className={`px-1.5 py-0.5 rounded text-xs ${isGolemMode ? 'bg-orange-400/20' : 'bg-white/10'}`}>A</kbd>
            <kbd className={`px-1.5 py-0.5 rounded text-xs ${isGolemMode ? 'bg-orange-400/20' : 'bg-white/10'}`}>S</kbd>
            <kbd className={`px-1.5 py-0.5 rounded text-xs ${isGolemMode ? 'bg-orange-400/20' : 'bg-white/10'}`}>D</kbd>
            <span className={`ml-1 ${isGolemMode ? 'text-orange-200/60' : 'text-white/60'}`}>
              {isGolemMode ? 'Stomp' : 'Move'}
            </span>
          </span>
          <span className={isGolemMode ? 'text-orange-400/40' : 'text-white/40'}>|</span>
          <span className="flex items-center gap-1">
            <span className={isGolemMode ? 'text-orange-200/60' : 'text-white/60'}>Mouse</span>
            <span className="ml-1">Look</span>
          </span>
          <span className={isGolemMode ? 'text-orange-400/40' : 'text-white/40'}>|</span>
          <span className="flex items-center gap-1">
            <kbd className={`px-1.5 py-0.5 rounded text-xs ${isGolemMode ? 'bg-orange-400/20' : 'bg-white/10'}`}>ESC</kbd>
            <span className={`ml-1 ${isGolemMode ? 'text-orange-200/60' : 'text-white/60'}`}>
              {isGolemMode ? 'Exit Golem' : 'Exit'}
            </span>
          </span>
        </div>
      </div>

      {/* Mode indicator - top right */}
      <div className="absolute top-4 right-4">
        {isGolemMode ? (
          // Golem mode indicator
          <div className="bg-orange-900/40 backdrop-blur-sm rounded px-3 py-1.5 text-orange-200/80 text-xs uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-sm animate-pulse" />
            <span className="font-bold">{possessedGolem?.name || 'Golem'}</span>
          </div>
        ) : (
          // Wizard mode indicator
          <div className="bg-black/30 backdrop-blur-sm rounded px-3 py-1.5 text-white/60 text-xs uppercase tracking-wider flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            First Person
          </div>
        )}
      </div>

      {/* Golem-specific exit button (pointer events enabled) */}
      {isGolemMode && (
        <div className="absolute bottom-4 right-4 pointer-events-auto">
          <button
            onClick={() => possessGolem(null)}
            className="bg-orange-800/60 hover:bg-orange-700/60 backdrop-blur-sm rounded-lg px-4 py-2 text-orange-100 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Exit Golem
          </button>
        </div>
      )}
    </div>
  );
}
