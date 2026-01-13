'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { MINION_ROLES, type MinionRole, type MinionTrait } from '@/types/game';
import { WowPanel, WowPanelInset, WowSectionHeader } from './WowPanel';
import { WowButton } from './WowButton';
import { WowInput } from './WowInput';
import { WowIcon, RoleIcon } from './WowIcon';
import { wowTheme } from '@/styles/theme';

const TRAITS: MinionTrait[] = ['curious', 'cautious', 'opinionated', 'reckless', 'methodical'];

const TRAIT_DESCRIPTIONS: Record<MinionTrait, string> = {
  curious: 'Explores unexpected paths',
  cautious: 'Takes careful, measured steps',
  opinionated: 'Has strong preferences',
  reckless: 'Moves fast, sometimes breaks things',
  methodical: 'Follows structured approaches',
};

export function MinionPanel() {
  const minions = useGameStore((state) => state.minions);
  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);
  const recruitMinion = useGameStore((state) => state.recruitMinion);

  const [isRecruiting, setIsRecruiting] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedRole, setSelectedRole] = useState<MinionRole>('scout');
  const [selectedTraits, setSelectedTraits] = useState<MinionTrait[]>([]);

  const selectedMinion = minions.find((m) => m.id === selectedMinionId);

  const handleRecruit = () => {
    if (!newName.trim()) return;
    recruitMinion(newName.trim(), selectedRole, selectedTraits);
    setNewName('');
    setSelectedTraits([]);
    setIsRecruiting(false);
  };

  const toggleTrait = (trait: MinionTrait) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter((t) => t !== trait));
    } else if (selectedTraits.length < 2) {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  const roleColors: Record<MinionRole, string> = {
    scout: wowTheme.colors.scout,
    scribe: wowTheme.colors.scribe,
    artificer: wowTheme.colors.artificer,
  };

  return (
    <WowPanel
      title="Minions"
      icon={<WowIcon name="minions" size="sm" />}
      className="w-80 animate-fade-in"
    >
      {isRecruiting ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <WowInput
            label="Name"
            value={newName}
            onChange={setNewName}
            placeholder="Enter minion name..."
          />

          <div>
            <WowSectionHeader icon={<WowIcon name="level" size="xs" color={wowTheme.colors.goldMid} />}>
              Role
            </WowSectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.keys(MINION_ROLES) as MinionRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: wowTheme.radius.sm,
                    border: selectedRole === role
                      ? `2px solid ${roleColors[role]}`
                      : `2px solid ${wowTheme.colors.stoneBorder}`,
                    background: selectedRole === role
                      ? `${roleColors[role]}30`
                      : wowTheme.colors.stoneDark,
                    color: selectedRole === role
                      ? roleColors[role]
                      : wowTheme.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ marginBottom: '4px' }}>
                    <RoleIcon role={role} size="sm" glow={selectedRole === role} />
                  </div>
                  <div style={{
                    fontSize: wowTheme.fontSizes.xs,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    {MINION_ROLES[role].name}
                  </div>
                </button>
              ))}
            </div>
            <p style={{
              marginTop: '8px',
              fontSize: wowTheme.fontSizes.xs,
              color: wowTheme.colors.textMuted,
              fontStyle: 'italic',
            }}>
              {MINION_ROLES[selectedRole].description}
            </p>
          </div>

          <div>
            <WowSectionHeader icon={<WowIcon name="rune" size="xs" color={wowTheme.colors.goldMid} />}>
              Traits <span style={{ color: wowTheme.colors.textMuted, fontWeight: 400 }}>(up to 2)</span>
            </WowSectionHeader>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TRAITS.map((trait) => (
                <button
                  key={trait}
                  onClick={() => toggleTrait(trait)}
                  title={TRAIT_DESCRIPTIONS[trait]}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    fontSize: wowTheme.fontSizes.xs,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textTransform: 'capitalize',
                    background: selectedTraits.includes(trait)
                      ? `linear-gradient(180deg, ${wowTheme.colors.bronze}40 0%, ${wowTheme.colors.bronze}20 100%)`
                      : wowTheme.colors.stoneDark,
                    border: selectedTraits.includes(trait)
                      ? `1px solid ${wowTheme.colors.bronze}`
                      : `1px solid ${wowTheme.colors.stoneBorder}`,
                    color: selectedTraits.includes(trait)
                      ? wowTheme.colors.bronzeLight
                      : wowTheme.colors.textMuted,
                    boxShadow: selectedTraits.includes(trait)
                      ? `0 0 8px ${wowTheme.colors.bronze}40`
                      : 'none',
                  }}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <WowButton
              variant="secondary"
              onClick={() => setIsRecruiting(false)}
              fullWidth
            >
              Cancel
            </WowButton>
            <WowButton
              onClick={handleRecruit}
              disabled={!newName.trim()}
              fullWidth
            >
              Recruit
            </WowButton>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Minion list */}
          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            {minions.length === 0 ? (
              <WowPanelInset>
                <p style={{
                  textAlign: 'center',
                  color: wowTheme.colors.textMuted,
                  fontSize: wowTheme.fontSizes.sm,
                  padding: '16px 0',
                  fontStyle: 'italic',
                }}>
                  No minions yet. Recruit your first!
                </p>
              </WowPanelInset>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {minions.map((minion) => (
                  <button
                    key={minion.id}
                    onClick={() => setSelectedMinion(minion.id)}
                    className={selectedMinionId === minion.id ? 'wow-slot selected' : 'wow-slot'}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `linear-gradient(135deg, ${roleColors[minion.role]} 0%, ${roleColors[minion.role]}80 100%)`,
                          border: `2px solid ${roleColors[minion.role]}`,
                          boxShadow: `0 0 8px ${roleColors[minion.role]}40`,
                        }}
                      >
                        <span style={{
                          color: wowTheme.colors.textPrimary,
                          fontSize: wowTheme.fontSizes.sm,
                          fontWeight: 700,
                          textShadow: wowTheme.shadows.text,
                        }}>
                          {minion.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          color: wowTheme.colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {minion.name}
                        </div>
                        <div style={{
                          fontSize: wowTheme.fontSizes.xs,
                          color: wowTheme.colors.textMuted,
                        }}>
                          {MINION_ROLES[minion.role].name} • <span style={{
                            color: minion.state === 'idle'
                              ? wowTheme.colors.success
                              : wowTheme.colors.goldMid
                          }}>{minion.state}</span>
                        </div>
                      </div>
                      {minion.state !== 'idle' && (
                        <div
                          className="animate-pulse-glow"
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: wowTheme.colors.goldMid,
                          }}
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <WowButton
            onClick={() => setIsRecruiting(true)}
            fullWidth
            icon={<span style={{ fontSize: '14px' }}>+</span>}
          >
            Recruit Minion
          </WowButton>

          {/* Selected minion quick details */}
          {selectedMinion && (
            <WowPanelInset>
              <h3 style={{
                fontWeight: 600,
                color: wowTheme.colors.goldLight,
                marginBottom: '8px',
                fontFamily: wowTheme.fonts.header,
              }}>
                {selectedMinion.name}
              </h3>
              <div style={{
                fontSize: wowTheme.fontSizes.xs,
                color: wowTheme.colors.textSecondary,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <p>Role: <span style={{ color: roleColors[selectedMinion.role] }}>{MINION_ROLES[selectedMinion.role].name}</span></p>
                <p>State: <span style={{ color: wowTheme.colors.textPrimary }}>{selectedMinion.state}</span></p>
                {selectedMinion.traits.length > 0 && (
                  <p>Traits: <span style={{ color: wowTheme.colors.bronzeLight }}>{selectedMinion.traits.join(', ')}</span></p>
                )}
                <p>Memories: <span style={{ color: wowTheme.colors.textPrimary }}>{selectedMinion.memories.length}</span></p>
              </div>
            </WowPanelInset>
          )}
        </div>
      )}
    </WowPanel>
  );
}
