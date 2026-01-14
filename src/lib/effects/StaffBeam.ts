import * as THREE from 'three';

export type BeamMode = 'idle' | 'aiming' | 'grabbing' | 'drawing';

interface BeamConfig {
  aimingColor: number;
  grabbingColor: number;
  drawingColor: number;
  aimingOpacity: number;
  grabbingOpacity: number;
  drawingOpacity: number;
  particleCount: number;
}

const DEFAULT_BEAM_CONFIG: BeamConfig = {
  aimingColor: 0x9966ff,
  grabbingColor: 0xffcc00,
  drawingColor: 0x66ccff,
  aimingOpacity: 0.3,
  grabbingOpacity: 0.8,
  drawingOpacity: 0.6,
  particleCount: 20,
};

export class StaffBeam {
  private config: BeamConfig;
  private group: THREE.Group;
  private line: THREE.Line;
  private lineMaterial: THREE.LineBasicMaterial;
  private particles: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;

  private mode: BeamMode = 'idle';
  private startPoint: THREE.Vector3 = new THREE.Vector3();
  private endPoint: THREE.Vector3 = new THREE.Vector3();
  private isVisible: boolean = false;

  // Particle animation state
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;

  constructor(config?: Partial<BeamConfig>) {
    this.config = { ...DEFAULT_BEAM_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.renderOrder = 999;

    // Create beam line
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: this.config.aimingColor,
      transparent: true,
      opacity: this.config.aimingOpacity,
      linewidth: 2,
      depthTest: false,
    });

    this.line = new THREE.Line(lineGeometry, this.lineMaterial);
    this.line.frustumCulled = false;
    this.group.add(this.line);

    // Create particles for beam effects
    this.particlePositions = new Float32Array(this.config.particleCount * 3);
    this.particleVelocities = new Float32Array(this.config.particleCount * 3);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: this.config.grabbingColor,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.group.add(this.particles);

    // Initialize particle positions
    this.initParticles();

    this.group.visible = false;
  }

  private initParticles(): void {
    for (let i = 0; i < this.config.particleCount; i++) {
      const i3 = i * 3;
      this.particlePositions[i3] = 0;
      this.particlePositions[i3 + 1] = 0;
      this.particlePositions[i3 + 2] = 0;

      this.particleVelocities[i3] = (Math.random() - 0.5) * 0.1;
      this.particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
      this.particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
    }
  }

  setEndpoints(start: THREE.Vector3, end: THREE.Vector3): void {
    this.startPoint.copy(start);
    this.endPoint.copy(end);

    const positions = this.line.geometry.attributes.position.array as Float32Array;
    positions[0] = start.x;
    positions[1] = start.y;
    positions[2] = start.z;
    positions[3] = end.x;
    positions[4] = end.y;
    positions[5] = end.z;
    this.line.geometry.attributes.position.needsUpdate = true;
  }

  setMode(mode: BeamMode): void {
    this.mode = mode;

    switch (mode) {
      case 'aiming':
        this.lineMaterial.color.setHex(this.config.aimingColor);
        this.lineMaterial.opacity = this.config.aimingOpacity;
        this.particleMaterial.opacity = 0.3;
        this.particleMaterial.size = 0.05;
        break;
      case 'grabbing':
        this.lineMaterial.color.setHex(this.config.grabbingColor);
        this.lineMaterial.opacity = this.config.grabbingOpacity;
        this.particleMaterial.color.setHex(this.config.grabbingColor);
        this.particleMaterial.opacity = 0.8;
        this.particleMaterial.size = 0.15;
        break;
      case 'drawing':
        this.lineMaterial.color.setHex(this.config.drawingColor);
        this.lineMaterial.opacity = this.config.drawingOpacity;
        this.particleMaterial.color.setHex(this.config.drawingColor);
        this.particleMaterial.opacity = 0.6;
        this.particleMaterial.size = 0.1;
        break;
      case 'idle':
      default:
        this.lineMaterial.opacity = 0;
        this.particleMaterial.opacity = 0;
        break;
    }
  }

  setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.group.visible = visible && this.mode !== 'idle';
  }

  update(deltaTime: number): void {
    if (!this.isVisible || this.mode === 'idle') return;

    // Update particles along the beam
    const beamDirection = this.endPoint.clone().sub(this.startPoint);
    const beamLength = beamDirection.length();
    beamDirection.normalize();

    for (let i = 0; i < this.config.particleCount; i++) {
      const i3 = i * 3;

      // Move particle along beam with some randomness
      let t = (i / this.config.particleCount + deltaTime * 2) % 1;

      // Interpolate position along beam
      const basePos = this.startPoint.clone().add(beamDirection.clone().multiplyScalar(t * beamLength));

      // Add some perpendicular wobble
      const perpX = Math.sin(t * Math.PI * 4 + Date.now() * 0.01) * 0.1;
      const perpY = Math.cos(t * Math.PI * 4 + Date.now() * 0.01) * 0.1;

      this.particlePositions[i3] = basePos.x + perpX;
      this.particlePositions[i3 + 1] = basePos.y + perpY;
      this.particlePositions[i3 + 2] = basePos.z;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;

    // Pulse effect based on mode
    if (this.mode === 'grabbing') {
      const pulse = 0.6 + Math.sin(Date.now() * 0.01) * 0.2;
      this.lineMaterial.opacity = pulse;
    }
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  dispose(): void {
    this.line.geometry.dispose();
    this.lineMaterial.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
  }
}
