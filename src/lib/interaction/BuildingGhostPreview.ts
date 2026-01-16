import * as THREE from 'three';

/**
 * Renders a transparent purple mesh showing where a building will be placed
 */
export class BuildingGhostPreview {
  private group: THREE.Group;
  private ghostMesh: THREE.Mesh | null = null;
  private outlineMesh: THREE.LineSegments | null = null;

  // Materials
  private ghostMaterial: THREE.MeshBasicMaterial;
  private outlineMaterial: THREE.LineBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;

    // Purple transparent fill
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Brighter purple outline
    this.outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.8,
    });
  }

  /**
   * Set the footprint size for the ghost preview
   */
  setFootprint(width: number, depth: number, height: number = 2): void {
    // Remove existing meshes
    this.clearMeshes();

    // Create box geometry for the ghost
    const geometry = new THREE.BoxGeometry(width, height, depth);

    // Create ghost mesh
    this.ghostMesh = new THREE.Mesh(geometry, this.ghostMaterial);
    this.ghostMesh.position.y = height / 2; // Center vertically
    this.group.add(this.ghostMesh);

    // Create outline using EdgesGeometry
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    this.outlineMesh = new THREE.LineSegments(edgesGeometry, this.outlineMaterial);
    this.outlineMesh.position.y = height / 2;
    this.group.add(this.outlineMesh);
  }

  /**
   * Update the position of the ghost preview
   */
  setPosition(x: number, z: number): void {
    this.group.position.x = x;
    this.group.position.z = z;
    this.group.position.y = 0; // Always on ground
  }

  /**
   * Show the ghost preview
   */
  show(): void {
    this.group.visible = true;
  }

  /**
   * Hide the ghost preview
   */
  hide(): void {
    this.group.visible = false;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.group.visible;
  }

  /**
   * Get the group to add to scene
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  private clearMeshes(): void {
    if (this.ghostMesh) {
      this.ghostMesh.geometry.dispose();
      this.group.remove(this.ghostMesh);
      this.ghostMesh = null;
    }

    if (this.outlineMesh) {
      this.outlineMesh.geometry.dispose();
      this.group.remove(this.outlineMesh);
      this.outlineMesh = null;
    }
  }

  dispose(): void {
    this.clearMeshes();
    this.ghostMaterial.dispose();
    this.outlineMaterial.dispose();
  }
}
