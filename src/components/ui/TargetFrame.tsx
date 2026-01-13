'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { wowTheme } from '@/styles/theme';
import { Portrait3D } from './Portrait3D';
import { WowIcon } from './WowIcon';
import { MINION_ROLES } from '@/types/game';
import type { MinionRole, MinionState } from '@/types/game';

/**
 * MMO-style target frame for selected minion.
 * Displays in the top-right corner with 3D portrait, name, quest progress, and status.
 */
export function TargetFrame() {
  const [mounted, setMounted] = useState(false);
  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const minions = useGameStore((state) => state.minions);
  const quests = useGameStore((state) => state.quests);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render placeholder on server and initial client render
  if (!mounted) {
    return null; // Target frame is only shown when a minion is selected
  }

  // Don't render if no minion selected
  if (!selectedMinionId) return null;

  const minion = minions.find((m) => m.id === selectedMinionId);
  if (!minion) return null;

  const currentQuest = minion.currentQuestId
    ? quests.find((q) => q.id === minion.currentQuestId)
    : null;

  const roleConfig = MINION_ROLES[minion.role];

  const handleClose = () => {
    setSelectedMinion(null);
  };

  return (
    <div
      className="target-frame"
      style={{
        position: 'fixed',
        top: '16px',
        right: '350px', // Position to the left of the CharacterPanel/level indicators
        zIndex: 40,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '2px',
        pointerEvents: 'auto',
        animation: 'fadeSlideIn 0.2s ease-out',
      }}
    >
      {/* Info panel (on left for target frame) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '180px',
        }}
      >
        {/* Name bar with close button */}
        <div
          style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
            border: `2px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.sm,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <WowIcon
              name={minion.role as 'scout' | 'scribe' | 'artificer'}
              size="xs"
              color={roleConfig.color}
            />
            <span
              style={{
                color: wowTheme.colors.textPrimary,
                fontSize: wowTheme.fontSizes.sm,
                fontWeight: 600,
                fontFamily: wowTheme.fonts.header,
                textShadow: wowTheme.shadows.text,
              }}
            >
              {minion.name}
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: wowTheme.radius.sm,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = wowTheme.colors.stoneMid;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <WowIcon name="close" size="xs" color={wowTheme.colors.textMuted} />
          </button>
        </div>

        {/* Quest progress bar (if on quest) */}
        {currentQuest && (
          <div
            style={{
              background: wowTheme.colors.bgDark,
              border: `2px solid ${wowTheme.colors.stoneBorder}`,
              borderRadius: wowTheme.radius.sm,
              padding: '3px',
              position: 'relative',
            }}
          >
            {/* Quest fill */}
            <div
              style={{
                height: '14px',
                background: `linear-gradient(180deg, ${wowTheme.colors.goldMid} 0%, ${wowTheme.colors.goldDark} 100%)`,
                borderRadius: '1px',
                width: `${currentQuest.progress}%`,
                transition: 'width 0.3s ease-out',
                boxShadow: currentQuest.progress > 0 ? wowTheme.shadows.glow : 'none',
              }}
            />

            {/* Quest text overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                color: wowTheme.colors.textPrimary,
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                padding: '0 4px',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {currentQuest.title} - {currentQuest.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div
          style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.parchmentDark} 0%, ${wowTheme.colors.bgMid} 100%)`,
            border: `2px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.sm,
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <StatusIndicator state={minion.state} />
          <span
            style={{
              color: wowTheme.colors.textSecondary,
              fontSize: wowTheme.fontSizes.xs,
              textTransform: 'capitalize',
            }}
          >
            {formatState(minion.state)}
          </span>
        </div>
      </div>

      {/* Portrait container with decorative frame */}
      <div
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
          border: `3px solid ${roleConfig.color}40`,
          borderRadius: wowTheme.radius.md,
          boxShadow: `${wowTheme.shadows.panel}, inset 0 0 15px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
        }}
      >
        {/* 3D Portrait */}
        <Portrait3D
          species="goblin"
          size={58}
          rotation={false}
        />

        {/* Role badge */}
        <RoleBadge role={minion.role} />

        {/* Corner decorations */}
        <TargetCorner position="top-left" color={roleConfig.color} />
        <TargetCorner position="top-right" color={roleConfig.color} />
        <TargetCorner position="bottom-left" color={roleConfig.color} />
        <TargetCorner position="bottom-right" color={roleConfig.color} />
      </div>
    </div>
  );
}

/**
 * Role badge displayed on the portrait
 */
function RoleBadge({ role }: { role: MinionRole }) {
  const roleConfig = MINION_ROLES[role];
  const initials: Record<MinionRole, string> = {
    scout: 'S',
    scribe: 'Sc',
    artificer: 'A',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '-2px',
        left: '-2px',
        minWidth: '20px',
        height: '18px',
        background: `linear-gradient(180deg, ${roleConfig.color} 0%, ${roleConfig.color}aa 100%)`,
        border: `2px solid ${wowTheme.colors.stoneDark}`,
        borderRadius: wowTheme.radius.sm,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        zIndex: 2,
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          color: wowTheme.colors.stoneDark,
          textTransform: 'uppercase',
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        {initials[role]}
      </span>
    </div>
  );
}

/**
 * Status indicator dot with animation
 */
function StatusIndicator({ state }: { state: MinionState }) {
  const stateColors: Record<MinionState, string> = {
    idle: wowTheme.colors.scout,
    traveling: wowTheme.colors.goldMid,
    working: '#8b5cf6',
    stuck: wowTheme.colors.danger,
    returning: wowTheme.colors.scribe,
    conversing: wowTheme.colors.goldLight,
  };

  const isAnimated = state === 'working' || state === 'traveling';

  return (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: stateColors[state],
        boxShadow: `0 0 6px ${stateColors[state]}`,
        animation: isAnimated ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}
    />
  );
}

/**
 * Format minion state for display
 */
function formatState(state: MinionState): string {
  const labels: Record<MinionState, string> = {
    idle: 'Idle',
    traveling: 'Traveling',
    working: 'Working',
    stuck: 'Stuck!',
    returning: 'Returning',
    conversing: 'Chatting',
  };
  return labels[state];
}

/**
 * Decorative corner piece for the target frame
 */
function TargetCorner({ position, color }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; color: string }) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0, transform: 'scaleX(-1)' },
    'bottom-left': { bottom: 0, left: 0, transform: 'scaleY(-1)' },
    'bottom-right': { bottom: 0, right: 0, transform: 'scale(-1, -1)' },
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: '8px',
        height: '8px',
        pointerEvents: 'none',
        zIndex: 1,
        ...positionStyles[position],
      }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0 L5 0 L5 1.5 L1.5 1.5 L1.5 5 L0 5 Z"
          fill={color}
          opacity="0.6"
        />
      </svg>
    </div>
  );
}
