'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MenuOption } from '@/types/interaction';

interface RadialMenuProps {
  visible: boolean;
  options: MenuOption[];
  onSelect: (option: MenuOption) => void;
  onCancel: () => void;
  cursorPosition: { x: number; y: number };
}

const DEAD_ZONE_RADIUS = 40; // pixels from center where no selection happens
const MENU_RADIUS = 100; // radius of the menu circle
const SEGMENT_INNER_RADIUS = 50;
const SEGMENT_OUTER_RADIUS = 110;

export function RadialMenu({ visible, options, onSelect, onCancel, cursorPosition }: RadialMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [centerPosition, setCenterPosition] = useState({ x: 0, y: 0 });

  // Calculate center position on mount
  useEffect(() => {
    if (visible) {
      setCenterPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    }
  }, [visible]);

  // Calculate selected segment based on cursor position
  useEffect(() => {
    if (!visible || options.length === 0) {
      setSelectedIndex(null);
      return;
    }

    const dx = cursorPosition.x - centerPosition.x;
    const dy = cursorPosition.y - centerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < DEAD_ZONE_RADIUS) {
      setSelectedIndex(null);
      return;
    }

    // Calculate angle (0 = right, going clockwise)
    let angle = Math.atan2(dy, dx);
    // Adjust so 0 is at top
    angle = angle + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;

    const segmentAngle = (Math.PI * 2) / options.length;
    const index = Math.floor(angle / segmentAngle) % options.length;

    setSelectedIndex(index);
  }, [visible, cursorPosition, centerPosition, options.length]);

  // Handle click to select
  const handleClick = useCallback(() => {
    if (selectedIndex !== null && options[selectedIndex]) {
      const option = options[selectedIndex];
      if (option.id === 'cancel') {
        onCancel();
      } else {
        onSelect(option);
      }
    }
  }, [selectedIndex, options, onSelect, onCancel]);

  // Listen for click when visible
  useEffect(() => {
    if (!visible) return;

    const handleMouseUp = (e: MouseEvent) => {
      // Only respond to left click release
      if (e.button === 0) {
        handleClick();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [visible, handleClick]);

  if (!visible || options.length === 0) return null;

  const segmentAngle = 360 / options.length;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{
        animation: 'radialMenuFadeIn 0.15s ease-out',
      }}
    >
      {/* Center point indicator */}
      <div
        className="absolute w-3 h-3 bg-white/30 rounded-full"
        style={{
          left: centerPosition.x - 6,
          top: centerPosition.y - 6,
        }}
      />

      {/* SVG for segments */}
      <svg
        className="absolute"
        style={{
          left: centerPosition.x - SEGMENT_OUTER_RADIUS,
          top: centerPosition.y - SEGMENT_OUTER_RADIUS,
          width: SEGMENT_OUTER_RADIUS * 2,
          height: SEGMENT_OUTER_RADIUS * 2,
        }}
      >
        {options.map((option, index) => {
          const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
          const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);

          const isSelected = selectedIndex === index;

          // Calculate arc path
          const innerStart = {
            x: SEGMENT_OUTER_RADIUS + Math.cos(startAngle) * SEGMENT_INNER_RADIUS,
            y: SEGMENT_OUTER_RADIUS + Math.sin(startAngle) * SEGMENT_INNER_RADIUS,
          };
          const innerEnd = {
            x: SEGMENT_OUTER_RADIUS + Math.cos(endAngle) * SEGMENT_INNER_RADIUS,
            y: SEGMENT_OUTER_RADIUS + Math.sin(endAngle) * SEGMENT_INNER_RADIUS,
          };
          const outerStart = {
            x: SEGMENT_OUTER_RADIUS + Math.cos(startAngle) * SEGMENT_OUTER_RADIUS,
            y: SEGMENT_OUTER_RADIUS + Math.sin(startAngle) * SEGMENT_OUTER_RADIUS,
          };
          const outerEnd = {
            x: SEGMENT_OUTER_RADIUS + Math.cos(endAngle) * SEGMENT_OUTER_RADIUS,
            y: SEGMENT_OUTER_RADIUS + Math.sin(endAngle) * SEGMENT_OUTER_RADIUS,
          };

          const largeArc = segmentAngle > 180 ? 1 : 0;

          const pathD = [
            `M ${innerStart.x} ${innerStart.y}`,
            `A ${SEGMENT_INNER_RADIUS} ${SEGMENT_INNER_RADIUS} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
            `L ${outerEnd.x} ${outerEnd.y}`,
            `A ${SEGMENT_OUTER_RADIUS} ${SEGMENT_OUTER_RADIUS} 0 ${largeArc} 0 ${outerStart.x} ${outerStart.y}`,
            'Z',
          ].join(' ');

          return (
            <path
              key={option.id}
              d={pathD}
              fill={isSelected ? 'rgba(153, 102, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}
              stroke={isSelected ? 'rgba(153, 102, 255, 1)' : 'rgba(255, 255, 255, 0.3)'}
              strokeWidth={isSelected ? 2 : 1}
              style={{
                transition: 'fill 0.1s, stroke 0.1s',
              }}
            />
          );
        })}
      </svg>

      {/* Labels for each segment */}
      {options.map((option, index) => {
        const midAngle = ((index + 0.5) * segmentAngle - 90) * (Math.PI / 180);
        const labelRadius = (SEGMENT_INNER_RADIUS + SEGMENT_OUTER_RADIUS) / 2;
        const x = centerPosition.x + Math.cos(midAngle) * labelRadius;
        const y = centerPosition.y + Math.sin(midAngle) * labelRadius;

        const isSelected = selectedIndex === index;

        return (
          <div
            key={option.id}
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className="text-xl"
              style={{
                filter: isSelected ? 'drop-shadow(0 0 4px rgba(153, 102, 255, 0.8))' : 'none',
                transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.1s, filter 0.1s',
              }}
            >
              {option.icon}
            </span>
            <span
              className={`text-xs mt-0.5 whitespace-nowrap ${
                isSelected ? 'text-white font-medium' : 'text-white/70'
              }`}
              style={{
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {option.label}
            </span>
          </div>
        );
      })}

      {/* Selected option description at bottom */}
      {selectedIndex !== null && options[selectedIndex] && (
        <div
          className="absolute left-1/2 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-xs"
          style={{
            top: centerPosition.y + SEGMENT_OUTER_RADIUS + 20,
            transform: 'translateX(-50%)',
          }}
        >
          {options[selectedIndex].description}
        </div>
      )}

      {/* Cursor indicator (shows where mouse is relative to center) */}
      <div
        className="absolute w-2 h-2 bg-purple-400 rounded-full shadow-lg"
        style={{
          left: cursorPosition.x - 4,
          top: cursorPosition.y - 4,
          boxShadow: '0 0 8px rgba(153, 102, 255, 0.8)',
        }}
      />

      <style jsx>{`
        @keyframes radialMenuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
