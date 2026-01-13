'use client';

import { wowTheme } from '@/styles/theme';

// Icon names map to SVG icons
export type IconName =
  | 'tower'
  | 'scout'
  | 'scribe'
  | 'artificer'
  | 'quest'
  | 'vault'
  | 'scroll'
  | 'artifact'
  | 'rune'
  | 'postcard'
  | 'close'
  | 'expand'
  | 'minimize'
  | 'gold'
  | 'xp'
  | 'level'
  | 'minions'
  | 'chevronDown'
  | 'chevronRight'
  | 'check'
  | 'warning'
  | 'info';

interface WowIconProps {
  name: IconName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  color?: string;
  className?: string;
}

const sizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

// SVG icon paths - WoW-style fantasy icons
const iconPaths: Record<IconName, React.ReactNode> = {
  tower: (
    <>
      <path d="M12 2L8 6V10L4 14V22H20V14L16 10V6L12 2Z" fill="currentColor" opacity="0.3" />
      <path d="M12 2L8 6V10L4 14V22H20V14L16 10V6L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M10 22V18H14V22" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <path d="M9 14H15" stroke="currentColor" strokeWidth="1" />
      <path d="M7 18H17" stroke="currentColor" strokeWidth="1" />
    </>
  ),
  scout: (
    <>
      <ellipse cx="12" cy="8" rx="4" ry="5" fill="currentColor" opacity="0.3" />
      <path d="M12 3C9.5 3 8 5.5 8 8C8 10.5 9.5 13 12 13C14.5 13 16 10.5 16 8C16 5.5 14.5 3 12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M6 21V19C6 16 8.5 14 12 14C15.5 14 18 16 18 19V21" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M8 6L5 4M16 6L19 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="8" r="1" fill="currentColor" />
      <circle cx="14" cy="8" r="1" fill="currentColor" />
    </>
  ),
  scribe: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="6" y="4" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9 8H15M9 11H15M9 14H13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M16 2L20 6L18 8L14 4L16 2Z" fill="currentColor" />
    </>
  ),
  artificer: (
    <>
      <path d="M12 4L14 8H18L15 11L16 16L12 13L8 16L9 11L6 8H10L12 4Z" fill="currentColor" opacity="0.3" />
      <path d="M12 4L14 8H18L15 11L16 16L12 13L8 16L9 11L6 8H10L12 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 16V17" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  quest: (
    <>
      <path d="M7 4L12 2L17 4L17 14L12 22L7 14V4Z" fill="currentColor" opacity="0.3" />
      <path d="M7 4L12 2L17 4V14L12 22L7 14V4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 7V13M12 15V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  vault: (
    <>
      <path d="M4 10L12 6L20 10V18L12 22L4 18V10Z" fill="currentColor" opacity="0.3" />
      <path d="M4 10L12 6L20 10V18L12 22L4 18V10Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 6V22M4 10L20 10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 4C6 4 6 6 6 6V18C6 18 6 20 8 20H18C18 20 18 18 18 18V6C18 6 20 6 20 8V16C20 18 18 20 16 20" fill="currentColor" opacity="0.3" />
      <path d="M8 4C6 4 6 6 6 6V18C6 18 6 20 8 20H18V6C18 6 20 6 20 8V16C20 18 18 20 16 20" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M9 8H15M9 11H15M9 14H12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  artifact: (
    <>
      <circle cx="12" cy="12" r="6" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M12 4V6M12 18V20M4 12H6M18 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 6.5L8 8M16 16L17.5 17.5M17.5 6.5L16 8M8 16L6.5 17.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  rune: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 9V15M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <circle cx="9" cy="15" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
    </>
  ),
  postcard: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="1" fill="currentColor" opacity="0.3" />
      <rect x="4" y="6" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M4 9L12 13L20 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="14" r="2" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.5" />
    </>
  ),
  close: (
    <>
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.2" />
      <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  expand: (
    <>
      <path d="M4 14V20H10M20 10V4H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 4L20 10M4 14L10 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  minimize: (
    <>
      <path d="M4 14H10V20M20 10H14V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 14L4 20M14 10L20 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  gold: (
    <>
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">$</text>
    </>
  ),
  xp: (
    <>
      <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16L5.5 21L8 13.5L2 9H9.5L12 2Z" fill="currentColor" opacity="0.4" />
      <path d="M12 2L14.5 9H22L16 13.5L18.5 21L12 16L5.5 21L8 13.5L2 9H9.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </>
  ),
  level: (
    <>
      <path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" fill="currentColor" opacity="0.3" />
      <path d="M12 3L20 8V16L12 21L4 16V8L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1" fill="none" />
    </>
  ),
  minions: (
    <>
      <circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="8" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="15" r="3" fill="currentColor" opacity="0.3" />
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M5 20V19C5 17 6 16 8 16M19 20V19C19 17 18 16 16 16M9 22V21C9 19 10 18 12 18C14 18 15 19 15 21V22" stroke="currentColor" strokeWidth="1" />
    </>
  ),
  chevronDown: (
    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  chevronRight: (
    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  check: (
    <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  warning: (
    <>
      <path d="M12 3L22 20H2L12 3Z" fill="currentColor" opacity="0.3" />
      <path d="M12 3L22 20H2L12 3Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 9V14M12 17V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 8V8.5M12 11V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

export function WowIcon({ name, size = 'md', glow = false, color, className = '' }: WowIconProps) {
  const pixelSize = sizes[size];
  const defaultColor = wowTheme.colors.goldMid;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        color: color || defaultColor,
        filter: glow ? `drop-shadow(0 0 4px ${color || defaultColor})` : undefined,
        flexShrink: 0,
      }}
    >
      {iconPaths[name]}
    </svg>
  );
}

// Convenience component for role-specific icons
export function RoleIcon({ role, size = 'md', glow = false }: { role: 'scout' | 'scribe' | 'artificer'; size?: WowIconProps['size']; glow?: boolean }) {
  const colors: Record<string, string> = {
    scout: wowTheme.colors.scout,
    scribe: wowTheme.colors.scribe,
    artificer: wowTheme.colors.artificer,
  };

  return <WowIcon name={role} size={size} color={colors[role]} glow={glow} />;
}
