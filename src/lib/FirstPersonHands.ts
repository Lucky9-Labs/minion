import * as THREE from 'three';

export interface FirstPersonHandsConfig {
  // Position offset from camera
  positionOffset: THREE.Vector3;
  // Base rotation of the staff
  baseRotation: THREE.Euler;
  // Sway intensity
  swayIntensity: number;
  // Bob intensity when moving
  bobIntensity: number;
}

export const DEFAULT_HANDS_CONFIG: FirstPersonHandsConfig = {
  // Position in lower-right of view, staff tilted forward
  positionOffset: new THREE.Vector3(0.3, -0.4, -0.6),
  baseRotation: new THREE.Euler(-0.7, -0.2, 0.1),
  swayIntensity: 0.15,
  bobIntensity: 0.03,
};

/**
 * Creates a first-person viewmodel with wizard staff and hands
 */
export class FirstPersonHands {
  private config: FirstPersonHandsConfig;
  private group: THREE.Group;
  private staff: THREE.Group;
  private orbLight: THREE.PointLight;
  private floatingGem: THREE.Mesh;
  private gemGlow: THREE.Mesh;

  // Animation state
  private targetSwayX: number = 0;
  private targetSwayY: number = 0;
  private currentSwayX: number = 0;
  private currentSwayY: number = 0;
  private bobPhase: number = 0;
  private bobAmount: number = 0;
  private gemRotation: number = 0;

  constructor(config: Partial<FirstPersonHandsConfig> = {}) {
    this.config = {
      ...DEFAULT_HANDS_CONFIG,
      ...config,
      positionOffset: config.positionOffset || DEFAULT_HANDS_CONFIG.positionOffset.clone(),
      baseRotation: config.baseRotation || DEFAULT_HANDS_CONFIG.baseRotation.clone(),
    };

    this.group = new THREE.Group();
    this.staff = this.createStaff();
    this.group.add(this.staff);

    // Add ambient gem light
    this.orbLight = new THREE.PointLight(0x9966ff, 0.8, 4);
    this.orbLight.position.set(0, 0.55, 0);
    this.staff.add(this.orbLight);

    // Apply base position and rotation
    this.group.position.copy(this.config.positionOffset);
    this.staff.rotation.copy(this.config.baseRotation);
  }

  private createStaff(): THREE.Group {
    const staffGroup = new THREE.Group();

    // Thin elegant staff shaft - ends at the gem
    const shaftGeometry = new THREE.CylinderGeometry(0.015, 0.022, 0.65, 6);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.6,
      metalness: 0.2,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.1;
    staffGroup.add(shaft);

    // Single decorative gold ring near top
    const ringGeometry = new THREE.TorusGeometry(0.025, 0.005, 6, 12);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x553300,
      emissiveIntensity: 0.2,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.38;
    staffGroup.add(ring);

    // Prongs to cradle the gem (3 curved prongs)
    const prongMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.8,
    });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const prongGeometry = new THREE.CylinderGeometry(0.004, 0.006, 0.12, 4);
      const prong = new THREE.Mesh(prongGeometry, prongMaterial);
      prong.position.set(
        Math.cos(angle) * 0.02,
        0.44,
        Math.sin(angle) * 0.02
      );
      prong.rotation.x = Math.cos(angle) * 0.4;
      prong.rotation.z = -Math.sin(angle) * 0.4;
      staffGroup.add(prong);
    }

    // Floating gem (octahedron for crystal look) - positioned lower for visibility
    const gemGeometry = new THREE.OctahedronGeometry(0.06, 0);
    const gemMaterial = new THREE.MeshStandardMaterial({
      color: 0x9966ff,
      emissive: 0x6633cc,
      emissiveIntensity: 1.0,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
    });
    this.floatingGem = new THREE.Mesh(gemGeometry, gemMaterial);
    this.floatingGem.position.y = 0.55;
    staffGroup.add(this.floatingGem);

    // Gem glow effect
    const glowGeometry = new THREE.SphereGeometry(0.12, 12, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x9966ff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    });
    this.gemGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.gemGlow.position.y = 0.55;
    staffGroup.add(this.gemGlow);

    // Simple blob hand (just a rounded shape gripping the staff)
    const handGroup = this.createHand();
    handGroup.position.set(0.01, 0.12, 0.02);
    handGroup.rotation.set(0.1, 0.2, -0.05);
    staffGroup.add(handGroup);

    return staffGroup;
  }

  private createHand(): THREE.Group {
    const hand = new THREE.Group();

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Simple rounded blob for the gripping hand
    const gripGeometry = new THREE.SphereGeometry(0.045, 8, 6);
    const grip = new THREE.Mesh(gripGeometry, skinMaterial);
    grip.scale.set(1.2, 0.9, 1.0);
    hand.add(grip);

    // Sleeve cuff (purple robe)
    const cuffGeometry = new THREE.CylinderGeometry(0.05, 0.065, 0.1, 8);
    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1b4e,
      roughness: 0.9,
      metalness: 0.0,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.set(0, -0.07, 0);
    hand.add(cuff);

    return hand;
  }

  /**
   * Get the root group to add to camera
   */
  getObject(): THREE.Group {
    return this.group;
  }

  /**
   * Set sway from mouse movement
   */
  setSway(deltaX: number, deltaY: number): void {
    this.targetSwayX = THREE.MathUtils.clamp(deltaX * this.config.swayIntensity, -0.15, 0.15);
    this.targetSwayY = THREE.MathUtils.clamp(deltaY * this.config.swayIntensity, -0.1, 0.1);
  }

  /**
   * Set bob amount based on movement speed
   */
  setBobbing(isMoving: boolean, speed: number = 1): void {
    this.bobAmount = isMoving ? this.config.bobIntensity * speed : 0;
  }

  /**
   * Update animation state
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Smooth sway interpolation
    this.currentSwayX = THREE.MathUtils.lerp(this.currentSwayX, this.targetSwayX, deltaTime * 8);
    this.currentSwayY = THREE.MathUtils.lerp(this.currentSwayY, this.targetSwayY, deltaTime * 8);

    // Decay target sway back to zero
    this.targetSwayX *= 0.95;
    this.targetSwayY *= 0.95;

    // Apply sway to staff rotation
    this.staff.rotation.y = this.config.baseRotation.y + this.currentSwayX;
    this.staff.rotation.x = this.config.baseRotation.x + this.currentSwayY;

    // Bob animation
    if (this.bobAmount > 0.001) {
      this.bobPhase += deltaTime * 12;
      const bob = Math.sin(this.bobPhase) * this.bobAmount;
      this.group.position.y = this.config.positionOffset.y + bob;
      // Slight horizontal sway when moving
      this.group.position.x = this.config.positionOffset.x + Math.cos(this.bobPhase * 0.5) * this.bobAmount * 0.3;
    } else {
      // Gentle idle sway
      const idleSway = Math.sin(elapsedTime * 1.5) * 0.003;
      this.group.position.y = this.config.positionOffset.y + idleSway;
    }

    // Spin the floating gem
    this.gemRotation += deltaTime * 2.5;
    this.floatingGem.rotation.y = this.gemRotation;
    // Add gentle floating motion
    this.floatingGem.position.y = 0.55 + Math.sin(elapsedTime * 2) * 0.015;

    // Gem glow pulsing
    const pulse = 0.15 + Math.sin(elapsedTime * 2.5) * 0.08;
    (this.gemGlow.material as THREE.MeshBasicMaterial).opacity = pulse;

    // Light intensity variation synced with gem
    this.orbLight.intensity = 0.6 + Math.sin(elapsedTime * 2.5) * 0.2;
  }

  /**
   * Show/hide the hands
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Dispose of resources
   */
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
