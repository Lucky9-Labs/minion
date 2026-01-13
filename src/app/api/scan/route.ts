import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import type { ChaudProject, Worktree, Building, ProjectContext } from '@/types/project';

const execAsync = promisify(exec);

// Generate a stable ID from path - use full path hash for uniqueness
function generateProjectId(projectPath: string): string {
  // Use a simple hash function for stable IDs
  let hash = 0;
  for (let i = 0; i < projectPath.length; i++) {
    const char = projectPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Combine hash with path basename for readability
  const basename = projectPath.split('/').pop() || 'project';
  return `${basename}_${Math.abs(hash).toString(36)}`;
}

// Get project context for LLM
async function getProjectContext(projectPath: string): Promise<ProjectContext> {
  const name = path.basename(projectPath);
  let readme = '';
  let packageJson = null;

  try {
    const readmePath = path.join(projectPath, 'README.md');
    const content = await fs.readFile(readmePath, 'utf-8');
    readme = content.substring(0, 500);
  } catch {
    // No README
  }

  try {
    const pkgPath = path.join(projectPath, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    packageJson = {
      name: pkg.name,
      description: pkg.description,
      keywords: pkg.keywords,
      dependencies: pkg.dependencies,
    };
  } catch {
    // No package.json
  }

  return { name, readme, packageJson };
}

// Get merge count from git history
async function getMergeCount(projectPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `cd "${projectPath}" && git log --oneline --merges 2>/dev/null | wc -l`
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

// Get worktrees for a project
async function getWorktrees(projectPath: string): Promise<Worktree[]> {
  const worktrees: Worktree[] = [];
  const worktreesDir = path.join(projectPath, '.worktrees');

  try {
    const entries = await fs.readdir(worktreesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const worktreePath = path.join(worktreesDir, entry.name);
        const stat = await fs.stat(worktreePath);
        worktrees.push({
          id: generateProjectId(worktreePath),
          branch: entry.name,
          path: worktreePath,
          minionId: null, // Will be assigned by client
          isActive: true,
          createdAt: stat.birthtimeMs,
        });
      }
    }
  } catch {
    // No worktrees directory
  }

  return worktrees;
}

// Determine building stage based on project state
function determineBuildingStage(
  hasChaud: boolean,
  worktreeCount: number,
  mergeCount: number
): Building['stage'] {
  if (!hasChaud) return 'planning';
  if (worktreeCount === 0 && mergeCount === 0) return 'foundation';
  if (worktreeCount > 0) return 'scaffolding';
  if (mergeCount > 0) return 'decorated';
  return 'constructed';
}

// Scan ~/Code for chaud projects
async function scanProjects(): Promise<ChaudProject[]> {
  const homeDir = os.homedir();
  const codeDir = path.join(homeDir, 'Code');
  const projects: ChaudProject[] = [];

  try {
    const entries = await fs.readdir(codeDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(codeDir, entry.name);
      const chaudPath = path.join(projectPath, '.chaud');

      try {
        await fs.access(chaudPath);
        // Has .chaud directory - this is a chaud project

        const context = await getProjectContext(projectPath);
        const mergeCount = await getMergeCount(projectPath);
        const worktrees = await getWorktrees(projectPath);
        const stage = determineBuildingStage(true, worktrees.length, mergeCount);

        // Default building (will be enhanced by LLM)
        const building: Building = {
          type: entry.name === 'minion' ? 'tower' : 'cottage',
          aesthetic: '',
          stage,
          level: Math.max(1, Math.floor(mergeCount / 2) + 1),
          position: { x: 0, z: 0 }, // Will be positioned by client
        };

        projects.push({
          id: generateProjectId(projectPath),
          path: projectPath,
          name: entry.name,
          building,
          worktrees,
          mergeCount,
          lastScanned: Date.now(),
        });
      } catch {
        // No .chaud directory, skip
      }
    }
  } catch (error) {
    console.error('Error scanning projects:', error);
  }

  return projects;
}

export async function GET() {
  const projects = await scanProjects();
  return NextResponse.json({ projects, scannedAt: Date.now() });
}

export async function POST() {
  // Same as GET but allows forcing a refresh
  const projects = await scanProjects();
  return NextResponse.json({ projects, scannedAt: Date.now() });
}
