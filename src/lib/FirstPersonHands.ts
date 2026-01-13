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
  positionOffset: new THREE.Vector3(0.35, -0.35, -0.6),
  baseRotation: new THREE.Euler(0.3, -0.2, 0.1),
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
  private orbGlow: THREE.Mesh;

  // Animation state
  private targetSwayX: number = 0;
  private targetSwayY: number = 0;
  private currentSwayX: number = 0;
  private currentSwayY: number = 0;
  private bobPhase: number = 0;
  private bobAmount: number = 0;

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

    // Add ambient orb light
    this.orbLight = new THREE.PointLight(0x6366f1, 0.5, 3);
    this.orbLight.position.set(0, 0.9, 0);
    this.staff.add(this.orbLight);

    // Create glow effect
    this.orbGlow = this.createOrbGlow();
    this.staff.add(this.orbGlow);

    // Apply base position and rotation
    this.group.position.copy(this.config.positionOffset);
    this.staff.rotation.copy(this.config.baseRotation);
  }

  private createStaff(): THREE.Group {
    const staffGroup = new THREE.Group();

    // Staff shaft - wooden texture appearance
    const shaftGeometry = new THREE.CylinderGeometry(0.025, 0.035, 1.0, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.8,
      metalness: 0.1,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 0.4;
    staffGroup.add(shaft);

    // Decorative rings
    const ringGeometry = new THREE.TorusGeometry(0.04, 0.008, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      roughness: 0.3,
      metalness: 0.8,
    });

    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.85;
    staffGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.75;
    staffGroup.add(ring2);

    // Crystal orb at top
    const orbGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const orbMaterial = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9,
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 0.95;
    staffGroup.add(orb);

    // Inner orb glow
    const innerOrbGeometry = new THREE.SphereGeometry(0.05, 12, 12);
    const innerOrbMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.6,
    });
    const innerOrb = new THREE.Mesh(innerOrbGeometry, innerOrbMaterial);
    innerOrb.position.y = 0.95;
    staffGroup.add(innerOrb);

    // Simple hand (low poly stylized)
    const handGroup = this.createHand();
    handGroup.position.set(0.02, 0.15, 0.03);
    handGroup.rotation.set(0.2, 0.3, -0.1);
    staffGroup.add(handGroup);

    return staffGroup;
  }

  private createHand(): THREE.Group {
    const hand = new THREE.Group();

    // Palm
    const palmGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.03);
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574, // Skin tone
      roughness: 0.7,
      metalness: 0.0,
    });
    const palm = new THREE.Mesh(palmGeometry, skinMaterial);
    hand.add(palm);

    // Fingers (simplified as cylinders wrapping around staff)
    const fingerGeometry = new THREE.CylinderGeometry(0.012, 0.01, 0.06, 6);

    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
      finger.position.set(-0.02 + i * 0.015, 0.05, 0.02);
      finger.rotation.x = Math.PI / 3;
      finger.rotation.z = -0.1 + i * 0.05;
      hand.add(finger);
    }

    // Thumb
    const thumb = new THREE.Mesh(fingerGeometry, skinMaterial);
    thumb.position.set(0.04, 0.02, 0.01);
    thumb.rotation.x = Math.PI / 4;
    thumb.rotation.z = Math.PI / 3;
    hand.add(thumb);

    // Sleeve cuff
    const cuffGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8);
    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1b4e, // Purple robe
      roughness: 0.9,
      metalness: 0.0,
    });
    const cuff = new THREE.Mesh(cuffGeometry, cuffMaterial);
    cuff.position.set(0, -0.08, 0);
    hand.add(cuff);

    return hand;
  }

  private createOrbGlow(): THREE.Mesh {
    const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.95;
    return glow;
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

    // Orb glow pulsing
    const pulse = 0.15 + Math.sin(elapsedTime * 2) * 0.05;
    (this.orbGlow.material as THREE.MeshBasicMaterial).opacity = pulse;

    // Light intensity variation
    this.orbLight.intensity = 0.4 + Math.sin(elapsedTime * 3) * 0.1;
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
