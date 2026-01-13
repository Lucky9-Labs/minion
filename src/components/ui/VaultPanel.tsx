'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Artifact, Postcard } from '@/types/game';
import { WowPanel, WowPanelInset, WowSectionHeader } from './WowPanel';
import { WowButton, WowToggleButton } from './WowButton';
import { WowIcon } from './WowIcon';
import { wowTheme } from '@/styles/theme';

type VaultTab = 'artifacts' | 'postcards';

const ARTIFACT_ICONS: Record<Artifact['type'], 'scroll' | 'artifact' | 'rune'> = {
  scroll: 'scroll',
  artifact: 'artifact',
  rune: 'rune',
};

export function VaultPanel() {
  const artifacts = useGameStore((state) => state.artifacts);
  const postcards = useGameStore((state) => state.postcards);
  const minions = useGameStore((state) => state.minions);
  const quests = useGameStore((state) => state.quests);

  const [activeTab, setActiveTab] = useState<VaultTab>('artifacts');
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);

  const getMinionName = (minionId: string) => {
    return minions.find((m) => m.id === minionId)?.name ?? 'Unknown';
  };

  const getQuestTitle = (questId: string) => {
    return quests.find((q) => q.id === questId)?.title ?? 'Unknown Quest';
  };

  return (
    <WowPanel
      title="Vault"
      icon={<WowIcon name="vault" size="sm" />}
      className="w-96 animate-fade-in"
    >
      {/* Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '16px',
        borderBottom: `2px solid ${wowTheme.colors.stoneBorder}`,
      }}>
        <WowToggleButton
          active={activeTab === 'artifacts'}
          onClick={() => {
            setActiveTab('artifacts');
            setSelectedPostcard(null);
          }}
          icon={<WowIcon name="artifact" size="xs" color={activeTab === 'artifacts' ? wowTheme.colors.goldLight : wowTheme.colors.textMuted} />}
        >
          Artifacts ({artifacts.length})
        </WowToggleButton>
        <WowToggleButton
          active={activeTab === 'postcards'}
          onClick={() => {
            setActiveTab('postcards');
            setSelectedArtifact(null);
          }}
          icon={<WowIcon name="postcard" size="xs" color={activeTab === 'postcards' ? wowTheme.colors.goldLight : wowTheme.colors.textMuted} />}
        >
          Postcards ({postcards.length})
        </WowToggleButton>
      </div>

      {activeTab === 'artifacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedArtifact ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setSelectedArtifact(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: wowTheme.colors.textMuted,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: wowTheme.fontSizes.sm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = wowTheme.colors.goldMid}
                onMouseLeave={(e) => e.currentTarget.style.color = wowTheme.colors.textMuted}
              >
                <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><WowIcon name="chevronRight" size="xs" /></span> Back to list
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <WowIcon name={ARTIFACT_ICONS[selectedArtifact.type]} size="lg" glow />
                  <h3 style={{
                    fontWeight: 600,
                    color: wowTheme.colors.goldLight,
                    fontSize: wowTheme.fontSizes.lg,
                    fontFamily: wowTheme.fonts.header,
                  }}>
                    {selectedArtifact.name}
                  </h3>
                </div>
                <p style={{
                  fontSize: wowTheme.fontSizes.sm,
                  color: wowTheme.colors.textSecondary,
                  fontStyle: 'italic',
                  marginBottom: '8px',
                }}>
                  {selectedArtifact.description}
                </p>
                <div style={{
                  fontSize: wowTheme.fontSizes.xs,
                  color: wowTheme.colors.textMuted,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}>
                  <p>Type: <span style={{ color: wowTheme.colors.bronzeLight, textTransform: 'capitalize' }}>{selectedArtifact.type}</span></p>
                  <p>Created by: <span style={{ color: wowTheme.colors.textPrimary }}>{getMinionName(selectedArtifact.minionId)}</span></p>
                  <p>Quest: <span style={{ color: wowTheme.colors.textPrimary }}>{getQuestTitle(selectedArtifact.questId)}</span></p>
                </div>
              </div>

              <WowPanelInset>
                <pre style={{
                  fontSize: wowTheme.fontSizes.xs,
                  color: wowTheme.colors.textSecondary,
                  fontFamily: wowTheme.fonts.mono,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '192px',
                  overflow: 'auto',
                  margin: 0,
                }}>
                  {selectedArtifact.content}
                </pre>
              </WowPanelInset>

              <div style={{ display: 'flex', gap: '8px' }}>
                <WowButton
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedArtifact.content);
                  }}
                  fullWidth
                >
                  Copy Content
                </WowButton>
                <WowButton
                  onClick={() => {
                    const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedArtifact.name.replace(/\s+/g, '_')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  fullWidth
                >
                  Download
                </WowButton>
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
              {artifacts.length === 0 ? (
                <WowPanelInset>
                  <p style={{
                    textAlign: 'center',
                    color: wowTheme.colors.textMuted,
                    fontSize: wowTheme.fontSizes.sm,
                    padding: '32px 0',
                    fontStyle: 'italic',
                  }}>
                    No artifacts yet. Complete quests to collect loot!
                  </p>
                </WowPanelInset>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => setSelectedArtifact(artifact)}
                      className="wow-slot"
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <WowIcon name={ARTIFACT_ICONS[artifact.type]} size="md" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: wowTheme.colors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {artifact.name}
                          </div>
                          <div style={{
                            fontSize: wowTheme.fontSizes.xs,
                            color: wowTheme.colors.textMuted,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {artifact.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'postcards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedPostcard ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => setSelectedPostcard(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: wowTheme.colors.textMuted,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: wowTheme.fontSizes.sm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'color 150ms',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = wowTheme.colors.goldMid}
                onMouseLeave={(e) => e.currentTarget.style.color = wowTheme.colors.textMuted}
              >
                <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><WowIcon name="chevronRight" size="xs" /></span> Back to list
              </button>

              {/* Postcard styled as aged letter */}
              <div style={{
                background: `linear-gradient(135deg, ${wowTheme.colors.parchmentLight}20 0%, ${wowTheme.colors.bronze}15 100%)`,
                borderRadius: wowTheme.radius.md,
                padding: '20px',
                border: `2px solid ${wowTheme.colors.goldDark}`,
                boxShadow: `inset 0 0 20px rgba(0,0,0,0.2), ${wowTheme.shadows.glow}`,
                position: 'relative',
              }}>
                {/* Wax seal decoration */}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '20px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 30% 30%, ${wowTheme.colors.danger} 0%, #5a2525 100%)`,
                  border: `2px solid ${wowTheme.colors.danger}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  <WowIcon name="postcard" size="sm" color={wowTheme.colors.textPrimary} />
                </div>

                <p style={{
                  color: wowTheme.colors.textSecondary,
                  fontSize: wowTheme.fontSizes.sm,
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                  marginBottom: '16px',
                }}>
                  "{selectedPostcard.narrativeText}"
                </p>

                <div style={{
                  paddingTop: '16px',
                  borderTop: `1px solid ${wowTheme.colors.goldDark}40`,
                }}>
                  <p style={{
                    color: wowTheme.colors.success,
                    fontSize: wowTheme.fontSizes.sm,
                    fontWeight: 600,
                    marginBottom: '8px',
                  }}>
                    {selectedPostcard.outcomeSummary}
                  </p>
                  <p style={{ fontSize: wowTheme.fontSizes.xs, color: wowTheme.colors.textMuted }}>
                    From: <span style={{ color: wowTheme.colors.textSecondary }}>{getMinionName(selectedPostcard.minionId)}</span>
                  </p>
                  <p style={{ fontSize: wowTheme.fontSizes.xs, color: wowTheme.colors.textMuted }}>
                    Quest: <span style={{ color: wowTheme.colors.textSecondary }}>{getQuestTitle(selectedPostcard.questId)}</span>
                  </p>
                </div>
              </div>

              {selectedPostcard.artifactIds.length > 0 && (
                <div>
                  <WowSectionHeader icon={<WowIcon name="artifact" size="xs" color={wowTheme.colors.goldMid} />}>
                    Attached Artifacts
                  </WowSectionHeader>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedPostcard.artifactIds.map((id) => {
                      const artifact = artifacts.find((a) => a.id === id);
                      return artifact ? (
                        <div
                          key={id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: wowTheme.fontSizes.sm,
                            color: wowTheme.colors.textSecondary,
                          }}
                        >
                          <WowIcon name={ARTIFACT_ICONS[artifact.type]} size="sm" />
                          <span>{artifact.name}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ maxHeight: '256px', overflowY: 'auto' }}>
              {postcards.length === 0 ? (
                <WowPanelInset>
                  <p style={{
                    textAlign: 'center',
                    color: wowTheme.colors.textMuted,
                    fontSize: wowTheme.fontSizes.sm,
                    padding: '32px 0',
                    fontStyle: 'italic',
                  }}>
                    No postcards yet. Complete quests to receive them!
                  </p>
                </WowPanelInset>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {postcards
                    .slice()
                    .reverse()
                    .map((postcard) => (
                      <button
                        key={postcard.id}
                        onClick={() => setSelectedPostcard(postcard)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: '12px',
                          background: `linear-gradient(135deg, ${wowTheme.colors.parchmentDark} 0%, ${wowTheme.colors.bronze}15 100%)`,
                          border: `2px solid ${wowTheme.colors.goldDark}40`,
                          borderRadius: wowTheme.radius.sm,
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = wowTheme.colors.goldMid;
                          e.currentTarget.style.boxShadow = wowTheme.shadows.glow;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = `${wowTheme.colors.goldDark}40`;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <WowIcon name="postcard" size="md" />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 600,
                              color: wowTheme.colors.textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {getQuestTitle(postcard.questId)}
                            </div>
                            <div style={{
                              fontSize: wowTheme.fontSizes.xs,
                              color: wowTheme.colors.textMuted,
                            }}>
                              From {getMinionName(postcard.minionId)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </WowPanel>
  );
}
