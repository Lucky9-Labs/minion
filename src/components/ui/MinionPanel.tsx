'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { MINION_ROLES, type MinionRole, type MinionTrait } from '@/types/game';
import { Panel, Button, Input } from './Panel';

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

  return (
    <Panel title="Minions" className="w-80">
      {isRecruiting ? (
        <div className="space-y-4">
          <Input
            label="Name"
            value={newName}
            onChange={setNewName}
            placeholder="Enter minion name..."
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MINION_ROLES) as MinionRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    selectedRole === role
                      ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-sm font-medium">{MINION_ROLES[role].name}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">{MINION_ROLES[selectedRole].description}</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Traits <span className="text-gray-500">(up to 2)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAITS.map((trait) => (
                <button
                  key={trait}
                  onClick={() => toggleTrait(trait)}
                  title={TRAIT_DESCRIPTIONS[trait]}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTraits.includes(trait)
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500'
                      : 'bg-gray-800 text-gray-400 border border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {trait}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsRecruiting(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleRecruit} disabled={!newName.trim()} className="flex-1">
              Recruit
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Minion list */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {minions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No minions yet. Recruit your first!
              </p>
            ) : (
              minions.map((minion) => (
                <button
                  key={minion.id}
                  onClick={() => setSelectedMinion(minion.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedMinionId === minion.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: MINION_ROLES[minion.role].color }}
                    >
                      <span className="text-white text-sm font-bold">
                        {minion.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{minion.name}</div>
                      <div className="text-xs text-gray-400">
                        {MINION_ROLES[minion.role].name} • {minion.state}
                      </div>
                    </div>
                    {minion.state !== 'idle' && (
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <Button onClick={() => setIsRecruiting(true)} className="w-full">
            + Recruit Minion
          </Button>

          {/* Selected minion details */}
          {selectedMinion && (
            <div className="pt-4 border-t border-gray-700 space-y-2">
              <h3 className="font-medium text-white">{selectedMinion.name}</h3>
              <div className="text-sm text-gray-400">
                <p>Role: {MINION_ROLES[selectedMinion.role].name}</p>
                <p>State: {selectedMinion.state}</p>
                {selectedMinion.traits.length > 0 && (
                  <p>Traits: {selectedMinion.traits.join(', ')}</p>
                )}
                <p>Memories: {selectedMinion.memories.length}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
