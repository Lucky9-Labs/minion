// WoW-inspired design tokens for MMORPG aesthetic UI
// Based on classic World of Warcraft (2004-2010 era) interface design

export const wowTheme = {
  colors: {
    // Stone/Border colors - dark weathered stone
    stoneDark: '#2a2015',
    stoneMid: '#4a3c2a',
    stoneLight: '#6b5a42',
    stoneBorder: '#1a1510',
    stoneHighlight: '#7d6b52',

    // Parchment/Background colors - aged paper/leather
    parchmentDark: '#3d3225',
    parchmentMid: '#5c4d3a',
    parchmentLight: '#8b7355',
    parchmentHighlight: '#a08060',

    // Metallic accents - gold/bronze
    goldDark: '#8b6914',
    goldMid: '#c9a227',
    goldLight: '#e8c84a',
    goldPale: '#f4d35e',
    bronze: '#b87333',
    bronzeLight: '#cd8c42',
    copper: '#b5651d',

    // Text colors
    textPrimary: '#f4e4c1',
    textSecondary: '#c4a77d',
    textMuted: '#8b7355',
    textGold: '#ffd700',
    textDanger: '#ff6b6b',

    // Role/Class colors (muted fantasy palette)
    scout: '#4a8f4a',      // Forest green
    scoutLight: '#6aaf6a',
    scribe: '#4a6a8f',     // Royal blue
    scribeLight: '#6a8aaf',
    artificer: '#c9a227',  // Gold
    artificerLight: '#e8c84a',

    // UI States
    hover: '#5c4d3a',
    active: '#c9a227',
    selected: '#6b5a42',
    danger: '#8b3a3a',
    dangerLight: '#ab5a5a',
    success: '#4a8f4a',

    // Background layers
    bgDarkest: '#0d0a07',
    bgDark: '#1a1510',
    bgMid: '#2a2015',
    bgOverlay: 'rgba(13, 10, 7, 0.85)',
  },

  borders: {
    panel: '3px solid #1a1510',
    panelInner: '1px solid #4a3c2a',
    inset: '2px solid #3d3225',
    gold: '2px solid #c9a227',
    goldThick: '3px solid #c9a227',
    stone: '2px solid #2a2015',
  },

  shadows: {
    panel: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
    panelHeavy: '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
    inset: 'inset 0 2px 4px rgba(0,0,0,0.4)',
    insetDeep: 'inset 0 3px 8px rgba(0,0,0,0.5)',
    glow: '0 0 10px rgba(201, 162, 39, 0.4)',
    glowStrong: '0 0 20px rgba(201, 162, 39, 0.6)',
    text: '0 1px 2px rgba(0,0,0,0.8)',
    textEmboss: '0 1px 0 rgba(255,255,255,0.1), 0 -1px 0 rgba(0,0,0,0.5)',
  },

  gradients: {
    // Button gradients
    buttonPrimary: 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)',
    buttonPrimaryHover: 'linear-gradient(180deg, #e8c84a 0%, #c9a227 100%)',
    buttonSecondary: 'linear-gradient(180deg, #5c4d3a 0%, #3d3225 100%)',
    buttonSecondaryHover: 'linear-gradient(180deg, #6b5a42 0%, #4a3c2a 100%)',
    buttonDanger: 'linear-gradient(180deg, #8b3a3a 0%, #5a2525 100%)',

    // Panel gradients
    panelHeader: 'linear-gradient(180deg, #4a3c2a 0%, #2a2015 100%)',
    panelBody: 'linear-gradient(180deg, #3d3225 0%, #2a2015 100%)',

    // Metallic shine
    goldShine: 'linear-gradient(135deg, rgba(248,200,74,0.3) 0%, transparent 50%, rgba(139,105,20,0.3) 100%)',
    stoneShine: 'linear-gradient(135deg, rgba(107,90,66,0.2) 0%, transparent 50%, rgba(26,21,16,0.2) 100%)',
  },

  // Border radius - minimal for medieval feel
  radius: {
    none: '0px',
    sm: '2px',
    md: '4px',
    lg: '6px',
  },

  // Spacing scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },

  // Typography
  fonts: {
    header: '"Cinzel", "Times New Roman", serif',
    body: '"Crimson Text", Georgia, serif',
    mono: '"Fira Code", "Courier New", monospace',
  },

  fontSizes: {
    xs: '11px',
    sm: '13px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
  },

  // Texture paths
  textures: {
    stoneBorder: '/textures/stone-border.png',
    parchmentBg: '/textures/parchment-bg.png',
    parchmentDark: '/textures/parchment-dark.png',
    metalCornerTL: '/textures/metal-corner-tl.png',
    metalCornerTR: '/textures/metal-corner-tr.png',
    metalCornerBL: '/textures/metal-corner-bl.png',
    metalCornerBR: '/textures/metal-corner-br.png',
    titleBarBg: '/textures/title-bar-bg.png',
    buttonNormal: '/textures/button-normal.png',
    buttonHover: '/textures/button-hover.png',
    buttonPressed: '/textures/button-pressed.png',
    dividerHorizontal: '/textures/divider-horizontal.png',
    scrollTrack: '/textures/scroll-track.png',
    scrollThumb: '/textures/scroll-thumb.png',
  },

  // Icon paths
  icons: {
    tower: '/icons/icon-tower.png',
    scout: '/icons/icon-minion-scout.png',
    scribe: '/icons/icon-minion-scribe.png',
    artificer: '/icons/icon-minion-artificer.png',
    quest: '/icons/icon-quest.png',
    vault: '/icons/icon-vault.png',
    scroll: '/icons/icon-scroll.png',
    artifact: '/icons/icon-artifact.png',
    rune: '/icons/icon-rune.png',
    postcard: '/icons/icon-postcard.png',
    close: '/icons/icon-close.png',
    expand: '/icons/icon-expand.png',
    minimize: '/icons/icon-minimize.png',
    gold: '/icons/icon-gold.png',
    xp: '/icons/icon-xp.png',
    level: '/icons/icon-level.png',
    minions: '/icons/icon-minions.png',
  },

  // Sound paths
  sounds: {
    panelOpen: '/sounds/panel-open.mp3',
    panelClose: '/sounds/panel-close.mp3',
    buttonClick: '/sounds/button-click.mp3',
    buttonHover: '/sounds/button-hover.mp3',
    questAccept: '/sounds/quest-accept.mp3',
    questComplete: '/sounds/quest-complete.mp3',
    itemPickup: '/sounds/item-pickup.mp3',
    error: '/sounds/error.mp3',
  },

  // Animation durations
  animation: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
} as const;

// Type exports for TypeScript support
export type WowTheme = typeof wowTheme;
export type WowColor = keyof typeof wowTheme.colors;
export type WowIcon = keyof typeof wowTheme.icons;
export type WowSound = keyof typeof wowTheme.sounds;
export type WowTexture = keyof typeof wowTheme.textures;

// CSS custom properties generator
export function generateCSSVariables(): string {
  const vars: string[] = [];

  // Colors
  Object.entries(wowTheme.colors).forEach(([key, value]) => {
    vars.push(`--wow-${kebabCase(key)}: ${value};`);
  });

  // Shadows
  Object.entries(wowTheme.shadows).forEach(([key, value]) => {
    vars.push(`--wow-shadow-${kebabCase(key)}: ${value};`);
  });

  // Gradients
  Object.entries(wowTheme.gradients).forEach(([key, value]) => {
    vars.push(`--wow-gradient-${kebabCase(key)}: ${value};`);
  });

  return `:root {\n  ${vars.join('\n  ')}\n}`;
}

// Helper to convert camelCase to kebab-case
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Tailwind-compatible color export
export const tailwindColors = {
  'wow-stone': {
    dark: wowTheme.colors.stoneDark,
    DEFAULT: wowTheme.colors.stoneMid,
    light: wowTheme.colors.stoneLight,
    border: wowTheme.colors.stoneBorder,
  },
  'wow-parchment': {
    dark: wowTheme.colors.parchmentDark,
    DEFAULT: wowTheme.colors.parchmentMid,
    light: wowTheme.colors.parchmentLight,
  },
  'wow-gold': {
    dark: wowTheme.colors.goldDark,
    DEFAULT: wowTheme.colors.goldMid,
    light: wowTheme.colors.goldLight,
    pale: wowTheme.colors.goldPale,
  },
  'wow-bronze': {
    DEFAULT: wowTheme.colors.bronze,
    light: wowTheme.colors.bronzeLight,
  },
  'wow-text': {
    DEFAULT: wowTheme.colors.textPrimary,
    secondary: wowTheme.colors.textSecondary,
    muted: wowTheme.colors.textMuted,
    gold: wowTheme.colors.textGold,
  },
};
