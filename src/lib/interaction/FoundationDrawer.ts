import * as THREE from 'three';
import type { GridConfig, DrawnFoundation } from '@/types/interaction';
import { DEFAULT_GRID_CONFIG } from '@/types/interaction';

export class FoundationDrawer {
  private config: GridConfig;
  private currentPath: THREE.Vector2[] = [];
  private group: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private pathLine: THREE.Line;
  private pathLineMaterial: THREE.LineBasicMaterial;
  private previewMesh: THREE.Mesh;
  private isDrawing: boolean = false;

  // Height map function for terrain following
  private getHeightAt: (x: number, z: number) => number;

  constructor(config?: Partial<GridConfig>, getHeightAt?: (x: number, z: number) => number) {
    this.config = { ...DEFAULT_GRID_CONFIG, ...config };
    this.getHeightAt = getHeightAt || (() => 0);
    this.group = new THREE.Group();

    // Create grid helper (shown while drawing)
    this.gridHelper = new THREE.GridHelper(
      this.config.maxSize * this.config.cellSize * 2,
      this.config.maxSize * 2,
      0x444444,
      0x222222
    );
    this.gridHelper.visible = false;
    this.group.add(this.gridHelper);

    // Create path line for drawing visualization
    const pathGeometry = new THREE.BufferGeometry();
    this.pathLineMaterial = new THREE.LineBasicMaterial({
      color: 0x66ccff,
      linewidth: 3,
      transparent: true,
      opacity: 0.8,
    });
    this.pathLine = new THREE.Line(pathGeometry, this.pathLineMaterial);
    this.pathLine.frustumCulled = false;
    this.group.add(this.pathLine);

    // Create preview mesh (semi-transparent fill)
    const previewGeometry = new THREE.PlaneGeometry(1, 1);
    const previewMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    this.previewMesh.rotation.x = -Math.PI / 2;
    this.previewMesh.visible = false;
    this.group.add(this.previewMesh);
  }

  setHeightFunction(fn: (x: number, z: number) => number): void {
    this.getHeightAt = fn;
  }

  private snapToGrid(position: THREE.Vector3): THREE.Vector2 {
    return new THREE.Vector2(
      Math.round(position.x / this.config.cellSize) * this.config.cellSize,
      Math.round(position.z / this.config.cellSize) * this.config.cellSize
    );
  }

  startDrawing(worldPosition: THREE.Vector3): void {
    const snapped = this.snapToGrid(worldPosition);
    this.currentPath = [snapped];
    this.isDrawing = true;

    // Position grid helper at draw start
    const height = this.getHeightAt(snapped.x, snapped.y);
    this.gridHelper.position.set(snapped.x, height + 0.05, snapped.y);
    this.gridHelper.visible = true;

    this.updatePathLine();
  }

  updatePosition(worldPosition: THREE.Vector3): void {
    if (!this.isDrawing) return;

    const snapped = this.snapToGrid(worldPosition);

    // Only add if different from last point
    const lastPoint = this.currentPath[this.currentPath.length - 1];
    if (!lastPoint || snapped.distanceTo(lastPoint) >= this.config.cellSize * 0.9) {
      // Check if we're closing the path
      if (this.currentPath.length >= 3) {
        const startPoint = this.currentPath[0];
        if (snapped.distanceTo(startPoint) < this.config.snapThreshold) {
          // Snap to start point to close
          this.currentPath.push(startPoint.clone());
          this.updatePathLine();
          return;
        }
      }

      // Check max size constraint
      if (this.currentPath.length < this.config.maxSize * 4) {
        this.currentPath.push(snapped);
        this.updatePathLine();
      }
    }
  }

  private updatePathLine(): void {
    if (this.currentPath.length < 2) {
      this.pathLine.visible = false;
      this.previewMesh.visible = false;
      return;
    }

    // Create 3D positions from 2D path
    const positions: number[] = [];
    for (const point of this.currentPath) {
      const height = this.getHeightAt(point.x, point.y) + 0.1;
      positions.push(point.x, height, point.y);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    this.pathLine.geometry.dispose();
    this.pathLine.geometry = geometry;
    this.pathLine.visible = true;

    // Update color based on validity
    if (this.isPathClosed()) {
      this.pathLineMaterial.color.setHex(0x00ff88); // Green when closed
      this.updatePreviewMesh();
    } else if (this.currentPath.length >= this.config.minSize) {
      this.pathLineMaterial.color.setHex(0xffcc00); // Yellow when can close
    } else {
      this.pathLineMaterial.color.setHex(0x66ccff); // Blue while drawing
    }
  }

  private updatePreviewMesh(): void {
    if (!this.isPathClosed() || this.currentPath.length < 4) {
      this.previewMesh.visible = false;
      return;
    }

    // Calculate bounds
    const bounds = this.calculateBounds();
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.y - bounds.min.y;
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerZ = (bounds.min.y + bounds.max.y) / 2;
    const height = this.getHeightAt(centerX, centerZ) + 0.05;

    this.previewMesh.position.set(centerX, height, centerZ);
    this.previewMesh.scale.set(width, depth, 1);
    this.previewMesh.visible = true;
  }

  private calculateBounds(): { min: THREE.Vector2; max: THREE.Vector2 } {
    const min = new THREE.Vector2(Infinity, Infinity);
    const max = new THREE.Vector2(-Infinity, -Infinity);

    for (const point of this.currentPath) {
      min.x = Math.min(min.x, point.x);
      min.y = Math.min(min.y, point.y);
      max.x = Math.max(max.x, point.x);
      max.y = Math.max(max.y, point.y);
    }

    return { min, max };
  }

  isPathClosed(): boolean {
    if (this.currentPath.length < 4) return false;

    const start = this.currentPath[0];
    const end = this.currentPath[this.currentPath.length - 1];

    return start.distanceTo(end) < this.config.snapThreshold;
  }

  canComplete(): boolean {
    return this.isPathClosed() && this.currentPath.length >= this.config.minSize;
  }

  finishDrawing(): DrawnFoundation | null {
    if (!this.canComplete()) {
      this.cancelDrawing();
      return null;
    }

    const bounds = this.calculateBounds();
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerZ = (bounds.min.y + bounds.max.y) / 2;
    const height = this.getHeightAt(centerX, centerZ);

    const foundation: DrawnFoundation = {
      cells: [...this.currentPath],
      bounds,
      center: new THREE.Vector3(centerX, height, centerZ),
      area: (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y),
      isComplete: true,
    };

    this.cancelDrawing();
    return foundation;
  }

  cancelDrawing(): void {
    this.currentPath = [];
    this.isDrawing = false;
    this.gridHelper.visible = false;
    this.pathLine.visible = false;
    this.previewMesh.visible = false;
  }

  isActive(): boolean {
    return this.isDrawing;
  }

  getCellCount(): number {
    return this.currentPath.length;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.pathLine.geometry.dispose();
    this.pathLineMaterial.dispose();
    this.previewMesh.geometry.dispose();
    (this.previewMesh.material as THREE.Material).dispose();
  }
}
