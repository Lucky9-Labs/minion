import * as THREE from 'three';

/**
 * Types of interior decoration items
 */
export type DecorType =
  | 'table'
  | 'chair'
  | 'bookshelf'
  | 'bed'
  | 'chest'
  | 'barrel'
  | 'crate'
  | 'torch'
  | 'carpet'
  | 'pot'
  | 'cauldron';

/**
 * Room types that can have decorations
 */
export type RoomType = 'library' | 'workshop' | 'forge' | 'bedroom' | 'storage' | 'common';

/**
 * Configuration for a decor item
 */
export interface DecorItem {
  type: DecorType;
  position: THREE.Vector3;
  rotation?: number; // Y rotation in radians
  scale?: number;
}

/**
 * Room decoration preset
 */
export interface RoomPreset {
  items: DecorItem[];
}

/**
 * Seeded random for deterministic decoration placement
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Creates 3D meshes for interior decorations
 */
export class InteriorDecorBuilder {
  private materials: Map<string, THREE.Material> = new Map();

  constructor() {
    this.initMaterials();
  }

  private initMaterials(): void {
    // Wood materials
    this.materials.set(
      'darkWood',
      new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.8 })
    );
    this.materials.set(
      'lightWood',
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.75 })
    );
    // Metal
    this.materials.set(
      'iron',
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.5 })
    );
    this.materials.set(
      'gold',
      new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.3 })
    );
    // Fabric
    this.materials.set(
      'redFabric',
      new THREE.MeshStandardMaterial({ color: 0x8b2222, roughness: 0.9 })
    );
    this.materials.set(
      'blueFabric',
      new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.9 })
    );
    // Stone
    this.materials.set(
      'stone',
      new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.95 })
    );
    // Leather
    this.materials.set(
      'leather',
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 })
    );
  }

  /**
   * Create a table mesh
   */
  createTable(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Table top
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), wood);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.75, 0.08);
    const legPositions = [
      [-0.5, 0.375, -0.25],
      [0.5, 0.375, -0.25],
      [-0.5, 0.375, 0.25],
      [0.5, 0.375, 0.25],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  /**
   * Create a chair mesh
   */
  createChair(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.4), wood);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.06), wood);
    back.position.set(0, 0.7, -0.17);
    back.castShadow = true;
    group.add(back);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.05, 0.45, 0.05);
    const legPositions = [
      [-0.18, 0.225, -0.15],
      [0.18, 0.225, -0.15],
      [-0.18, 0.225, 0.15],
      [0.18, 0.225, 0.15],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  /**
   * Create a bookshelf mesh
   */
  createBookshelf(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Back panel
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.05), wood);
    back.position.set(0, 0.9, -0.175);
    back.castShadow = true;
    group.add(back);

    // Shelves
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.35), wood);
      shelf.position.set(0, 0.1 + i * 0.5, 0);
      shelf.castShadow = true;
      shelf.receiveShadow = true;
      group.add(shelf);
    }

    // Side panels
    const sideGeo = new THREE.BoxGeometry(0.05, 1.8, 0.35);
    [-0.475, 0.475].forEach((x) => {
      const side = new THREE.Mesh(sideGeo, wood);
      side.position.set(x, 0.9, 0);
      side.castShadow = true;
      group.add(side);
    });

    // Books on shelves
    const bookColors = [0x8b2222, 0x2a4a6a, 0x2a6a2a, 0x6a4a2a, 0x4a2a6a];
    for (let shelf = 1; shelf < 4; shelf++) {
      const numBooks = 3 + Math.floor(seededRandom(shelf * 100) * 4);
      let xPos = -0.4;
      for (let b = 0; b < numBooks; b++) {
        const bookWidth = 0.05 + seededRandom(shelf * 100 + b) * 0.08;
        const bookHeight = 0.2 + seededRandom(shelf * 100 + b + 50) * 0.15;
        const bookColor = bookColors[Math.floor(seededRandom(shelf * 100 + b + 100) * bookColors.length)];
        const bookMat = new THREE.MeshStandardMaterial({ color: bookColor, roughness: 0.9 });
        const book = new THREE.Mesh(new THREE.BoxGeometry(bookWidth, bookHeight, 0.2), bookMat);
        book.position.set(xPos + bookWidth / 2, shelf * 0.5 + bookHeight / 2 + 0.05, 0.05);
        group.add(book);
        xPos += bookWidth + 0.02;
        if (xPos > 0.35) break;
      }
    }

    return group;
  }

  /**
   * Create a bed mesh
   */
  createBed(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;
    const fabric = this.materials.get('redFabric')!;

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 2.0), wood);
    frame.position.set(0, 0.2, 0);
    frame.castShadow = true;
    group.add(frame);

    // Mattress
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.15, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.9 })
    );
    mattress.position.set(0, 0.375, 0);
    mattress.receiveShadow = true;
    group.add(mattress);

    // Blanket
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 1.2), fabric);
    blanket.position.set(0, 0.49, 0.3);
    group.add(blanket);

    // Pillow
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.12, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    );
    pillow.position.set(0, 0.51, -0.7);
    group.add(pillow);

    // Headboard
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), wood);
    headboard.position.set(0, 0.6, -0.96);
    headboard.castShadow = true;
    group.add(headboard);

    return group;
  }

  /**
   * Create a chest/trunk mesh
   */
  createChest(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('lightWood')!;
    const iron = this.materials.get('iron')!;

    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), wood);
    body.position.y = 0.25;
    body.castShadow = true;
    group.add(body);

    // Lid (slightly raised for dimension)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.52), wood);
    lid.position.y = 0.54;
    lid.castShadow = true;
    group.add(lid);

    // Metal bands
    const bandGeo = new THREE.BoxGeometry(0.84, 0.04, 0.04);
    [0.15, 0.35].forEach((y) => {
      const band = new THREE.Mesh(bandGeo, iron);
      band.position.set(0, y, 0.23);
      group.add(band);
      const bandBack = new THREE.Mesh(bandGeo, iron);
      bandBack.position.set(0, y, -0.23);
      group.add(bandBack);
    });

    // Lock
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), iron);
    lock.position.set(0, 0.4, 0.27);
    group.add(lock);

    return group;
  }

  /**
   * Create a barrel mesh
   */
  createBarrel(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('lightWood')!;
    const iron = this.materials.get('iron')!;

    // Main barrel body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.8, 12), wood);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Metal bands
    [0.15, 0.65].forEach((y) => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 16), iron);
      band.position.y = y;
      band.rotation.x = Math.PI / 2;
      group.add(band);
    });

    return group;
  }

  /**
   * Create a wooden crate mesh
   */
  createCrate(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('lightWood')!;

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), wood);
    crate.position.y = 0.25;
    crate.castShadow = true;
    group.add(crate);

    // Slat details
    const slatMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.85 });
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.04, 0.04), slatMat);
      slat.position.set(0, 0.1 + i * 0.15, 0.24);
      group.add(slat);
    }

    return group;
  }

  /**
   * Create a wall torch mesh
   */
  createTorch(): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Torch handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 8), wood);
    handle.position.y = 0.2;
    handle.castShadow = true;
    group.add(handle);

    // Flame holder
    const holder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.04, 0.1, 8),
      this.materials.get('iron')!
    );
    holder.position.y = 0.45;
    group.add(holder);

    // Flame (emissive)
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.8,
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), flameMat);
    flame.position.y = 0.56;
    group.add(flame);

    // Point light
    const light = new THREE.PointLight(0xff6633, 0.5, 3);
    light.position.y = 0.5;
    group.add(light);

    return group;
  }

  /**
   * Create a carpet/rug mesh
   */
  createCarpet(): THREE.Group {
    const group = new THREE.Group();
    const fabric = this.materials.get('redFabric')!;

    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), fabric);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.y = 0.01;
    carpet.receiveShadow = true;
    group.add(carpet);

    // Border
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, roughness: 0.85 });
    const borderGeo = new THREE.PlaneGeometry(2.1, 1.6);
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.y = 0.005;
    group.add(border);

    return group;
  }

  /**
   * Create a pot/vase mesh
   */
  createPot(): THREE.Group {
    const group = new THREE.Group();
    const clay = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });

    // Simple pot shape
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.2, 12), clay);
    pot.position.y = 0.1;
    pot.castShadow = true;
    group.add(pot);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 12), clay);
    rim.position.y = 0.2;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    return group;
  }

  /**
   * Create a cauldron mesh
   */
  createCauldron(): THREE.Group {
    const group = new THREE.Group();
    const iron = this.materials.get('iron')!;

    // Bowl
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), iron);
    bowl.position.y = 0.3;
    bowl.rotation.x = Math.PI;
    bowl.castShadow = true;
    group.add(bowl);

    // Rim
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 16), iron);
    rim.position.y = 0.3;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.2, 6);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(legGeo, iron);
      leg.position.set(Math.cos(angle) * 0.25, 0.1, Math.sin(angle) * 0.25);
      leg.rotation.x = 0.2 * Math.cos(angle);
      leg.rotation.z = 0.2 * Math.sin(angle);
      leg.castShadow = true;
      group.add(leg);
    }

    // Liquid inside (glowing potion)
    const liquid = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 16),
      new THREE.MeshStandardMaterial({
        color: 0x44ff44,
        emissive: 0x22aa22,
        emissiveIntensity: 0.4,
      })
    );
    liquid.rotation.x = -Math.PI / 2;
    liquid.position.y = 0.25;
    group.add(liquid);

    return group;
  }

  /**
   * Create a decor item by type
   */
  create(type: DecorType): THREE.Group {
    switch (type) {
      case 'table':
        return this.createTable();
      case 'chair':
        return this.createChair();
      case 'bookshelf':
        return this.createBookshelf();
      case 'bed':
        return this.createBed();
      case 'chest':
        return this.createChest();
      case 'barrel':
        return this.createBarrel();
      case 'crate':
        return this.createCrate();
      case 'torch':
        return this.createTorch();
      case 'carpet':
        return this.createCarpet();
      case 'pot':
        return this.createPot();
      case 'cauldron':
        return this.createCauldron();
      default:
        return new THREE.Group();
    }
  }

  /**
   * Dispose materials
   */
  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}

/**
 * Room preset definitions
 */
export const ROOM_PRESETS: Record<RoomType, (width: number, depth: number) => DecorItem[]> = {
  library: (width, depth) => {
    const items: DecorItem[] = [];
    // Bookshelves along walls
    items.push({ type: 'bookshelf', position: new THREE.Vector3(-width / 2 + 0.5, 0, 0), rotation: Math.PI / 2 });
    items.push({ type: 'bookshelf', position: new THREE.Vector3(width / 2 - 0.5, 0, 0), rotation: -Math.PI / 2 });
    // Reading table and chair
    items.push({ type: 'table', position: new THREE.Vector3(0, 0, 0) });
    items.push({ type: 'chair', position: new THREE.Vector3(0, 0, 0.6), rotation: Math.PI });
    // Carpet
    items.push({ type: 'carpet', position: new THREE.Vector3(0, 0, 0) });
    return items;
  },

  workshop: (width, depth) => {
    const items: DecorItem[] = [];
    // Work table
    items.push({ type: 'table', position: new THREE.Vector3(0, 0, -depth / 4) });
    // Storage
    items.push({ type: 'chest', position: new THREE.Vector3(-width / 3, 0, depth / 3) });
    items.push({ type: 'crate', position: new THREE.Vector3(width / 3, 0, depth / 3) });
    items.push({ type: 'barrel', position: new THREE.Vector3(width / 3 + 0.5, 0, depth / 3) });
    // Chair
    items.push({ type: 'chair', position: new THREE.Vector3(0, 0, -depth / 4 + 0.6), rotation: Math.PI });
    return items;
  },

  forge: (width, depth) => {
    const items: DecorItem[] = [];
    // Cauldron in center
    items.push({ type: 'cauldron', position: new THREE.Vector3(0, 0, 0) });
    // Storage
    items.push({ type: 'barrel', position: new THREE.Vector3(-width / 3, 0, -depth / 3) });
    items.push({ type: 'barrel', position: new THREE.Vector3(-width / 3 + 0.6, 0, -depth / 3) });
    items.push({ type: 'chest', position: new THREE.Vector3(width / 3, 0, -depth / 3) });
    // Torches
    items.push({ type: 'torch', position: new THREE.Vector3(-width / 2 + 0.1, 1.2, 0) });
    items.push({ type: 'torch', position: new THREE.Vector3(width / 2 - 0.1, 1.2, 0) });
    return items;
  },

  bedroom: (width, depth) => {
    const items: DecorItem[] = [];
    // Bed
    items.push({ type: 'bed', position: new THREE.Vector3(-width / 4, 0, 0) });
    // Chest at foot of bed
    items.push({ type: 'chest', position: new THREE.Vector3(-width / 4, 0, depth / 3) });
    // Small table
    items.push({ type: 'pot', position: new THREE.Vector3(width / 4, 0.75, -depth / 4) });
    // Carpet
    items.push({ type: 'carpet', position: new THREE.Vector3(0, 0, 0), scale: 0.7 });
    return items;
  },

  storage: (width, depth) => {
    const items: DecorItem[] = [];
    // Lots of storage items
    items.push({ type: 'barrel', position: new THREE.Vector3(-width / 3, 0, -depth / 3) });
    items.push({ type: 'barrel', position: new THREE.Vector3(-width / 3, 0, 0) });
    items.push({ type: 'crate', position: new THREE.Vector3(0, 0, -depth / 3) });
    items.push({ type: 'crate', position: new THREE.Vector3(0, 0.5, -depth / 3) });
    items.push({ type: 'chest', position: new THREE.Vector3(width / 3, 0, -depth / 3) });
    items.push({ type: 'crate', position: new THREE.Vector3(width / 3, 0, 0) });
    return items;
  },

  common: (width, depth) => {
    const items: DecorItem[] = [];
    // Table and chairs
    items.push({ type: 'table', position: new THREE.Vector3(0, 0, 0) });
    items.push({ type: 'chair', position: new THREE.Vector3(-0.7, 0, 0), rotation: Math.PI / 2 });
    items.push({ type: 'chair', position: new THREE.Vector3(0.7, 0, 0), rotation: -Math.PI / 2 });
    items.push({ type: 'chair', position: new THREE.Vector3(0, 0, 0.5), rotation: Math.PI });
    // Carpet
    items.push({ type: 'carpet', position: new THREE.Vector3(0, 0, 0) });
    // Some pots
    items.push({ type: 'pot', position: new THREE.Vector3(-width / 3, 0, -depth / 3) });
    return items;
  },
};

/**
 * Interior Decor System - manages loading and unloading of building interiors
 */
export class InteriorDecorSystem {
  private builder: InteriorDecorBuilder;
  private loadedInteriors: Map<string, THREE.Group> = new Map();

  constructor() {
    this.builder = new InteriorDecorBuilder();
  }

  /**
   * Load interior decoration for a building
   */
  loadInterior(
    buildingId: string,
    roomType: RoomType,
    position: THREE.Vector3,
    width: number,
    depth: number
  ): THREE.Group {
    // Check if already loaded
    if (this.loadedInteriors.has(buildingId)) {
      return this.loadedInteriors.get(buildingId)!;
    }

    const group = new THREE.Group();
    group.position.copy(position);

    // Get preset items for this room type
    const presetFn = ROOM_PRESETS[roomType] || ROOM_PRESETS.common;
    const items = presetFn(width, depth);

    // Create and add all items
    for (const item of items) {
      const mesh = this.builder.create(item.type);
      mesh.position.copy(item.position);
      if (item.rotation) {
        mesh.rotation.y = item.rotation;
      }
      if (item.scale) {
        mesh.scale.setScalar(item.scale);
      }
      group.add(mesh);
    }

    this.loadedInteriors.set(buildingId, group);
    return group;
  }

  /**
   * Unload interior decoration for a building
   */
  unloadInterior(buildingId: string, scene?: THREE.Scene): void {
    const group = this.loadedInteriors.get(buildingId);
    if (group) {
      if (scene) {
        scene.remove(group);
      }
      // Dispose meshes
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
        }
      });
      this.loadedInteriors.delete(buildingId);
    }
  }

  /**
   * Check if an interior is loaded
   */
  isLoaded(buildingId: string): boolean {
    return this.loadedInteriors.has(buildingId);
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const [id] of this.loadedInteriors) {
      this.unloadInterior(id);
    }
    this.builder.dispose();
  }
}

// Export singleton instance
export const interiorDecorSystem = new InteriorDecorSystem();
