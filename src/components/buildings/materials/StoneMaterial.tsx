'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// Medieval stone color palette
export const STONE_COLORS = {
  light: '#9ca3af',
  medium: '#6b7280',
  dark: '#4b5563',
  darker: '#374151',
  mortar: '#52525b',
} as const;

// Wood color palette for roofs
export const WOOD_COLORS = {
  light: '#A0522D',
  medium: '#8B4513',
  dark: '#6B4423',
  weathered: '#5D4037',
  darkStain: '#4A3728',
} as const;

// Seeded random for consistent block generation
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface StoneBlockProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  opacity?: number;
}

export function StoneBlock({ position, size, color, opacity = 1 }: StoneBlockProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0.05}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

interface StoneWallProps {
  width: number;
  height: number;
  depth: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  blockRows?: number;
  blockCols?: number;
  opacity?: number;
  seed?: number;
  mortarGap?: number;
}

export function StoneWall({
  width,
  height,
  depth,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  blockRows = 4,
  blockCols = 3,
  opacity = 1,
  seed = 0,
  mortarGap = 0.03,
}: StoneWallProps) {
  const blocks = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];

    const blockHeight = (height - mortarGap * (blockRows + 1)) / blockRows;
    const baseBlockWidth = (width - mortarGap * (blockCols + 1)) / blockCols;

    const stoneColors = [STONE_COLORS.light, STONE_COLORS.medium, STONE_COLORS.dark];

    for (let row = 0; row < blockRows; row++) {
      // Offset every other row for brick pattern
      const rowOffset = row % 2 === 0 ? 0 : baseBlockWidth * 0.5;
      const colsInRow = row % 2 === 0 ? blockCols : blockCols + 1;

      for (let col = 0; col < colsInRow; col++) {
        const blockSeed = seed + row * 100 + col;

        // Randomize block width slightly
        const widthVariation = 0.85 + seededRandom(blockSeed) * 0.3;
        const blockWidth = baseBlockWidth * widthVariation;

        // Randomize depth for 3D effect
        const depthVariation = 1 + seededRandom(blockSeed + 50) * 0.15;
        const blockDepth = depth * depthVariation;

        // Calculate position
        const x = -width / 2 + mortarGap + col * (baseBlockWidth + mortarGap) + blockWidth / 2 - rowOffset;
        const y = -height / 2 + mortarGap + row * (blockHeight + mortarGap) + blockHeight / 2;
        const z = (blockDepth - depth) / 2; // Protrude slightly

        // Skip blocks that would extend past edges
        if (x - blockWidth / 2 < -width / 2 - 0.01 || x + blockWidth / 2 > width / 2 + 0.01) {
          continue;
        }

        // Random color from palette
        const colorIndex = Math.floor(seededRandom(blockSeed + 25) * stoneColors.length);
        const color = stoneColors[colorIndex];

        result.push({
          position: [x, y, z],
          size: [blockWidth - 0.01, blockHeight - 0.01, blockDepth],
          color,
        });
      }
    }

    return result;
  }, [width, height, depth, blockRows, blockCols, seed, mortarGap]);

  return (
    <group position={position} rotation={rotation}>
      {/* Mortar background */}
      <mesh receiveShadow>
        <boxGeometry args={[width, height, depth * 0.8]} />
        <meshStandardMaterial
          color={STONE_COLORS.mortar}
          roughness={0.95}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {/* Stone blocks */}
      {blocks.map((block, i) => (
        <StoneBlock
          key={i}
          position={block.position}
          size={block.size}
          color={block.color}
          opacity={opacity}
        />
      ))}
    </group>
  );
}

interface WoodPlankRoofProps {
  width: number;
  depth: number;
  thickness?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  plankCount?: number;
  opacity?: number;
  seed?: number;
  woodTone?: 'light' | 'medium' | 'dark' | 'weathered' | 'darkStain';
}

export function WoodPlankRoof({
  width,
  depth,
  thickness = 0.15,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  plankCount = 8,
  opacity = 1,
  seed = 0,
  woodTone = 'medium',
}: WoodPlankRoofProps) {
  const planks = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];

    const plankWidth = width / plankCount;
    const gap = 0.02;

    // Wood color variations based on tone
    const toneColors: Record<string, string[]> = {
      light: ['#A0522D', '#B8733D', '#9A6B4D'],
      medium: ['#8B4513', '#7A3D12', '#9C5020'],
      dark: ['#6B4423', '#5A3A1D', '#7A4D2B'],
      weathered: ['#5D4037', '#6B5344', '#4E362D'],
      darkStain: ['#4A3728', '#3D2D20', '#5A4538'],
    };

    const colors = toneColors[woodTone] || toneColors.medium;

    for (let i = 0; i < plankCount; i++) {
      const plankSeed = seed + i;

      // Slight height variation for texture
      const heightOffset = seededRandom(plankSeed) * 0.02 - 0.01;

      // Random color from tone palette
      const colorIndex = Math.floor(seededRandom(plankSeed + 10) * colors.length);
      const color = colors[colorIndex];

      const x = -width / 2 + plankWidth / 2 + i * plankWidth;

      result.push({
        position: [x, heightOffset, 0],
        size: [plankWidth - gap, thickness, depth],
        color,
      });
    }

    return result;
  }, [width, depth, thickness, plankCount, seed, woodTone]);

  return (
    <group position={position} rotation={rotation}>
      {/* Base layer underneath */}
      <mesh position={[0, -thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[width, thickness * 0.3, depth]} />
        <meshStandardMaterial
          color={WOOD_COLORS.dark}
          roughness={0.9}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {/* Wood planks */}
      {planks.map((plank, i) => (
        <mesh key={i} position={plank.position} castShadow receiveShadow>
          <boxGeometry args={plank.size} />
          <meshStandardMaterial
            color={plank.color}
            roughness={0.85}
            metalness={0.02}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

interface CornerQuoinProps {
  height: number;
  position: [number, number, number];
  opacity?: number;
  blockCount?: number;
}

export function CornerQuoin({
  height,
  position,
  opacity = 1,
  blockCount = 4,
}: CornerQuoinProps) {
  const blocks = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];

    const blockHeight = height / blockCount;
    const colors = [STONE_COLORS.light, STONE_COLORS.medium];

    for (let i = 0; i < blockCount; i++) {
      const y = -height / 2 + blockHeight / 2 + i * blockHeight;
      const color = colors[i % 2];

      result.push({
        position: [0, y, 0],
        size: [0.25, blockHeight - 0.02, 0.25],
        color,
      });
    }

    return result;
  }, [height, blockCount]);

  return (
    <group position={position}>
      {blocks.map((block, i) => (
        <mesh key={i} position={block.position} castShadow receiveShadow>
          <boxGeometry args={block.size} />
          <meshStandardMaterial
            color={block.color}
            roughness={0.85}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

// Pitched roof with wood planks (for cottages, etc.)
interface PitchedWoodRoofProps {
  width: number;
  depth: number;
  roofHeight: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  opacity?: number;
  seed?: number;
  woodTone?: 'light' | 'medium' | 'dark' | 'weathered' | 'darkStain';
}

export function PitchedWoodRoof({
  width,
  depth,
  roofHeight,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  opacity = 1,
  seed = 0,
  woodTone = 'medium',
}: PitchedWoodRoofProps) {
  const roofGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(0, roofHeight);
    shape.lineTo(width / 2, 0);
    shape.closePath();

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: false,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -depth / 2);
    geo.rotateY(Math.PI / 2);

    return geo;
  }, [width, depth, roofHeight]);

  // Generate plank lines on the roof surface
  const plankLines = useMemo(() => {
    const lines: Array<{ y: number; color: string }> = [];
    const plankCount = 12;
    const colors = [WOOD_COLORS.medium, WOOD_COLORS.dark, WOOD_COLORS.light];

    for (let i = 0; i < plankCount; i++) {
      const y = (i / plankCount) * roofHeight * 0.9;
      const colorIndex = Math.floor(seededRandom(seed + i) * colors.length);
      lines.push({ y, color: colors[colorIndex] });
    }

    return lines;
  }, [roofHeight, seed]);

  const toneColors: Record<string, string> = {
    light: WOOD_COLORS.light,
    medium: WOOD_COLORS.medium,
    dark: WOOD_COLORS.dark,
    weathered: WOOD_COLORS.weathered,
    darkStain: WOOD_COLORS.darkStain,
  };

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={roofGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={toneColors[woodTone]}
          roughness={0.8}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {/* Plank detail lines */}
      {plankLines.map((line, i) => (
        <mesh
          key={i}
          position={[0, line.y + 0.01, 0]}
          rotation={[0, 0, 0]}
          castShadow
        >
          <boxGeometry args={[depth * 1.05, 0.02, width * 0.01]} />
          <meshStandardMaterial
            color={WOOD_COLORS.dark}
            roughness={0.9}
            transparent={opacity < 1}
            opacity={opacity * 0.7}
          />
        </mesh>
      ))}
    </group>
  );
}
