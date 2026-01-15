import * as THREE from 'three';
import type { GridConfig, DrawnFoundation } from '@/types/interaction';
import { DEFAULT_GRID_CONFIG } from '@/types/interaction';

interface GridCell {
  id: string;           // "cell_x_y"
  x: number;            // Grid x coordinate
  y: number;            // Grid z coordinate (world z)
  worldPos: THREE.Vector3;
  mesh: THREE.Mesh;
}

export class FoundationDrawer {
  private config: GridConfig;
  private selectedCells: Set<string> = new Set();
  private hoveredCell: string | null = null;
  private dragStartCell: string | null = null;
  private isDragging: boolean = false;
  private drawStartPos: THREE.Vector3 = new THREE.Vector3();
  private group: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private cellMeshes: Map<string, GridCell> = new Map();
  private isSelecting: boolean = false;

  // Materials
  private selectedCellMaterial: THREE.MeshBasicMaterial;
  private hoveredCellMaterial: THREE.MeshBasicMaterial;
  private defaultCellMaterial: THREE.MeshBasicMaterial;

  // Height map function for terrain following
  private getHeightAt: (x: number, z: number) => number;

  constructor(config?: Partial<GridConfig>, getHeightAt?: (x: number, z: number) => number) {
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };
    this.getHeightAt = getHeightAt || (() => 0);
    this.group = new THREE.Group();

    // Create grid helper (shown while selecting)
    this.gridHelper = new THREE.GridHelper(
      this.config.maxSize * this.config.cellSize * 2,
      (this.config.maxSize * this.config.cellSize * 2) / this.config.cellSize,
      0x444444,
      0x222222
    );
    this.gridHelper.visible = false;
    this.group.add(this.gridHelper);

    // Create materials for grid cells
    this.selectedCellMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,  // Purple - magical tone
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.hoveredCellMaterial = new THREE.MeshBasicMaterial({
      color: 0xa855f7,  // Lighter purple for hover
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.defaultCellMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  setHeightFunction(fn: (x: number, z: number) => number): void {
    this.getHeightAt = fn;
  }

  private snapToGrid(position: THREE.Vector3): { gridX: number; gridY: number } {
    return {
      gridX: Math.round(position.x / this.config.cellSize),
      gridY: Math.round(position.z / this.config.cellSize),
    };
  }

  private getCellId(gridX: number, gridY: number): string {
    return `cell_${gridX}_${gridY}`;
  }

  private getWorldPosFromGrid(gridX: number, gridY: number): THREE.Vector3 {
    const x = gridX * this.config.cellSize;
    const z = gridY * this.config.cellSize;
    const height = this.getHeightAt(x, z);
    return new THREE.Vector3(x, height + 0.05, z);
  }

  private createGridCell(gridX: number, gridY: number): GridCell {
    const cellId = this.getCellId(gridX, gridY);
    const worldPos = this.getWorldPosFromGrid(gridX, gridY);

    // Create plane geometry for the cell
    const geometry = new THREE.PlaneGeometry(
      this.config.cellSize * 0.95,
      this.config.cellSize * 0.95
    );
    const mesh = new THREE.Mesh(geometry, this.defaultCellMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(worldPos);
    mesh.userData.cellId = cellId;

    this.group.add(mesh);

    const cell: GridCell = {
      id: cellId,
      x: gridX,
      y: gridY,
      worldPos,
      mesh,
    };

    this.cellMeshes.set(cellId, cell);
    return cell;
  }

  private ensureGridCell(gridX: number, gridY: number): GridCell {
    const cellId = this.getCellId(gridX, gridY);
    if (this.cellMeshes.has(cellId)) {
      return this.cellMeshes.get(cellId)!;
    }
    return this.createGridCell(gridX, gridY);
  }

  startDrawing(worldPosition: THREE.Vector3): void {
    this.drawStartPos = worldPosition.clone();
    this.isSelecting = true;

    // Position grid helper at draw start
    const snapped = this.snapToGrid(worldPosition);
    const cellPos = this.getWorldPosFromGrid(snapped.gridX, snapped.gridY);
    this.gridHelper.position.copy(cellPos);
    this.gridHelper.visible = true;

    // Create initial grid cells around the start position
    this.createGridCellsAround(snapped.gridX, snapped.gridY, 15);

    // Select the initial cell
    const cellId = this.getCellId(snapped.gridX, snapped.gridY);
    this.selectCell(cellId, true);
  }

  private createGridCellsAround(gridX: number, gridY: number, radius: number): void {
    for (let x = gridX - radius; x <= gridX + radius; x++) {
      for (let y = gridY - radius; y <= gridY + radius; y++) {
        this.ensureGridCell(x, y);
      }
    }
  }

  getCellAtWorldPosition(worldPosition: THREE.Vector3): string | null {
    const snapped = this.snapToGrid(worldPosition);
    const cellId = this.getCellId(snapped.gridX, snapped.gridY);

    // Ensure cell exists so it can be found
    this.ensureGridCell(snapped.gridX, snapped.gridY);

    return cellId;
  }

  private selectCell(cellId: string, isSelected: boolean): void {
    const cell = this.cellMeshes.get(cellId);
    if (!cell) return;

    if (isSelected) {
      this.selectedCells.add(cellId);
      cell.mesh.material = this.selectedCellMaterial;
    } else {
      this.selectedCells.delete(cellId);
      cell.mesh.material = this.defaultCellMaterial;
    }
  }

  private setHoveredCell(cellId: string | null): void {
    // Clear previous hover
    if (this.hoveredCell && !this.selectedCells.has(this.hoveredCell)) {
      const prevCell = this.cellMeshes.get(this.hoveredCell);
      if (prevCell) {
        prevCell.mesh.material = this.defaultCellMaterial;
      }
    }

    this.hoveredCell = cellId;

    // Set new hover if not already selected
    if (cellId && !this.selectedCells.has(cellId)) {
      const cell = this.cellMeshes.get(cellId);
      if (cell) {
        cell.mesh.material = this.hoveredCellMaterial;
      }
    }
  }

  private selectCellsByDrag(startCellId: string, endCellId: string): void {
    const startCell = this.cellMeshes.get(startCellId);
    const endCell = this.cellMeshes.get(endCellId);
    if (!startCell || !endCell) return;

    // Create a line and select all cells near it (free-form drag)
    const startGrid = { x: startCell.x, y: startCell.y };
    const endGrid = { x: endCell.x, y: endCell.y };

    // Use Bresenham-like algorithm to select cells along the drag path
    const cellsOnPath = this.getCellsOnPath(startGrid, endGrid);
    for (const cellId of cellsOnPath) {
      this.selectCell(cellId, true);
    }
  }

  private getCellsOnPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): string[] {
    const cells: string[] = [];
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const sx = start.x < end.x ? 1 : -1;
    const sy = start.y < end.y ? 1 : -1;
    let err = dx - dy;

    let x = start.x;
    let y = start.y;

    while (true) {
      cells.push(this.getCellId(x, y));

      if (x === end.x && y === end.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return cells;
  }

  updatePosition(worldPosition: THREE.Vector3, isShiftHeld: boolean = false): void {
    if (!this.isSelecting) return;

    const cellId = this.getCellAtWorldPosition(worldPosition);
    if (!cellId) return;

    // Hover feedback
    this.setHoveredCell(cellId);

    // If dragging, select cells along the path
    if (this.isDragging && this.dragStartCell && cellId !== this.dragStartCell) {
      this.selectCellsByDrag(this.dragStartCell, cellId);
    }
  }

  handleMouseDown(worldPosition: THREE.Vector3, isShiftHeld: boolean = false): void {
    if (!this.isSelecting) return;

    const cellId = this.getCellAtWorldPosition(worldPosition);
    if (!cellId) return;

    this.dragStartCell = cellId;
    this.isDragging = true;

    // Toggle selection if shift held, otherwise start drag
    if (isShiftHeld) {
      const isCurrentlySelected = this.selectedCells.has(cellId);
      this.selectCell(cellId, !isCurrentlySelected);
    } else if (!this.selectedCells.has(cellId)) {
      // Toggle cell under cursor
      this.selectCell(cellId, true);
    }
  }

  handleMouseUp(worldPosition: THREE.Vector3): void {
    this.isDragging = false;
    this.dragStartCell = null;
  }

  canComplete(): boolean {
    return this.selectedCells.size >= this.config.minSize;
  }

  finishDrawing(): DrawnFoundation | null {
    if (!this.canComplete()) {
      this.cancelDrawing();
      return null;
    }

    // Calculate bounds from selected cells
    let minGridX = Infinity;
    let maxGridX = -Infinity;
    let minGridY = Infinity;
    let maxGridY = -Infinity;

    for (const cellId of this.selectedCells) {
      const cell = this.cellMeshes.get(cellId);
      if (cell) {
        minGridX = Math.min(minGridX, cell.x);
        maxGridX = Math.max(maxGridX, cell.x);
        minGridY = Math.min(minGridY, cell.y);
        maxGridY = Math.max(maxGridY, cell.y);
      }
    }

    // Calculate world bounds
    const minX = minGridX * this.config.cellSize;
    const maxX = (maxGridX + 1) * this.config.cellSize;
    const minY = minGridY * this.config.cellSize;
    const maxY = (maxGridY + 1) * this.config.cellSize;

    const centerX = (minX + maxX) / 2;
    const centerZ = (minY + maxY) / 2;
    const height = this.getHeightAt(centerX, centerZ);

    const foundation: DrawnFoundation = {
      cells: new Set(this.selectedCells),
      cellSize: this.config.cellSize,
      bounds: {
        min: new THREE.Vector2(minX, minY),
        max: new THREE.Vector2(maxX, maxY),
      },
      center: new THREE.Vector3(centerX, height, centerZ),
      area: this.selectedCells.size,
      isComplete: true,
    };

    this.cancelDrawing();
    return foundation;
  }

  cancelDrawing(): void {
    this.selectedCells.clear();
    this.hoveredCell = null;
    this.dragStartCell = null;
    this.isDragging = false;
    this.isSelecting = false;
    this.gridHelper.visible = false;

    // Reset all cell materials
    for (const cell of this.cellMeshes.values()) {
      cell.mesh.material = this.defaultCellMaterial;
    }
  }

  isActive(): boolean {
    return this.isSelecting;
  }

  getCellCount(): number {
    return this.selectedCells.size;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();

    // Dispose all cell meshes
    for (const cell of this.cellMeshes.values()) {
      cell.mesh.geometry.dispose();
    }

    // Dispose materials
    this.selectedCellMaterial.dispose();
    this.hoveredCellMaterial.dispose();
    this.defaultCellMaterial.dispose();

    this.cellMeshes.clear();
  }
}
