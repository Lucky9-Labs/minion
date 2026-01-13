'use client';

import { useGameStore } from '@/store/gameStore';
import { MINION_ROLES } from '@/types/game';
import { WowIcon, RoleIcon } from './WowIcon';
import { WowIconButton } from './WowButton';
import { wowTheme } from '@/styles/theme';

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

  const roleColors: Record<string, string> = {
    scout: wowTheme.colors.scout,
    scribe: wowTheme.colors.scribe,
    artificer: wowTheme.colors.artificer,
  };

  // Generate consistent "random" content based on minion id
  const idHash = selectedMinion.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const loreIndex = idHash % roleLore.length;
  const storyIndex = idHash % ADVENTURE_STORIES.length;
  const itemCount = (idHash % 3) + 1;
  const items = COLLECTED_ITEMS.slice(0, itemCount);

  return (
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        right: '16px',
        top: '80px',
        bottom: '80px',
        width: '320px',
        background: `linear-gradient(180deg, ${wowTheme.colors.parchmentMid} 0%, ${wowTheme.colors.parchmentDark} 100%)`,
        border: `3px solid ${wowTheme.colors.stoneBorder}`,
        borderRadius: wowTheme.radius.md,
        boxShadow: wowTheme.shadows.panelHeavy,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: `2px solid ${wowTheme.colors.stoneBorder}`,
          background: `linear-gradient(180deg, ${roleColors[selectedMinion.role]}30 0%, ${wowTheme.colors.stoneDark} 100%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${roleColors[selectedMinion.role]} 0%, ${roleColors[selectedMinion.role]}60 100%)`,
                border: `3px solid ${wowTheme.colors.goldMid}`,
                boxShadow: `0 0 12px ${roleColors[selectedMinion.role]}60`,
              }}
            >
              <RoleIcon role={selectedMinion.role} size="md" />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontWeight: 700,
                color: wowTheme.colors.goldLight,
                fontSize: wowTheme.fontSizes.lg,
                fontFamily: wowTheme.fonts.header,
                textShadow: wowTheme.shadows.text,
              }}>
                {selectedMinion.name}
              </h2>
              <p style={{
                margin: 0,
                fontSize: wowTheme.fontSizes.sm,
                color: roleColors[selectedMinion.role],
                fontWeight: 500,
              }}>
                {roleConfig.name}
              </p>
            </div>
          </div>
          <WowIconButton
            icon={<WowIcon name="close" size="sm" color={wowTheme.colors.textMuted} />}
            onClick={() => setSelectedMinion(null)}
            tooltip="Close panel"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Status */}
        <Section title="Status" icon={<WowIcon name="info" size="xs" color={wowTheme.colors.goldMid} />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              className={selectedMinion.state === 'idle' ? 'animate-pulse-glow' : ''}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: selectedMinion.state === 'idle'
                  ? wowTheme.colors.success
                  : selectedMinion.state === 'traveling'
                  ? wowTheme.colors.goldMid
                  : selectedMinion.state === 'working'
                  ? wowTheme.colors.scribe
                  : wowTheme.colors.textMuted,
              }}
            />
            <span style={{
              color: wowTheme.colors.textPrimary,
              textTransform: 'capitalize',
              fontWeight: 500,
            }}>
              {selectedMinion.state}
            </span>
          </div>
        </Section>

        {/* Traits */}
        <Section title="Traits" icon={<WowIcon name="rune" size="xs" color={wowTheme.colors.goldMid} />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {selectedMinion.traits.map((trait) => (
              <span
                key={trait}
                style={{
                  padding: '4px 10px',
                  fontSize: wowTheme.fontSizes.xs,
                  borderRadius: '12px',
                  background: `${wowTheme.colors.bronze}30`,
                  border: `1px solid ${wowTheme.colors.bronze}`,
                  color: wowTheme.colors.bronzeLight,
                  textTransform: 'capitalize',
                }}
              >
                {trait}
              </span>
            ))}
            {selectedMinion.traits.length === 0 && (
              <span style={{
                color: wowTheme.colors.textMuted,
                fontSize: wowTheme.fontSizes.sm,
                fontStyle: 'italic',
              }}>
                No special traits yet
              </span>
            )}
          </div>
        </Section>

        {/* Lore */}
        <Section title="Origin Story" icon={<WowIcon name="scroll" size="xs" color={wowTheme.colors.goldMid} />}>
          <p style={{
            color: wowTheme.colors.textSecondary,
            fontSize: wowTheme.fontSizes.sm,
            fontStyle: 'italic',
            lineHeight: 1.5,
            margin: 0,
          }}>
            "{roleLore[loreIndex]}"
          </p>
        </Section>

        {/* Adventures */}
        <Section title="Recent Adventures" icon={<WowIcon name="quest" size="xs" color={wowTheme.colors.goldMid} />}>
          {selectedMinion.memories.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedMinion.memories.slice(-3).map((memory) => (
                <li
                  key={memory.id}
                  style={{
                    fontSize: wowTheme.fontSizes.sm,
                    color: wowTheme.colors.textSecondary,
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: wowTheme.colors.goldMid }}>*</span>
                  {memory.content}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{
              fontSize: wowTheme.fontSizes.sm,
              color: wowTheme.colors.textSecondary,
              display: 'flex',
              gap: '8px',
              margin: 0,
            }}>
              <span style={{ color: wowTheme.colors.goldMid }}>*</span>
              {ADVENTURE_STORIES[storyIndex]}
            </p>
          )}
        </Section>

        {/* Collected Items */}
        <Section title="Collected Treasures" icon={<WowIcon name="artifact" size="xs" color={wowTheme.colors.goldMid} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <WowIcon name="gold" size="sm" color={wowTheme.colors.goldMid} />
                <div>
                  <p style={{
                    fontSize: wowTheme.fontSizes.sm,
                    color: wowTheme.colors.textPrimary,
                    fontWeight: 500,
                    margin: 0,
                  }}>
                    {item.name}
                  </p>
                  <p style={{
                    fontSize: wowTheme.fontSizes.xs,
                    color: wowTheme.colors.textMuted,
                    margin: 0,
                  }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Stats */}
        <Section title="Statistics" icon={<WowIcon name="level" size="xs" color={wowTheme.colors.goldMid} />}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '8px',
            fontSize: wowTheme.fontSizes.sm,
          }}>
            <span style={{ color: wowTheme.colors.textMuted }}>Quests Completed</span>
            <span style={{ color: wowTheme.colors.textPrimary, fontWeight: 500 }}>{selectedMinion.memories.length}</span>
            <span style={{ color: wowTheme.colors.textMuted }}>Days in Service</span>
            <span style={{ color: wowTheme.colors.textPrimary, fontWeight: 500 }}>
              {Math.floor((Date.now() - selectedMinion.createdAt) / (1000 * 60 * 60 * 24))}
            </span>
            <span style={{ color: wowTheme.colors.textMuted }}>Loyalty</span>
            <span style={{ color: wowTheme.colors.goldMid, fontWeight: 500 }}>Unwavering</span>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: `2px solid ${wowTheme.colors.stoneBorder}`,
        background: wowTheme.colors.stoneDark,
      }}>
        <p style={{
          fontSize: wowTheme.fontSizes.xs,
          color: wowTheme.colors.textMuted,
          textAlign: 'center',
          fontStyle: 'italic',
          margin: 0,
        }}>
          Click on the minion in the world to interact
        </p>
      </div>
    </div>
  );
}

// Section component for consistent styling
function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: wowTheme.colors.stoneDark,
      border: `1px solid ${wowTheme.colors.stoneBorder}`,
      borderRadius: wowTheme.radius.sm,
      boxShadow: wowTheme.shadows.inset,
      padding: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: `1px solid ${wowTheme.colors.stoneBorder}`,
      }}>
        {icon}
        <h3 style={{
          margin: 0,
          fontSize: wowTheme.fontSizes.xs,
          fontWeight: 600,
          color: wowTheme.colors.goldMid,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontFamily: wowTheme.fonts.header,
        }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
