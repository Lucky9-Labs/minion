'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';

interface MarketBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
}

export function MarketBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
}: MarketBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseHeight = 1.8;
  const floorHeight = 0.7;
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
      {/* Foundation/Platform */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.2, 2.5]} />
        <meshStandardMaterial color="#8B7355" transparent opacity={opacity} />
      </mesh>

      {/* Main structure - open front */}
      {stage !== 'planning' && (
        <>
          {/* Back wall */}
          <mesh position={[0, totalHeight / 2 + 0.2, -1.1]} castShadow receiveShadow>
            <boxGeometry args={[2.8, totalHeight, 0.2]} />
            <meshStandardMaterial
              color="#DEB887"
              transparent
              opacity={stage === 'scaffolding' ? 0.6 : opacity}
            />
          </mesh>
          {/* Side walls */}
          <mesh position={[-1.4, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, totalHeight, 2]} />
            <meshStandardMaterial
              color="#DEB887"
              transparent
              opacity={stage === 'scaffolding' ? 0.6 : opacity}
            />
          </mesh>
          <mesh position={[1.4, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, totalHeight, 2]} />
            <meshStandardMaterial
              color="#DEB887"
              transparent
              opacity={stage === 'scaffolding' ? 0.6 : opacity}
            />
          </mesh>
        </>
      )}

      {/* Awning/Canopy - extends forward */}
      {showRoof && (
        <group>
          {/* Main awning */}
          <mesh position={[0, totalHeight + 0.3, 0.5]} rotation={[0.2, 0, 0]} castShadow>
            <boxGeometry args={[3.2, 0.1, 2.5]} />
            <meshStandardMaterial
              color="#B22222"
              transparent
              opacity={stage === 'scaffolding' ? 0.5 : opacity}
            />
          </mesh>
          {/* Striped pattern on awning */}
          {stage !== 'scaffolding' &&
            [-1, 0, 1].map((x, i) => (
              <mesh
                key={i}
                position={[x * 1, totalHeight + 0.35, 0.5]}
                rotation={[0.2, 0, 0]}
              >
                <boxGeometry args={[0.3, 0.12, 2.4]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={opacity * 0.9} />
              </mesh>
            ))}
        </group>
      )}

      {/* Support poles for awning */}
      {showRoof && (
        <>
          <mesh position={[-1.3, totalHeight / 2 + 0.5, 1.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, totalHeight + 0.5]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity} />
          </mesh>
          <mesh position={[1.3, totalHeight / 2 + 0.5, 1.2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, totalHeight + 0.5]} />
            <meshStandardMaterial color="#8B4513" transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Counter/display table */}
      {stage !== 'planning' && (
        <mesh position={[0, 0.5, 0.8]} castShadow>
          <boxGeometry args={[2.4, 0.15, 0.8]} />
          <meshStandardMaterial color="#8B4513" transparent opacity={opacity} />
        </mesh>
      )}

      {/* Scaffolding */}
      {showScaffolding && (
        <group>
          {[
            [-1.7, 0, -1.4],
            [1.7, 0, -1.4],
            [-1.7, 0, 1.4],
            [1.7, 0, 1.4],
          ].map((pos, i) => (
            <mesh key={i} position={[pos[0], totalHeight / 2 + 0.5, pos[2]]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, totalHeight + 1]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Goods on display */}
          {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
            <group key={i} position={[x, 0.65, 0.8]}>
              {/* Crates/baskets */}
              <mesh castShadow>
                <boxGeometry args={[0.35, 0.2, 0.35]} />
                <meshStandardMaterial color={['#D2691E', '#8B4513', '#A0522D', '#CD853F'][i]} />
              </mesh>
              {/* Items in baskets */}
              {[0, 1, 2].map((j) => (
                <mesh
                  key={j}
                  position={[(j - 1) * 0.08, 0.15, 0]}
                  castShadow
                >
                  <sphereGeometry args={[0.06]} />
                  <meshStandardMaterial
                    color={
                      [
                        ['#FF6347', '#FF4500', '#DC143C'],
                        ['#FFD700', '#FFA500', '#FF8C00'],
                        ['#32CD32', '#228B22', '#006400'],
                        ['#9370DB', '#8A2BE2', '#4B0082'],
                      ][i][j]
                    }
                  />
                </mesh>
              ))}
            </group>
          ))}

          {/* Hanging sign */}
          <group position={[0, totalHeight + 0.8, 1.5]}>
            <mesh castShadow>
              <boxGeometry args={[0.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Sign chains */}
            {[-0.35, 0.35].map((x, i) => (
              <mesh key={i} position={[x, 0.35, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.2]} />
                <meshStandardMaterial color="#696969" />
              </mesh>
            ))}
          </group>

          {/* Lanterns */}
          {[-1.2, 1.2].map((x, i) => (
            <group key={i} position={[x, totalHeight + 0.1, 1.1]}>
              <mesh castShadow>
                <boxGeometry args={[0.15, 0.2, 0.15]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <pointLight
                position={[0, 0, 0]}
                color="#FFD700"
                intensity={0.3}
                distance={2}
              />
            </group>
          ))}
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
