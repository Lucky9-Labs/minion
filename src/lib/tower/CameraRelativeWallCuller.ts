import * as THREE from 'three';

export type WallFace = 'north' | 'south' | 'east' | 'west';

interface WallEntry {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
}

/**
 * Controls wall transparency based on camera direction.
 * Walls only become transparent when a character is inside the building.
 */
export class CameraRelativeWallCuller {
  private walls: Map<WallFace, WallEntry> = new Map();
  private roofs: THREE.Group[] = [];
  private camera: THREE.Camera;
  private targetOpacities: Map<WallFace, number> = new Map();
  private currentOpacities: Map<WallFace, number> = new Map();
  private roofOpacity: number = 1.0;
  private targetRoofOpacity: number = 1.0;
  private fadeSpeed: number = 5.0;
  private selectedFloor: number | null = null;
  private characterInside: boolean = false;

  // Wall normals pointing outward from building center
  private static readonly WALL_NORMALS: Record<WallFace, THREE.Vector3> = {
    north: new THREE.Vector3(0, 0, -1),
    south: new THREE.Vector3(0, 0, 1),
    east: new THREE.Vector3(1, 0, 0),
    west: new THREE.Vector3(-1, 0, 0),
  };

  constructor(camera: THREE.Camera) {
    this.camera = camera;

    // Initialize all walls to opaque
    for (const face of ['north', 'south', 'east', 'west'] as WallFace[]) {
      this.targetOpacities.set(face, 1.0);
      this.currentOpacities.set(face, 1.0);
    }
  }

  /**
   * Register a wall mesh for camera-relative culling
   */
  registerWall(face: WallFace, mesh: THREE.Mesh): void {
    // Get or create the material for transparency
    let material = mesh.material as THREE.MeshStandardMaterial;

    // Clone material if needed to avoid affecting other meshes
    if (!material.transparent) {
      material = material.clone();
      material.transparent = true;
      material.opacity = 1.0;
      mesh.material = material;
    }

    this.walls.set(face, { mesh, material });
  }

  /**
   * Register walls from tower mesh refs
   */
  registerWallsFromRefs(refs: {
    frontWall: THREE.Mesh;
    backWall: THREE.Mesh;
    leftWall: THREE.Mesh;
    rightWall: THREE.Mesh;
  }): void {
    this.registerWall('south', refs.frontWall); // +Z is south (facing camera)
    this.registerWall('north', refs.backWall);  // -Z is north
    this.registerWall('west', refs.leftWall);   // -X is west
    this.registerWall('east', refs.rightWall);  // +X is east
  }

  /**
   * Register walls from cottage refs (same structure)
   */
  registerWallsFromCottage(walls: {
    north: THREE.Mesh;
    south: THREE.Mesh;
    east: THREE.Mesh;
    west: THREE.Mesh;
  }): void {
    this.registerWall('north', walls.north);
    this.registerWall('south', walls.south);
    this.registerWall('east', walls.east);
    this.registerWall('west', walls.west);
  }

  /**
   * Register a roof group for transparency control when characters are inside
   */
  registerRoof(roofGroup: THREE.Group): void {
    // Make all materials in the roof transparent-capable
    roofGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        if (!child.material.transparent) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 1.0;
        }
      }
    });
    this.roofs.push(roofGroup);
  }

  /**
   * When a room/floor is selected, make all facing walls extra transparent
   */
  setSelectedFloor(floorIndex: number | null): void {
    this.selectedFloor = floorIndex;
  }

  /**
   * Set whether a character is inside the building.
   * Walls only become transparent when this is true.
   */
  setCharacterInside(isInside: boolean): void {
    this.characterInside = isInside;
  }

  /**
   * Update wall visibility based on camera angle.
   * Call this every frame.
   */
  update(deltaTime: number): void {
    // If no character inside, keep all walls and roof opaque
    if (!this.characterInside) {
      for (const face of this.walls.keys()) {
        this.targetOpacities.set(face, 1.0);
      }
      this.targetRoofOpacity = 1.0;
      this.interpolateOpacities(deltaTime);
      this.applyOpacities();
      return;
    }

    // Character is inside - make roof transparent
    this.targetRoofOpacity = 0.1;

    // Get camera direction projected onto XZ plane
    const cameraDir = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();

    // Calculate target opacity for each wall
    for (const [face, normal] of Object.entries(CameraRelativeWallCuller.WALL_NORMALS)) {
      // Dot product: negative = wall facing camera
      // (camera looks at -Z, so if wall normal points toward camera, dot is negative)
      const dot = cameraDir.dot(normal);

      // Walls facing camera (dot < -0.3) should be transparent
      // This gives roughly 108-degree visibility cone
      let targetOpacity: number;

      if (dot < -0.3) {
        // Wall faces camera - make transparent
        targetOpacity = this.selectedFloor !== null ? 0.05 : 0.15;
      } else if (dot < 0.1) {
        // Wall at an angle - partial transparency
        targetOpacity = this.selectedFloor !== null ? 0.3 : 0.6;
      } else {
        // Wall faces away - keep opaque
        targetOpacity = 1.0;
      }

      this.targetOpacities.set(face as WallFace, targetOpacity);
    }

    // Smoothly interpolate to target opacities
    this.interpolateOpacities(deltaTime);

    // Apply opacities to materials
    this.applyOpacities();
  }

  private interpolateOpacities(deltaTime: number): void {
    // Interpolate wall opacities
    for (const face of this.walls.keys()) {
      const current = this.currentOpacities.get(face) ?? 1.0;
      const target = this.targetOpacities.get(face) ?? 1.0;

      if (Math.abs(current - target) < 0.001) {
        this.currentOpacities.set(face, target);
      } else {
        const newOpacity = THREE.MathUtils.lerp(
          current,
          target,
          deltaTime * this.fadeSpeed
        );
        this.currentOpacities.set(face, newOpacity);
      }
    }

    // Interpolate roof opacity
    if (Math.abs(this.roofOpacity - this.targetRoofOpacity) < 0.001) {
      this.roofOpacity = this.targetRoofOpacity;
    } else {
      this.roofOpacity = THREE.MathUtils.lerp(
        this.roofOpacity,
        this.targetRoofOpacity,
        deltaTime * this.fadeSpeed
      );
    }
  }

  private applyOpacities(): void {
    // Apply wall opacities
    for (const [face, entry] of this.walls) {
      const opacity = this.currentOpacities.get(face) ?? 1.0;
      entry.material.opacity = opacity;

      // Hide completely if nearly transparent (optimization)
      entry.mesh.visible = opacity > 0.01;

      // Also handle wall groups (for cottage walls with windows/doors)
      const wallGroup = entry.mesh.userData.wallGroup as THREE.Group | undefined;
      if (wallGroup) {
        wallGroup.visible = opacity > 0.01;
        wallGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
            if (child.material.transparent) {
              child.material.opacity = Math.min(child.material.opacity, opacity);
            }
          }
        });
      }
    }

    // Apply roof opacity
    for (const roof of this.roofs) {
      roof.visible = this.roofOpacity > 0.01;
      roof.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.opacity = this.roofOpacity;
        }
      });
    }
  }

  /**
   * Get current opacity of a wall (for debugging)
   */
  getOpacity(face: WallFace): number {
    return this.currentOpacities.get(face) ?? 1.0;
  }

  /**
   * Force immediate opacity (no transition)
   */
  setImmediate(face: WallFace, opacity: number): void {
    this.currentOpacities.set(face, opacity);
    this.targetOpacities.set(face, opacity);
    const entry = this.walls.get(face);
    if (entry) {
      entry.material.opacity = opacity;
    }
  }
}
