'use client';

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MageBuilder, DEFAULT_WIZARD_CUSTOMIZATION } from '@/lib/minion/species/mage';
import { GoblinBuilder } from '@/lib/minion/species/goblin';

export type PortraitSpecies = 'wizard' | 'witch' | 'goblin' | 'penguin' | 'mushroom';

interface Portrait3DProps {
  species: PortraitSpecies;
  size?: number;
  rotation?: boolean;
  className?: string;
}

/**
 * Renders a 3D character portrait in an isolated canvas.
 * Used for wizard profile and minion target frames.
 */
export function Portrait3D({
  species,
  size = 64,
  rotation = false,
  className = '',
}: Portrait3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const frameIdRef = useRef<number>(0);

  // Build the character mesh
  const characterMesh = useMemo(() => {
    let builder;

    switch (species) {
      case 'wizard':
        builder = new MageBuilder(DEFAULT_WIZARD_CUSTOMIZATION);
        break;
      case 'witch':
        builder = new MageBuilder({ ...DEFAULT_WIZARD_CUSTOMIZATION, variant: 'witch' });
        break;
      case 'goblin':
      case 'penguin':
      case 'mushroom':
      default:
        builder = new GoblinBuilder();
        break;
    }

    const { mesh } = builder.build();
    return mesh;
  }, [species]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Setup orthographic camera for portrait view
    const aspect = 1;
    const frustumSize = 2.5;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      100
    );
    // Position camera for head-on portrait view
    camera.position.set(0, 1.2, 3);
    camera.lookAt(0, 0.8, 0);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add character to scene
    const model = characterMesh.clone(true);
    scene.add(model);
    modelRef.current = model;

    // Lighting setup for portrait
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    keyLight.position.set(2, 3, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fillLight.position.set(-2, 1, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 0.3);
    rimLight.position.set(0, 2, -2);
    scene.add(rimLight);

    // Animation loop
    let rotationAngle = 0;
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (rotation && model) {
        rotationAngle += 0.005;
        model.rotation.y = Math.sin(rotationAngle) * 0.3;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(frameIdRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [characterMesh, size, rotation]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        borderRadius: '4px',
      }}
    />
  );
}
