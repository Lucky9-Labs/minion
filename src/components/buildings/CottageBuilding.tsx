'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';

interface CottageBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
}

export function CottageBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
}: CottageBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = 1.5;
  const floorHeight = 0.8;
  const totalHeight = baseHeight + Math.min(level - 1, 3) * floorHeight;

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
      {/* Foundation/Base */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={opacity} />
      </mesh>

      {/* Main walls */}
      {stage !== 'planning' && (
        <mesh position={[0, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, totalHeight, 1.8]} />
          <meshStandardMaterial
            color="#E8DCC4"
            transparent
            opacity={stage === 'scaffolding' ? 0.6 : opacity}
          />
        </mesh>
      )}

      {/* Roof */}
      {showRoof && (
        <mesh
          position={[0, totalHeight + 0.7, 0]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
        >
          <coneGeometry args={[1.6, 1, 4]} />
          <meshStandardMaterial
            color="#8B4513"
            transparent
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
          />
        </mesh>
      )}

      {/* Chimney */}
      {showRoof && (
        <mesh position={[0.5, totalHeight + 0.8, 0.5]} castShadow>
          <boxGeometry args={[0.3, 0.8, 0.3]} />
          <meshStandardMaterial color="#696969" transparent opacity={opacity} />
        </mesh>
      )}

      {/* Door */}
      {stage !== 'planning' && (
        <mesh position={[0, 0.5, 0.91]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.05]} />
          <meshStandardMaterial color="#5D4037" transparent opacity={opacity} />
        </mesh>
      )}

      {/* Windows */}
      {stage !== 'planning' && stage !== 'foundation' && (
        <>
          <mesh position={[0.6, 1, 0.91]} castShadow>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={opacity} />
          </mesh>
          <mesh position={[-0.6, 1, 0.91]} castShadow>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Scaffolding */}
      {showScaffolding && (
        <group>
          {/* Vertical poles */}
          {[
            [-1.2, 0, -1.2],
            [1.2, 0, -1.2],
            [-1.2, 0, 1.2],
            [1.2, 0, 1.2],
          ].map((pos, i) => (
            <mesh key={i} position={[pos[0], totalHeight / 2 + 0.5, pos[2]]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, totalHeight + 1]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
          {/* Horizontal beams */}
          {[0.5, 1.5, 2.5].slice(0, Math.ceil(totalHeight)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, -1.2]} castShadow>
                <boxGeometry args={[2.4, 0.08, 0.08]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0, y, 1.2]} castShadow>
                <boxGeometry args={[2.4, 0.08, 0.08]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Decorations for completed buildings */}
      {showDecorations && (
        <group>
          {/* Flower box under window */}
          <mesh position={[0.6, 0.7, 1]} castShadow>
            <boxGeometry args={[0.4, 0.15, 0.15]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          {/* Flowers */}
          {[-0.1, 0, 0.1].map((x, i) => (
            <mesh key={i} position={[0.6 + x, 0.85, 1]} castShadow>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial color={['#FF69B4', '#FF6347', '#FFD700'][i]} />
            </mesh>
          ))}
          {/* Light by door */}
          <mesh position={[0.35, 1, 0.95]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Planning stakes */}
      {stage === 'planning' && (
        <>
          {[
            [-0.8, -0.8],
            [0.8, -0.8],
            [-0.8, 0.8],
            [0.8, 0.8],
          ].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.2, z]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.4]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
          {/* String between stakes */}
          <lineSegments>
            <edgesGeometry
              args={[new THREE.BoxGeometry(1.6, 0.01, 1.6)]}
            />
            <lineBasicMaterial color="#F5DEB3" />
          </lineSegments>
        </>
      )}
    </group>
  );
}
