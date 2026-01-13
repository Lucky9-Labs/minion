'use client';

import { ReactNode, useState } from 'react';
import { wowTheme } from '@/styles/theme';
import { playSound } from '@/lib/sounds';

interface WowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function WowButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  icon,
  iconPosition = 'left',
  fullWidth = false,
}: WowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    playSound('buttonClick');
    onClick?.();
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    playSound('buttonHover', 0.1);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
  };

  // Size configurations
  const sizes = {
    sm: {
      padding: '6px 12px',
      fontSize: wowTheme.fontSizes.xs,
      gap: '4px',
    },
    md: {
      padding: '8px 16px',
      fontSize: wowTheme.fontSizes.sm,
      gap: '6px',
    },
    lg: {
      padding: '12px 24px',
      fontSize: wowTheme.fontSizes.md,
      gap: '8px',
    },
  };

  // Variant configurations
  const variants = {
    primary: {
      background: isPressed
        ? `linear-gradient(180deg, ${wowTheme.colors.goldDark} 0%, ${wowTheme.colors.goldMid} 100%)`
        : isHovered
        ? wowTheme.gradients.buttonPrimaryHover
        : wowTheme.gradients.buttonPrimary,
      border: `2px solid ${wowTheme.colors.goldDark}`,
      color: wowTheme.colors.stoneDark,
      textShadow: '0 1px 0 rgba(255,255,255,0.3)',
      boxShadow: isPressed
        ? wowTheme.shadows.inset
        : isHovered
        ? `${wowTheme.shadows.glow}, 0 2px 4px rgba(0,0,0,0.3)`
        : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    },
    secondary: {
      background: isPressed
        ? `linear-gradient(180deg, ${wowTheme.colors.stoneDark} 0%, ${wowTheme.colors.stoneMid} 100%)`
        : isHovered
        ? wowTheme.gradients.buttonSecondaryHover
        : wowTheme.gradients.buttonSecondary,
      border: `2px solid ${wowTheme.colors.stoneBorder}`,
      color: wowTheme.colors.textPrimary,
      textShadow: wowTheme.shadows.text,
      boxShadow: isPressed
        ? wowTheme.shadows.inset
        : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    },
    danger: {
      background: isPressed
        ? `linear-gradient(180deg, #5a2525 0%, #8b3a3a 100%)`
        : isHovered
        ? `linear-gradient(180deg, #ab5a5a 0%, #8b3a3a 100%)`
        : wowTheme.gradients.buttonDanger,
      border: `2px solid #4a1515`,
      color: wowTheme.colors.textPrimary,
      textShadow: wowTheme.shadows.text,
      boxShadow: isPressed
        ? wowTheme.shadows.inset
        : '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    },
    ghost: {
      background: isPressed
        ? wowTheme.colors.stoneDark
        : isHovered
        ? wowTheme.colors.stoneMid
        : 'transparent',
      border: `1px solid ${isHovered ? wowTheme.colors.stoneLight : 'transparent'}`,
      color: isHovered ? wowTheme.colors.textPrimary : wowTheme.colors.textSecondary,
      textShadow: 'none',
      boxShadow: 'none',
    },
  };

  const currentVariant = variants[variant];
  const currentSize = sizes[size];

  return (
    <button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: 600,
        fontFamily: wowTheme.fonts.body,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
        borderRadius: wowTheme.radius.sm,
        width: fullWidth ? '100%' : 'auto',
        ...currentVariant,
        // Reset button defaults
        outline: 'none',
      }}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  );
}

// Icon-only button variant
interface WowIconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  tooltip?: string;
}

export function WowIconButton({
  icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  tooltip,
}: WowIconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    playSound('buttonClick');
    onClick?.();
  };

  const sizes = {
    sm: 28,
    md: 36,
    lg: 44,
  };

  const pixelSize = sizes[size];

  const variants = {
    primary: {
      background: isPressed
        ? wowTheme.colors.goldDark
        : isHovered
        ? wowTheme.colors.goldMid
        : wowTheme.colors.goldDark,
      border: `2px solid ${wowTheme.colors.goldDark}`,
      color: wowTheme.colors.stoneDark,
    },
    secondary: {
      background: isPressed
        ? wowTheme.colors.stoneDark
        : isHovered
        ? wowTheme.colors.stoneMid
        : wowTheme.colors.parchmentDark,
      border: `1px solid ${wowTheme.colors.stoneBorder}`,
      color: wowTheme.colors.textPrimary,
    },
    ghost: {
      background: isPressed
        ? wowTheme.colors.stoneDark
        : isHovered
        ? wowTheme.colors.stoneMid
        : 'transparent',
      border: '1px solid transparent',
      color: isHovered ? wowTheme.colors.goldMid : wowTheme.colors.textSecondary,
    },
  };

  const currentVariant = variants[variant];

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
      className={className}
      title={tooltip}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: pixelSize,
        height: pixelSize,
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms ease',
        borderRadius: wowTheme.radius.sm,
        outline: 'none',
        ...currentVariant,
      }}
    >
      {icon}
    </button>
  );
}

// Toggle button for tab-like selections
interface WowToggleButtonProps {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
}

export function WowToggleButton({
  children,
  active,
  onClick,
  icon,
  className = '',
}: WowToggleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    playSound('buttonClick');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        fontSize: wowTheme.fontSizes.sm,
        fontWeight: 600,
        fontFamily: wowTheme.fonts.body,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        borderRadius: `${wowTheme.radius.sm} ${wowTheme.radius.sm} 0 0`,
        outline: 'none',
        background: active
          ? wowTheme.colors.parchmentMid
          : isHovered
          ? wowTheme.colors.stoneMid
          : wowTheme.colors.stoneDark,
        border: `2px solid ${wowTheme.colors.stoneBorder}`,
        borderBottom: active ? `2px solid ${wowTheme.colors.parchmentMid}` : `2px solid ${wowTheme.colors.stoneBorder}`,
        color: active ? wowTheme.colors.goldLight : wowTheme.colors.textSecondary,
        marginBottom: '-2px',
        position: 'relative',
        zIndex: active ? 1 : 0,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
