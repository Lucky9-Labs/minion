'use client';

import { useState, useCallback, useEffect } from 'react';
import { QuickInfo } from './QuickInfo';
import { RadialMenu } from './RadialMenu';
import type { Target, MenuOption, InteractionMode } from '@/types/interaction';

interface InteractionHUDProps {
  visible: boolean;
  mode: InteractionMode;
  target: Target | null;
  menuOptions: MenuOption[] | null;
  /** Accumulated mouse delta for look-to-select */
  selectionDelta: { x: number; y: number };
  showQuickInfo: boolean;
  /** Screen position for radial menu (null = screen center) */
  menuScreenPosition?: { x: number; y: number } | null;
  onMenuSelect: (option: MenuOption) => void;
  onMenuCancel: () => void;
}

export function InteractionHUD({
  visible,
  mode,
  target,
  menuOptions,
  selectionDelta,
  showQuickInfo,
  menuScreenPosition,
  onMenuSelect,
  onMenuCancel,
}: InteractionHUDProps) {
  if (!visible) return null;

  return (
    <>
      {/* Quick Info tooltip - shows on tap */}
      <QuickInfo visible={showQuickInfo && mode === 'idle'} target={target} />

      {/* Radial Menu - shows when holding on entity (look-to-select) */}
      <RadialMenu
        visible={mode === 'menu' && menuOptions !== null}
        options={menuOptions || []}
        onSelect={onMenuSelect}
        onCancel={onMenuCancel}
        selectionDelta={selectionDelta}
        screenPosition={menuScreenPosition}
      />

      {/* Drawing mode indicator */}
      {mode === 'drawing' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏗️</span>
              <span className="text-sm">Drawing foundation - return to start to complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Grabbing mode indicator */}
      {mode === 'grabbing' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤚</span>
              <span className="text-sm">Force Pulling - click to release</span>
            </div>
          </div>
        </div>
      )}

      {/* Moving mode indicator */}
      {mode === 'moving' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏗️</span>
              <span className="text-sm">Moving building - click to place • right-click to cancel</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
