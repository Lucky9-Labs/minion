'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SimpleScene } from './SimpleScene';
import { MinionPanel } from './ui/MinionPanel';
import { QuestPanel } from './ui/QuestPanel';
import { VaultPanel } from './ui/VaultPanel';
import { CharacterPanel } from './ui/CharacterPanel';
import { ConversationPanel } from './ui/ConversationPanel';
import { CollisionInstructionDialog } from './ui/CollisionInstructionDialog';
import { WizardProfileFrame } from './ui/WizardProfileFrame';
import { TargetFrame } from './ui/TargetFrame';
import { FirstPersonHUD } from './ui/FirstPersonHUD';
import { InteractionHUD } from './ui/InteractionHUD';
import { useGameStore } from '@/store/gameStore';
import { TOWER_FLOORS } from '@/types/game';
import { useMinionMovement, useGolemMovement } from '@/lib/questSimulation';
import { WowIcon } from './ui/WowIcon';
import { wowTheme } from '@/styles/theme';
import { initSoundSettings, preloadSounds, playSound } from '@/lib/sounds';
import { useProjectPolling } from '@/hooks/useProjectPolling';
import { useActiveAssignments } from '@/hooks/useActiveAssignments';
import type { InteractionMode, MenuOption, Target, DrawnFoundation } from '@/types/interaction';
import type { SpellbookPage } from '@/lib/FirstPersonSpellbook';

type ActivePanel = 'minions' | 'quests' | 'vault' | null;

export function GameLayout() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('minions');
  const tower = useGameStore((state) => state.tower);
  const minions = useGameStore((state) => state.minions);
  const activeQuestId = useGameStore((state) => state.activeQuestId);
  const conversation = useGameStore((state) => state.conversation);
  const exitConversation = useGameStore((state) => state.exitConversation);
  const cameraMode = useGameStore((state) => state.cameraMode);
  const possessedGolemId = useGameStore((state) => state.possessedGolemId);
  const possessGolem = useGameStore((state) => state.possessGolem);

  // Interaction state for first person mode and isometric mode
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('idle');
  const [menuOptions, setMenuOptions] = useState<MenuOption[] | null>(null);
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const [selectionDelta, setSelectionDelta] = useState({ x: 0, y: 0 });
  const [interactionTarget, setInteractionTarget] = useState<Target | null>(null);
  const [menuScreenPosition, setMenuScreenPosition] = useState<{ x: number; y: number } | null>(null);

  // Spellbook state for first person entity selection
  const [spellbookSelection, setSpellbookSelection] = useState<SpellbookPage | null>(null);
  const [spellbookPageIndex, setSpellbookPageIndex] = useState(0);
  const [spellbookPageCount, setSpellbookPageCount] = useState(0);

  // Ref to store interaction controller execute function
  const interactionExecuteRef = useRef<((actionId: string) => void) | null>(null);

  // Initialize sound system
  useEffect(() => {
    initSoundSettings();
    preloadSounds();
  }, []);

  // Animate minion movement during quests
  useMinionMovement();

  // Animate golem movement toward targets
  useGolemMovement();

  // Poll for project/PR changes every 30 seconds
  useProjectPolling(30000);

  // Sync minion assignments with active PRs (handles lifecycle and periodic polling)
  useActiveAssignments({
    pollingIntervalMs: 30000, // Check for PR changes every 30 seconds
    autoSync: true, // Auto sync on mount and with polling
  });

  const togglePanel = (panel: ActivePanel) => {
    if (activePanel === panel) {
      playSound('panelClose');
      setActivePanel(null);
    } else {
      playSound('panelOpen');
      setActivePanel(panel);
    }
  };

  const floorColors: Record<string, string> = {
    library: '#8b5cf6',
    workshop: wowTheme.colors.goldMid,
    forge: '#ef4444',
    observatory: '#06b6d4',
    default: wowTheme.colors.scout,
  };

  // Handle Escape key to exit conversation or golem possession
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      // Exit golem possession first
      if (possessedGolemId) {
        possessGolem(null);
        return;
      }
      // Then try to exit conversation
      if (conversation.active && conversation.phase === 'active') {
        exitConversation();
      }
    }
  }, [conversation.active, conversation.phase, exitConversation, possessedGolemId, possessGolem]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Hide normal UI during conversation or first person mode
  const inConversation = conversation.active;
  const inFirstPerson = cameraMode === 'firstPerson';
  const hideUI = inConversation || inFirstPerson;

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: wowTheme.colors.bgDarkest }}>
      {/* 3D Scene - z-0 to be below UI overlays */}
      <div className="absolute inset-0 z-0">
        <SimpleScene
          onInteractionModeChange={setInteractionMode}
          onMenuOptionsChange={setMenuOptions}
          onQuickInfoChange={setShowQuickInfo}
          onSelectionDeltaChange={setSelectionDelta}
          onTargetChange={setInteractionTarget}
          onMenuScreenPositionChange={setMenuScreenPosition}
          onFoundationComplete={(foundation) => {
            console.log('Foundation complete:', foundation);
            // TODO: Open building project creation dialog
          }}
          onInteractionControllerReady={(executeAction) => {
            interactionExecuteRef.current = executeAction;
          }}
          onSpellbookSelectionChange={(selection, pageIndex, pageCount) => {
            setSpellbookSelection(selection);
            setSpellbookPageIndex(pageIndex);
            setSpellbookPageCount(pageCount);
          }}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <div style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
            border: `3px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.md,
            padding: '10px 16px',
            boxShadow: wowTheme.shadows.panel,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <WowIcon name="tower" size="md" glow />
            <h1 style={{
              margin: 0,
              fontSize: wowTheme.fontSizes.xl,
              fontWeight: 700,
              color: wowTheme.colors.goldLight,
              fontFamily: wowTheme.fonts.header,
              textShadow: wowTheme.shadows.textEmboss,
              letterSpacing: '1px',
            }}>
              Mage Tower
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {/* Tower level indicator */}
          <div style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
            border: `3px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.md,
            padding: '8px 14px',
            boxShadow: wowTheme.shadows.panel,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <WowIcon name="xp" size="sm" color={wowTheme.colors.goldMid} glow />
            <span style={{
              color: wowTheme.colors.textPrimary,
              fontWeight: 600,
              fontSize: wowTheme.fontSizes.sm,
            }}>
              Level {tower.level}
            </span>
            <span style={{
              color: wowTheme.colors.textMuted,
              fontSize: wowTheme.fontSizes.xs,
            }}>
              ({tower.unlockedFloors.length} floors)
            </span>
          </div>

          {/* Minion count */}
          <div style={{
            background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
            border: `3px solid ${wowTheme.colors.stoneBorder}`,
            borderRadius: wowTheme.radius.md,
            padding: '8px 14px',
            boxShadow: wowTheme.shadows.panel,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <WowIcon name="minions" size="sm" color={wowTheme.colors.textSecondary} />
            <span style={{
              color: wowTheme.colors.textPrimary,
              fontWeight: 500,
              fontSize: wowTheme.fontSizes.sm,
            }}>
              {minions.length} minions
            </span>
          </div>

          {/* Active quest indicator */}
          {activeQuestId && (
            <div
              className="animate-border-glow"
              style={{
                background: `linear-gradient(180deg, ${wowTheme.colors.goldMid}30 0%, ${wowTheme.colors.goldDark}30 100%)`,
                border: `3px solid ${wowTheme.colors.goldMid}`,
                borderRadius: wowTheme.radius.md,
                padding: '8px 14px',
                boxShadow: wowTheme.shadows.glow,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <WowIcon name="quest" size="sm" color={wowTheme.colors.goldLight} glow />
              <span style={{
                color: wowTheme.colors.goldLight,
                fontWeight: 600,
                fontSize: wowTheme.fontSizes.sm,
              }}>
                Quest Active
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation buttons (hidden during conversation) */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto transition-opacity duration-300 ${hideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <NavButton
          icon={<WowIcon name="minions" size="lg" color={activePanel === 'minions' ? wowTheme.colors.goldLight : wowTheme.colors.textSecondary} />}
          label="Minions"
          active={activePanel === 'minions'}
          onClick={() => togglePanel('minions')}
        />
        <NavButton
          icon={<WowIcon name="quest" size="lg" color={activePanel === 'quests' ? wowTheme.colors.goldLight : wowTheme.colors.textSecondary} />}
          label="Quests"
          active={activePanel === 'quests'}
          onClick={() => togglePanel('quests')}
          badge={activeQuestId ? '!' : undefined}
        />
        <NavButton
          icon={<WowIcon name="vault" size="lg" color={activePanel === 'vault' ? wowTheme.colors.goldLight : wowTheme.colors.textSecondary} />}
          label="Vault"
          active={activePanel === 'vault'}
          onClick={() => togglePanel('vault')}
        />
      </div>

      {/* Side panels (hidden during conversation) */}
      <div className={`absolute top-20 left-4 bottom-20 flex flex-col gap-4 pointer-events-none transition-opacity duration-300 ${hideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="pointer-events-auto">
          {activePanel === 'minions' && <MinionPanel />}
          {activePanel === 'quests' && <QuestPanel />}
          {activePanel === 'vault' && <VaultPanel />}
        </div>
      </div>

      {/* Tower floors legend (hidden during conversation) */}
      <div className={`absolute bottom-20 right-4 pointer-events-auto transition-opacity duration-300 ${hideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div style={{
          background: `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
          border: `3px solid ${wowTheme.colors.stoneBorder}`,
          borderRadius: wowTheme.radius.md,
          padding: '12px',
          boxShadow: wowTheme.shadows.panel,
        }}>
          <h3 style={{
            fontSize: wowTheme.fontSizes.xs,
            fontWeight: 600,
            color: wowTheme.colors.goldMid,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            fontFamily: wowTheme.fonts.header,
          }}>
            Tower Floors
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tower.unlockedFloors.map((floor) => (
              <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: wowTheme.radius.sm,
                    background: floorColors[floor] || floorColors.default,
                    boxShadow: `0 0 4px ${floorColors[floor] || floorColors.default}60`,
                  }}
                />
                <span style={{
                  color: wowTheme.colors.textPrimary,
                  fontSize: wowTheme.fontSizes.sm,
                }}>
                  {TOWER_FLOORS[floor].name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid selection instructions - FPS style floating HUD */}
      {interactionMode === 'drawing' && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
            {/* Commit instruction */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}>
              <span style={{
                fontSize: wowTheme.fontSizes.md,
                fontWeight: 700,
                color: wowTheme.colors.goldLight,
                textShadow: `0 0 8px ${wowTheme.colors.goldMid}, 0 2px 4px rgba(0,0,0,0.5)`,
                fontFamily: 'monospace',
                letterSpacing: '1px',
              }}>
                [ENTER]
              </span>
              <span style={{
                fontSize: wowTheme.fontSizes.sm,
                fontWeight: 600,
                color: wowTheme.colors.textPrimary,
                textShadow: '0 2px 4px rgba(0,0,0,0.7)',
              }}>
                Commit Zone
              </span>
            </div>

            {/* Cancel instruction */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <span style={{
                fontSize: wowTheme.fontSizes.md,
                fontWeight: 700,
                color: wowTheme.colors.textSecondary,
                textShadow: `0 0 8px ${wowTheme.colors.textMuted}, 0 2px 4px rgba(0,0,0,0.5)`,
                fontFamily: 'monospace',
                letterSpacing: '1px',
              }}>
                [RMB]
              </span>
              <span style={{
                fontSize: wowTheme.fontSizes.sm,
                fontWeight: 600,
                color: wowTheme.colors.textMuted,
                textShadow: '0 2px 4px rgba(0,0,0,0.7)',
              }}>
                Cancel
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Instructions for new users */}
      {minions.length === 0 && interactionMode !== 'drawing' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="animate-scale-in"
            style={{
              background: `linear-gradient(180deg, ${wowTheme.colors.parchmentMid} 0%, ${wowTheme.colors.parchmentDark} 100%)`,
              border: `3px solid ${wowTheme.colors.goldDark}`,
              borderRadius: wowTheme.radius.md,
              padding: '24px',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: `${wowTheme.shadows.panelHeavy}, ${wowTheme.shadows.glow}`,
            }}
          >
            <WowIcon name="tower" size="xl" glow className="mb-3" />
            <h2 style={{
              color: wowTheme.colors.goldLight,
              fontSize: wowTheme.fontSizes.xxl,
              fontWeight: 700,
              fontFamily: wowTheme.fonts.header,
              marginBottom: '8px',
              textShadow: wowTheme.shadows.textEmboss,
            }}>
              Welcome, Mage!
            </h2>
            <p style={{
              color: wowTheme.colors.textSecondary,
              fontSize: wowTheme.fontSizes.md,
              marginBottom: '16px',
              lineHeight: 1.5,
            }}>
              Your tower awaits. Recruit your first minion to begin your journey.
            </p>
            <p style={{
              color: wowTheme.colors.goldMid,
              fontSize: wowTheme.fontSizes.sm,
              fontWeight: 500,
            }}>
              Click "Minions" below to recruit your first helper.
            </p>
          </div>
        </div>
      )}

      {/* Character panel for selected minion */}
      {!hideUI && <CharacterPanel />}

      {/* Wizard profile frame (bottom-left) - hidden during conversation */}
      <div className={`transition-opacity duration-300 ${inConversation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <WizardProfileFrame />
      </div>

      {/* Target frame for selected minion (top-right) - hidden during conversation */}
      <div className={`transition-opacity duration-300 ${inConversation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <TargetFrame />
      </div>

      {/* Conversation panel (shown during minion conversation) */}
      <ConversationPanel />

      {/* Collision instruction dialog (shown when minion thrown at building) */}
      <CollisionInstructionDialog />

      {/* First person mode HUD */}
      <FirstPersonHUD
        visible={inFirstPerson}
        spellbookSelection={spellbookSelection}
        spellbookPageIndex={spellbookPageIndex}
        spellbookPageCount={spellbookPageCount}
      />

      {/* Interaction HUD (radial menu, quick info) for first person and isometric */}
      <InteractionHUD
        visible={inFirstPerson || (cameraMode === 'isometric' && interactionMode !== 'idle')}
        mode={interactionMode}
        target={interactionTarget}
        menuOptions={menuOptions}
        selectionDelta={selectionDelta}
        showQuickInfo={showQuickInfo}
        menuScreenPosition={cameraMode === 'isometric' ? menuScreenPosition : null}
        onMenuSelect={(option) => {
          interactionExecuteRef.current?.(option.id);
        }}
        onMenuCancel={() => {
          interactionExecuteRef.current?.('cancel');
        }}
      />

      {/* CSS animations for frames */}
      <style jsx global>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}

function NavButton({ icon, label, active, onClick, badge }: NavButtonProps) {
  const handleClick = () => {
    playSound('buttonClick');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '12px 24px',
        borderRadius: wowTheme.radius.md,
        transition: 'all 200ms ease',
        cursor: 'pointer',
        background: active
          ? `linear-gradient(180deg, ${wowTheme.colors.goldMid} 0%, ${wowTheme.colors.goldDark} 100%)`
          : `linear-gradient(180deg, ${wowTheme.colors.stoneMid} 0%, ${wowTheme.colors.stoneDark} 100%)`,
        border: active
          ? `3px solid ${wowTheme.colors.goldLight}`
          : `3px solid ${wowTheme.colors.stoneBorder}`,
        boxShadow: active
          ? `${wowTheme.shadows.glowStrong}, 0 4px 12px rgba(0,0,0,0.4)`
          : wowTheme.shadows.panel,
        color: active ? wowTheme.colors.stoneDark : wowTheme.colors.textSecondary,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = wowTheme.colors.stoneLight;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
        playSound('buttonHover', 0.1);
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = wowTheme.colors.stoneBorder;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {icon}
      <span style={{
        fontSize: wowTheme.fontSizes.sm,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: wowTheme.fonts.header,
        color: active ? wowTheme.colors.stoneDark : wowTheme.colors.textSecondary,
        textShadow: active ? '0 1px 0 rgba(255,255,255,0.3)' : 'none',
      }}>
        {label}
      </span>
      {badge && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: `linear-gradient(180deg, ${wowTheme.colors.danger} 0%, #5a2525 100%)`,
          border: `2px solid ${wowTheme.colors.stoneDark}`,
          color: wowTheme.colors.textPrimary,
          fontSize: wowTheme.fontSizes.xs,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}
