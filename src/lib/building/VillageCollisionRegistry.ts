import * as THREE from 'three';

/**
 * Helper to collect all collision meshes from the village scene
 * Traverses the Three.js scene graph and finds all meshes marked with userData.isCollisionMesh = true
 */

export class VillageCollisionRegistry {
  /**
   * Collect all collision meshes from a scene or group
   * Searches recursively through the object hierarchy
   */
  static collectCollisionMeshes(parent: THREE.Object3D | THREE.Scene): THREE.Mesh[] {
    const collisionMeshes: THREE.Mesh[] = [];

    parent.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.userData.isCollisionMesh === true
      ) {
        collisionMeshes.push(child);
      }
    });

    return collisionMeshes;
  }

  /**
   * Collect collision meshes from multiple sources (e.g., all buildings)
   */
  static collectFromMultiple(objects: THREE.Object3D[]): THREE.Mesh[] {
    const allMeshes: THREE.Mesh[] = [];

    for (const obj of objects) {
      const meshes = this.collectCollisionMeshes(obj);
      allMeshes.push(...meshes);
    }

    return allMeshes;
  }
}
