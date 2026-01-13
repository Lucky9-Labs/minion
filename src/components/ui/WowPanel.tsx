'use client';

import { ReactNode, useEffect } from 'react';
import { wowTheme } from '@/styles/theme';
import { WowIcon } from './WowIcon';
import { playSound } from '@/lib/sounds';

interface WowPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'compact' | 'ornate';
  noPadding?: boolean;
}

export function WowPanel({
  title,
  children,
  className = '',
  onClose,
  icon,
  variant = 'default',
  noPadding = false,
}: WowPanelProps) {
  // Play sound on mount
  useEffect(() => {
    playSound('panelOpen');
    return () => {
      // Don't play close sound on unmount - can be jarring
    };
  }, []);

  const handleClose = () => {
    playSound('panelClose');
    onClose?.();
  };

  return (
    <div
      className={`wow-panel wow-panel--${variant} ${className}`}
      style={{
        // Base panel styling
        background: `linear-gradient(180deg, ${wowTheme.colors.parchmentMid} 0%, ${wowTheme.colors.parchmentDark} 100%)`,
        border: `3px solid ${wowTheme.colors.stoneBorder}`,
        borderRadius: wowTheme.radius.md,
        boxShadow: wowTheme.shadows.panelHeavy,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Stone texture overlay */}
      <div
        className="wow-panel__texture"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.02) 2px,
              rgba(0,0,0,0.02) 4px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      {/* Inner border highlight */}
      <div
        className="wow-panel__inner-border"
        style={{
          position: 'absolute',
          inset: '3px',
          border: `1px solid ${wowTheme.colors.stoneLight}`,
          borderRadius: wowTheme.radius.sm,
          pointerEvents: 'none',
          opacity: 0.3,
        }}
      />

      {/* Corner ornaments */}
      <CornerOrnament position="top-left" />
      <CornerOrnament position="top-right" />
      <CornerOrnament position="bottom-left" />
      <CornerOrnament position="bottom-right" />

      {/* Title bar */}
      <div
        className="wow-panel__header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
          borderBottom: `2px solid ${wowTheme.colors.stoneBorder}`,
          position: 'relative',
        }}
      >
        {/* Title bar shine */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${wowTheme.colors.stoneHighlight}, transparent)`,
            opacity: 0.5,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
          <h2
            style={{
              margin: 0,
              fontSize: wowTheme.fontSizes.lg,
              fontWeight: 600,
              color: wowTheme.colors.goldLight,
              textShadow: wowTheme.shadows.textEmboss,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontFamily: wowTheme.fonts.header,
            }}
          >
            {title}
          </h2>
        </div>

        {onClose && (
          <button
            onClick={handleClose}
            className="wow-panel__close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: wowTheme.radius.sm,
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = wowTheme.colors.stoneMid;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <WowIcon name="close" size="sm" color={wowTheme.colors.textSecondary} />
          </button>
        )}
      </div>

      {/* Decorative divider */}
      <div
        style={{
          height: '4px',
          background: `linear-gradient(90deg,
            transparent,
            ${wowTheme.colors.goldDark} 20%,
            ${wowTheme.colors.goldMid} 50%,
            ${wowTheme.colors.goldDark} 80%,
            transparent
          )`,
        }}
      />

      {/* Content area */}
      <div
        className="wow-panel__content"
        style={{
          padding: noPadding ? 0 : '16px',
          position: 'relative',
          color: wowTheme.colors.textPrimary,
          fontSize: wowTheme.fontSizes.sm,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Corner ornament component
function CornerOrnament({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: -2, left: -2 },
    'top-right': { top: -2, right: -2, transform: 'scaleX(-1)' },
    'bottom-left': { bottom: -2, left: -2, transform: 'scaleY(-1)' },
    'bottom-right': { bottom: -2, right: -2, transform: 'scale(-1, -1)' },
  };

  return (
    <div
      style={{
        position: 'absolute',
        width: '20px',
        height: '20px',
        pointerEvents: 'none',
        zIndex: 10,
        ...positionStyles[position],
      }}
    >
      {/* SVG corner ornament */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 0 L8 0 L8 2 L2 2 L2 8 L0 8 Z"
          fill={wowTheme.colors.goldMid}
        />
        <path
          d="M1 1 L6 1 L6 3 L3 3 L3 6 L1 6 Z"
          fill={wowTheme.colors.goldLight}
          opacity="0.5"
        />
        <circle cx="4" cy="4" r="2" fill={wowTheme.colors.goldDark} />
        <circle cx="4" cy="4" r="1" fill={wowTheme.colors.goldLight} />
      </svg>
    </div>
  );
}

// Simpler panel variant for nested content
export function WowPanelInset({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`wow-panel-inset ${className}`}
      style={{
        background: wowTheme.colors.parchmentDark,
        border: `1px solid ${wowTheme.colors.stoneBorder}`,
        borderRadius: wowTheme.radius.sm,
        boxShadow: wowTheme.shadows.inset,
        padding: '12px',
      }}
    >
      {children}
    </div>
  );
}

// Section header within a panel
export function WowSectionHeader({ children, icon }: { children: ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${wowTheme.colors.stoneMid}`,
      }}
    >
      {icon}
      <h3
        style={{
          margin: 0,
          fontSize: wowTheme.fontSizes.md,
          fontWeight: 600,
          color: wowTheme.colors.goldMid,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontFamily: wowTheme.fonts.header,
        }}
      >
        {children}
      </h3>
    </div>
  );
}

// Horizontal divider
export function WowDivider() {
  return (
    <div
      style={{
        height: '2px',
        margin: '12px 0',
        background: `linear-gradient(90deg,
          transparent,
          ${wowTheme.colors.stoneMid} 20%,
          ${wowTheme.colors.stoneLight} 50%,
          ${wowTheme.colors.stoneMid} 80%,
          transparent
        )`,
      }}
    />
  );
}
