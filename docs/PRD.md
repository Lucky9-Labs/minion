# Product Requirements Document (PRD)
## Mage Tower

### Product Type
Consumer App / Gameified Agent Platform

### One-liner
Mage Tower is an isometric, narrative-driven interface for commanding LLM agents as minions inside a persistent world, producing real artifacts while feeling like a cozy strategy game.

---

## 1. Goals & Non-Goals

### Goals
- Replace chat-based agent interaction with **spatial dispatch**
- Make invisible agent work **visible, legible, and emotionally engaging**
- Create strong retention through:
  - persistent world
  - narrative minions
  - cosmetic identity
- Produce **real, usable outputs** (code, docs, data, automations)

### Non-Goals
- Not a full RPG with branching plotlines
- Not a general-purpose 3D engine
- Not pay-to-win or power monetization
- Not a social feed product

---

## 2. Target User

Primary:
- Developers, builders, indie founders
- Power users of LLMs who feel terminal/chat fatigue

Secondary:
- Knowledge workers
- Creative technologists
- Agent-curious non-programmers

---

## 3. Core User Experience

### Mental Model
> "I run a tower. I send minions. They return with loot."

Users do not:
- prompt
- babysit tokens
- manage logs

Users do:
- recruit
- dispatch
- observe
- collect
- reuse

---

## 4. Core Loop

1. Recruit or select a Minion
2. Create a Quest (task + context)
3. Dispatch Minion
4. Observe journey in isometric world
5. Receive Postcard + Artifact
6. Store, Equip, or Share

---

## 5. World & UI (Three.js)

### Rendering Stack
- **Three.js** for rendering
- **WebGL** target
- Fixed isometric camera (no rotation in v0)
- Orthographic camera preferred for clarity

### World Structure
- Single isometric scene
- Tile-based ground plane
- Vertical tower mesh with modular floors
- Path graph for minion movement

### Camera
- Locked isometric angle (e.g. 30° / 45°)
- Smooth pan + zoom
- No free rotation (prevents complexity)

### Assets
- Stylized low-poly or hand-painted look
- Pre-baked lighting
- Minimal dynamic shadows (v0 optional)

---

## 6. Tower Design

### Tower = Capability Graph
Each unlocked floor corresponds to a system capability.

| Floor | Capability |
|------|-----------|
| Library | Memory, style guide, context |
| Workshop | Code execution |
| Forge | Testing, refinement |
| Observatory | Monitoring / scheduled tasks |
| Portal | Integrations |

Tower visibly grows upward as capabilities unlock.

---

## 7. Minions

### Minion Types (v0)
- Scout (research)
- Scribe (docs/specs)
- Artificer (code)

### Minion Attributes
- Role (functional)
- Traits (narrative)
- Memory (small, capped)
- Visual skin (cosmetic)

### Minion States (Visualized)
- Idle
- Traveling
- Working
- Stuck
- Returning

All states must map to visible animations.

---

## 8. Narrative System

### Design Principle
Narrative is **ambient and emergent**, not branching or blocking.

### Quest Phases
1. Departure
2. Travel
3. Work
4. Optional Event
5. Resolution
6. Return

Narrative events only trigger at phase boundaries.

### Event Types
- Flavor (no effect)
- Modifier (minor outcome change)
- Social (minion encounters)

Events never prevent completion.

---

## 9. Postcards

### Definition
A Postcard is the narrative receipt of a quest.

### Contents
- Stylized image snapshot
- Short narrative text
- Outcome summary
- Artifact link(s)

### Purpose
- Emotional payoff
- Shareable moment
- Trust-building transparency

---

## 10. Artifacts (Outputs)

Artifacts are **real outputs**, not decorative items.

### Artifact Types
- Scrolls: reusable agent recipes
- Artifacts: files, code, docs, data
- Runes: automations, scheduled workflows

Artifacts must be:
- Downloadable or runnable
- Reusable
- Shareable via link

---

## 11. Social Layer

### Principles
- No feeds
- No likes
- No follower mechanics

### Social Interactions
- Minion encounters
- Shared artifacts
- Read-only tower visits
- Guild vaults (later)

Social presence is indirect and ambient.

---

## 12. Monetization

### Allowed
- Cosmetics only

### Cosmetic Categories
- Mage avatar
- Tower architecture
- Terrain & skybox
- Ambient effects
- Minion skins

### Explicitly Disallowed
- Pay-for-speed
- Pay-for-better agents
- Pay-for-capabilities

---

## 13. Technical Architecture (High Level)

### Frontend
- React
- Three.js
- State sync via lightweight ECS or scene graph abstraction

### Backend
- Agent orchestration service
- Artifact storage
- Quest state machine
- Event generator
- Social encounter resolver

### Determinism
- Quest outcomes must be reproducible
- Narrative events are seeded
- Artifacts always persist

---

## 14. v0 Scope (Strict)

### Included
- One tower
- One terrain
- Three minion types
- One quest at a time
- Postcards
- Artifact vault
- Basic cosmetics

### Excluded
- PvP
- Live multiplayer
- Complex economy
- User-generated assets

---

## 15. Success Metrics

- Users name their minions
- Users rerun artifacts instead of re-prompting
- Users share Postcards or Scrolls organically
- Session time > chat-based agent tools

---

## 16. Product Philosophy

Mage Tower is not about making work faster.
It's about making delegation **legible, human, and satisfying**.

If successful, users will not say:
"I used an AI."

They will say:
"My minion handled it."
