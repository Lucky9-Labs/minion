import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Manages post-processing outline effect for interactable highlighting.
 * Used in first-person mode to show a purple silhouette outline around
 * targeted objects instead of changing their material color.
 */
export class OutlineEffect {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private outlinePass: OutlinePass;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private time: number = 0;
  private enabled: boolean = true;
  private hasSelection: boolean = false;

  // Outline configuration
  private static readonly EDGE_COLOR = 0x9966ff; // Purple to match staff/theme
  private static readonly EDGE_THICKNESS = 1.5; // Subtle thickness
  private static readonly EDGE_STRENGTH_MIN = 2.5;
  private static readonly EDGE_STRENGTH_MAX = 4.0;
  private static readonly PULSE_SPEED = 4.0; // ~2Hz pulse frequency
  private static readonly EDGE_GLOW = 0.5;
  private static readonly HIDDEN_EDGE_COLOR = 0x442288; // Dimmer for occluded edges

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Create effect composer
    this.composer = new EffectComposer(renderer);

    // Add render pass (renders the scene normally first)
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // Get renderer size
    const size = new THREE.Vector2();
    renderer.getSize(size);

    // Add outline pass
    this.outlinePass = new OutlinePass(size, scene, camera);
    this.configureOutlinePass();
    this.composer.addPass(this.outlinePass);

    // Add output pass to preserve tone mapping and color encoding
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private configureOutlinePass(): void {
    // Purple outline color matching the staff theme
    this.outlinePass.visibleEdgeColor.setHex(OutlineEffect.EDGE_COLOR);
    this.outlinePass.hiddenEdgeColor.setHex(OutlineEffect.HIDDEN_EDGE_COLOR);

    // Subtle thickness
    this.outlinePass.edgeThickness = OutlineEffect.EDGE_THICKNESS;
    this.outlinePass.edgeStrength = OutlineEffect.EDGE_STRENGTH_MIN;
    this.outlinePass.edgeGlow = OutlineEffect.EDGE_GLOW;

    // Don't show pulsing down-sample artifacts
    this.outlinePass.pulsePeriod = 0; // We handle our own pulse animation
  }

  /**
   * Set the objects to outline. Pass an empty array or call clearSelection() to remove outlines.
   */
  setSelectedObjects(objects: THREE.Object3D[]): void {
    this.outlinePass.selectedObjects = objects;
    this.hasSelection = objects.length > 0;
  }

  /**
   * Clear all outlined objects.
   */
  clearSelection(): void {
    this.outlinePass.selectedObjects = [];
    this.hasSelection = false;
  }

  /**
   * Update the camera reference (needed when switching cameras).
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    this.renderPass.camera = camera;
    this.outlinePass.renderCamera = camera;
  }

  /**
   * Enable or disable the outline effect.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  /**
   * Check if the effect is enabled (always true when enabled, regardless of selection).
   * This ensures consistent rendering pipeline to avoid lighting flicker.
   */
  isActive(): boolean {
    return this.enabled;
  }

  /**
   * Check if there are objects currently selected for outline.
   */
  hasSelectedObjects(): boolean {
    return this.hasSelection;
  }

  /**
   * Update pulse animation.
   * @param deltaTime Time since last frame in seconds
   */
  update(deltaTime: number): void {
    if (!this.hasSelection) return;

    this.time += deltaTime;

    // Subtle pulse: oscillate strength between min and max
    const pulse = Math.sin(this.time * OutlineEffect.PULSE_SPEED) * 0.5 + 0.5;
    this.outlinePass.edgeStrength =
      OutlineEffect.EDGE_STRENGTH_MIN +
      pulse * (OutlineEffect.EDGE_STRENGTH_MAX - OutlineEffect.EDGE_STRENGTH_MIN);
  }

  /**
   * Render the scene with post-processing outline effect.
   */
  render(): void {
    this.composer.render();
  }

  /**
   * Handle window resize.
   */
  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.outlinePass.resolution.set(width, height);
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.clearSelection();
    this.composer.dispose();
  }
}
