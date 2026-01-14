'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';
import { STONE_COLORS, WOOD_COLORS } from './materials/StoneMaterial';

interface LaboratoryBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
}

export function LaboratoryBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
}: LaboratoryBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bubbleRef = useRef<THREE.Mesh>(null);

  const baseHeight = 2.5;
  const floorHeight = 1.2;
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
  const showStoneDetail = stage === 'constructed' || stage === 'decorated';

  // Animate bubbles
  useFrame((state) => {
    if (bubbleRef.current && showDecorations) {
      bubbleRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation - gray stone, slightly crooked */}
      <mesh position={[0.1, 0.15, 0]} rotation={[0, 0.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.3, 2.5]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
      </mesh>

      {/* Main tower - slightly tilted for character, stone gray */}
      {stage !== 'planning' && (
        <group rotation={[0.02, 0.03, 0.02]}>
          {/* Main cylindrical body - stone */}
          <mesh position={[0, totalHeight / 2 + 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1, 1.2, totalHeight, 8]} />
            <meshStandardMaterial
              color={STONE_COLORS.medium}
              transparent
              opacity={stage === 'scaffolding' ? 0.6 : opacity}
              roughness={0.9}
            />
          </mesh>

          {/* Stone band rings for detail when constructed */}
          {showStoneDetail && (
            <>
              {/* Base ring */}
              <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[1.25, 1.3, 0.2, 8]} />
                <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
              </mesh>
              {/* Middle rings based on height */}
              {[1, 2, 3].slice(0, Math.floor(totalHeight / 2)).map((i) => (
                <mesh key={i} position={[0, i * 1.2, 0]} castShadow>
                  <cylinderGeometry args={[1.08, 1.08, 0.15, 8]} />
                  <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
                </mesh>
              ))}
              {/* Top ring */}
              <mesh position={[0, totalHeight + 0.2, 0]} castShadow>
                <cylinderGeometry args={[1.05, 1.1, 0.2, 8]} />
                <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Conical roof with wood planks - dark stained */}
      {showRoof && (
        <group rotation={[0.02, 0.03, 0.02]}>
          {/* Main cone roof - wood */}
          <mesh position={[0, totalHeight + 0.7, 0]} castShadow>
            <coneGeometry args={[1.3, 1.2, 8]} />
            <meshStandardMaterial
              color={WOOD_COLORS.darkStain}
              roughness={0.8}
              transparent
              opacity={stage === 'scaffolding' ? 0.5 : opacity}
            />
          </mesh>
          {/* Roof trim ring */}
          <mesh position={[0, totalHeight + 0.2, 0]} castShadow>
            <cylinderGeometry args={[1.35, 1.35, 0.1, 8]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} transparent opacity={opacity} />
          </mesh>
          {/* Spire - stone with purple crystal */}
          <mesh position={[0, totalHeight + 1.4, 0]} castShadow>
            <coneGeometry args={[0.12, 0.6, 6]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.85} transparent opacity={opacity} />
          </mesh>
          {/* Magic crystal on top */}
          <mesh position={[0, totalHeight + 1.8, 0]} castShadow>
            <octahedronGeometry args={[0.1]} />
            <meshStandardMaterial
              color="#9370DB"
              emissive="#9370DB"
              emissiveIntensity={showDecorations ? 0.6 : 0.2}
              transparent
              opacity={opacity}
            />
          </mesh>
        </group>
      )}

      {/* Round windows with stone frames */}
      {stage !== 'planning' && stage !== 'foundation' &&
        [0, 1, 2].slice(0, Math.ceil(totalHeight / 2)).map((i) => (
          <group
            key={i}
            position={[
              Math.cos(i * 1.5) * 1.01,
              1.2 + i * 1.5,
              Math.sin(i * 1.5) * 1.01,
            ]}
            rotation={[0, -i * 1.5, 0]}
          >
            {/* Stone frame */}
            <mesh castShadow>
              <circleGeometry args={[0.32, 16]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
            </mesh>
            {/* Window glass - magical purple */}
            <mesh position={[0, 0, 0.02]} castShadow>
              <circleGeometry args={[0.22, 16]} />
              <meshStandardMaterial
                color="#9370DB"
                transparent
                opacity={opacity * 0.8}
                emissive="#9370DB"
                emissiveIntensity={showDecorations ? 0.3 : 0}
              />
            </mesh>
          </group>
        ))}

      {/* Scaffolding */}
      {showScaffolding && (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI) / 2) * 1.5,
                totalHeight / 2 + 0.5,
                Math.sin((i * Math.PI) / 2) * 1.5,
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.05, 0.05, totalHeight + 1.5]} />
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
          {[1, 2, 3].slice(0, Math.ceil(totalHeight / 1.5)).map((y, i) => (
            <mesh key={i} position={[0, y * 1.2, 0]}>
              <torusGeometry args={[1.5, 0.05, 8, 16]} />
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Bubbling cauldron outside on stone base */}
          <group position={[1.8, 0.3, 0]}>
            {/* Stone pedestal */}
            <mesh position={[0, -0.1, 0]} castShadow>
              <cylinderGeometry args={[0.4, 0.45, 0.2, 8]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
            </mesh>
            {/* Cauldron - iron */}
            <mesh castShadow>
              <cylinderGeometry args={[0.35, 0.25, 0.5, 16]} />
              <meshStandardMaterial color="#1f1f1f" metalness={0.4} roughness={0.7} />
            </mesh>
            {/* Glowing liquid */}
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 0.15, 16]} />
              <meshStandardMaterial
                color="#00FF7F"
                emissive="#00FF7F"
                emissiveIntensity={0.5}
                transparent
                opacity={0.8}
              />
            </mesh>
            {/* Bubbles */}
            <mesh ref={bubbleRef} position={[0.1, 0.35, 0.05]}>
              <sphereGeometry args={[0.05]} />
              <meshStandardMaterial
                color="#00FF7F"
                emissive="#00FF7F"
                emissiveIntensity={0.8}
                transparent
                opacity={0.6}
              />
            </mesh>
          </group>

          {/* Hanging herbs/bottles */}
          {[-0.3, 0, 0.3].map((x, i) => (
            <group key={i} position={[x, totalHeight + 0.2, 1.1]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.06, 0.08, 0.2, 8]} />
                <meshStandardMaterial
                  color={['#8B0000', '#006400', '#4B0082'][i]}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
          ))}

          {/* Mystical glow from windows */}
          <pointLight position={[0, 2, 0]} color="#9370DB" intensity={0.3} distance={4} />
        </group>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.6, 1.8, 32]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Planning stakes */}
      {stage === 'planning' && (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI) / 3) * 1.1,
                0.25,
                Math.sin((i * Math.PI) / 3) * 1.1,
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.03, 0.03, 0.5]} />
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
