import * as THREE from 'three';
import { TargetingSystem } from './TargetingSystem';
import { ForceGrabController } from './ForceGrabController';
import { FoundationDrawer } from './FoundationDrawer';
import { StaffBeam } from '../effects/StaffBeam';
import type {
  InteractionMode,
  InteractionState,
  Target,
  MenuOption,
  DrawnFoundation,
  StaffState,
} from '@/types/interaction';
import {
  MINION_MENU_OPTIONS,
  BUILDING_MENU_OPTIONS,
  GROUND_MENU_OPTIONS,
} from '@/types/interaction';

interface StaffInteractionCallbacks {
  onMinionChat?: (minionId: string) => void;
  onMinionQuest?: (minionId: string) => void;
  onBuildingStatus?: (buildingId: string) => void;
  onBuildingWorkers?: (buildingId: string) => void;
  onBuildingAesthetic?: (buildingId: string) => void;
  onFoundationComplete?: (foundation: DrawnFoundation) => void;
  onModeChange?: (mode: InteractionMode) => void;
  onStaffStateChange?: (state: StaffState) => void;
}

export class StaffInteractionController {
  private targetingSystem: TargetingSystem;
  private forceGrabController: ForceGrabController;
  private foundationDrawer: FoundationDrawer;
  private staffBeam: StaffBeam;

  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;

  private state: InteractionState = {
    mode: 'idle',
    target: null,
    holdStartTime: null,
    selectedMenuOption: null,
    grabbedEntityId: null,
  };

  private holdThreshold: number = 200; // ms before opening menu
  private quickInfoTimeout: ReturnType<typeof setTimeout> | null = null;
  private showQuickInfo: boolean = false;

  // Cursor position tracking (for menu selection)
  private cursorPosition: { x: number; y: number } = { x: 0, y: 0 };
  private isMouseDown: boolean = false;

  // Look-to-select: accumulated mouse delta while menu is open
  private menuSelectionDelta: { x: number; y: number } = { x: 0, y: 0 };

  // Callbacks
  private callbacks: StaffInteractionCallbacks = {};

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;

    this.targetingSystem = new TargetingSystem(camera);
    this.forceGrabController = new ForceGrabController();
    this.foundationDrawer = new FoundationDrawer();
    this.staffBeam = new StaffBeam();

    scene.add(this.staffBeam.getGroup());
    scene.add(this.foundationDrawer.getGroup());
  }

  setCallbacks(callbacks: StaffInteractionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
    this.targetingSystem.setCamera(camera);
  }

  setHeightFunction(fn: (x: number, z: number) => number): void {
    this.foundationDrawer.setHeightFunction(fn);
  }

  // Entity registration
  registerMinion(id: string, mesh: THREE.Object3D, data: { name?: string; state?: string; personality?: string }): void {
    this.targetingSystem.registerMinion(id, mesh, data);
  }

  registerBuilding(id: string, mesh: THREE.Object3D, data: { name?: string; buildingType?: string }): void {
    this.targetingSystem.registerBuilding(id, mesh, data);
  }

  unregisterEntity(id: string): void {
    this.targetingSystem.unregisterEntity(id);
  }

  setGroundMesh(mesh: THREE.Object3D): void {
    this.targetingSystem.setGroundMesh(mesh);
  }

  // Input handlers
  handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left click

    this.isMouseDown = true;
    this.cursorPosition = { x: event.clientX, y: event.clientY };

    // Clear any existing quick info
    this.hideQuickInfo();

    if (this.state.mode === 'grabbing') {
      // Release grabbed entity
      const velocity = this.forceGrabController.getVelocity();
      this.forceGrabController.release(velocity);
      this.setMode('idle');
      return;
    }

    if (this.state.mode === 'drawing') {
      // Check if we can complete the foundation
      if (this.foundationDrawer.canComplete()) {
        const foundation = this.foundationDrawer.finishDrawing();
        if (foundation) {
          this.callbacks.onFoundationComplete?.(foundation);
        }
      } else {
        this.foundationDrawer.cancelDrawing();
      }
      this.setMode('idle');
      return;
    }

    // Start hold detection
    this.state.holdStartTime = Date.now();

    // Update targeting
    const target = this.targetingSystem.update();
    this.state.target = target;

    if (target && target.type !== 'none') {
      this.setMode('aiming');
    }
  }

  handleMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.isMouseDown = false;

    if (this.state.mode === 'menu') {
      // Menu selection is handled by the RadialMenu component
      return;
    }

    if (this.state.mode === 'aiming' && this.state.holdStartTime) {
      const holdDuration = Date.now() - this.state.holdStartTime;

      if (holdDuration < this.holdThreshold) {
        // Quick tap - show quick info
        this.showQuickInfoForTarget();
      }
      // If hold was long enough, menu would already be open

      this.state.holdStartTime = null;
      this.setMode('idle');
    }
  }

  handleMouseMove(event: MouseEvent): void {
    this.cursorPosition = { x: event.clientX, y: event.clientY };

    // Accumulate delta for look-to-select when menu is open
    if (this.state.mode === 'menu') {
      // Use movementX/Y for pointer lock delta, or calculate from position change
      const deltaX = event.movementX ?? 0;
      const deltaY = event.movementY ?? 0;
      this.menuSelectionDelta.x += deltaX;
      this.menuSelectionDelta.y += deltaY;
    }

    if (this.state.mode === 'drawing') {
      // Update drawing position
      const target = this.targetingSystem.getTarget();
      if (target && target.type === 'ground') {
        this.foundationDrawer.updatePosition(target.position);
      }
    }
  }

  /**
   * Handle raw mouse movement delta (for pointer lock mode)
   * Call this from the pointer lock mousemove handler
   */
  handleMouseDelta(deltaX: number, deltaY: number): void {
    if (this.state.mode === 'menu') {
      this.menuSelectionDelta.x += deltaX;
      this.menuSelectionDelta.y += deltaY;
    }
  }

  // Update loop (call in animation frame)
  update(deltaTime: number): void {
    // Always update targeting (for highlight effect)
    const target = this.targetingSystem.update();
    this.state.target = target;

    // Check for hold -> menu transition
    if (this.state.mode === 'aiming' && this.state.holdStartTime) {
      const holdDuration = Date.now() - this.state.holdStartTime;
      if (holdDuration >= this.holdThreshold && target && target.type !== 'none') {
        this.setMode('menu');
        this.state.holdStartTime = null;
      }
    }

    // Update force grab
    if (this.state.mode === 'grabbing') {
      this.forceGrabController.updateTargetFromCamera(this.camera);
      this.forceGrabController.update(deltaTime);

      // Update beam to grabbed entity
      const grabbedPos = this.forceGrabController.getPosition();
      if (grabbedPos) {
        const staffPos = this.getStaffGemPosition();
        this.staffBeam.setEndpoints(staffPos, grabbedPos);
      }
    }

    // Update beam for aiming
    if (this.state.mode === 'aiming' && target) {
      const staffPos = this.getStaffGemPosition();
      this.staffBeam.setEndpoints(staffPos, target.position);
      this.staffBeam.setVisible(true);
    } else if (this.state.mode !== 'grabbing' && this.state.mode !== 'drawing') {
      this.staffBeam.setVisible(false);
    }

    // Update staff beam animation
    this.staffBeam.update(deltaTime);
  }

  private getStaffGemPosition(): THREE.Vector3 {
    // Staff gem is offset from camera in first person view
    // Approximate position based on FirstPersonHands config
    const offset = new THREE.Vector3(0.3, -0.2, -0.4);
    offset.applyQuaternion(this.camera.quaternion);
    return this.camera.position.clone().add(offset);
  }

  private setMode(mode: InteractionMode): void {
    const previousMode = this.state.mode;
    this.state.mode = mode;

    // Update beam mode
    switch (mode) {
      case 'aiming':
        this.staffBeam.setMode('aiming');
        this.staffBeam.setVisible(true);
        this.callbacks.onStaffStateChange?.('aiming');
        break;
      case 'grabbing':
        this.staffBeam.setMode('grabbing');
        this.staffBeam.setVisible(true);
        this.callbacks.onStaffStateChange?.('grabbing');
        break;
      case 'drawing':
        this.staffBeam.setMode('drawing');
        this.staffBeam.setVisible(true);
        this.callbacks.onStaffStateChange?.('drawing');
        break;
      case 'menu':
        this.staffBeam.setMode('aiming');
        this.callbacks.onStaffStateChange?.('charging');
        // Reset selection delta when entering menu mode
        this.menuSelectionDelta = { x: 0, y: 0 };
        break;
      case 'idle':
      default:
        this.staffBeam.setMode('idle');
        this.staffBeam.setVisible(false);
        this.callbacks.onStaffStateChange?.('idle');
        break;
    }

    this.callbacks.onModeChange?.(mode);
  }

  private showQuickInfoForTarget(): void {
    this.showQuickInfo = true;

    // Auto-hide after 2 seconds
    this.quickInfoTimeout = setTimeout(() => {
      this.hideQuickInfo();
    }, 2000);
  }

  private hideQuickInfo(): void {
    this.showQuickInfo = false;
    if (this.quickInfoTimeout) {
      clearTimeout(this.quickInfoTimeout);
      this.quickInfoTimeout = null;
    }
  }

  // Execute action from menu selection
  executeAction(actionId: string): void {
    const target = this.state.target;

    switch (actionId) {
      case 'chat':
        if (target?.type === 'minion' && target.id) {
          this.callbacks.onMinionChat?.(target.id);
        }
        break;

      case 'quest':
        if (target?.type === 'minion' && target.id) {
          this.callbacks.onMinionQuest?.(target.id);
        }
        break;

      case 'grab':
        if (target?.type === 'minion' && target.id && target.mesh) {
          this.forceGrabController.grab(target.id, target.mesh);
          this.state.grabbedEntityId = target.id;
          this.setMode('grabbing');
          return; // Don't set to idle
        }
        break;

      case 'status':
        if (target?.type === 'building' && target.id) {
          this.callbacks.onBuildingStatus?.(target.id);
        }
        break;

      case 'workers':
        if (target?.type === 'building' && target.id) {
          this.callbacks.onBuildingWorkers?.(target.id);
        }
        break;

      case 'aesthetic':
        if (target?.type === 'building' && target.id) {
          this.callbacks.onBuildingAesthetic?.(target.id);
        }
        break;

      case 'build':
        if (target?.type === 'ground') {
          this.foundationDrawer.startDrawing(target.position);
          this.setMode('drawing');
          return; // Don't set to idle
        }
        break;

      case 'cancel':
      default:
        break;
    }

    this.setMode('idle');
  }

  // Cancel current interaction
  cancel(): void {
    if (this.state.mode === 'grabbing') {
      this.forceGrabController.cancel();
    } else if (this.state.mode === 'drawing') {
      this.foundationDrawer.cancelDrawing();
    }

    this.hideQuickInfo();
    this.setMode('idle');
  }

  // State getters for UI
  getState(): InteractionState {
    return { ...this.state };
  }

  getMode(): InteractionMode {
    return this.state.mode;
  }

  getCurrentTarget(): Target | null {
    return this.state.target;
  }

  getMenuOptions(): MenuOption[] | null {
    if (this.state.mode !== 'menu' || !this.state.target) return null;

    switch (this.state.target.type) {
      case 'minion':
        return MINION_MENU_OPTIONS;
      case 'building':
        return BUILDING_MENU_OPTIONS;
      case 'ground':
        return GROUND_MENU_OPTIONS;
      default:
        return null;
    }
  }

  getCursorPosition(): { x: number; y: number } {
    return this.cursorPosition;
  }

  /**
   * Get accumulated mouse delta for look-to-select menu
   */
  getSelectionDelta(): { x: number; y: number } {
    return { ...this.menuSelectionDelta };
  }

  shouldShowQuickInfo(): boolean {
    return this.showQuickInfo;
  }

  isGrabbing(): boolean {
    return this.forceGrabController.isGrabbing();
  }

  getGrabbedEntityId(): string | null {
    return this.forceGrabController.getGrabbedEntityId();
  }

  isDrawing(): boolean {
    return this.foundationDrawer.isActive();
  }

  getDrawingCellCount(): number {
    return this.foundationDrawer.getCellCount();
  }

  canCompleteDrawing(): boolean {
    return this.foundationDrawer.canComplete();
  }

  dispose(): void {
    this.hideQuickInfo();
    this.targetingSystem.dispose();
    this.forceGrabController.dispose();
    this.foundationDrawer.dispose();
    this.staffBeam.dispose();
  }
}
