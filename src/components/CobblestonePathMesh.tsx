'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Building } from '@/types/project';
import { generateVillagePaths, generatePathGeometry, type PathSegment } from '@/lib/pathGeneration';

interface CobblestonePathMeshProps {
  buildings: Building[];
}

// Cobblestone texture pattern using procedural approach
function createCobblestoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base gray color
  ctx.fillStyle = '#6B6B6B';
  ctx.fillRect(0, 0, 256, 256);

  // Draw irregular cobblestones
  const stoneColors = ['#5A5A5A', '#7A7A7A', '#686868', '#606060', '#727272'];

  // Create a grid of slightly irregular stones
  const stoneSize = 32;
  const gap = 4;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Add some randomness to position
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetY = (Math.random() - 0.5) * 4;

      const x = col * stoneSize + gap / 2 + offsetX;
      const y = row * stoneSize + gap / 2 + offsetY;
      const w = stoneSize - gap + (Math.random() - 0.5) * 4;
      const h = stoneSize - gap + (Math.random() - 0.5) * 4;

      // Random color
      ctx.fillStyle = stoneColors[Math.floor(Math.random() * stoneColors.length)];

      // Draw rounded rectangle
      const radius = 4;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      // Add slight highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + 2, y + 2, w / 2, h / 3);
    }
  }

  // Add dark mortar lines
  ctx.strokeStyle = '#3A3A3A';
  ctx.lineWidth = gap;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.5, 2);

  return texture;
}

export function CobblestonePathMesh({ buildings }: CobblestonePathMeshProps) {
  // Generate path segments based on building positions
  const pathSegments = useMemo(() => {
    if (buildings.length === 0) return [];
    return generateVillagePaths(buildings);
  }, [buildings]);

  // Create cobblestone material
  const cobbleMaterial = useMemo(() => {
    // Use procedural texture if window is available
    let texture: THREE.CanvasTexture | null = null;
    if (typeof window !== 'undefined') {
      texture = createCobblestoneTexture();
    }

    return new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.9,
      metalness: 0.0,
      map: texture,
    });
  }, []);

  // Generate geometries for all path segments
  const pathMeshes = useMemo(() => {
    return pathSegments.map((segment, index) => {
      const geometry = generatePathGeometry(segment);
      return { geometry, key: `path-${index}` };
    });
  }, [pathSegments]);

  if (pathMeshes.length === 0) return null;

  return (
    <group name="cobblestone-paths">
      {pathMeshes.map(({ geometry, key }) => (
        <mesh
          key={key}
          geometry={geometry}
          material={cobbleMaterial}
          receiveShadow
        />
      ))}
    </group>
  );
}

export default CobblestonePathMesh;
