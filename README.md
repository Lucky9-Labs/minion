# Mage Tower

*A narrative-first agent game for building real things*

Mage Tower is a consumer app that turns LLM agents into **characters you command inside an isometric world**. Instead of chatting with a terminal, you **recruit minions**, dispatch them on quests, watch them travel and work inside your tower, and collect **real, usable artifacts** as magical loot.

## What is Mage Tower?

- **Minions = specialized AI agents** (Scouts, Scribes, Artificers, Smiths, Heralds)
- **Quests = real tasks** (code, research, writing, automation)
- **Artifacts = real outputs** (files, PRs, docs, datasets, workflows)
- **Narrative = ambient, emergent, social**

You don't "run an agent." You **send a minion**.

## Core Loop

1. **Recruit a Minion** - Each has a role, personality, and memory
2. **Post a Quest** - "Research this", "Add a feature", "Refactor this repo"
3. **Dispatch** - Minion leaves your tower, travels, works, encounters events
4. **Narrative Happens** - Random travel events, trait development, memory formation
5. **Return with Loot** - Scrolls, Artifacts, Runes
6. **Store, Equip, or Share** - Keep in Vault, re-run as spell, or gift to others

## The Isometric World

Rendered as a persistent isometric domain:

- **Your Tower** - Grows vertically as you unlock capabilities
  - Library (memory & style)
  - Workshop (execution)
  - Forge (testing & refinement)
  - Observatory (monitoring & automation)
  - Portal (integrations)

- **Minions** - Move through the world, idle, work, get stuck, return

## Tech Stack

- **Next.js 16** - React framework
- **Three.js** - 3D isometric rendering
- **Browser Storage** - IndexedDB for persistence
- **Tailwind CSS** - Styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to enter your tower.

## v0 Focus

- One tower with growing rooms
- Handful of minion types
- Real agent-backed quests
- Narrative postcards
- Shareable magical items
