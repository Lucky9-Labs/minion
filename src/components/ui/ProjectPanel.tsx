'use client';

import { useProjectStore } from '@/store/projectStore';
import { BUILDING_STAGE_DESCRIPTIONS } from '@/types/project';

interface ProjectPanelProps {
  projectId: string | null;
  onClose: () => void;
}

export function ProjectPanel({ projectId, onClose }: ProjectPanelProps) {
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return null;
  }

  const stageColors = {
    planning: 'bg-gray-500',
    foundation: 'bg-yellow-600',
    scaffolding: 'bg-orange-500',
    constructed: 'bg-blue-500',
    decorated: 'bg-green-500',
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-black/80 backdrop-blur-sm rounded-lg border border-amber-900/50 text-amber-100 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-900/30">
        <h2 className="text-lg font-bold text-amber-400">{project.name}</h2>
        <button
          onClick={onClose}
          className="text-amber-500 hover:text-amber-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Building info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${stageColors[project.building.stage]}`}
            >
              {project.building.stage}
            </span>
            <span className="text-amber-500 text-sm">
              Level {project.building.level}
            </span>
          </div>
          <p className="text-sm text-amber-200/70">
            {BUILDING_STAGE_DESCRIPTIONS[project.building.stage]}
          </p>
          {project.building.aesthetic && (
            <p className="text-sm text-amber-200/50 italic mt-2">
              "{project.building.aesthetic}"
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-900/20 rounded p-2">
            <div className="text-2xl font-bold text-amber-400">
              {project.worktrees.length}
            </div>
            <div className="text-xs text-amber-200/60">Active Worktrees</div>
          </div>
          <div className="bg-amber-900/20 rounded p-2">
            <div className="text-2xl font-bold text-amber-400">
              {project.mergeCount}
            </div>
            <div className="text-xs text-amber-200/60">Merged PRs</div>
          </div>
        </div>

        {/* Worktrees list */}
        {project.worktrees.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-amber-400 mb-2">
              Active Worktrees
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {project.worktrees.map((worktree) => (
                <div
                  key={worktree.id}
                  className="flex items-center gap-2 bg-amber-900/10 rounded px-2 py-1.5 text-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="truncate flex-1 text-amber-200/80">
                    {worktree.branch}
                  </span>
                  {worktree.minionId && (
                    <span className="text-xs text-amber-500">🧙 Working</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Path */}
        <div className="text-xs text-amber-200/40 truncate" title={project.path}>
          📁 {project.path}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-amber-900/30">
          <button
            onClick={() => {
              // Open in terminal - this would need to be implemented
              navigator.clipboard.writeText(`cd ${project.path}`);
            }}
            className="flex-1 px-3 py-1.5 bg-amber-800/30 hover:bg-amber-800/50 rounded text-sm transition-colors"
          >
            Copy Path
          </button>
          <button
            onClick={() => {
              // Could open VS Code or similar
              navigator.clipboard.writeText(`code ${project.path}`);
            }}
            className="flex-1 px-3 py-1.5 bg-amber-800/30 hover:bg-amber-800/50 rounded text-sm transition-colors"
          >
            Open in Editor
          </button>
        </div>
      </div>
    </div>
  );
}
