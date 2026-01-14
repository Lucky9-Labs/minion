'use client';

import type { Target } from '@/types/interaction';

interface QuickInfoProps {
  visible: boolean;
  target: Target | null;
}

function getQuickInfoContent(target: Target): { title: string; subtitle: string; icon: string } {
  switch (target.type) {
    case 'minion':
      return {
        title: target.entity?.name || 'Minion',
        subtitle: target.entity?.state || 'Idle',
        icon: '🧙',
      };
    case 'building':
      return {
        title: target.entity?.name || 'Building',
        subtitle: target.entity?.buildingType || 'Structure',
        icon: '🏠',
      };
    case 'ground':
      return {
        title: 'Open Ground',
        subtitle: 'Hold to build',
        icon: '🏗️',
      };
    default:
      return { title: '', subtitle: '', icon: '' };
  }
}

export function QuickInfo({ visible, target }: QuickInfoProps) {
  if (!visible || !target || target.type === 'none') return null;

  const { title, subtitle, icon } = getQuickInfoContent(target);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        // Position slightly below and to the right of center (reticle)
        top: '52%',
        left: '52%',
        transform: 'translate(0, 0)',
      }}
    >
      <div
        className="bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white shadow-lg border border-white/10"
        style={{
          animation: 'quickInfoFadeIn 0.15s ease-out',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs text-white/60">{subtitle}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes quickInfoFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
