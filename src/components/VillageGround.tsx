'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface VillageGroundProps {
  size: number;
  onClick?: (event: THREE.Event) => void;
}

// Simple seeded random for consistent terrain
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function VillageGround({ size, onClick }: VillageGroundProps) {
  const groundRef = useRef<THREE.Mesh>(null);

  // Generate terrain details
  const details = useMemo(() => {
    const random = seededRandom(42);
    const items: Array<{
      type: 'tree' | 'rock' | 'flower' | 'grass';
      position: [number, number, number];
      scale: number;
      rotation: number;
    }> = [];

    const halfSize = size / 2;
    const centerClearRadius = 5; // Keep center clear for main tower

    // Trees
    for (let i = 0; i < Math.floor(size * 1.5); i++) {
      const x = (random() - 0.5) * size * 0.9;
      const z = (random() - 0.5) * size * 0.9;
      const distFromCenter = Math.sqrt(x * x + z * z);

      if (distFromCenter > centerClearRadius && distFromCenter < halfSize * 0.9) {
        items.push({
          type: 'tree',
          position: [x, 0, z],
          scale: 0.8 + random() * 0.6,
          rotation: random() * Math.PI * 2,
        });
      }
    }

    // Rocks
    for (let i = 0; i < Math.floor(size * 0.5); i++) {
      const x = (random() - 0.5) * size * 0.85;
      const z = (random() - 0.5) * size * 0.85;
      const distFromCenter = Math.sqrt(x * x + z * z);

      if (distFromCenter > centerClearRadius * 0.5) {
        items.push({
          type: 'rock',
          position: [x, 0.1, z],
          scale: 0.3 + random() * 0.5,
          rotation: random() * Math.PI * 2,
        });
      }
    }

    // Flowers
    for (let i = 0; i < Math.floor(size * 2); i++) {
      const x = (random() - 0.5) * size * 0.8;
      const z = (random() - 0.5) * size * 0.8;
      items.push({
        type: 'flower',
        position: [x, 0.1, z],
        scale: 0.5 + random() * 0.5,
        rotation: random() * Math.PI * 2,
      });
    }

    // Grass patches
    for (let i = 0; i < Math.floor(size * 3); i++) {
      const x = (random() - 0.5) * size * 0.9;
      const z = (random() - 0.5) * size * 0.9;
      items.push({
        type: 'grass',
        position: [x, 0.05, z],
        scale: 0.3 + random() * 0.4,
        rotation: random() * Math.PI * 2,
      });
    }

    return items;
  }, [size]);

  // Animate grass slightly
  const grassRefs = useRef<THREE.Mesh[]>([]);
  useFrame((state) => {
    grassRefs.current.forEach((grass, i) => {
      if (grass) {
        grass.rotation.z = Math.sin(state.clock.elapsedTime * 2 + i * 0.5) * 0.05;
      }
    });
  });

  return (
    <group>
      {/* Main ground plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={onClick}
      >
        <planeGeometry args={[size, size, 32, 32]} />
        <meshStandardMaterial color="#4A7C4E" roughness={0.9} />
      </mesh>

      {/* Dirt path pattern around center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[3, 5, 32]} />
        <meshStandardMaterial color="#8B7355" roughness={1} />
      </mesh>

      {/* Terrain details */}
      {details.map((item, i) => {
        switch (item.type) {
          case 'tree':
            return (
              <group
                key={i}
                position={item.position}
                rotation={[0, item.rotation, 0]}
                scale={item.scale}
              >
                {/* Trunk */}
                <mesh position={[0, 0.8, 0]} castShadow>
                  <cylinderGeometry args={[0.15, 0.2, 1.6]} />
                  <meshStandardMaterial color="#8B4513" />
                </mesh>
                {/* Foliage layers */}
                <mesh position={[0, 1.8, 0]} castShadow>
                  <coneGeometry args={[0.8, 1.2, 8]} />
                  <meshStandardMaterial color="#228B22" />
                </mesh>
                <mesh position={[0, 2.4, 0]} castShadow>
                  <coneGeometry args={[0.6, 1, 8]} />
                  <meshStandardMaterial color="#2E8B57" />
                </mesh>
                <mesh position={[0, 2.9, 0]} castShadow>
                  <coneGeometry args={[0.4, 0.8, 8]} />
                  <meshStandardMaterial color="#3CB371" />
                </mesh>
              </group>
            );

          case 'rock':
            return (
              <mesh
                key={i}
                position={item.position}
                rotation={[item.rotation * 0.2, item.rotation, 0]}
                scale={[item.scale, item.scale * 0.7, item.scale]}
                castShadow
              >
                <dodecahedronGeometry args={[0.5]} />
                <meshStandardMaterial color="#696969" roughness={0.9} />
              </mesh>
            );

          case 'flower':
            return (
              <group key={i} position={item.position} scale={item.scale}>
                {/* Stem */}
                <mesh position={[0, 0.1, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.2]} />
                  <meshStandardMaterial color="#228B22" />
                </mesh>
                {/* Petals */}
                <mesh position={[0, 0.22, 0]}>
                  <sphereGeometry args={[0.06]} />
                  <meshStandardMaterial
                    color={
                      ['#FF69B4', '#FFD700', '#FF6347', '#9370DB', '#FFFFFF'][
                        Math.floor(item.rotation * 5) % 5
                      ]
                    }
                  />
                </mesh>
              </group>
            );

          case 'grass':
            return (
              <mesh
                key={i}
                ref={(el) => {
                  if (el) grassRefs.current[i] = el;
                }}
                position={item.position}
                rotation={[0, item.rotation, 0]}
                scale={item.scale}
              >
                <coneGeometry args={[0.08, 0.3, 4]} />
                <meshStandardMaterial color="#6B8E23" />
              </mesh>
            );

          default:
            return null;
        }
      })}

      {/* Border fence posts (optional, sparse) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = size * 0.45;
        return (
          <mesh
            key={`post-${i}`}
            position={[Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius]}
            castShadow
          >
            <cylinderGeometry args={[0.08, 0.1, 0.6]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        );
      })}
    </group>
  );
}
