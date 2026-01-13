# Mage Tower

Isometric, narrative-driven interface for commanding LLM agents as minions in a persistent world. Built with Next.js 16, Three.js, and Zustand.

## Quick Start

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict)
- **Three.js** via @react-three/fiber and @react-three/drei
- **Zustand** for state (localStorage persistence)
- **Tailwind CSS 4** for styling

## Project Structure

```
src/
├── app/              # Next.js App Router (page.tsx, layout.tsx)
├── components/       # React + Three.js components
│   ├── Scene.tsx     # Three.js canvas setup
│   ├── Tower.tsx     # Isometric tower
│   ├── Ground.tsx    # Terrain
│   ├── MinionEntity.tsx
│   ├── GameLayout.tsx
│   └── ui/           # Panel components (MinionPanel, QuestPanel, VaultPanel)
├── store/
│   └── gameStore.ts  # Zustand store
├── types/
│   └── game.ts       # Type definitions
└── lib/
    └── questSimulation.ts  # Quest progression logic
```

## Key Concepts

**Minions**: Scout (research), Scribe (docs), Artificer (code)
- States: idle, traveling, working, stuck, returning

**Quests**: departure -> travel -> work -> event -> resolution -> return -> complete

**Artifacts**: scroll (templates), artifact (files), rune (automations)

**Postcards**: Narrative receipt of completed quests with linked artifacts

## Architecture Notes

- Orthographic camera for isometric view
- State persists to localStorage via Zustand middleware
- Quest simulation runs client-side with animated movement
- UI panels overlay 3D scene with backdrop blur
- Path alias: `@/*` maps to `./src/*`
