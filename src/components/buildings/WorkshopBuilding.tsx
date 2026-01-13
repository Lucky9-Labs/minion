'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';

interface WorkshopBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
}

export function WorkshopBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
}: WorkshopBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = 2;
  const floorHeight = 1;
  const totalHeight = baseHeight + Math.min(level - 1, 4) * floorHeight;

  const stageOpacity = {
    planning: 0.3,
    foundation: 0.5,
    scaffolding: 0.8,
    constructed: 1,
    decorated: 1,
  };

  const opacity = stageOpacity[stage];
  const showScaffolding = stage === 'scaffolding';
  const showDecorations = stage === 'decorated';
  const showRoof = stage !== 'planning' && stage !== 'foundation';

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.3, 2.5]} />
        <meshStandardMaterial color="#4A4A4A" transparent opacity={opacity} />
      </mesh>

      {/* Main structure */}
      {stage !== 'planning' && (
        <mesh position={[0, totalHeight / 2 + 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, totalHeight, 2.3]} />
          <meshStandardMaterial
            color="#8B7355"
            transparent
            opacity={stage === 'scaffolding' ? 0.6 : opacity}
          />
        </mesh>
      )}

      {/* Slanted roof */}
      {showRoof && (
        <mesh position={[0, totalHeight + 0.8, 0]} castShadow>
          <boxGeometry args={[3.2, 0.3, 2.8]} />
          <meshStandardMaterial
            color="#2F4F4F"
            transparent
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
          />
        </mesh>
      )}

      {/* Forge chimney - tall and industrial */}
      {showRoof && (
        <mesh position={[-0.8, totalHeight + 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 2]} />
          <meshStandardMaterial color="#363636" transparent opacity={opacity} />
        </mesh>
      )}

      {/* Large door opening */}
      {stage !== 'planning' && (
        <mesh position={[0, 0.8, 1.16]} castShadow>
          <boxGeometry args={[1.2, 1.4, 0.1]} />
          <meshStandardMaterial color="#2D2D2D" transparent opacity={opacity} />
        </mesh>
      )}

      {/* Windows (small, high) */}
      {stage !== 'planning' && stage !== 'foundation' &&
        [1, 2, 3].slice(0, Math.ceil(totalHeight / 1.5)).map((i) => (
          <mesh key={i} position={[1, i * 0.9, 1.16]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.05]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.7} />
          </mesh>
        ))}

      {/* Scaffolding */}
      {showScaffolding && (
        <group>
          {[
            [-1.6, 0, -1.4],
            [1.6, 0, -1.4],
            [-1.6, 0, 1.4],
            [1.6, 0, 1.4],
          ].map((pos, i) => (
            <mesh key={i} position={[pos[0], totalHeight / 2 + 0.5, pos[2]]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, totalHeight + 1.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
          {[0.8, 1.8, 2.8].slice(0, Math.ceil(totalHeight)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, -1.4]} castShadow>
                <boxGeometry args={[3.2, 0.1, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0, y, 1.4]} castShadow>
                <boxGeometry args={[3.2, 0.1, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Anvil outside */}
          <group position={[1.8, 0.4, 0.5]}>
            <mesh castShadow>
              <boxGeometry args={[0.4, 0.3, 0.25]} />
              <meshStandardMaterial color="#363636" />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.5, 0.15, 0.35]} />
              <meshStandardMaterial color="#2F2F2F" />
            </mesh>
          </group>

          {/* Tool rack on wall */}
          <mesh position={[-1.41, 1.2, 0.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.1, 0.05]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>

          {/* Hanging tools */}
          {[-0.2, 0, 0.2].map((z, i) => (
            <mesh key={i} position={[-1.38, 1, 0.5 + z]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.3]} />
              <meshStandardMaterial color="#696969" />
            </mesh>
          ))}

          {/* Glowing forge inside */}
          <pointLight position={[0, 0.5, 0]} color="#FF4500" intensity={0.5} distance={3} />
        </group>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 2, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Planning stakes */}
      {stage === 'planning' && (
        <>
          {[
            [-1.3, -1.1],
            [1.3, -1.1],
            [-1.3, 1.1],
            [1.3, 1.1],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.25, z]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
