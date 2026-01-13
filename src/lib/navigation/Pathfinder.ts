import type { NavCell, NavPath } from './types';
import { NavGrid } from './NavGrid';

/**
 * Priority queue item for Dijkstra's algorithm
 */
interface QueueItem {
  cell: NavCell;
  cost: number;
}

/**
 * Simple priority queue implementation (min-heap behavior via sorting)
 * For small grids (~500 cells), this is efficient enough
 */
class PriorityQueue {
  private items: QueueItem[] = [];

  enqueue(cell: NavCell, cost: number): void {
    this.items.push({ cell, cost });
    // Keep sorted by cost (ascending)
    this.items.sort((a, b) => a.cost - b.cost);
  }

  dequeue(): QueueItem | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Update cost if lower (or add if not present)
   */
  updateIfLower(cell: NavCell, newCost: number): boolean {
    const key = cellKey(cell);
    const existingIdx = this.items.findIndex(i => cellKey(i.cell) === key);

    if (existingIdx === -1) {
      this.enqueue(cell, newCost);
      return true;
    }

    if (newCost < this.items[existingIdx].cost) {
      this.items[existingIdx].cost = newCost;
      this.items.sort((a, b) => a.cost - b.cost);
      return true;
    }

    return false;
  }
}

/**
 * Create unique key for a cell
 */
function cellKey(cell: NavCell): string {
  return `${cell.x},${cell.z},${cell.floor}`;
}

/**
 * Pathfinder using Dijkstra's algorithm
 */
export class Pathfinder {
  private grid: NavGrid;

  constructor(grid: NavGrid) {
    this.grid = grid;
  }

  /**
   * Find the shortest path between two cells using Dijkstra's algorithm
   */
  findPath(start: NavCell, goal: NavCell): NavPath | null {
    if (!start.walkable || !goal.walkable) {
      return null;
    }

    const startKey = cellKey(start);
    const goalKey = cellKey(goal);

    // Distance from start to each cell
    const distances = new Map<string, number>();
    distances.set(startKey, 0);

    // Parent cell for path reconstruction
    const parents = new Map<string, NavCell>();

    // Visited cells
    const visited = new Set<string>();

    // Priority queue
    const queue = new PriorityQueue();
    queue.enqueue(start, 0);

    while (!queue.isEmpty()) {
      const current = queue.dequeue()!;
      const currentKey = cellKey(current.cell);

      // Skip if already visited
      if (visited.has(currentKey)) {
        continue;
      }
      visited.add(currentKey);

      // Check if we reached the goal
      if (currentKey === goalKey) {
        return this.reconstructPath(start, goal, parents, distances.get(goalKey)!);
      }

      // Explore neighbors
      const neighbors = this.grid.getNeighbors(current.cell);
      for (const neighbor of neighbors) {
        const neighborKey = cellKey(neighbor);

        if (visited.has(neighborKey)) {
          continue;
        }

        const moveCost = this.grid.getMovementCost(current.cell, neighbor);
        const newDist = current.cost + moveCost;

        const existingDist = distances.get(neighborKey);
        if (existingDist === undefined || newDist < existingDist) {
          distances.set(neighborKey, newDist);
          parents.set(neighborKey, current.cell);
          queue.updateIfLower(neighbor, newDist);
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Reconstruct path from parent pointers
   */
  private reconstructPath(
    start: NavCell,
    goal: NavCell,
    parents: Map<string, NavCell>,
    totalCost: number
  ): NavPath {
    const cells: NavCell[] = [];
    let current: NavCell | undefined = goal;

    while (current) {
      cells.unshift(current);
      const currentKey = cellKey(current);
      if (currentKey === cellKey(start)) {
        break;
      }
      current = parents.get(currentKey);
    }

    return {
      cells,
      totalCost,
    };
  }

  /**
   * Find path from world coordinates
   */
  findPathFromWorld(
    startX: number,
    startZ: number,
    startFloor: number,
    goalX: number,
    goalZ: number,
    goalFloor: number
  ): NavPath | null {
    const startCell = this.grid.findNearestWalkable(startX, startZ, startFloor);
    const goalCell = this.grid.findNearestWalkable(goalX, goalZ, goalFloor);

    if (!startCell || !goalCell) {
      return null;
    }

    return this.findPath(startCell, goalCell);
  }

  /**
   * Check if a path exists between two cells
   */
  hasPath(start: NavCell, goal: NavCell): boolean {
    return this.findPath(start, goal) !== null;
  }

  /**
   * Get the underlying grid
   */
  getGrid(): NavGrid {
    return this.grid;
  }
}
