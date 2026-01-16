import * as THREE from 'three';
import { TargetingSystem } from './TargetingSystem';
import { ForceGrabController } from './ForceGrabController';
import { FoundationDrawer } from './FoundationDrawer';
import { BuildingMoveController } from './BuildingMoveController';
import { BuildingGhostPreview } from './BuildingGhostPreview';
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

export interface ThrownEntity {
  entityId: string;
  velocity: THREE.Vector3;
  position: THREE.Vector3;
}

interface StaffInteractionCallbacks {
  onMinionChat?: (minionId: string) => void;
  onMinionQuest?: (minionId: string) => void;
  onMinionDetails?: (minionId: string) => void;
  onBuildingStatus?: (buildingId: string) => void;
  onBuildingWorkers?: (buildingId: string) => void;
  onBuildingAesthetic?: (buildingId: string) => void;
  onBuildingMoveStart?: (buildingId: string) => void;
  onBuildingMoveCommit?: (buildingId: string, newPosition: { x: number; z: number }) => void;
  onBuildingMoveCancel?: (buildingId: string) => void;
  onFoundationComplete?: (foundation: DrawnFoundation) => void;
  onModeChange?: (mode: InteractionMode) => void;
  onStaffStateChange?: (state: StaffState) => void;
  onEntityThrown?: (thrown: ThrownEntity) => void;
  onSpawnGolem?: (position: { x: number; y: number; z: number }) => void;
}

export class StaffInteractionController {
  private targetingSystem: TargetingSystem;
  private forceGrabController: ForceGrabController;
  private foundationDrawer: FoundationDrawer;
  private buildingMoveController: BuildingMoveController;
  private buildingGhostPreview: BuildingGhostPreview;
  private staffBeam: StaffBeam;

  private camera: THREE.Camera;
  private orthoCamera: THREE.OrthographicCamera | null = null;
  private scene: THREE.Scene;
  private isIsometricMode: boolean = false;

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

  // Suspended entity (when menu is open on a minion - they hover in place)
  private suspendedEntityId: string | null = null;
  private suspendedMesh: THREE.Object3D | null = null;
  private suspendedOriginalRotation: THREE.Euler | null = null;
  private suspendedOriginalPosition: THREE.Vector3 | null = null;

  // Callbacks
  private callbacks: StaffInteractionCallbacks = {};

  // Wizard position getter for isometric mode force grab
  private getWizardPosition: (() => THREE.Vector3) | null = null;

  // Screen dimensions for raycast calculation
  private screenWidth: number = window.innerWidth;
  private screenHeight: number = window.innerHeight;

  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;

    this.targetingSystem = new TargetingSystem(camera);
    this.forceGrabController = new ForceGrabController();
    if (camera instanceof THREE.PerspectiveCamera) {
      this.forceGrabController.setCamera(camera);
    }
    this.foundationDrawer = new FoundationDrawer();
    this.buildingMoveController = new BuildingMoveController();
    this.buildingGhostPreview = new BuildingGhostPreview();
    this.staffBeam = new StaffBeam();

    scene.add(this.staffBeam.getGroup());
    scene.add(this.foundationDrawer.getGroup());
    scene.add(this.buildingGhostPreview.getGroup());
  }

  setCallbacks(callbacks: StaffInteractionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    this.targetingSystem.setCamera(camera);
    if (camera instanceof THREE.PerspectiveCamera) {
      this.forceGrabController.setCamera(camera);
    }
  }

  /**
   * Set orthographic camera for isometric mode
   */
  setOrthoCamera(camera: THREE.OrthographicCamera): void {
    this.orthoCamera = camera;
  }

  /**
   * Enable/disable isometric mode
   */
  setIsometricMode(isometric: boolean): void {
    this.isIsometricMode = isometric;
    this.targetingSystem.setUseMouseRaycast(isometric);
    this.forceGrabController.setIsometricMode(isometric);
    if (isometric && this.orthoCamera) {
      this.targetingSystem.setCamera(this.orthoCamera);
    } else {
      this.targetingSystem.setCamera(this.camera);
    }
  }

  /**
   * Set wizard position getter for isometric mode force grab
   */
  setWizardPositionGetter(getter: () => THREE.Vector3): void {
    this.getWizardPosition = getter;
    this.forceGrabController.setWizardPositionGetter(getter);
  }

  /**
   * Set screen dimensions for raycast calculation
   */
  setScreenDimensions(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
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
    this.isMouseDown = true;
    this.cursorPosition = { x: event.clientX, y: event.clientY };

    // Clear any existing quick info
    this.hideQuickInfo();

    // Right-click cancels drawing or moving mode
    if (event.button === 2) {
      if (this.state.mode === 'drawing') {
        this.foundationDrawer.cancelDrawing();
        this.setMode('idle');
      } else if (this.state.mode === 'moving') {
        this.cancel();
      }
      return;
    }

    if (event.button !== 0) return; // Only handle left click further

    if (this.state.mode === 'grabbing') {
      // Throw the grabbed entity with ruthless force
      let targetPosition: THREE.Vector3 | undefined;

      if (this.isIsometricMode) {
        // In isometric mode, raycast to get throw target position
        this.targetingSystem.setMousePosition(
          event.clientX,
          event.clientY,
          this.screenWidth,
          this.screenHeight
        );
        const target = this.targetingSystem.update();
        if (target) {
          targetPosition = target.position;
        }
      }

      const thrown = this.forceGrabController.throw(targetPosition);
      if (thrown) {
        this.callbacks.onEntityThrown?.(thrown);
      }
      this.setMode('idle');
      return;
    }

    if (this.state.mode === 'drawing') {
      // Update targeting to get ground position for grid selection
      const target = this.targetingSystem.update();
      if (target && target.type === 'ground') {
        // Handle grid cell selection
        const isShiftHeld = event.shiftKey;
        this.foundationDrawer.handleMouseDown(target.position, isShiftHeld);
      }
      return;
    }

    if (this.state.mode === 'moving') {
      // Commit the building move on left click
      if (this.buildingMoveController.isMoving()) {
        this.commitBuildingMove();
      }
      return;
    }

    // Start hold detection
    this.state.holdStartTime = Date.now();

    // Update mouse position for targeting in isometric mode
    if (this.isIsometricMode) {
      this.targetingSystem.setMousePosition(
        event.clientX,
        event.clientY,
        this.screenWidth,
        this.screenHeight
      );
    }

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

    if (this.state.mode === 'drawing') {
      // End drag selection and potentially complete drawing
      const target = this.targetingSystem.getTarget();
      if (target) {
        this.foundationDrawer.handleMouseUp(target.position);
      }

      // Check if we can complete the foundation
      if (this.foundationDrawer.canComplete()) {
        // Foundation is ready to finalize
        // Don't auto-complete here - let user finalize with a UI button or double-click
        // For now, just show that selection is ready
      }
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

    // Update targeting system mouse position for isometric mode
    if (this.isIsometricMode) {
      this.targetingSystem.setMousePosition(
        event.clientX,
        event.clientY,
        this.screenWidth,
        this.screenHeight
      );
    }

    // Accumulate delta for look-to-select when menu is open
    if (this.state.mode === 'menu') {
      // Use movementX/Y for pointer lock delta, or calculate from position change
      const deltaX = event.movementX ?? 0;
      const deltaY = event.movementY ?? 0;
      this.menuSelectionDelta.x += deltaX;
      this.menuSelectionDelta.y += deltaY;
    }

    if (this.state.mode === 'drawing') {
      // Update grid position during hover/drag
      const target = this.targetingSystem.getTarget();
      if (target && target.type === 'ground') {
        const isShiftHeld = event.shiftKey;
        this.foundationDrawer.updatePosition(target.position, isShiftHeld);
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

  // Keyboard handler for grid selection and building move
  handleKeyDown(event: KeyboardEvent): void {
    if (this.state.mode === 'drawing') {
      // Enter key to finalize selection
      if (event.key === 'Enter') {
        event.preventDefault();
        this.finalizeGridSelection();
      }
      // Escape key to cancel
      else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    } else if (this.state.mode === 'moving') {
      // Escape key to cancel building move
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    }
  }

  // Update loop (call in animation frame)
  update(deltaTime: number): void {
    // Only update targeting continuously in first-person mode (for highlight effect)
    // In isometric mode, targeting is done on-demand in handleMouseDown
    if (!this.isIsometricMode) {
      const target = this.targetingSystem.update();
      this.state.target = target;
    }
    // Note: In isometric mode, targeting is NOT updated here - only on mousedown

    // Check for hold -> menu transition
    if (this.state.mode === 'aiming' && this.state.holdStartTime) {
      const holdDuration = Date.now() - this.state.holdStartTime;
      if (holdDuration >= this.holdThreshold && this.state.target && this.state.target.type !== 'none') {
        this.setMode('menu');
        this.state.holdStartTime = null;
      }
    }

    // Update force grab
    if (this.state.mode === 'grabbing') {
      // Update target based on mode
      if (this.isIsometricMode) {
        this.forceGrabController.updateTargetForIsometric();
      } else {
        this.forceGrabController.updateTargetFromCamera(this.camera as THREE.PerspectiveCamera);
      }
      this.forceGrabController.update(deltaTime);

      // Update beam to grabbed entity
      const grabbedPos = this.forceGrabController.getPosition();
      if (grabbedPos) {
        const staffPos = this.getStaffGemPosition();
        this.staffBeam.setEndpoints(staffPos, grabbedPos);
      }
    }

    // Update building move
    if (this.state.mode === 'moving' || this.buildingMoveController.isActive()) {
      // Update targeting to get ground position
      const target = this.targetingSystem.update();

      if (target && target.type === 'ground' && this.buildingMoveController.isMoving()) {
        // Update target position for placement
        this.buildingMoveController.updateTargetPosition(target.position);

        // Update ghost preview position
        const targetPos = this.buildingMoveController.getTargetPosition();
        if (targetPos) {
          this.buildingGhostPreview.setPosition(targetPos.x, targetPos.z);
        }

        // Update localized grid
        this.foundationDrawer.updateMoveGrid(target.position);
      }

      // Update move controller animation
      this.buildingMoveController.update(deltaTime);
    }

    // Update beam for aiming
    if (this.state.mode === 'aiming' && this.state.target) {
      const staffPos = this.getStaffGemPosition();
      this.staffBeam.setEndpoints(staffPos, this.state.target.position);
      this.staffBeam.setVisible(true);
    } else if (this.state.mode !== 'grabbing' && this.state.mode !== 'drawing' && this.state.mode !== 'moving') {
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
      case 'moving':
        this.staffBeam.setMode('drawing');
        this.staffBeam.setVisible(true);
        this.callbacks.onStaffStateChange?.('drawing');
        break;
      case 'menu':
        this.staffBeam.setMode('aiming');
        this.callbacks.onStaffStateChange?.('charging');
        // Reset selection delta when entering menu mode
        this.menuSelectionDelta = { x: 0, y: 0 };
        // Suspend the targeted minion (they hover in place)
        if (this.state.target?.type === 'minion' && this.state.target.mesh && this.state.target.id) {
          this.suspendEntity(this.state.target.id, this.state.target.mesh);
        }
        break;
      case 'idle':
      default:
        this.staffBeam.setMode('idle');
        this.staffBeam.setVisible(false);
        this.callbacks.onStaffStateChange?.('idle');
        // Release any suspended entity (restore their rotation)
        this.releaseSuspendedEntity();
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

      case 'details':
        if (target?.type === 'minion' && target.id) {
          this.callbacks.onMinionDetails?.(target.id);
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

      case 'move':
        if (target?.type === 'building' && target.id && target.mesh) {
          this.startBuildingMove(target.id, target.mesh);
          return; // Don't set to idle
        }
        break;

      case 'build':
        if (target?.type === 'ground') {
          this.foundationDrawer.startDrawing(target.position);
          this.setMode('drawing');
          return; // Don't set to idle
        }
        break;

      case 'spawn_golem':
        if (target?.type === 'ground') {
          const pos = target.position;
          this.callbacks.onSpawnGolem?.({ x: pos.x, y: pos.y, z: pos.z });
        }
        break;

      case 'cancel':
      default:
        break;
    }

    this.setMode('idle');
  }

  /**
   * Finalize grid selection and proceed to minion picker
   * Call this when user has selected zones and is ready to proceed
   */
  finalizeGridSelection(): void {
    if (this.state.mode === 'drawing') {
      const foundation = this.foundationDrawer.finishDrawing();
      if (foundation) {
        this.callbacks.onFoundationComplete?.(foundation);
      }
      this.setMode('idle');
    }
  }

  /**
   * Start moving a building
   */
  private startBuildingMove(buildingId: string, buildingMesh: THREE.Object3D): void {
    // Set up callbacks for move completion
    this.buildingMoveController.setOnCommit((id, newPosition) => {
      this.buildingGhostPreview.hide();
      this.foundationDrawer.exitMoveMode();
      this.callbacks.onBuildingMoveCommit?.(id, newPosition);
      this.setMode('idle');
    });

    this.buildingMoveController.setOnCancel((id) => {
      this.buildingGhostPreview.hide();
      this.foundationDrawer.exitMoveMode();
      this.callbacks.onBuildingMoveCancel?.(id);
      this.setMode('idle');
    });

    // Start the move
    this.buildingMoveController.startMove(buildingId, buildingMesh);

    // Set up ghost preview with building footprint
    const footprint = this.buildingMoveController.getFootprint();
    if (footprint) {
      this.buildingGhostPreview.setFootprint(footprint.width, footprint.depth);
      const originalPos = this.buildingMoveController.getOriginalPosition();
      if (originalPos) {
        this.buildingGhostPreview.setPosition(originalPos.x, originalPos.z);
      }
      this.buildingGhostPreview.show();
    }

    // Enter move mode on foundation drawer (localized grid)
    const originalPos = this.buildingMoveController.getOriginalPosition();
    if (originalPos) {
      this.foundationDrawer.enterMoveMode(originalPos);
    }

    // Fire callback
    this.callbacks.onBuildingMoveStart?.(buildingId);

    this.setMode('moving');
  }

  /**
   * Commit building move (place at current target)
   */
  commitBuildingMove(): void {
    if (this.state.mode === 'moving' && this.buildingMoveController.isMoving()) {
      this.buildingMoveController.commit();
    }
  }

  // Cancel current interaction
  cancel(): void {
    if (this.state.mode === 'grabbing') {
      this.forceGrabController.cancel();
    } else if (this.state.mode === 'drawing') {
      this.foundationDrawer.cancelDrawing();
    } else if (this.state.mode === 'moving') {
      this.buildingMoveController.cancel();
      this.buildingGhostPreview.hide();
      this.foundationDrawer.exitMoveMode();
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

  isMovingBuilding(): boolean {
    return this.buildingMoveController.isActive();
  }

  getMovingBuildingId(): string | null {
    return this.buildingMoveController.getBuildingId();
  }

  // Suspend entity (for menu hover state - they float and spin)
  private suspendEntity(entityId: string, mesh: THREE.Object3D): void {
    this.suspendedEntityId = entityId;
    this.suspendedMesh = mesh;
    this.suspendedOriginalRotation = mesh.rotation.clone();
    this.suspendedOriginalPosition = mesh.position.clone();
  }

  // Release suspended entity and restore their orientation
  private releaseSuspendedEntity(): void {
    if (this.suspendedMesh && this.suspendedOriginalRotation && this.suspendedOriginalPosition) {
      // Restore original rotation
      this.suspendedMesh.rotation.copy(this.suspendedOriginalRotation);
      // Note: position is managed by the animation loop, just restore rotation
    }
    this.suspendedEntityId = null;
    this.suspendedMesh = null;
    this.suspendedOriginalRotation = null;
    this.suspendedOriginalPosition = null;
  }

  getSuspendedEntityId(): string | null {
    return this.suspendedEntityId;
  }

  /**
   * Get the targeting system for access to highlighted mesh (used for outline rendering).
   */
  getTargetingSystem(): TargetingSystem {
    return this.targetingSystem;
  }

  dispose(): void {
    this.hideQuickInfo();
    this.targetingSystem.dispose();
    this.forceGrabController.dispose();
    this.foundationDrawer.dispose();
    this.buildingMoveController.dispose();
    this.buildingGhostPreview.dispose();
    this.staffBeam.dispose();
  }
}
