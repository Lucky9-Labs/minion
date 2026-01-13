import * as THREE from 'three';
import { PlotGenerator } from './PlotGenerator';
import { PlotMeshBuilder } from './PlotMeshBuilder';
import type { PlotCoord, PlotConfig, TerrainConfig } from './types';
import { DEFAULT_TERRAIN_CONFIG } from './types';

/**
 * Manages loading and unloading of terrain plots
 */
export class PlotManager {
  private scene: THREE.Scene;
  private config: TerrainConfig;
  private generator: PlotGenerator;
  private builder: PlotMeshBuilder;
  private loadedPlots: Map<string, THREE.Group> = new Map();
  private plotConfigs: Map<string, PlotConfig> = new Map();

  constructor(scene: THREE.Scene, config: TerrainConfig = DEFAULT_TERRAIN_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.generator = new PlotGenerator(config);
    this.builder = new PlotMeshBuilder(config.plotSize);
  }

  /**
   * Load all plots in the grid
   * For 9x9, this loads all 81 plots at once (small enough to keep in memory)
   */
  loadAllPlots(): void {
    const coords = this.generator.getAllPlotCoords();

    for (const coord of coords) {
      this.loadPlot(coord);
    }
  }

  /**
   * Load a single plot
   */
  private loadPlot(coord: PlotCoord): void {
    const key = this.coordToKey(coord);

    if (this.loadedPlots.has(key)) {
      return; // Already loaded
    }

    const config = this.generator.generatePlotConfig(coord);
    const mesh = this.builder.build(config);

    this.scene.add(mesh);
    this.loadedPlots.set(key, mesh);
    this.plotConfigs.set(key, config);
  }

  /**
   * Unload a specific plot
   */
  private unloadPlot(coord: PlotCoord): void {
    const key = this.coordToKey(coord);
    const mesh = this.loadedPlots.get(key);

    if (mesh) {
      this.scene.remove(mesh);
      this.disposeMesh(mesh);
      this.loadedPlots.delete(key);
      this.plotConfigs.delete(key);
    }
  }

  /**
   * Get plot config by coordinate
   */
  getPlotConfig(coord: PlotCoord): PlotConfig | undefined {
    const key = this.coordToKey(coord);
    return this.plotConfigs.get(key);
  }

  /**
   * Get world position for a plot coordinate
   */
  getPlotWorldPosition(coord: PlotCoord): THREE.Vector3 {
    const config = this.getPlotConfig(coord);
    const elevation = config?.elevation || 0;

    return new THREE.Vector3(
      coord.gridX * this.config.plotSize,
      elevation,
      coord.gridZ * this.config.plotSize
    );
  }

  /**
   * Get the plot coordinate at a world position
   */
  worldToPlotCoord(worldX: number, worldZ: number): PlotCoord {
    return {
      gridX: Math.round(worldX / this.config.plotSize),
      gridZ: Math.round(worldZ / this.config.plotSize),
    };
  }

  /**
   * Check if a world position is within the terrain bounds
   */
  isWithinBounds(worldX: number, worldZ: number): boolean {
    const maxBound = (this.config.totalGridSize / 2) * this.config.plotSize;
    return Math.abs(worldX) <= maxBound && Math.abs(worldZ) <= maxBound;
  }

  /**
   * Get camera bounds for the terrain
   */
  getCameraBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    const maxBound = (this.config.totalGridSize / 2) * this.config.plotSize;
    return {
      min: new THREE.Vector3(-maxBound, -10, -maxBound),
      max: new THREE.Vector3(maxBound, 50, maxBound),
    };
  }

  /**
   * Dispose of all loaded plots
   */
  dispose(): void {
    for (const [key, mesh] of this.loadedPlots) {
      this.scene.remove(mesh);
      this.disposeMesh(mesh);
    }
    this.loadedPlots.clear();
    this.plotConfigs.clear();
  }

  private coordToKey(coord: PlotCoord): string {
    return `${coord.gridX},${coord.gridZ}`;
  }

  private disposeMesh(mesh: THREE.Group): void {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
