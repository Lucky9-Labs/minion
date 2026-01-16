'use client';

import type { SpellbookPage } from '@/lib/FirstPersonSpellbook';

interface FirstPersonHUDProps {
  visible: boolean;
  spellbookSelection?: SpellbookPage | null;
  spellbookPageIndex?: number;
  spellbookPageCount?: number;
}

export function FirstPersonHUD({
  visible,
  spellbookSelection,
  spellbookPageIndex = 0,
  spellbookPageCount = 0,
}: FirstPersonHUDProps) {
  if (!visible) return null;

  const showSpellbook = spellbookSelection !== null && spellbookSelection !== undefined;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Crosshair - subtle dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full shadow-sm" />
      </div>

      {/* Spellbook selection indicator - below crosshair */}
      {showSpellbook && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-12">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-3 text-center min-w-[160px]">
            {/* Entity type badge */}
            <div className="text-xs uppercase tracking-wider text-purple-300/80 mb-1">
              {spellbookSelection.type === 'minion' ? 'Summon' : 'Construct'}
            </div>
            {/* Entity name */}
            <div className="text-white text-lg font-medium">
              {spellbookSelection.name}
            </div>
            {/* Page indicator */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {Array.from({ length: spellbookPageCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === spellbookPageIndex
                      ? 'bg-purple-400 scale-125'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            {/* Scroll hint */}
            <div className="text-white/40 text-xs mt-2 flex items-center justify-center gap-1">
              <span>Scroll</span>
              <span className="text-white/60">to turn pages</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls hint - auto-fades via CSS animation */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fade-out-delayed"
        style={{
          animation: 'fadeOutDelayed 5s forwards',
        }}
      >
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white/80 text-sm flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">W</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">S</kbd>
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">D</kbd>
            <span className="ml-1 text-white/60">Move</span>
          </span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1">
            <span className="text-white/60">Mouse</span>
            <span className="ml-1">Look</span>
          </span>
          <span className="text-white/40">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Tab</kbd>
            <span className="ml-1 text-white/60">Exit</span>
          </span>
        </div>
      </div>

      {/* Mode indicator - top right */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/30 backdrop-blur-sm rounded px-3 py-1.5 text-white/60 text-xs uppercase tracking-wider flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${showSpellbook ? 'bg-purple-400' : 'bg-amber-400'}`} />
          {showSpellbook ? 'Spellbook' : 'First Person'}
        </div>
      </div>
    </div>
  );
}
