import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChaudProject, Building, BuildingType } from '@/types/project';

interface ProjectStore {
  projects: ChaudProject[];
  lastScanTime: number;
  isScanning: boolean;
  scanError: string | null;

  // Actions
  scanProjects: () => Promise<void>;
  setProjects: (projects: ChaudProject[]) => void;
  updateProject: (id: string, updates: Partial<ChaudProject>) => void;
  updateBuildingAesthetic: (
    projectId: string,
    type: BuildingType,
    aesthetic: string
  ) => void;
  assignMinionToWorktree: (
    projectId: string,
    worktreeId: string,
    minionId: string
  ) => void;
}

// Village grid configuration - "Diagon Alley" style
const VILLAGE_CONFIG = {
  mainStreetWidth: 3.5,      // Width of main cobblestone street
  buildingSpacing: 12,       // Distance between building centers along street
  buildingSetback: 8,        // Distance from street center to building center
  maxBuildingsPerSide: 5,    // Before creating second row
  rowSpacing: 16,            // Distance between rows of buildings
};

// Position buildings in a village street grid
function calculateBuildingPositions(projects: ChaudProject[]): ChaudProject[] {
  const { buildingSpacing, buildingSetback, maxBuildingsPerSide, rowSpacing } = VILLAGE_CONFIG;

  const centerProject = projects.find((p) => p.name === 'minion');
  const otherProjects = projects.filter((p) => p.name !== 'minion');

  const positioned: ChaudProject[] = [];

  // Minion project (main cottage) at center, facing south (toward the village)
  if (centerProject) {
    positioned.push({
      ...centerProject,
      building: {
        ...centerProject.building,
        position: { x: 0, z: 0 },
        rotation: 0, // Facing south along main street
      },
    });
  }

  // Arrange other projects along the main street
  // Buildings alternate: left side, right side
  // Each side faces inward toward the street
  for (let i = 0; i < otherProjects.length; i++) {
    const project = otherProjects[i];

    const isLeftSide = i % 2 === 0;
    const pairIndex = Math.floor(i / 2);
    const rowIndex = Math.floor(pairIndex / maxBuildingsPerSide);
    const positionInRow = pairIndex % maxBuildingsPerSide;

    // Calculate position along street (Z-axis, going south/positive Z)
    const z = buildingSpacing * (positionInRow + 1) + (rowIndex * rowSpacing * 2);

    // Calculate position perpendicular to street (X-axis)
    // Additional row offset for buildings in second+ rows
    const xOffset = rowIndex > 0 ? rowSpacing : 0;
    const x = (buildingSetback + xOffset) * (isLeftSide ? -1 : 1);

    // Rotation: left side buildings face right (toward street), right side face left
    const rotation = isLeftSide ? -Math.PI / 2 : Math.PI / 2;

    positioned.push({
      ...project,
      building: {
        ...project.building,
        position: { x, z },
        rotation,
      },
    });
  }

  return positioned;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      lastScanTime: 0,
      isScanning: false,
      scanError: null,

      scanProjects: async () => {
        if (get().isScanning) return;

        set({ isScanning: true, scanError: null });

        try {
          const response = await fetch('/api/scan');
          if (!response.ok) {
            throw new Error(`Scan failed: ${response.status}`);
          }

          const data = await response.json();
          const existingProjects = get().projects;

          // Merge with existing data (preserve aesthetics and minion assignments)
          const mergedProjects = data.projects.map((newProject: ChaudProject) => {
            const existing = existingProjects.find((p) => p.id === newProject.id);
            if (existing) {
              return {
                ...newProject,
                building: {
                  ...newProject.building,
                  type: existing.building.aesthetic
                    ? existing.building.type
                    : newProject.building.type,
                  aesthetic: existing.building.aesthetic || '',
                },
                worktrees: newProject.worktrees.map((wt) => {
                  const existingWt = existing.worktrees.find((w) => w.id === wt.id);
                  return {
                    ...wt,
                    minionId: existingWt?.minionId || null,
                  };
                }),
              };
            }
            return newProject;
          });

          const positioned = calculateBuildingPositions(mergedProjects);

          set({
            projects: positioned,
            lastScanTime: data.scannedAt,
            isScanning: false,
          });

          // Generate aesthetics for projects that don't have one
          for (const project of positioned) {
            if (!project.building.aesthetic && project.name !== 'minion') {
              generateAestheticForProject(project);
            }
          }
        } catch (error) {
          set({
            isScanning: false,
            scanError: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      setProjects: (projects) => {
        set({ projects: calculateBuildingPositions(projects) });
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      updateBuildingAesthetic: (projectId, type, aesthetic) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  building: { ...p.building, type, aesthetic },
                }
              : p
          ),
        }));
      },

      assignMinionToWorktree: (projectId, worktreeId, minionId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  worktrees: p.worktrees.map((w) =>
                    w.id === worktreeId ? { ...w, minionId } : w
                  ),
                }
              : p
          ),
        }));
      },
    }),
    {
      name: 'chaud-projects',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        projects: state.projects,
        lastScanTime: state.lastScanTime,
      }),
    }
  )
);

// Helper to generate aesthetic for a project
async function generateAestheticForProject(project: ChaudProject) {
  try {
    const response = await fetch('/api/generate-aesthetic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectContext: {
          name: project.name,
          readme: '', // Could be fetched if needed
          packageJson: null,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      useProjectStore
        .getState()
        .updateBuildingAesthetic(project.id, data.type, data.aesthetic);
    }
  } catch (error) {
    console.error('Error generating aesthetic:', error);
  }
}

