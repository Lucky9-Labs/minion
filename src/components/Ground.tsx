'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// Floating island with dramatic visible depth layers
// Inspired by voxel games and Monument Valley style isometric art

const ISLAND_SIZE = 14;
const LAYER_HEIGHT = 1.0; // Thick layers for visible depth

export function Ground() {
  return (
    <group>
      {/* The floating island platform */}
      <FloatingIsland />

      {/* Decorative 3D elements on the island */}
      <Tree position={[-4.5, 0.5, -3.5]} scale={1.1} />
      <Tree position={[-5, 0.5, 2.5]} scale={0.9} />
      <Tree position={[4.5, 0.5, -3]} scale={1.0} />
      <Tree position={[3.5, 0.5, 4.5]} scale={0.85} />
      <Tree position={[-3.5, 0.5, 5]} scale={0.95} />

      {/* Rock formations */}
      <RockFormation position={[-5.5, 0.5, -5]} />
      <RockFormation position={[5, 0.5, -5.5]} />
      <RockFormation position={[5.5, 0.5, 5]} />

      {/* Stone path to tower */}
      <StonePath />
    </group>
  );
}

function FloatingIsland() {
  // Create a dramatic floating island with clearly visible layered sides
  // Each layer is slightly smaller, creating a stepped pyramid effect
  return (
    <group>
      {/* TOP LAYER - Grass surface */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE, LAYER_HEIGHT, ISLAND_SIZE]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
      </mesh>

      {/* Grass edge trim - darker green */}
      <mesh position={[0, -LAYER_HEIGHT * 0.6, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE + 0.2, LAYER_HEIGHT * 0.3, ISLAND_SIZE + 0.2]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} />
      </mesh>

      {/* LAYER 2 - Rich brown dirt */}
      <mesh position={[0, -LAYER_HEIGHT * 1.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 0.5, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 0.5]} />
        <meshStandardMaterial color="#a3761c" roughness={0.9} />
      </mesh>

      {/* LAYER 3 - Darker earth */}
      <mesh position={[0, -LAYER_HEIGHT * 3, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 1.2, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 1.2]} />
        <meshStandardMaterial color="#7c5a1a" roughness={0.9} />
      </mesh>

      {/* LAYER 4 - Stone layer */}
      <mesh position={[0, -LAYER_HEIGHT * 4.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 2, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.95} />
      </mesh>

      {/* LAYER 5 - Darker stone */}
      <mesh position={[0, -LAYER_HEIGHT * 6, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 3, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 3]} />
        <meshStandardMaterial color="#4b5563" roughness={0.95} />
      </mesh>

      {/* LAYER 6 - Deep rock base */}
      <mesh position={[0, -LAYER_HEIGHT * 7.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 4.5, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 4.5]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>

      {/* Bottom point - dramatic tapered bottom */}
      <mesh position={[0, -LAYER_HEIGHT * 9, 0]} receiveShadow castShadow>
        <boxGeometry args={[ISLAND_SIZE - 6, LAYER_HEIGHT * 1.5, ISLAND_SIZE - 6]} />
        <meshStandardMaterial color="#1f2937" roughness={0.95} />
      </mesh>

      {/* Final spike at bottom */}
      <mesh position={[0, -LAYER_HEIGHT * 10.5, 0]} castShadow>
        <coneGeometry args={[3, 2, 4]} />
        <meshStandardMaterial color="#111827" roughness={0.95} />
      </mesh>

      {/* Hanging vines/roots */}
      <HangingRoots />

      {/* Floating crystal below for magic effect */}
      <FloatingCrystal position={[0, -LAYER_HEIGHT * 12, 0]} />
    </group>
  );
}

function HangingRoots() {
  const roots = useMemo(() => {
    const positions: [number, number, number, number][] = [];
    const edgeOffset = ISLAND_SIZE / 2 - 1;

    // Roots hanging from edges
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * edgeOffset * 0.8;
      const z = Math.sin(angle) * edgeOffset * 0.8;
      const length = 1.5 + Math.random() * 2;
      positions.push([x, -LAYER_HEIGHT * 2, z, length]);
    }
    return positions;
  }, []);

  return (
    <group>
      {roots.map(([x, y, z, length], i) => (
        <mesh key={i} position={[x, y - length / 2, z]} castShadow>
          <cylinderGeometry args={[0.08, 0.03, length, 6]} />
          <meshStandardMaterial color="#5d4037" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingCrystal({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main crystal */}
      <mesh castShadow>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>
      {/* Glow effect */}
      <pointLight color="#a78bfa" intensity={2} distance={8} />
    </group>
  );
}

function StonePath() {
  const pathTiles = useMemo(() => {
    const tiles: { x: number; z: number; height: number; size: number }[] = [];
    // Path from tower entrance outward
    for (let z = 2.5; z < 6; z += 0.9) {
      tiles.push({
        x: 0,
        z,
        height: 0.15 + Math.random() * 0.1,
        size: 0.7 + Math.random() * 0.2
      });
    }
    // Branch paths
    tiles.push({ x: -1, z: 5, height: 0.12, size: 0.6 });
    tiles.push({ x: 1, z: 5, height: 0.12, size: 0.6 });
    tiles.push({ x: -1.8, z: 5.8, height: 0.1, size: 0.5 });
    tiles.push({ x: 1.8, z: 5.8, height: 0.1, size: 0.5 });
    return tiles;
  }, []);

  return (
    <group position={[0, LAYER_HEIGHT / 2, 0]}>
      {pathTiles.map(({ x, z, height, size }, i) => (
        <mesh key={i} castShadow receiveShadow position={[x, height / 2, z]}>
          <boxGeometry args={[size, height, size]} />
          <meshStandardMaterial color="#78716c" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]} scale={scale}>
      {/* Trunk - thick and visible */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 1.6, 8]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </mesh>

      {/* Foliage - stacked cones for depth */}
      <mesh castShadow position={[0, 1.8, 0]}>
        <coneGeometry args={[1.2, 1.6, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.85} flatShading />
      </mesh>
      <mesh castShadow position={[0, 2.6, 0]}>
        <coneGeometry args={[0.9, 1.3, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} flatShading />
      </mesh>
      <mesh castShadow position={[0, 3.2, 0]}>
        <coneGeometry args={[0.6, 1.0, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

function RockFormation({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;

  return (
    <group position={[x, y, z]}>
      {/* Main boulder */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]} rotation={[0.1, 0.5, 0.1]}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color="#78716c" roughness={0.95} flatShading />
      </mesh>
      {/* Smaller rocks */}
      <mesh castShadow receiveShadow position={[0.4, 0.15, 0.3]} rotation={[0, 0.8, 0]}>
        <dodecahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial color="#a1a1aa" roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.3, 0.12, 0.2]} rotation={[0.2, 1.2, 0]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#71717a" roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}
