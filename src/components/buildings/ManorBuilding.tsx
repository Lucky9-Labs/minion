'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';
import { StoneWall, WoodPlankRoof, CornerQuoin, STONE_COLORS, WOOD_COLORS } from './materials/StoneMaterial';

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
  const wingHeight = totalHeight * 0.7;

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
      {/* Foundation - formal cut stone */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.3, 3]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
      </mesh>

      {/* Main building - center section with stone walls */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Front wall - center */}
              <StoneWall
                width={2.5}
                height={totalHeight}
                depth={0.18}
                position={[0, totalHeight / 2 + 0.3, 1.16]}
                blockRows={Math.max(5, Math.floor(totalHeight / 0.5))}
                blockCols={5}
                opacity={opacity}
                seed={200}
              />
              {/* Back wall - center */}
              <StoneWall
                width={2.5}
                height={totalHeight}
                depth={0.18}
                position={[0, totalHeight / 2 + 0.3, -1.16]}
                blockRows={Math.max(5, Math.floor(totalHeight / 0.5))}
                blockCols={5}
                opacity={opacity}
                seed={201}
              />
              {/* Side walls - center */}
              <StoneWall
                width={2.1}
                height={totalHeight}
                depth={0.18}
                position={[-1.16, totalHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(5, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={202}
              />
              <StoneWall
                width={2.1}
                height={totalHeight}
                depth={0.18}
                position={[1.16, totalHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(5, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={203}
              />
              {/* Corner quoins - center */}
              <CornerQuoin height={totalHeight} position={[-1.2, totalHeight / 2 + 0.3, 1.2]} opacity={opacity} blockCount={Math.max(5, Math.floor(totalHeight / 0.5))} />
              <CornerQuoin height={totalHeight} position={[1.2, totalHeight / 2 + 0.3, 1.2]} opacity={opacity} blockCount={Math.max(5, Math.floor(totalHeight / 0.5))} />
              <CornerQuoin height={totalHeight} position={[-1.2, totalHeight / 2 + 0.3, -1.2]} opacity={opacity} blockCount={Math.max(5, Math.floor(totalHeight / 0.5))} />
              <CornerQuoin height={totalHeight} position={[1.2, totalHeight / 2 + 0.3, -1.2]} opacity={opacity} blockCount={Math.max(5, Math.floor(totalHeight / 0.5))} />
            </>
          ) : (
            <mesh position={[0, totalHeight / 2 + 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.5, totalHeight, 2.5]} />
              <meshStandardMaterial
                color={STONE_COLORS.medium}
                transparent
                opacity={stage === 'scaffolding' ? 0.6 : opacity}
                roughness={0.9}
              />
            </mesh>
          )}
        </>
      )}

      {/* Left wing with stone */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Left wing front */}
              <StoneWall
                width={1.2}
                height={wingHeight}
                depth={0.15}
                position={[-1.8, wingHeight / 2 + 0.3, 0.93]}
                blockRows={Math.max(3, Math.floor(wingHeight / 0.55))}
                blockCols={3}
                opacity={opacity}
                seed={210}
              />
              {/* Left wing outer */}
              <StoneWall
                width={1.8}
                height={wingHeight}
                depth={0.15}
                position={[-2.35, wingHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(3, Math.floor(wingHeight / 0.55))}
                blockCols={4}
                opacity={opacity}
                seed={211}
              />
              <CornerQuoin height={wingHeight} position={[-2.4, wingHeight / 2 + 0.3, 0.95]} opacity={opacity} blockCount={Math.max(3, Math.floor(wingHeight / 0.6))} />
              <CornerQuoin height={wingHeight} position={[-2.4, wingHeight / 2 + 0.3, -0.95]} opacity={opacity} blockCount={Math.max(3, Math.floor(wingHeight / 0.6))} />
            </>
          ) : (
            <mesh position={[-1.8, wingHeight / 2 + 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, wingHeight, 2]} />
              <meshStandardMaterial
                color={STONE_COLORS.medium}
                transparent
                opacity={stage === 'scaffolding' ? 0.6 : opacity}
                roughness={0.9}
              />
            </mesh>
          )}
        </>
      )}

      {/* Right wing with stone */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Right wing front */}
              <StoneWall
                width={1.2}
                height={wingHeight}
                depth={0.15}
                position={[1.8, wingHeight / 2 + 0.3, 0.93]}
                blockRows={Math.max(3, Math.floor(wingHeight / 0.55))}
                blockCols={3}
                opacity={opacity}
                seed={220}
              />
              {/* Right wing outer */}
              <StoneWall
                width={1.8}
                height={wingHeight}
                depth={0.15}
                position={[2.35, wingHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(3, Math.floor(wingHeight / 0.55))}
                blockCols={4}
                opacity={opacity}
                seed={221}
              />
              <CornerQuoin height={wingHeight} position={[2.4, wingHeight / 2 + 0.3, 0.95]} opacity={opacity} blockCount={Math.max(3, Math.floor(wingHeight / 0.6))} />
              <CornerQuoin height={wingHeight} position={[2.4, wingHeight / 2 + 0.3, -0.95]} opacity={opacity} blockCount={Math.max(3, Math.floor(wingHeight / 0.6))} />
            </>
          ) : (
            <mesh position={[1.8, wingHeight / 2 + 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, wingHeight, 2]} />
              <meshStandardMaterial
                color={STONE_COLORS.medium}
                transparent
                opacity={stage === 'scaffolding' ? 0.6 : opacity}
                roughness={0.9}
              />
            </mesh>
          )}
        </>
      )}

      {/* Main roof - center - wood planks */}
      {showRoof && (
        <group position={[0, totalHeight + 0.5, 0]}>
          {/* Pyramidal roof base with wood */}
          <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[2, 1.3, 4]} />
            <meshStandardMaterial
              color={WOOD_COLORS.medium}
              roughness={0.8}
              transparent
              opacity={stage === 'scaffolding' ? 0.5 : opacity}
            />
          </mesh>
          {/* Roof trim */}
          <mesh position={[0, -0.5, 0]} castShadow>
            <boxGeometry args={[2.7, 0.12, 2.7]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} transparent opacity={opacity} />
          </mesh>
        </group>
      )}

      {/* Wing roofs - wood planks */}
      {showRoof && (
        <>
          <WoodPlankRoof
            width={1.4}
            depth={2.2}
            thickness={0.15}
            position={[-1.8, wingHeight + 0.4, 0]}
            plankCount={6}
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
            seed={230}
            woodTone="medium"
          />
          <WoodPlankRoof
            width={1.4}
            depth={2.2}
            thickness={0.15}
            position={[1.8, wingHeight + 0.4, 0]}
            plankCount={6}
            opacity={stage === 'scaffolding' ? 0.5 : opacity}
            seed={231}
            woodTone="medium"
          />
        </>
      )}

      {/* Chimneys - stone */}
      {showRoof && (
        <>
          <group position={[-0.8, totalHeight + 1.2, -0.8]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.35, 0.1, 0.35]} />
              <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} transparent opacity={opacity} />
            </mesh>
          </group>
          <group position={[0.8, totalHeight + 1.2, -0.8]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.35, 0.1, 0.35]} />
              <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} transparent opacity={opacity} />
            </mesh>
          </group>
        </>
      )}

      {/* Grand entrance with stone arch */}
      {stage !== 'planning' && (
        <>
          {/* Stone door arch */}
          <mesh position={[0, 0.8, 1.28]} castShadow>
            <boxGeometry args={[1.1, 1.4, 0.15]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
          </mesh>
          {/* Double doors - wood */}
          <mesh position={[-0.22, 0.7, 1.32]} castShadow>
            <boxGeometry args={[0.38, 1.2, 0.06]} />
            <meshStandardMaterial color={WOOD_COLORS.darkStain} transparent opacity={opacity} />
          </mesh>
          <mesh position={[0.22, 0.7, 1.32]} castShadow>
            <boxGeometry args={[0.38, 1.2, 0.06]} />
            <meshStandardMaterial color={WOOD_COLORS.darkStain} transparent opacity={opacity} />
          </mesh>
          {/* Door frame/arch top */}
          <mesh position={[0, 1.4, 1.34]} castShadow>
            <boxGeometry args={[1, 0.15, 0.12]} />
            <meshStandardMaterial color={STONE_COLORS.light} roughness={0.85} transparent opacity={opacity} />
          </mesh>
          {/* Stone columns */}
          {[-0.55, 0.55].map((x, i) => (
            <group key={i} position={[x, 0.7, 1.4]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.1, 0.12, 1.4]} />
                <meshStandardMaterial color={STONE_COLORS.light} roughness={0.8} transparent opacity={opacity} />
              </mesh>
              {/* Column base */}
              <mesh position={[0, -0.75, 0]} castShadow>
                <boxGeometry args={[0.28, 0.1, 0.28]} />
                <meshStandardMaterial color={STONE_COLORS.medium} roughness={0.85} transparent opacity={opacity} />
              </mesh>
              {/* Column capital */}
              <mesh position={[0, 0.75, 0]} castShadow>
                <boxGeometry args={[0.26, 0.1, 0.26]} />
                <meshStandardMaterial color={STONE_COLORS.medium} roughness={0.85} transparent opacity={opacity} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Windows with stone frames */}
      {stage !== 'planning' &&
        stage !== 'foundation' &&
        [-0.8, 0.8].map((x) =>
          [1, 2, 3].slice(0, Math.ceil(totalHeight / 1.5)).map((y, i) => (
            <group key={`${x}-${i}`} position={[x, y * 0.9 + 0.3, 1.26]}>
              {/* Stone frame */}
              <mesh castShadow>
                <boxGeometry args={[0.45, 0.6, 0.08]} />
                <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
              </mesh>
              {/* Glass */}
              <mesh position={[0, 0, 0.02]} castShadow>
                <boxGeometry args={[0.32, 0.45, 0.02]} />
                <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.8} />
              </mesh>
            </group>
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
          {[1, 2, 3].slice(0, Math.ceil(totalHeight / 1.2)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y * 1.1, -1.6]} castShadow>
                <boxGeometry args={[5, 0.1, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
              </mesh>
              <mesh position={[0, y * 1.1, 1.6]} castShadow>
                <boxGeometry args={[5, 0.1, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Garden/courtyard elements - topiaries in stone planters */}
          {[-1.5, 1.5].map((x, i) => (
            <group key={i} position={[x, 0.4, 2]}>
              {/* Stone planter */}
              <mesh castShadow>
                <cylinderGeometry args={[0.3, 0.25, 0.35, 8]} />
                <meshStandardMaterial color={STONE_COLORS.medium} roughness={0.9} />
              </mesh>
              {/* Bush/topiary */}
              <mesh position={[0, 0.4, 0]} castShadow>
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
                <meshStandardMaterial color={WOOD_COLORS.weathered} />
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
