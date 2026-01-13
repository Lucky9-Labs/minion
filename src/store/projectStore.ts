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

// Position buildings in a spiral pattern around center
function calculateBuildingPositions(projects: ChaudProject[]): ChaudProject[] {
  const spacing = 8;
  const centerProject = projects.find((p) => p.name === 'minion');
  const otherProjects = projects.filter((p) => p.name !== 'minion');

  const positioned: ChaudProject[] = [];

  // Minion project at center
  if (centerProject) {
    positioned.push({
      ...centerProject,
      building: {
        ...centerProject.building,
        position: { x: 0, z: 0 },
      },
    });
  }

  // Spiral other projects around center
  let angle = 0;
  let radius = spacing;
  const angleIncrement = Math.PI / 3; // 60 degrees
  let projectsAtCurrentRadius = 0;
  const projectsPerRing = 6;

  for (const project of otherProjects) {
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positioned.push({
      ...project,
      building: {
        ...project.building,
        position: { x, z },
      },
    });

    angle += angleIncrement;
    projectsAtCurrentRadius++;

    if (projectsAtCurrentRadius >= projectsPerRing) {
      radius += spacing;
      projectsAtCurrentRadius = 0;
      angle = radius * 0.1; // Slight offset for each ring
    }
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
              get().generateAestheticForProject(project);
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

// Add the method to the store type
declare module 'zustand' {
  interface StoreMutatorIdentifier {
    generateAestheticForProject: typeof generateAestheticForProject;
  }
}

// Patch the store with the method
(useProjectStore.getState() as unknown as Record<string, unknown>).generateAestheticForProject =
  generateAestheticForProject;
