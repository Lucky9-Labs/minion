'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { wowTheme } from '@/styles/theme';
import { Portrait3D } from './Portrait3D';
import { WowIcon } from './WowIcon';

/**
 * MMO-style character profile frame for the wizard (player character).
 * Displays in the bottom-left corner with 3D portrait, name, level, and XP bar.
 */
export function WizardProfileFrame() {
  const [mounted, setMounted] = useState(false);
  const wizard = useGameStore((state) => state.wizard);

  useEffect(() => {
    setMounted(true);
  }, []);

  const xpPercentage = wizard ? (wizard.xp / wizard.xpToNextLevel) * 100 : 0;

  // Render placeholder on server and initial client render
  if (!mounted) {
    return (
      <div
        className="wizard-profile-frame"
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 40,
          width: '220px',
          height: '72px',
        }}
      />
    );
  }

  return (
    <div
      className="wizard-profile-frame"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '16px',
        zIndex: 40,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '2px',
        pointerEvents: 'auto',
      }}
    >
      {/* Portrait container with decorative frame */}
      <div
        style={{
          position: 'relative',
          width: '72px',
          height: '72px',
          background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
          border: `3px solid ${wowTheme.colors.goldDark}`,
          borderRadius: wowTheme.radius.md,
          boxShadow: `${wowTheme.shadows.panel}, inset 0 0 20px rgba(0,0,0,0.5)`,
          overflow: 'hidden',
        }}
      >
        {/* 3D Portrait */}
        <Portrait3D
          species="wizard"
          size={66}
          rotation={false}
        />

        {/* Level badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '24px',
            height: '24px',
            background: `linear-gradient(180deg, ${wowTheme.colors.goldMid} 0%, ${wowTheme.colors.goldDark} 100%)`,
            border: `2px solid ${wowTheme.colors.stoneDark}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: wowTheme.shadows.glow,
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: wowTheme.colors.stoneDark,
              textShadow: '0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            {wizard?.level || 1}
          </span>
        </div>

        {/* Corner decorations */}
        <FrameCorner position="top-left" />
        <FrameCorner position="top-right" />
        <FrameCorner position="bottom-left" />
        <FrameCorner position="bottom-right" />
      </div>

      {/* Info panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '140px',
        }}
      >
        {/* Name bar */}
        <div
          style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
            border: `2px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.sm,
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <WowIcon name="tower" size="xs" color={wowTheme.colors.goldMid} />
          <span
            style={{
              color: wowTheme.colors.goldLight,
              fontSize: wowTheme.fontSizes.sm,
              fontWeight: 600,
              fontFamily: wowTheme.fonts.header,
              textShadow: wowTheme.shadows.text,
              letterSpacing: '0.5px',
            }}
          >
            {wizard?.name || 'Archmage'}
          </span>
        </div>

        {/* XP bar */}
        <div
          style={{
            background: wowTheme.colors.bgDark,
            border: `2px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.sm,
            padding: '3px',
            position: 'relative',
          }}
        >
          {/* XP fill */}
          <div
            style={{
              height: '12px',
              background: `linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%)`,
              borderRadius: '1px',
              width: `${xpPercentage}%`,
              transition: 'width 0.3s ease-out',
              boxShadow: xpPercentage > 0 ? '0 0 8px rgba(139, 92, 246, 0.5)' : 'none',
            }}
          />

          {/* XP text overlay */}
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
            }}
          >
            {wizard?.xp || 0} / {wizard?.xpToNextLevel || 100} XP
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Decorative corner piece for the portrait frame
 */
function FrameCorner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
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
        width: '10px',
        height: '10px',
        pointerEvents: 'none',
        zIndex: 1,
        ...positionStyles[position],
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0 L6 0 L6 2 L2 2 L2 6 L0 6 Z"
          fill={wowTheme.colors.goldMid}
        />
        <circle cx="2" cy="2" r="1.5" fill={wowTheme.colors.goldLight} />
      </svg>
    </div>
  );
}
