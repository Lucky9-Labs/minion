'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Artifact, Postcard } from '@/types/game';
import { Panel, Button } from './Panel';

type VaultTab = 'artifacts' | 'postcards';

const ARTIFACT_ICONS: Record<Artifact['type'], string> = {
  scroll: '📜',
  artifact: '⚗️',
  rune: '🔮',
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
    <Panel title="Vault" className="w-96">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => {
            setActiveTab('artifacts');
            setSelectedPostcard(null);
          }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'artifacts'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Artifacts ({artifacts.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('postcards');
            setSelectedArtifact(null);
          }}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'postcards'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Postcards ({postcards.length})
        </button>
      </div>

      {activeTab === 'artifacts' && (
        <div className="space-y-4">
          {selectedArtifact ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedArtifact(null)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                ← Back to list
              </button>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ARTIFACT_ICONS[selectedArtifact.type]}</span>
                  <h3 className="font-medium text-white text-lg">{selectedArtifact.name}</h3>
                </div>
                <p className="text-sm text-gray-400">{selectedArtifact.description}</p>
                <div className="text-xs text-gray-500">
                  <p>Type: {selectedArtifact.type}</p>
                  <p>Created by: {getMinionName(selectedArtifact.minionId)}</p>
                  <p>Quest: {getQuestTitle(selectedArtifact.questId)}</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 max-h-48 overflow-auto">
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
                  {selectedArtifact.content}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedArtifact.content);
                  }}
                  className="flex-1"
                >
                  Copy Content
                </Button>
                <Button
                  onClick={() => {
                    const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedArtifact.name.replace(/\s+/g, '_')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1"
                >
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {artifacts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No artifacts yet. Complete quests to collect loot!
                </p>
              ) : (
                artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    onClick={() => setSelectedArtifact(artifact)}
                    className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{ARTIFACT_ICONS[artifact.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{artifact.name}</div>
                        <div className="text-xs text-gray-500 truncate">{artifact.description}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'postcards' && (
        <div className="space-y-4">
          {selectedPostcard ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedPostcard(null)}
                className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
              >
                ← Back to list
              </button>
              <div className="bg-gradient-to-br from-amber-900/30 to-purple-900/30 rounded-lg p-4 border border-amber-700/50">
                <div className="text-center mb-4">
                  <span className="text-4xl">📮</span>
                </div>
                <p className="text-gray-300 text-sm italic leading-relaxed">
                  "{selectedPostcard.narrativeText}"
                </p>
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-emerald-400 text-sm font-medium">
                    {selectedPostcard.outcomeSummary}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    From: {getMinionName(selectedPostcard.minionId)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Quest: {getQuestTitle(selectedPostcard.questId)}
                  </p>
                </div>
              </div>
              {selectedPostcard.artifactIds.length > 0 && (
                <div className="text-sm text-gray-400">
                  <p className="font-medium mb-2">Attached Artifacts:</p>
                  {selectedPostcard.artifactIds.map((id) => {
                    const artifact = artifacts.find((a) => a.id === id);
                    return artifact ? (
                      <div key={id} className="flex items-center gap-2 text-gray-300">
                        <span>{ARTIFACT_ICONS[artifact.type]}</span>
                        <span>{artifact.name}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {postcards.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No postcards yet. Complete quests to receive them!
                </p>
              ) : (
                postcards
                  .slice()
                  .reverse()
                  .map((postcard) => (
                    <button
                      key={postcard.id}
                      onClick={() => setSelectedPostcard(postcard)}
                      className="w-full p-3 bg-gradient-to-r from-amber-900/20 to-purple-900/20 rounded-lg border border-amber-700/30 hover:border-amber-600/50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">📮</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {getQuestTitle(postcard.questId)}
                          </div>
                          <div className="text-xs text-gray-500">
                            From {getMinionName(postcard.minionId)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
