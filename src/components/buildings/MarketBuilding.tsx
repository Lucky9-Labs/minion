'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';
import { StoneWall, WoodPlankRoof, STONE_COLORS, WOOD_COLORS } from './materials/StoneMaterial';

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
  const showStoneDetail = stage === 'constructed' || stage === 'decorated';

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation/Platform - stone */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.2, 2.5]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
      </mesh>

      {/* Main structure - half-timber style (stone base, wood upper) */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Back wall - stone lower, wood upper */}
              <StoneWall
                width={2.8}
                height={totalHeight * 0.6}
                depth={0.15}
                position={[0, totalHeight * 0.3 + 0.2, -1.1]}
                blockRows={Math.max(2, Math.floor(totalHeight * 0.4))}
                blockCols={5}
                opacity={opacity}
                seed={300}
              />
              {/* Wood upper back */}
              <mesh position={[0, totalHeight * 0.6 + totalHeight * 0.2 + 0.2, -1.1]} castShadow receiveShadow>
                <boxGeometry args={[2.8, totalHeight * 0.4, 0.15]} />
                <meshStandardMaterial color={WOOD_COLORS.weathered} roughness={0.85} transparent opacity={opacity} />
              </mesh>
              {/* Wood beams on back */}
              {[-1.2, 0, 1.2].map((x, i) => (
                <mesh key={i} position={[x, totalHeight / 2 + 0.2, -1.08]} castShadow>
                  <boxGeometry args={[0.1, totalHeight, 0.08]} />
                  <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
                </mesh>
              ))}

              {/* Side walls - stone lower half */}
              <StoneWall
                width={2}
                height={totalHeight * 0.6}
                depth={0.15}
                position={[-1.4, totalHeight * 0.3 + 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(2, Math.floor(totalHeight * 0.4))}
                blockCols={4}
                opacity={opacity}
                seed={301}
              />
              <StoneWall
                width={2}
                height={totalHeight * 0.6}
                depth={0.15}
                position={[1.4, totalHeight * 0.3 + 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(2, Math.floor(totalHeight * 0.4))}
                blockCols={4}
                opacity={opacity}
                seed={302}
              />
              {/* Wood upper sides */}
              <mesh position={[-1.4, totalHeight * 0.6 + totalHeight * 0.2 + 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.15, totalHeight * 0.4, 2]} />
                <meshStandardMaterial color={WOOD_COLORS.weathered} roughness={0.85} transparent opacity={opacity} />
              </mesh>
              <mesh position={[1.4, totalHeight * 0.6 + totalHeight * 0.2 + 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.15, totalHeight * 0.4, 2]} />
                <meshStandardMaterial color={WOOD_COLORS.weathered} roughness={0.85} transparent opacity={opacity} />
              </mesh>
              {/* Wood beams on sides */}
              <mesh position={[-1.38, totalHeight / 2 + 0.2, 0]} castShadow>
                <boxGeometry args={[0.08, totalHeight, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
              </mesh>
              <mesh position={[1.38, totalHeight / 2 + 0.2, 0]} castShadow>
                <boxGeometry args={[0.08, totalHeight, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
              </mesh>
            </>
          ) : (
            <>
              {/* Simple solid walls during construction */}
              <mesh position={[0, totalHeight / 2 + 0.2, -1.1]} castShadow receiveShadow>
                <boxGeometry args={[2.8, totalHeight, 0.2]} />
                <meshStandardMaterial
                  color={STONE_COLORS.medium}
                  transparent
                  opacity={stage === 'scaffolding' ? 0.6 : opacity}
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[-1.4, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.2, totalHeight, 2]} />
                <meshStandardMaterial
                  color={STONE_COLORS.medium}
                  transparent
                  opacity={stage === 'scaffolding' ? 0.6 : opacity}
                  roughness={0.9}
                />
              </mesh>
              <mesh position={[1.4, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.2, totalHeight, 2]} />
                <meshStandardMaterial
                  color={STONE_COLORS.medium}
                  transparent
                  opacity={stage === 'scaffolding' ? 0.6 : opacity}
                  roughness={0.9}
                />
              </mesh>
            </>
          )}
        </>
      )}

      {/* Awning/Canopy - wood plank roof extending forward */}
      {showRoof && (
        <group>
          {/* Main wooden awning */}
          <WoodPlankRoof
            width={3.2}
            depth={2.5}
            thickness={0.12}
            position={[0, totalHeight + 0.25, 0.5]}
            rotation={[0.15, 0, 0]}
            plankCount={10}
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
            seed={310}
            woodTone="medium"
          />
          {/* Front edge trim */}
          <mesh position={[0, totalHeight + 0.15, 1.7]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[3.3, 0.08, 0.15]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} transparent opacity={opacity} />
          </mesh>
        </group>
      )}

      {/* Support poles for awning - wood */}
      {showRoof && (
        <>
          <mesh position={[-1.3, totalHeight / 2 + 0.5, 1.2]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, totalHeight + 0.5]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
          </mesh>
          <mesh position={[1.3, totalHeight / 2 + 0.5, 1.2]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, totalHeight + 0.5]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
          </mesh>
          {/* Cross braces */}
          <mesh position={[0, totalHeight - 0.2, 1.2]} castShadow>
            <boxGeometry args={[2.6, 0.08, 0.08]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.8} transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Counter/display table - thick wood on stone base */}
      {stage !== 'planning' && (
        <group position={[0, 0.4, 0.8]}>
          {/* Stone counter base */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[2.4, 0.3, 0.6]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
          </mesh>
          {/* Wood counter top */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[2.5, 0.1, 0.7]} />
            <meshStandardMaterial color={WOOD_COLORS.medium} roughness={0.8} transparent opacity={opacity} />
          </mesh>
        </group>
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Goods on display - in wooden crates on stone counter */}
          {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
            <group key={i} position={[x, 0.7, 0.8]}>
              {/* Wooden crates/baskets */}
              <mesh castShadow>
                <boxGeometry args={[0.35, 0.2, 0.35]} />
                <meshStandardMaterial color={[WOOD_COLORS.medium, WOOD_COLORS.dark, WOOD_COLORS.weathered, WOOD_COLORS.light][i]} />
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

          {/* Hanging sign - wood with iron chains */}
          <group position={[0, totalHeight + 0.6, 1.5]}>
            <mesh castShadow>
              <boxGeometry args={[0.8, 0.5, 0.06]} />
              <meshStandardMaterial color={WOOD_COLORS.weathered} roughness={0.85} />
            </mesh>
            {/* Sign chains */}
            {[-0.35, 0.35].map((x, i) => (
              <mesh key={i} position={[x, 0.35, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.2]} />
                <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.6} />
              </mesh>
            ))}
          </group>

          {/* Lanterns on posts - iron with warm glow */}
          {[-1.2, 1.2].map((x, i) => (
            <group key={i} position={[x, totalHeight + 0.1, 1.1]}>
              {/* Iron lantern frame */}
              <mesh castShadow>
                <boxGeometry args={[0.18, 0.25, 0.18]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.7} />
              </mesh>
              {/* Glass panels */}
              <mesh position={[0, 0, 0.08]}>
                <boxGeometry args={[0.12, 0.18, 0.01]} />
                <meshStandardMaterial color="#fef3c7" transparent opacity={0.7} emissive="#fbbf24" emissiveIntensity={0.3} />
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
