import * as THREE from 'three';

/**
 * First-person viewmodel for Golem possession mode.
 * Shows two large rocky hands with crystal accents.
 */

export interface GolemHandsConfig {
  leftOffset: THREE.Vector3;
  rightOffset: THREE.Vector3;
  swayIntensity: number;
  bobIntensity: number;
}

export const DEFAULT_GOLEM_HANDS_CONFIG: GolemHandsConfig = {
  // Hands positioned lower-left and lower-right of view
  leftOffset: new THREE.Vector3(-0.6, -0.6, -0.8),
  rightOffset: new THREE.Vector3(0.6, -0.6, -0.8),
  swayIntensity: 0.08, // Less sway - heavy hands
  bobIntensity: 0.1,   // More bob - stompy movement
};

// Golem color palette (same as GolemEntity)
const GOLEM_COLORS = {
  rockBase: 0x5c5247,
  rockDark: 0x4a433b,
  rockLight: 0x6e6459,
  crystalOrange: 0xff6b35,
  crystalBlue: 0x4da6ff,
};

export class GolemFirstPersonHands {
  private config: GolemHandsConfig;
  private group: THREE.Group;
  private leftHand: THREE.Group;
  private rightHand: THREE.Group;

  // Animation state
  private targetSwayX: number = 0;
  private targetSwayY: number = 0;
  private currentSwayX: number = 0;
  private currentSwayY: number = 0;
  private bobPhase: number = 0;
  private bobAmount: number = 0;
  private isMoving: boolean = false;

  constructor(config: Partial<GolemHandsConfig> = {}) {
    this.config = {
      ...DEFAULT_GOLEM_HANDS_CONFIG,
      ...config,
      leftOffset: config.leftOffset || DEFAULT_GOLEM_HANDS_CONFIG.leftOffset.clone(),
      rightOffset: config.rightOffset || DEFAULT_GOLEM_HANDS_CONFIG.rightOffset.clone(),
    };

    this.group = new THREE.Group();

    // Create left hand
    this.leftHand = this.createHand('left');
    this.leftHand.position.copy(this.config.leftOffset);
    this.leftHand.rotation.set(0.3, 0.4, 0.2); // Angled inward
    this.group.add(this.leftHand);

    // Create right hand
    this.rightHand = this.createHand('right');
    this.rightHand.position.copy(this.config.rightOffset);
    this.rightHand.rotation.set(0.3, -0.4, -0.2); // Angled inward (mirrored)
    this.group.add(this.rightHand);
  }

  private createHand(side: 'left' | 'right'): THREE.Group {
    const hand = new THREE.Group();
    const mirror = side === 'right' ? -1 : 1;

    // Rock material with flat shading for angular look
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: GOLEM_COLORS.rockBase,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });

    const rockDarkMaterial = new THREE.MeshStandardMaterial({
      color: GOLEM_COLORS.rockDark,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });

    // Main palm - chunky box
    const palmGeometry = new THREE.BoxGeometry(0.25, 0.18, 0.12);
    // Slightly randomize vertices for organic rock feel
    const positions = palmGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * 0.02);
      positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * 0.02);
      positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * 0.02);
    }
    palmGeometry.computeVertexNormals();

    const palm = new THREE.Mesh(palmGeometry, rockMaterial);
    hand.add(palm);

    // Fingers - three chunky stone digits
    const fingerPositions = [
      { x: 0.08 * mirror, y: -0.03, length: 0.15 },
      { x: 0, y: -0.05, length: 0.17 },
      { x: -0.08 * mirror, y: -0.03, length: 0.13 },
    ];

    fingerPositions.forEach((pos, i) => {
      const fingerGeo = new THREE.BoxGeometry(0.05, pos.length, 0.05);
      const finger = new THREE.Mesh(fingerGeo, i === 1 ? rockMaterial : rockDarkMaterial);
      finger.position.set(pos.x, pos.y - pos.length / 2, 0.06);
      finger.rotation.x = 0.3; // Slightly curled
      hand.add(finger);
    });

    // Thumb - positioned on the side
    const thumbGeo = new THREE.BoxGeometry(0.04, 0.1, 0.04);
    const thumb = new THREE.Mesh(thumbGeo, rockDarkMaterial);
    thumb.position.set(0.12 * mirror, 0, 0.04);
    thumb.rotation.z = -0.5 * mirror;
    thumb.rotation.x = 0.2;
    hand.add(thumb);

    // Crystal accent on knuckles
    const crystalColor = side === 'left' ? GOLEM_COLORS.crystalBlue : GOLEM_COLORS.crystalOrange;
    const crystalMaterial = new THREE.MeshStandardMaterial({
      color: crystalColor,
      emissive: crystalColor,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
    });

    const crystalGeo = new THREE.OctahedronGeometry(0.03, 0);
    const crystal = new THREE.Mesh(crystalGeo, crystalMaterial);
    crystal.position.set(0, 0.08, 0.07);
    crystal.rotation.set(0.3, 0.5, 0);
    hand.add(crystal);

    // Add a small point light from the crystal
    const crystalLight = new THREE.PointLight(crystalColor, 0.3, 1);
    crystalLight.position.copy(crystal.position);
    hand.add(crystalLight);

    return hand;
  }

  /**
   * Get the Three.js object to add to camera
   */
  getObject(): THREE.Group {
    return this.group;
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Set sway from mouse movement
   */
  setSway(deltaX: number, deltaY: number): void {
    this.targetSwayX = -deltaX * 0.001 * this.config.swayIntensity;
    this.targetSwayY = -deltaY * 0.001 * this.config.swayIntensity;
  }

  /**
   * Set bobbing state from movement
   */
  setBobbing(isMoving: boolean, speed: number = 1): void {
    this.isMoving = isMoving;
    this.bobAmount = isMoving ? Math.min(speed / 3, 1) : 0;
  }

  /**
   * Sync step phase from golem camera controller
   */
  setStepPhase(phase: number): void {
    this.bobPhase = phase * Math.PI * 2;
  }

  /**
   * Update animation each frame
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Smooth sway interpolation (slower for heavy hands)
    this.currentSwayX = THREE.MathUtils.lerp(this.currentSwayX, this.targetSwayX, deltaTime * 4);
    this.currentSwayY = THREE.MathUtils.lerp(this.currentSwayY, this.targetSwayY, deltaTime * 4);

    // Decay target sway
    this.targetSwayX *= 0.9;
    this.targetSwayY *= 0.9;

    // Update bob phase when moving
    if (this.isMoving) {
      // Bob is synced externally via setStepPhase, but add some continuous motion
      this.bobPhase += deltaTime * 3;
    }

    // Calculate bob offset (heavier, more pronounced)
    const bobY = Math.sin(this.bobPhase) * this.config.bobIntensity * this.bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * this.config.bobIntensity * 0.3 * this.bobAmount;

    // Apply to left hand
    this.leftHand.position.x = this.config.leftOffset.x + this.currentSwayX + bobX;
    this.leftHand.position.y = this.config.leftOffset.y + this.currentSwayY + bobY;

    // Apply to right hand (opposite phase for alternating movement)
    this.rightHand.position.x = this.config.rightOffset.x + this.currentSwayX - bobX;
    this.rightHand.position.y = this.config.rightOffset.y + this.currentSwayY - bobY;

    // Subtle rotation sway
    this.leftHand.rotation.z = 0.2 + this.currentSwayX * 2 + bobX * 0.5;
    this.rightHand.rotation.z = -0.2 + this.currentSwayX * 2 - bobX * 0.5;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
