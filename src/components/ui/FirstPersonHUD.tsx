'use client';

interface FirstPersonHUDProps {
  visible: boolean;
}

export function FirstPersonHUD({ visible }: FirstPersonHUDProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Crosshair - subtle dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full shadow-sm" />
      </div>

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
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          First Person
        </div>
      </div>
    </div>
  );
}
