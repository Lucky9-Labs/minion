import * as THREE from 'three';

export interface SpellbookConfig {
  positionOffset: THREE.Vector3;
  baseRotation: THREE.Euler;
  openAngle: number; // How wide the book opens (radians)
  pageCount: number;
}

export const DEFAULT_SPELLBOOK_CONFIG: SpellbookConfig = {
  // Position relative to FirstPersonHands group which is at (0.3, -0.4, -0.6)
  // So to get to left side at (-0.3, -0.4, -0.6) we need offset of (-0.6, 0, 0)
  positionOffset: new THREE.Vector3(-0.6, 0.1, 0.1),
  // Tilt book toward player so pages are readable, rotated to face camera
  baseRotation: new THREE.Euler(-1.2, 0.0, 0.0),
  openAngle: Math.PI * 0.75, // 135 degrees each cover - wide open
  pageCount: 8,
};

export interface SpellbookPage {
  type: 'minion' | 'building';
  id: string;
  name: string;
}

export const SPELLBOOK_PAGES: SpellbookPage[] = [
  { type: 'minion', id: 'goblin', name: 'Goblin' },
  { type: 'minion', id: 'penguin', name: 'Penguin' },
  { type: 'minion', id: 'mushroom', name: 'Mushroom' },
  { type: 'building', id: 'cottage', name: 'Cottage' },
  { type: 'building', id: 'workshop', name: 'Workshop' },
  { type: 'building', id: 'laboratory', name: 'Laboratory' },
  { type: 'building', id: 'market', name: 'Market' },
  { type: 'building', id: 'manor', name: 'Manor' },
];

/**
 * First-person spellbook for selecting minions and buildings
 */
export class FirstPersonSpellbook {
  private config: SpellbookConfig;
  private group: THREE.Group;

  // Book components
  private bookGroup!: THREE.Group;
  private leftCover!: THREE.Group;
  private rightCover!: THREE.Group;
  private spine!: THREE.Mesh;
  private pages!: THREE.Group;
  private turningPage!: THREE.Group;

  // Preview mesh holder
  private previewContainer!: THREE.Group;
  private currentPreview: THREE.Object3D | null = null;
  private previewLight!: THREE.PointLight;

  // Hand holding the book
  private hand!: THREE.Group;

  // State
  private isOpen: boolean = false;
  private openProgress: number = 0; // 0 = closed, 1 = open
  private currentPageIndex: number = 0;
  private isAnimatingPage: boolean = false;
  private pageAnimationProgress: number = 0;
  private pageAnimationDirection: 1 | -1 = 1;

  // Animation
  private previewRotation: number = 0;
  private bobPhase: number = 0;

  constructor(config: Partial<SpellbookConfig> = {}) {
    this.config = {
      ...DEFAULT_SPELLBOOK_CONFIG,
      ...config,
      positionOffset: config.positionOffset || DEFAULT_SPELLBOOK_CONFIG.positionOffset.clone(),
      baseRotation: config.baseRotation || DEFAULT_SPELLBOOK_CONFIG.baseRotation.clone(),
    };

    this.group = new THREE.Group();
    this.group.visible = false;

    this.createBook();
    this.createHand();
    this.createPreviewContainer();

    this.group.position.copy(this.config.positionOffset);
    this.group.rotation.copy(this.config.baseRotation);
  }

  private createBook(): void {
    this.bookGroup = new THREE.Group();

    // Book dimensions - scaled up 2.5x for visibility
    const coverWidth = 0.30;
    const coverHeight = 0.40;
    const coverDepth = 0.02;
    const spineWidth = 0.05;

    // Materials
    const coverMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1a3a, // Dark purple leather
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x1a0a2a,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x996600,
      emissiveIntensity: 0.3,
    });

    const pageMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e0, // Parchment
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    // Spine (center pivot point)
    const spineGeometry = new THREE.BoxGeometry(spineWidth, coverHeight, coverDepth * 2);
    this.spine = new THREE.Mesh(spineGeometry, coverMaterial);
    this.bookGroup.add(this.spine);

    // Left cover (opens to the left)
    this.leftCover = new THREE.Group();
    this.leftCover.position.x = -spineWidth / 2;

    const leftCoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(coverWidth, coverHeight, coverDepth),
      coverMaterial
    );
    leftCoverMesh.position.x = -coverWidth / 2;
    this.leftCover.add(leftCoverMesh);

    // Gold corner decorations on left cover
    this.addCornerDecorations(leftCoverMesh, goldMaterial, coverWidth, coverHeight);

    this.bookGroup.add(this.leftCover);

    // Right cover (opens to the right)
    this.rightCover = new THREE.Group();
    this.rightCover.position.x = spineWidth / 2;

    const rightCoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(coverWidth, coverHeight, coverDepth),
      coverMaterial
    );
    rightCoverMesh.position.x = coverWidth / 2;
    this.rightCover.add(rightCoverMesh);

    // Gold corner decorations on right cover
    this.addCornerDecorations(rightCoverMesh, goldMaterial, coverWidth, coverHeight);

    // Gold clasp on right cover (visible when closed)
    const claspGeometry = new THREE.BoxGeometry(0.015, 0.025, 0.005);
    const clasp = new THREE.Mesh(claspGeometry, goldMaterial);
    clasp.position.set(coverWidth + 0.005, 0, 0.005);
    this.rightCover.add(clasp);

    this.bookGroup.add(this.rightCover);

    // Page block (visible between covers when open)
    this.pages = new THREE.Group();

    // Left page surface
    const leftPageGeometry = new THREE.PlaneGeometry(coverWidth * 0.9, coverHeight * 0.9);
    const leftPage = new THREE.Mesh(leftPageGeometry, pageMaterial);
    leftPage.position.set(-coverWidth / 2 - spineWidth / 2, 0, 0.001);
    this.pages.add(leftPage);

    // Right page surface
    const rightPageGeometry = new THREE.PlaneGeometry(coverWidth * 0.9, coverHeight * 0.9);
    const rightPage = new THREE.Mesh(rightPageGeometry, pageMaterial);
    rightPage.position.set(coverWidth / 2 + spineWidth / 2, 0, 0.001);
    this.pages.add(rightPage);

    // Page edges (stack of pages visible from side)
    const pageStackGeometry = new THREE.BoxGeometry(coverWidth * 0.9, coverHeight * 0.85, 0.015);
    const pageStackLeft = new THREE.Mesh(pageStackGeometry, pageMaterial);
    pageStackLeft.position.set(-coverWidth / 2 - spineWidth / 2, 0, -0.005);
    this.pages.add(pageStackLeft);

    const pageStackRight = new THREE.Mesh(pageStackGeometry, pageMaterial);
    pageStackRight.position.set(coverWidth / 2 + spineWidth / 2, 0, -0.005);
    this.pages.add(pageStackRight);

    this.pages.visible = false; // Only visible when open
    this.bookGroup.add(this.pages);

    // Turning page (animated during page turn)
    this.turningPage = new THREE.Group();
    this.turningPage.position.x = spineWidth / 2;

    const turningPageGeometry = new THREE.PlaneGeometry(coverWidth * 0.88, coverHeight * 0.88);
    const turningPageMesh = new THREE.Mesh(turningPageGeometry, pageMaterial.clone());
    turningPageMesh.position.x = coverWidth / 2;
    this.turningPage.add(turningPageMesh);

    // Back of turning page
    const turningPageBack = new THREE.Mesh(turningPageGeometry, pageMaterial.clone());
    turningPageBack.position.x = coverWidth / 2;
    turningPageBack.rotation.y = Math.PI;
    this.turningPage.add(turningPageBack);

    this.turningPage.visible = false;
    this.bookGroup.add(this.turningPage);

    this.group.add(this.bookGroup);
  }

  private addCornerDecorations(
    cover: THREE.Mesh,
    material: THREE.Material,
    width: number,
    height: number
  ): void {
    const cornerSize = 0.015;
    const cornerGeometry = new THREE.BoxGeometry(cornerSize, cornerSize, 0.003);

    const positions = [
      { x: -width / 2 + cornerSize / 2, y: height / 2 - cornerSize / 2 },
      { x: width / 2 - cornerSize / 2, y: height / 2 - cornerSize / 2 },
      { x: -width / 2 + cornerSize / 2, y: -height / 2 + cornerSize / 2 },
      { x: width / 2 - cornerSize / 2, y: -height / 2 + cornerSize / 2 },
    ];

    for (const pos of positions) {
      const corner = new THREE.Mesh(cornerGeometry, material);
      corner.position.set(pos.x, pos.y, 0.005);
      cover.add(corner);
    }

    // Center emblem
    const emblemGeometry = new THREE.CircleGeometry(0.018, 6);
    const emblem = new THREE.Mesh(emblemGeometry, material);
    emblem.position.z = 0.005;
    cover.add(emblem);
  }

  private createHand(): void {
    this.hand = new THREE.Group();

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0,
    });

    // Simple hand shape supporting the book from below
    const palmGeometry = new THREE.SphereGeometry(0.04, 8, 6);
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    palm.scale.set(1.3, 0.7, 1.0);
    palm.position.set(0, -0.1, 0.02);
    this.hand.add(palm);

    // Sleeve cuff
    const cuffGeometry = new THREE.CylinderGeometry(0.045, 0.055, 0.08, 8);
    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1b4e,
      roughness: 0.9,
      metalness: 0,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.set(0, -0.15, 0.02);
    cuff.rotation.x = 0.2;
    this.hand.add(cuff);

    this.group.add(this.hand);
  }

  private createPreviewContainer(): void {
    this.previewContainer = new THREE.Group();
    // Position above the right page - since book is tilted back, "up" is more in +Z direction
    this.previewContainer.position.set(0.15, 0.08, 0.28);
    // Counter-rotate to tilt preview upward toward viewer (compensate for book tilt)
    this.previewContainer.rotation.x = 1.0;
    this.previewContainer.visible = false;

    // Magical glow light for preview
    this.previewLight = new THREE.PointLight(0x9966ff, 1.0, 0.5);
    this.previewLight.position.set(0, 0.05, 0);
    this.previewContainer.add(this.previewLight);

    this.group.add(this.previewContainer);
  }

  getObject(): THREE.Group {
    return this.group;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  isVisible(): boolean {
    return this.group.visible;
  }

  /**
   * Open or close the spellbook
   */
  setOpen(open: boolean): void {
    this.isOpen = open;
  }

  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Turn to the next or previous page
   */
  turnPage(direction: 1 | -1): boolean {
    if (this.isAnimatingPage) return false;
    if (!this.isOpen || this.openProgress < 0.95) return false;

    const newIndex = this.currentPageIndex + direction;
    if (newIndex < 0 || newIndex >= SPELLBOOK_PAGES.length) return false;

    this.isAnimatingPage = true;
    this.pageAnimationProgress = 0;
    this.pageAnimationDirection = direction;
    this.turningPage.visible = true;
    this.turningPage.rotation.y = direction === 1 ? 0 : -Math.PI;

    return true;
  }

  getCurrentPage(): SpellbookPage {
    return SPELLBOOK_PAGES[this.currentPageIndex];
  }

  getCurrentPageIndex(): number {
    return this.currentPageIndex;
  }

  getPageCount(): number {
    return SPELLBOOK_PAGES.length;
  }

  /**
   * Set the preview mesh to display above the book
   */
  setPreviewMesh(mesh: THREE.Object3D | null): void {
    // Remove old preview
    if (this.currentPreview) {
      this.previewContainer.remove(this.currentPreview);
      this.currentPreview = null;
    }

    // Add new preview
    if (mesh) {
      this.currentPreview = mesh;
      this.previewContainer.add(mesh);
      this.previewContainer.visible = true;
    } else {
      this.previewContainer.visible = false;
    }
  }

  getPreviewContainer(): THREE.Group {
    return this.previewContainer;
  }

  /**
   * Check if currently animating
   */
  isAnimating(): boolean {
    return this.isAnimatingPage || (this.isOpen && this.openProgress < 1) || (!this.isOpen && this.openProgress > 0);
  }

  /**
   * Update animation state
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Open/close animation
    const targetOpen = this.isOpen ? 1 : 0;
    const openSpeed = 3.0; // Opens/closes in ~0.33s

    if (Math.abs(this.openProgress - targetOpen) > 0.001) {
      this.openProgress = THREE.MathUtils.lerp(
        this.openProgress,
        targetOpen,
        deltaTime * openSpeed
      );

      // Animate covers
      const angle = this.config.openAngle * this.openProgress;
      this.leftCover.rotation.y = angle;
      this.rightCover.rotation.y = -angle;

      // Show pages when opening
      this.pages.visible = this.openProgress > 0.3;
      this.previewContainer.visible = this.openProgress > 0.5 && this.currentPreview !== null;
    }

    // Page turn animation
    if (this.isAnimatingPage) {
      const turnSpeed = 4.0; // Page turns in ~0.25s
      this.pageAnimationProgress += deltaTime * turnSpeed;

      if (this.pageAnimationProgress >= 1) {
        // Animation complete
        this.isAnimatingPage = false;
        this.turningPage.visible = false;
        this.currentPageIndex += this.pageAnimationDirection;
        this.pageAnimationProgress = 0;
      } else {
        // Animate the turning page
        const progress = this.easeInOutCubic(this.pageAnimationProgress);
        if (this.pageAnimationDirection === 1) {
          // Turning forward: rotate from 0 to -PI
          this.turningPage.rotation.y = -Math.PI * progress;
        } else {
          // Turning backward: rotate from -PI to 0
          this.turningPage.rotation.y = -Math.PI * (1 - progress);
        }

        // Add slight curve effect by adjusting position
        const curvePeak = Math.sin(progress * Math.PI);
        this.turningPage.position.z = curvePeak * 0.02;
        this.turningPage.position.y = curvePeak * 0.01;
      }
    }

    // Preview rotation
    if (this.currentPreview && this.previewContainer.visible) {
      this.previewRotation += deltaTime * 1.5; // Slow spin
      this.currentPreview.rotation.y = this.previewRotation;

      // Gentle bob
      this.bobPhase += deltaTime * 2;
      this.currentPreview.position.y = Math.sin(this.bobPhase) * 0.008;

      // Pulsing light
      const pulse = 0.8 + Math.sin(elapsedTime * 3) * 0.2;
      this.previewLight.intensity = pulse;
    }

    // Idle animation when open
    if (this.isOpen && this.openProgress > 0.9 && !this.isAnimatingPage) {
      // Gentle floating motion
      const float = Math.sin(elapsedTime * 1.2) * 0.003;
      this.bookGroup.position.y = float;

      // Subtle rotation sway
      const sway = Math.sin(elapsedTime * 0.8) * 0.02;
      this.bookGroup.rotation.z = sway;
    } else {
      this.bookGroup.position.y = 0;
      this.bookGroup.rotation.z = 0;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
    });
  }
}
