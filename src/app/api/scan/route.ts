import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import type { ChaudProject, Worktree, Building, ProjectContext, OpenPR } from '@/types/project';

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

// Get GitHub remote owner/repo from git remote URL
async function getGitHubRepo(projectPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `cd "${projectPath}" && git remote get-url origin 2>/dev/null`
    );
    const url = stdout.trim();
    // Parse GitHub URL formats:
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const httpsMatch = url.match(/github\.com\/([^\/]+\/[^\/\.]+)/);
    const sshMatch = url.match(/github\.com:([^\/]+\/[^\/\.]+)/);
    const match = httpsMatch || sshMatch;
    if (match) {
      return match[1].replace(/\.git$/, '');
    }
    return null;
  } catch {
    return null;
  }
}

// Get open PRs using GitHub CLI
async function getOpenPRs(projectPath: string): Promise<OpenPR[]> {
  const repo = await getGitHubRepo(projectPath);
  if (!repo) return [];

  try {
    const { stdout } = await execAsync(
      `gh pr list --repo "${repo}" --state open --json number,title,headRefName,createdAt 2>/dev/null`
    );
    const prs = JSON.parse(stdout || '[]');
    return prs.map((pr: { number: number; title: string; headRefName: string; createdAt: string }) => ({
      number: pr.number,
      title: pr.title,
      branch: pr.headRefName,
      createdAt: new Date(pr.createdAt).getTime(),
    }));
  } catch {
    return [];
  }
}

// Get merged PR count using GitHub CLI
async function getMergedPRCount(projectPath: string): Promise<number> {
  const repo = await getGitHubRepo(projectPath);
  if (!repo) return 0;

  try {
    const { stdout } = await execAsync(
      `gh pr list --repo "${repo}" --state merged --json number 2>/dev/null`
    );
    const prs = JSON.parse(stdout || '[]');
    return prs.length;
  } catch {
    return 0;
  }
}

// Get worktrees for a project with PR linking
async function getWorktrees(projectPath: string, openPRs: OpenPR[]): Promise<Worktree[]> {
  const worktrees: Worktree[] = [];
  const worktreesDir = path.join(projectPath, '.worktrees');

  try {
    const entries = await fs.readdir(worktreesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const worktreePath = path.join(worktreesDir, entry.name);
        const stat = await fs.stat(worktreePath);
        // Find matching PR by branch name
        const matchingPR = openPRs.find(pr => pr.branch === entry.name);
        worktrees.push({
          id: generateProjectId(worktreePath),
          branch: entry.name,
          path: worktreePath,
          minionId: null, // Will be assigned by client
          isActive: true,
          createdAt: stat.birthtimeMs,
          prNumber: matchingPR?.number || null,
        });
      }
    }
  } catch {
    // No worktrees directory
  }

  return worktrees;
}

// Determine building stage based on project state
// Scaffolding only appears when there are open PRs
function determineBuildingStage(
  hasChaud: boolean,
  openPRCount: number,
  mergeCount: number
): Building['stage'] {
  if (!hasChaud) return 'planning';
  if (openPRCount > 0) return 'scaffolding';
  if (mergeCount > 0) return 'decorated';
  return 'foundation';
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

        // Fetch PR data from GitHub CLI
        const openPRs = await getOpenPRs(projectPath);
        const mergedPRCount = await getMergedPRCount(projectPath);

        // Also get git merge count as fallback
        const gitMergeCount = await getMergeCount(projectPath);
        // Use the higher of GitHub merged PRs or git merges
        const mergeCount = Math.max(mergedPRCount, gitMergeCount);

        const worktrees = await getWorktrees(projectPath, openPRs);
        const stage = determineBuildingStage(true, openPRs.length, mergeCount);

        // Building height = merged PR count (minimum 1)
        const building: Building = {
          type: entry.name === 'minion' ? 'tower' : 'cottage',
          aesthetic: '',
          stage,
          level: Math.max(1, mergeCount),
          position: { x: 0, z: 0 }, // Will be positioned by client
        };

        projects.push({
          id: generateProjectId(projectPath),
          path: projectPath,
          name: entry.name,
          building,
          worktrees,
          openPRs,
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
