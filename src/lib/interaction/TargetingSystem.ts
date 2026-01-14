import * as THREE from 'three';
import type { Target, TargetType } from '@/types/interaction';

interface RegisteredEntity {
  id: string;
  mesh: THREE.Object3D;
  type: TargetType;
  data: {
    name?: string;
    state?: string;
    buildingType?: string;
    personality?: string;
  };
}

export class TargetingSystem {
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera;
  private registeredEntities: Map<string, RegisteredEntity> = new Map();
  private groundMesh: THREE.Object3D | null = null;
  private currentTarget: Target | null = null;
  private maxDistance: number = 200; // Increased for isometric camera which is far from scene

  // For highlight effect
  private highlightedMesh: THREE.Object3D | null = null;
  private highlightedEntityId: string | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  // Mouse position for isometric raycasting (normalized -1 to 1)
  private mouseNDC: THREE.Vector2 = new THREE.Vector2();
  private useMouseRaycast: boolean = false;

  // Screen-space picking for isometric mode (more reliable than 3D raycast for small entities)
  private mouseScreenPos: THREE.Vector2 = new THREE.Vector2();
  private screenPickRadius: number = 150; // Pixels - radius for screen-space entity picking (generous for easier selection)

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.maxDistance;
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * Set mouse position for raycasting (used in isometric mode)
   * @param x Screen X position
   * @param y Screen Y position
   * @param screenWidth Viewport width
   * @param screenHeight Viewport height
   */
  setMousePosition(x: number, y: number, screenWidth: number, screenHeight: number): void {
    this.mouseNDC.x = (x / screenWidth) * 2 - 1;
    this.mouseNDC.y = -(y / screenHeight) * 2 + 1;
    // Also store actual screen position for screen-space picking
    this.mouseScreenPos.set(x, y);
  }

  /**
   * Enable/disable mouse-based raycasting (for isometric mode)
   */
  setUseMouseRaycast(use: boolean): void {
    this.useMouseRaycast = use;
  }

  registerMinion(id: string, mesh: THREE.Object3D, data: { name?: string; state?: string; personality?: string }): void {
    this.registeredEntities.set(id, {
      id,
      mesh,
      type: 'minion',
      data,
    });
  }

  registerBuilding(id: string, mesh: THREE.Object3D, data: { name?: string; buildingType?: string }): void {
    this.registeredEntities.set(id, {
      id,
      mesh,
      type: 'building',
      data,
    });
  }

  unregisterEntity(id: string): void {
    this.registeredEntities.delete(id);
  }

  setGroundMesh(mesh: THREE.Object3D): void {
    this.groundMesh = mesh;
  }

  /**
   * Project world position to screen coordinates
   */
  private projectToScreen(worldPos: THREE.Vector3): THREE.Vector2 {
    const pos = worldPos.clone().project(this.camera);
    return new THREE.Vector2(
      (pos.x * 0.5 + 0.5) * window.innerWidth,
      (-pos.y * 0.5 + 0.5) * window.innerHeight
    );
  }

  /**
   * Find nearest entity to click position using screen-space distance
   */
  private findNearestEntityScreenSpace(entityType: 'minion' | 'building'): RegisteredEntity | null {
    let nearestEntity: RegisteredEntity | null = null;
    let nearestDistance = this.screenPickRadius;

    this.registeredEntities.forEach((entity) => {
      if (entity.type !== entityType) return;

      const screenPos = this.projectToScreen(entity.mesh.position);
      const distance = screenPos.distanceTo(this.mouseScreenPos);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEntity = entity;
      }
    });

    return nearestEntity;
  }

  update(): Target | null {
    // Cast ray based on mode
    if (this.useMouseRaycast) {
      // Isometric mode: cast ray from mouse position
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    } else {
      // First person mode: cast ray from camera center (forward direction)
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.raycaster.set(this.camera.position, direction);
    }

    // Collect all meshes to test (for raycast)
    const minionMeshes: THREE.Object3D[] = [];
    const buildingMeshes: THREE.Object3D[] = [];

    this.registeredEntities.forEach((entity) => {
      if (entity.type === 'minion') {
        minionMeshes.push(entity.mesh);
      } else if (entity.type === 'building') {
        buildingMeshes.push(entity.mesh);
      }
    });

    // Priority 1: Check minions
    // In isometric mode, use screen-space picking (more reliable for small entities)
    if (this.useMouseRaycast) {
      const nearestMinion = this.findNearestEntityScreenSpace('minion');
      if (nearestMinion) {
        this.currentTarget = {
          type: 'minion',
          id: nearestMinion.id,
          position: nearestMinion.mesh.position.clone(),
          normal: new THREE.Vector3(0, 1, 0),
          distance: 0,
          mesh: nearestMinion.mesh,
          entity: nearestMinion.data,
        };
        if (this.highlightedEntityId !== nearestMinion.id) {
          this.clearHighlight();
          this.applyHighlight(nearestMinion.mesh, nearestMinion.id);
        }
        return this.currentTarget;
      }
    }

    // First-person mode: use raycast for minions
    const minionHits = this.raycaster.intersectObjects(minionMeshes, true);
    if (minionHits.length > 0) {
      const hit = minionHits[0];
      const entity = this.findEntityByMesh(hit.object);
      if (entity) {
        this.currentTarget = {
          type: 'minion',
          id: entity.id,
          position: hit.point.clone(),
          normal: hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0),
          distance: hit.distance,
          mesh: entity.mesh,
          entity: entity.data,
        };
        // Only update highlight if target changed
        if (this.highlightedEntityId !== entity.id) {
          this.clearHighlight();
          this.applyHighlight(entity.mesh, entity.id);
        }
        return this.currentTarget;
      }
    }

    // Priority 2: Check buildings
    // In isometric mode, use screen-space picking for buildings too (with larger radius)
    if (this.useMouseRaycast) {
      const nearestBuilding = this.findNearestEntityScreenSpace('building');
      if (nearestBuilding) {
        this.currentTarget = {
          type: 'building',
          id: nearestBuilding.id,
          position: nearestBuilding.mesh.position.clone(),
          normal: new THREE.Vector3(0, 1, 0),
          distance: 0,
          mesh: nearestBuilding.mesh,
          entity: nearestBuilding.data,
        };
        if (this.highlightedEntityId !== nearestBuilding.id) {
          this.clearHighlight();
          this.applyHighlight(nearestBuilding.mesh, nearestBuilding.id);
        }
        return this.currentTarget;
      }
    }

    // First-person mode: use raycast for buildings
    const buildingHits = this.raycaster.intersectObjects(buildingMeshes, true);
    if (buildingHits.length > 0) {
      const hit = buildingHits[0];
      const entity = this.findEntityByMesh(hit.object);
      if (entity) {
        this.currentTarget = {
          type: 'building',
          id: entity.id,
          position: hit.point.clone(),
          normal: hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0),
          distance: hit.distance,
          mesh: entity.mesh,
          entity: entity.data,
        };
        if (this.highlightedEntityId !== entity.id) {
          this.clearHighlight();
          this.applyHighlight(entity.mesh, entity.id);
        }
        return this.currentTarget;
      }
    }

    // Priority 3: Check ground (always use raycast)
    if (this.groundMesh) {
      const groundHits = this.raycaster.intersectObject(this.groundMesh, true);
      if (groundHits.length > 0) {
        const hit = groundHits[0];
        // Clear highlight when targeting ground
        if (this.highlightedEntityId !== null) {
          this.clearHighlight();
        }
        this.currentTarget = {
          type: 'ground',
          id: null,
          position: hit.point.clone(),
          normal: hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0),
          distance: hit.distance,
          mesh: this.groundMesh,
        };
        return this.currentTarget;
      }
    }

    // No hit - clear highlight
    if (this.highlightedEntityId !== null) {
      this.clearHighlight();
    }
    this.currentTarget = null;
    return null;
  }

  private findEntityByMesh(mesh: THREE.Object3D): RegisteredEntity | null {
    // Walk up the parent chain to find registered entity
    let current: THREE.Object3D | null = mesh;
    while (current) {
      for (const [, entity] of this.registeredEntities) {
        if (entity.mesh === current) {
          return entity;
        }
      }
      current = current.parent;
    }
    return null;
  }

  private applyHighlight(mesh: THREE.Object3D, entityId: string): void {
    this.highlightedMesh = mesh;
    this.highlightedEntityId = entityId;

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Store original material
        this.originalMaterials.set(child, child.material);

        // Clone and modify material for highlight
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            const cloned = m.clone();
            if ('emissive' in cloned) {
              (cloned as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x9966ff);
              (cloned as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
            }
            return cloned;
          });
        } else {
          const cloned = child.material.clone();
          if ('emissive' in cloned) {
            (cloned as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x9966ff);
            (cloned as THREE.MeshStandardMaterial).emissiveIntensity = 0.3;
          }
          child.material = cloned;
        }
      }
    });
  }

  private clearHighlight(): void {
    if (!this.highlightedMesh) return;

    this.highlightedMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const original = this.originalMaterials.get(child);
        if (original) {
          // Dispose cloned materials
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
          child.material = original;
        }
      }
    });

    this.originalMaterials.clear();
    this.highlightedMesh = null;
    this.highlightedEntityId = null;
  }

  getTarget(): Target | null {
    return this.currentTarget;
  }

  getTargetScreenPosition(): { x: number; y: number } | null {
    if (!this.currentTarget) return null;

    const pos = this.currentTarget.position.clone();
    pos.project(this.camera);

    return {
      x: (pos.x * 0.5 + 0.5) * window.innerWidth,
      y: (-pos.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  dispose(): void {
    this.clearHighlight();
    this.registeredEntities.clear();
  }
}
