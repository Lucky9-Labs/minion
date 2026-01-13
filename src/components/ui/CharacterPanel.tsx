'use client';

import { useGameStore } from '@/store/gameStore';
import { MINION_ROLES } from '@/types/game';

// Placeholder lore for different minion roles
const ROLE_LORE: Record<string, string[]> = {
  scout: [
    "Born from the whispers of ancient libraries, this Scout has an insatiable curiosity for the unknown.",
    "Legend says Scouts can smell knowledge from a hundred leagues away.",
    "With eyes that gleam like polished obsidian, no secret stays hidden for long.",
  ],
  scribe: [
    "Descended from a long line of tower archivists, this Scribe's quill never rests.",
    "It is said that a Scribe once documented an entire kingdom's history in a single night.",
    "Their memory is as vast as the ocean, and twice as deep.",
  ],
  artificer: [
    "Forged in the mystical workshops beneath the tower, this Artificer brings ideas to life.",
    "With hands that dance like flames, they craft wonders from mere thoughts.",
    "An Artificer's creations are said to outlast even the oldest mountains.",
  ],
};

// Placeholder adventure stories
const ADVENTURE_STORIES = [
  "Once ventured into the Caverns of Echoing Code and returned with a rare bug-fixing scroll.",
  "Discovered the lost API documentation hidden beneath the Server Mountains.",
  "Befriended a wandering pixel sprite who now occasionally visits the tower.",
  "Found a cache of ancient components in the Ruins of Legacy Systems.",
  "Successfully navigated the Maze of Dependencies without a single conflict.",
  "Tamed a wild regex beast and taught it to be gentle with strings.",
];

// Placeholder items/memories
const COLLECTED_ITEMS = [
  { name: "Dusty Scroll of Wisdom", description: "Contains fragments of an ancient README" },
  { name: "Glowing Error Fragment", description: "A crystallized exception, now harmless" },
  { name: "Feather of Documentation", description: "Writes beautiful comments automatically" },
  { name: "Tiny Code Snippet", description: "A useful function found in forgotten folders" },
  { name: "Memory Crystal", description: "Stores the minion's fondest quest memories" },
];

export function CharacterPanel() {
  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const minions = useGameStore((state) => state.minions);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);

  const selectedMinion = minions.find((m) => m.id === selectedMinionId);

  if (!selectedMinion) {
    return null;
  }

  const roleConfig = MINION_ROLES[selectedMinion.role];
  const roleLore = ROLE_LORE[selectedMinion.role] || ROLE_LORE.scout;

  // Generate consistent "random" content based on minion id
  const idHash = selectedMinion.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const loreIndex = idHash % roleLore.length;
  const storyIndex = idHash % ADVENTURE_STORIES.length;
  const itemCount = (idHash % 3) + 1;
  const items = COLLECTED_ITEMS.slice(0, itemCount);

  return (
    <div className="fixed right-4 top-20 bottom-20 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col z-50">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-700"
        style={{ backgroundColor: `${roleConfig.color}20` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Goblin avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
              style={{ backgroundColor: roleConfig.color }}
            >
              <span role="img" aria-label="goblin">
                {selectedMinion.role === 'scout' ? '🧝' :
                 selectedMinion.role === 'scribe' ? '📜' : '⚒️'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{selectedMinion.name}</h2>
              <p className="text-sm" style={{ color: roleConfig.color }}>
                {roleConfig.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedMinion(null)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Status</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              selectedMinion.state === 'idle' ? 'bg-green-500 animate-pulse' :
              selectedMinion.state === 'traveling' ? 'bg-amber-500' :
              selectedMinion.state === 'working' ? 'bg-blue-500' :
              'bg-gray-500'
            }`} />
            <span className="text-white capitalize">{selectedMinion.state}</span>
          </div>
        </div>

        {/* Traits */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Traits</h3>
          <div className="flex flex-wrap gap-2">
            {selectedMinion.traits.map((trait) => (
              <span
                key={trait}
                className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300 capitalize"
              >
                {trait}
              </span>
            ))}
            {selectedMinion.traits.length === 0 && (
              <span className="text-gray-500 text-sm italic">No special traits yet</span>
            )}
          </div>
        </div>

        {/* Lore */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Origin Story</h3>
          <p className="text-gray-300 text-sm italic leading-relaxed">
            "{roleLore[loreIndex]}"
          </p>
        </div>

        {/* Adventures */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Adventures</h3>
          {selectedMinion.memories.length > 0 ? (
            <ul className="space-y-2">
              {selectedMinion.memories.slice(-3).map((memory) => (
                <li key={memory.id} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-amber-500">•</span>
                  {memory.content}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-300">
              <span className="text-amber-500">•</span> {ADVENTURE_STORIES[storyIndex]}
            </p>
          )}
        </div>

        {/* Collected Items */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Collected Treasures</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">✦</span>
                <div>
                  <p className="text-sm text-white font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Statistics</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-400">Quests Completed</div>
            <div className="text-white text-right">{selectedMinion.memories.length}</div>
            <div className="text-gray-400">Days in Service</div>
            <div className="text-white text-right">
              {Math.floor((Date.now() - selectedMinion.createdAt) / (1000 * 60 * 60 * 24))}
            </div>
            <div className="text-gray-400">Loyalty</div>
            <div className="text-white text-right">Unwavering</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <p className="text-xs text-gray-500 text-center italic">
          Click on the goblin in the world to interact
        </p>
      </div>
    </div>
  );
}
