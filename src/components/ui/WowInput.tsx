'use client';

import { useState } from 'react';
import { wowTheme } from '@/styles/theme';

interface WowInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function WowInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  disabled = false,
  error,
  className = '',
}: WowInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: wowTheme.fontSizes.sm,
    fontFamily: wowTheme.fonts.body,
    color: wowTheme.colors.textPrimary,
    background: wowTheme.colors.stoneDark,
    border: `2px solid ${error ? wowTheme.colors.danger : isFocused ? wowTheme.colors.goldMid : wowTheme.colors.stoneBorder}`,
    borderRadius: wowTheme.radius.sm,
    boxShadow: wowTheme.shadows.inset,
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    resize: multiline ? 'vertical' : 'none',
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`wow-input ${className}`} style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: wowTheme.fontSizes.xs,
            fontWeight: 600,
            fontFamily: wowTheme.fonts.header,
            color: wowTheme.colors.goldMid,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {label}
        </label>
      )}

      {multiline ? (
        <textarea
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          style={inputStyles}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          style={inputStyles}
        />
      )}

      {error && (
        <p
          style={{
            marginTop: '4px',
            fontSize: wowTheme.fontSizes.xs,
            color: wowTheme.colors.textDanger,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// Select dropdown with WoW styling
interface WowSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

export function WowSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
}: WowSelectProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`wow-select ${className}`} style={{ width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: wowTheme.fontSizes.xs,
            fontWeight: 600,
            fontFamily: wowTheme.fonts.header,
            color: wowTheme.colors.goldMid,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: wowTheme.fontSizes.sm,
          fontFamily: wowTheme.fonts.body,
          color: wowTheme.colors.textPrimary,
          background: wowTheme.colors.stoneDark,
          border: `2px solid ${isFocused ? wowTheme.colors.goldMid : wowTheme.colors.stoneBorder}`,
          borderRadius: wowTheme.radius.sm,
          boxShadow: wowTheme.shadows.inset,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9a227' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
        }}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{
              background: wowTheme.colors.stoneDark,
              color: wowTheme.colors.textPrimary,
            }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Checkbox with WoW styling
interface WowCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WowCheckbox({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
}: WowCheckboxProps) {
  return (
    <label
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: wowTheme.colors.stoneDark,
          border: `2px solid ${checked ? wowTheme.colors.goldMid : wowTheme.colors.stoneBorder}`,
          borderRadius: wowTheme.radius.sm,
          boxShadow: wowTheme.shadows.inset,
          transition: 'all 150ms ease',
        }}
      >
        {checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={wowTheme.colors.goldLight}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L19 7" />
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <span
        style={{
          fontSize: wowTheme.fontSizes.sm,
          color: wowTheme.colors.textPrimary,
          fontFamily: wowTheme.fonts.body,
        }}
      >
        {label}
      </span>
    </label>
  );
}
