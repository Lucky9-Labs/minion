import * as THREE from 'three';

/**
 * Types of exterior decorations
 */
export type ExteriorDetailType =
  | 'windowShutter'
  | 'flowerBox'
  | 'chimney'
  | 'weatherVane'
  | 'banner'
  | 'lantern'
  | 'overhang'
  | 'windowFrame'
  | 'woodBeam';

/**
 * Seeded random for deterministic detail placement
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Creates external building decoration meshes
 */
export class ExteriorDetailBuilder {
  private materials: Map<string, THREE.Material> = new Map();

  constructor() {
    this.initMaterials();
  }

  private initMaterials(): void {
    // Wood materials
    this.materials.set(
      'darkWood',
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 })
    );
    this.materials.set(
      'lightWood',
      new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 })
    );
    this.materials.set(
      'redWood',
      new THREE.MeshStandardMaterial({ color: 0x6a3a2a, roughness: 0.8 })
    );
    // Metal
    this.materials.set(
      'iron',
      new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.5 })
    );
    this.materials.set(
      'copper',
      new THREE.MeshStandardMaterial({ color: 0x8a5a3a, metalness: 0.6, roughness: 0.4 })
    );
    // Stone/brick
    this.materials.set(
      'brick',
      new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.95 })
    );
    this.materials.set(
      'stone',
      new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.9 })
    );
    // Fabric
    this.materials.set(
      'redBanner',
      new THREE.MeshStandardMaterial({ color: 0x8b2222, roughness: 0.9, side: THREE.DoubleSide })
    );
    this.materials.set(
      'blueBanner',
      new THREE.MeshStandardMaterial({ color: 0x22448b, roughness: 0.9, side: THREE.DoubleSide })
    );
    // Plants
    this.materials.set(
      'leaves',
      new THREE.MeshStandardMaterial({ color: 0x2a6a2a, roughness: 0.9 })
    );
    this.materials.set(
      'flowers',
      new THREE.MeshStandardMaterial({ color: 0xcc4488, roughness: 0.85 })
    );
  }

  /**
   * Create a window shutter
   */
  createWindowShutter(height: number = 0.8): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Main panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.25, height, 0.03), wood);
    panel.castShadow = true;
    group.add(panel);

    // Horizontal slats
    const numSlats = 4;
    for (let i = 0; i < numSlats; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.04, 0.015),
        this.materials.get('lightWood')!
      );
      const y = -height / 2 + 0.1 + (i * (height - 0.2)) / (numSlats - 1);
      slat.position.set(0, y, 0.02);
      group.add(slat);
    }

    // Hinges
    const hingeMat = this.materials.get('iron')!;
    [-height / 3, height / 3].forEach((y) => {
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.02), hingeMat);
      hinge.position.set(-0.11, y, 0.02);
      group.add(hinge);
    });

    return group;
  }

  /**
   * Create a flower box for under windows
   */
  createFlowerBox(width: number = 0.6): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('redWood')!;

    // Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(width, 0.15, 0.2), wood);
    box.position.y = -0.075;
    box.castShadow = true;
    group.add(box);

    // Dirt
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, 0.05, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1.0 })
    );
    dirt.position.y = 0.02;
    group.add(dirt);

    // Flowers/plants
    const leaves = this.materials.get('leaves')!;
    const flowers = this.materials.get('flowers')!;
    const numPlants = Math.floor(width * 4);
    for (let i = 0; i < numPlants; i++) {
      const x = -width / 2 + 0.1 + (i / (numPlants - 1)) * (width - 0.2);

      // Leaves
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), leaves);
      leaf.position.set(x + seededRandom(i) * 0.04, 0.08, seededRandom(i + 50) * 0.04);
      leaf.scale.y = 1.2;
      group.add(leaf);

      // Occasional flower
      if (seededRandom(i * 100) > 0.5) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), flowers);
        flower.position.set(x, 0.15, 0);
        group.add(flower);
      }
    }

    return group;
  }

  /**
   * Create a chimney with smoke effect preparation
   */
  createChimney(): THREE.Group {
    const group = new THREE.Group();
    const brick = this.materials.get('brick')!;

    // Main chimney body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), brick);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), this.materials.get('stone')!);
    cap.position.y = 1.25;
    cap.castShadow = true;
    group.add(cap);

    // Inner opening (dark)
    const opening = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.05, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a })
    );
    opening.position.y = 1.22;
    group.add(opening);

    return group;
  }

  /**
   * Create a weather vane
   */
  createWeatherVane(): THREE.Group {
    const group = new THREE.Group();
    const iron = this.materials.get('iron')!;
    const copper = this.materials.get('copper')!;

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.6, 8), iron);
    pole.position.y = 0.3;
    pole.castShadow = true;
    group.add(pole);

    // Directional arms (N/S/E/W)
    const armGeo = new THREE.BoxGeometry(0.4, 0.02, 0.02);
    const armNS = new THREE.Mesh(armGeo, iron);
    armNS.position.y = 0.55;
    group.add(armNS);
    const armEW = new THREE.Mesh(armGeo, iron);
    armEW.position.y = 0.55;
    armEW.rotation.y = Math.PI / 2;
    group.add(armEW);

    // Arrow/rooster shape
    const arrow = new THREE.Group();
    // Arrow shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.01), copper);
    arrow.add(shaft);
    // Arrow head
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), copper);
    head.position.x = 0.28;
    head.rotation.z = -Math.PI / 2;
    arrow.add(head);
    // Arrow tail
    const tailGeo = new THREE.BufferGeometry();
    const tailVerts = new Float32Array([
      -0.25, 0.06, 0, -0.25, -0.06, 0, -0.35, 0, 0,
    ]);
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    tailGeo.computeVertexNormals();
    const tail = new THREE.Mesh(tailGeo, copper);
    arrow.add(tail);

    arrow.position.y = 0.65;
    group.add(arrow);

    return group;
  }

  /**
   * Create a hanging banner/flag
   */
  createBanner(color: 'red' | 'blue' = 'red'): THREE.Group {
    const group = new THREE.Group();
    const fabric = this.materials.get(color === 'red' ? 'redBanner' : 'blueBanner')!;
    const wood = this.materials.get('darkWood')!;

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), wood);
    pole.rotation.z = Math.PI / 2;
    pole.castShadow = true;
    group.add(pole);

    // Banner fabric (curved shape)
    const bannerGeo = new THREE.PlaneGeometry(0.6, 0.8, 4, 4);
    // Add wave to vertices
    const positions = bannerGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // Wave effect
      const z = Math.sin(x * 4) * 0.05 + Math.sin(y * 2) * 0.03;
      positions.setZ(i, z);
    }
    bannerGeo.computeVertexNormals();

    const banner = new THREE.Mesh(bannerGeo, fabric);
    banner.position.set(0, -0.45, 0.05);
    banner.castShadow = true;
    group.add(banner);

    // End cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), wood);
    cap.position.x = 0.42;
    group.add(cap);

    return group;
  }

  /**
   * Create a hanging lantern
   */
  createLantern(): THREE.Group {
    const group = new THREE.Group();
    const iron = this.materials.get('iron')!;

    // Mounting bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), iron);
    bracket.position.set(0.1, 0, 0);
    group.add(bracket);

    // Chain
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 6), iron);
    chain.position.set(0.2, -0.1, 0);
    group.add(chain);

    // Lantern body
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(0.2, -0.25, 0);

    // Frame
    const frameGeo = new THREE.BoxGeometry(0.12, 0.2, 0.12);
    const frame = new THREE.Mesh(frameGeo, iron);
    lanternGroup.add(frame);

    // Glass (emissive for glow)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffcc66,
      emissive: 0xffaa33,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), glassMat);
    lanternGroup.add(glass);

    // Top cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 4), iron);
    cap.position.y = 0.13;
    lanternGroup.add(cap);

    // Point light
    const light = new THREE.PointLight(0xffaa44, 0.4, 4);
    light.position.y = 0;
    lanternGroup.add(light);

    group.add(lanternGroup);

    return group;
  }

  /**
   * Create a roof overhang/eave detail
   */
  createOverhang(width: number = 2): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('darkWood')!;

    // Main beam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.3), wood);
    beam.castShadow = true;
    group.add(beam);

    // Support brackets
    const bracketGeo = new THREE.BufferGeometry();
    const bracketVerts = new Float32Array([
      0, 0, 0, 0.2, 0, 0, 0, -0.3, 0,
    ]);
    bracketGeo.setAttribute('position', new THREE.BufferAttribute(bracketVerts, 3));
    bracketGeo.computeVertexNormals();

    const numBrackets = Math.floor(width / 0.5);
    for (let i = 0; i < numBrackets; i++) {
      const x = -width / 2 + 0.25 + (i * (width - 0.5)) / Math.max(numBrackets - 1, 1);
      const bracket = new THREE.Mesh(bracketGeo, wood);
      bracket.position.set(x, -0.05, 0.1);
      bracket.scale.set(0.5, 0.5, 0.5);
      group.add(bracket);
    }

    return group;
  }

  /**
   * Create decorative window frame
   */
  createWindowFrame(width: number = 0.6, height: number = 0.8): THREE.Group {
    const group = new THREE.Group();
    const wood = this.materials.get('lightWood')!;

    const frameThickness = 0.06;
    const frameDepth = 0.04;

    // Top
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      wood
    );
    top.position.y = height / 2 + frameThickness / 2;
    top.castShadow = true;
    group.add(top);

    // Bottom
    const bottom = new THREE.Mesh(
      new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, frameDepth),
      wood
    );
    bottom.position.y = -height / 2 - frameThickness / 2;
    bottom.castShadow = true;
    group.add(bottom);

    // Sides
    const sideGeo = new THREE.BoxGeometry(frameThickness, height, frameDepth);
    [-width / 2 - frameThickness / 2, width / 2 + frameThickness / 2].forEach((x) => {
      const side = new THREE.Mesh(sideGeo, wood);
      side.position.x = x;
      side.castShadow = true;
      group.add(side);
    });

    // Cross bars
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.03, frameDepth * 0.8),
      wood
    );
    group.add(crossH);

    const crossV = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, height, frameDepth * 0.8),
      wood
    );
    group.add(crossV);

    return group;
  }

  /**
   * Create decorative wood beam (for half-timber style)
   */
  createWoodBeam(length: number = 2, vertical: boolean = false): THREE.Mesh {
    const wood = this.materials.get('darkWood')!;
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(vertical ? 0.12 : length, vertical ? length : 0.12, 0.08),
      wood
    );
    beam.castShadow = true;
    return beam;
  }

  /**
   * Create a detail by type
   */
  create(type: ExteriorDetailType, options?: Record<string, unknown>): THREE.Object3D {
    switch (type) {
      case 'windowShutter':
        return this.createWindowShutter(options?.height as number);
      case 'flowerBox':
        return this.createFlowerBox(options?.width as number);
      case 'chimney':
        return this.createChimney();
      case 'weatherVane':
        return this.createWeatherVane();
      case 'banner':
        return this.createBanner(options?.color as 'red' | 'blue');
      case 'lantern':
        return this.createLantern();
      case 'overhang':
        return this.createOverhang(options?.width as number);
      case 'windowFrame':
        return this.createWindowFrame(options?.width as number, options?.height as number);
      case 'woodBeam':
        return this.createWoodBeam(options?.length as number, options?.vertical as boolean);
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
 * Add exterior details to a building
 */
export function addExteriorDetails(
  building: THREE.Group,
  config: {
    addShutters?: boolean;
    addFlowerBoxes?: boolean;
    addChimney?: boolean;
    addWeatherVane?: boolean;
    addBanners?: boolean;
    addLanterns?: boolean;
    windowPositions?: { x: number; y: number; z: number; side: 'front' | 'back' | 'left' | 'right' }[];
    roofTopY?: number;
    seed?: number;
  }
): THREE.Group {
  const builder = new ExteriorDetailBuilder();
  const detailGroup = new THREE.Group();
  const seed = config.seed || 0;

  // Add window decorations
  if (config.windowPositions) {
    config.windowPositions.forEach((win, i) => {
      const rotation = {
        front: 0,
        back: Math.PI,
        left: -Math.PI / 2,
        right: Math.PI / 2,
      }[win.side];

      // Window frame
      const frame = builder.createWindowFrame(0.5, 0.7);
      frame.position.set(win.x, win.y, win.z);
      frame.rotation.y = rotation;
      detailGroup.add(frame);

      // Shutters
      if (config.addShutters && seededRandom(seed + i * 100) > 0.3) {
        const leftShutter = builder.createWindowShutter(0.7);
        leftShutter.position.set(win.x - 0.35, win.y, win.z + 0.02);
        leftShutter.rotation.y = rotation - 0.2;
        detailGroup.add(leftShutter);

        const rightShutter = builder.createWindowShutter(0.7);
        rightShutter.position.set(win.x + 0.35, win.y, win.z + 0.02);
        rightShutter.rotation.y = rotation + 0.2;
        detailGroup.add(rightShutter);
      }

      // Flower boxes
      if (config.addFlowerBoxes && seededRandom(seed + i * 200) > 0.5) {
        const flowerBox = builder.createFlowerBox(0.5);
        flowerBox.position.set(win.x, win.y - 0.5, win.z + 0.12);
        flowerBox.rotation.y = rotation;
        detailGroup.add(flowerBox);
      }
    });
  }

  // Add chimney
  if (config.addChimney && config.roofTopY) {
    const chimney = builder.createChimney();
    chimney.position.set(
      seededRandom(seed + 300) * 0.5 - 0.25,
      config.roofTopY,
      seededRandom(seed + 301) * 0.5 - 0.25
    );
    detailGroup.add(chimney);

    // Weather vane on chimney
    if (config.addWeatherVane) {
      const vane = builder.createWeatherVane();
      vane.position.set(chimney.position.x, config.roofTopY + 1.3, chimney.position.z);
      vane.rotation.y = seededRandom(seed + 302) * Math.PI * 2;
      detailGroup.add(vane);
    }
  }

  // Add lanterns near entrance
  if (config.addLanterns) {
    [-0.6, 0.6].forEach((x, i) => {
      const lantern = builder.createLantern();
      lantern.position.set(x, 1.8, 0.5);
      lantern.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      detailGroup.add(lantern);
    });
  }

  // Add banners
  if (config.addBanners) {
    const banner = builder.createBanner(seededRandom(seed + 400) > 0.5 ? 'red' : 'blue');
    banner.position.set(0, 2.5, 0.55);
    detailGroup.add(banner);
  }

  building.add(detailGroup);
  return detailGroup;
}

// Export singleton builder
export const exteriorDetailBuilder = new ExteriorDetailBuilder();
