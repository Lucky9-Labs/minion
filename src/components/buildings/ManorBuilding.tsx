'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';

interface ManorBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
}

export function ManorBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
}: ManorBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = 2.5;
  const floorHeight = 1;
  const totalHeight = baseHeight + Math.min(level - 1, 5) * floorHeight;

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
        <boxGeometry args={[4, 0.3, 3]} />
        <meshStandardMaterial color="#696969" transparent opacity={opacity} />
      </mesh>

      {/* Main building - center section */}
      {stage !== 'planning' && (
        <mesh position={[0, totalHeight / 2 + 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, totalHeight, 2.5]} />
          <meshStandardMaterial
            color="#D4C4A8"
            transparent
            opacity={stage === 'scaffolding' ? 0.6 : opacity}
          />
        </mesh>
      )}

      {/* Left wing */}
      {stage !== 'planning' && (
        <mesh
          position={[-1.8, (totalHeight * 0.7) / 2 + 0.3, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.2, totalHeight * 0.7, 2]} />
          <meshStandardMaterial
            color="#D4C4A8"
            transparent
            opacity={stage === 'scaffolding' ? 0.6 : opacity}
          />
        </mesh>
      )}

      {/* Right wing */}
      {stage !== 'planning' && (
        <mesh
          position={[1.8, (totalHeight * 0.7) / 2 + 0.3, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1.2, totalHeight * 0.7, 2]} />
          <meshStandardMaterial
            color="#D4C4A8"
            transparent
            opacity={stage === 'scaffolding' ? 0.6 : opacity}
          />
        </mesh>
      )}

      {/* Main roof - center */}
      {showRoof && (
        <mesh position={[0, totalHeight + 0.8, 0]} rotation={[0, 0, 0]} castShadow>
          <coneGeometry args={[2, 1.3, 4]} />
          <meshStandardMaterial
            color="#4A4A4A"
            transparent
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
          />
        </mesh>
      )}

      {/* Wing roofs */}
      {showRoof && (
        <>
          <mesh
            position={[-1.8, totalHeight * 0.7 + 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.8, 0.8, 2.2, 3]} />
            <meshStandardMaterial
              color="#4A4A4A"
              transparent
              opacity={stage === 'scaffolding' ? 0.5 : opacity}
            />
          </mesh>
          <mesh
            position={[1.8, totalHeight * 0.7 + 0.6, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.8, 0.8, 2.2, 3]} />
            <meshStandardMaterial
              color="#4A4A4A"
              transparent
              opacity={stage === 'scaffolding' ? 0.5 : opacity}
            />
          </mesh>
        </>
      )}

      {/* Chimneys */}
      {showRoof && (
        <>
          <mesh position={[-0.8, totalHeight + 1.2, -0.8]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity} />
          </mesh>
          <mesh position={[0.8, totalHeight + 1.2, -0.8]} castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Grand entrance */}
      {stage !== 'planning' && (
        <>
          {/* Double doors */}
          <mesh position={[0, 0.7, 1.26]} castShadow>
            <boxGeometry args={[0.8, 1.2, 0.1]} />
            <meshStandardMaterial color="#4A3728" transparent opacity={opacity} />
          </mesh>
          {/* Door frame/arch */}
          <mesh position={[0, 1.4, 1.28]} castShadow>
            <boxGeometry args={[1, 0.15, 0.15]} />
            <meshStandardMaterial color="#696969" transparent opacity={opacity} />
          </mesh>
          {/* Columns */}
          {[-0.55, 0.55].map((x, i) => (
            <mesh key={i} position={[x, 0.7, 1.35]} castShadow>
              <cylinderGeometry args={[0.08, 0.1, 1.4]} />
              <meshStandardMaterial color="#E8E8E8" transparent opacity={opacity} />
            </mesh>
          ))}
        </>
      )}

      {/* Windows */}
      {stage !== 'planning' &&
        stage !== 'foundation' &&
        [-0.8, 0.8].map((x) =>
          [1, 2, 3].slice(0, Math.ceil(totalHeight / 1.5)).map((y, i) => (
            <mesh key={`${x}-${i}`} position={[x, y * 0.9 + 0.3, 1.26]} castShadow>
              <boxGeometry args={[0.35, 0.5, 0.05]} />
              <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.8} />
            </mesh>
          ))
        )}

      {/* Scaffolding */}
      {showScaffolding && (
        <group>
          {[
            [-2.5, 0, -1.6],
            [2.5, 0, -1.6],
            [-2.5, 0, 1.6],
            [2.5, 0, 1.6],
            [0, 0, -1.6],
            [0, 0, 1.8],
          ].map((pos, i) => (
            <mesh key={i} position={[pos[0], totalHeight / 2 + 0.5, pos[2]]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, totalHeight + 1.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
          {[1, 2, 3].slice(0, Math.ceil(totalHeight / 1.2)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y * 1.1, -1.6]} castShadow>
                <boxGeometry args={[5, 0.1, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0, y * 1.1, 1.6]} castShadow>
                <boxGeometry args={[5, 0.1, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Garden/courtyard elements */}
          {[-1.5, 1.5].map((x, i) => (
            <group key={i} position={[x, 0.4, 2]}>
              {/* Planter */}
              <mesh castShadow>
                <cylinderGeometry args={[0.25, 0.2, 0.3, 8]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              {/* Bush/topiary */}
              <mesh position={[0, 0.35, 0]} castShadow>
                <sphereGeometry args={[0.3]} />
                <meshStandardMaterial color="#228B22" />
              </mesh>
            </group>
          ))}

          {/* Flags on roof */}
          {[-0.5, 0.5].map((x, i) => (
            <group key={i} position={[x, totalHeight + 1.5, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.6]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0.15, 0.15, 0]} castShadow>
                <boxGeometry args={[0.25, 0.2, 0.02]} />
                <meshStandardMaterial color={i === 0 ? '#B22222' : '#1E3A8A'} />
              </mesh>
            </group>
          ))}

          {/* Lit windows at night */}
          <pointLight position={[0, 1.5, 1]} color="#FFD700" intensity={0.4} distance={3} />
          <pointLight position={[-1.8, 1, 0]} color="#FFD700" intensity={0.2} distance={2} />
          <pointLight position={[1.8, 1, 0]} color="#FFD700" intensity={0.2} distance={2} />
        </group>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.3, 2.5, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Planning stakes */}
      {stage === 'planning' && (
        <>
          {[
            [-1.8, -1.3],
            [1.8, -1.3],
            [-1.8, 1.3],
            [1.8, 1.3],
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
