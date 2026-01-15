'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';
import { StoneWall, WoodPlankRoof, CornerQuoin, STONE_COLORS, WOOD_COLORS } from './materials/StoneMaterial';
import { createBuildingCollisionMeshes, createRoofCollisionMesh, createScaffoldingCollisionMeshes, disposeCollisionMeshes } from '@/lib/building/CollisionMeshHelper';

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
  const collisionMeshesRef = useRef<THREE.Mesh[]>([]);
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
  const showStoneDetail = stage === 'constructed' || stage === 'decorated';

  // Create collision meshes
  useEffect(() => {
    if (!groupRef.current || stage === 'planning') {
      disposeCollisionMeshes(collisionMeshesRef.current, groupRef.current!);
      collisionMeshesRef.current = [];
      return;
    }

    disposeCollisionMeshes(collisionMeshesRef.current, groupRef.current);
    const meshes: THREE.Mesh[] = [];

    // Main walls
    const wallMeshes = createBuildingCollisionMeshes(
      groupRef.current,
      {
        frontWidth: 2.8,
        sideWidth: 1.9,
        wallHeight: totalHeight,
        wallThickness: 0.18,
        frontZ: 1.06,
        backZ: -1.06,
        leftX: -1.31,
        rightX: 1.31,
        centerY: 0.3,
      },
      {
        width: 1.4,
        height: 1.6,
        centerY: 0.9,
      }
    );
    meshes.push(...wallMeshes);

    // Roof collision
    if (showRoof) {
      const roof = createRoofCollisionMesh(groupRef.current, 3.2, 2.8, totalHeight + 0.4);
      meshes.push(roof);
    }

    // Scaffolding collision
    if (showScaffolding) {
      const scaffoldMeshes = createScaffoldingCollisionMeshes(
        groupRef.current,
        [
          [-1.6, -1.4],
          [1.6, -1.4],
          [-1.6, 1.4],
          [1.6, 1.4],
        ],
        0.3,
        totalHeight
      );
      meshes.push(...scaffoldMeshes);
    }

    collisionMeshesRef.current = meshes;

    return () => {
      disposeCollisionMeshes(meshes, groupRef.current!);
    };
  }, [stage, totalHeight, showRoof, showScaffolding]);

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation - dark stone */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.3, 2.5]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
      </mesh>

      {/* Main structure with stone walls */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Front wall */}
              <StoneWall
                width={2.8}
                height={totalHeight}
                depth={0.18}
                position={[0, totalHeight / 2 + 0.3, 1.06]}
                blockRows={Math.max(4, Math.floor(totalHeight / 0.5))}
                blockCols={5}
                opacity={opacity}
                seed={100}
              />
              {/* Back wall */}
              <StoneWall
                width={2.8}
                height={totalHeight}
                depth={0.18}
                position={[0, totalHeight / 2 + 0.3, -1.06]}
                blockRows={Math.max(4, Math.floor(totalHeight / 0.5))}
                blockCols={5}
                opacity={opacity}
                seed={101}
              />
              {/* Left wall */}
              <StoneWall
                width={1.9}
                height={totalHeight}
                depth={0.18}
                position={[-1.31, totalHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(4, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={102}
              />
              {/* Right wall */}
              <StoneWall
                width={1.9}
                height={totalHeight}
                depth={0.18}
                position={[1.31, totalHeight / 2 + 0.3, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(4, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={103}
              />
              {/* Corner quoins */}
              <CornerQuoin height={totalHeight} position={[-1.35, totalHeight / 2 + 0.3, 1.1]} opacity={opacity} blockCount={Math.max(4, Math.floor(totalHeight / 0.6))} />
              <CornerQuoin height={totalHeight} position={[1.35, totalHeight / 2 + 0.3, 1.1]} opacity={opacity} blockCount={Math.max(4, Math.floor(totalHeight / 0.6))} />
              <CornerQuoin height={totalHeight} position={[-1.35, totalHeight / 2 + 0.3, -1.1]} opacity={opacity} blockCount={Math.max(4, Math.floor(totalHeight / 0.6))} />
              <CornerQuoin height={totalHeight} position={[1.35, totalHeight / 2 + 0.3, -1.1]} opacity={opacity} blockCount={Math.max(4, Math.floor(totalHeight / 0.6))} />
            </>
          ) : (
            <mesh position={[0, totalHeight / 2 + 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.8, totalHeight, 2.3]} />
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

      {/* Slanted roof - wooden planks with weathered look */}
      {showRoof && (
        <WoodPlankRoof
          width={3.2}
          depth={2.8}
          thickness={0.2}
          position={[0, totalHeight + 0.4, 0]}
          plankCount={10}
          opacity={stage === 'scaffolding' ? 0.5 : opacity}
          seed={110}
          woodTone="weathered"
        />
      )}

      {/* Forge chimney - tall and industrial, stone */}
      {showRoof && (
        <group position={[-0.8, totalHeight + 1.5, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.35, 2]} />
            <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
          </mesh>
          {/* Chimney cap ring */}
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.28, 0.15, 16]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
          </mesh>
        </group>
      )}

      {/* Large door opening - wood frame with dark interior */}
      {stage !== 'planning' && (
        <>
          {/* Door frame - stone arch */}
          <mesh position={[0, 0.9, 1.15]} castShadow>
            <boxGeometry args={[1.4, 1.6, 0.12]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
          </mesh>
          {/* Door interior */}
          <mesh position={[0, 0.8, 1.12]} castShadow>
            <boxGeometry args={[1.2, 1.4, 0.1]} />
            <meshStandardMaterial color="#1a1a1a" transparent opacity={opacity} />
          </mesh>
          {/* Wooden door panels */}
          <mesh position={[-0.35, 0.8, 1.18]} castShadow>
            <boxGeometry args={[0.45, 1.3, 0.04]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} transparent opacity={opacity} />
          </mesh>
          <mesh position={[0.35, 0.8, 1.18]} castShadow>
            <boxGeometry args={[0.45, 1.3, 0.04]} />
            <meshStandardMaterial color={WOOD_COLORS.dark} transparent opacity={opacity} />
          </mesh>
        </>
      )}

      {/* Windows (small, high) with stone frames */}
      {stage !== 'planning' && stage !== 'foundation' &&
        [1, 2, 3].slice(0, Math.ceil(totalHeight / 1.5)).map((i) => (
          <group key={i} position={[1.1, i * 0.9, 1.16]}>
            {/* Stone frame */}
            <mesh castShadow>
              <boxGeometry args={[0.5, 0.4, 0.08]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
            </mesh>
            {/* Glass */}
            <mesh position={[0, 0, 0.02]} castShadow>
              <boxGeometry args={[0.35, 0.25, 0.02]} />
              <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.7} />
            </mesh>
          </group>
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
          {[0.8, 1.8, 2.8].slice(0, Math.ceil(totalHeight)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, -1.4]} castShadow>
                <boxGeometry args={[3.2, 0.1, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
              </mesh>
              <mesh position={[0, y, 1.4]} castShadow>
                <boxGeometry args={[3.2, 0.1, 0.1]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Decorations */}
      {showDecorations && (
        <group>
          {/* Anvil outside - on stone platform */}
          <group position={[1.8, 0.3, 0.5]}>
            {/* Stone platform */}
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[0.6, 0.1, 0.5]} />
              <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
            </mesh>
            {/* Anvil base */}
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.4, 0.3, 0.25]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.7} />
            </mesh>
            {/* Anvil top */}
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[0.5, 0.15, 0.35]} />
              <meshStandardMaterial color="#1f1f1f" metalness={0.5} roughness={0.6} />
            </mesh>
          </group>

          {/* Tool rack on wall - wooden */}
          <mesh position={[-1.41, 1.2, 0.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.8, 0.1, 0.05]} />
            <meshStandardMaterial color={WOOD_COLORS.weathered} />
          </mesh>

          {/* Hanging tools */}
          {[-0.2, 0, 0.2].map((z, i) => (
            <mesh key={i} position={[-1.38, 1, 0.5 + z]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.3]} />
              <meshStandardMaterial color="#4a4a4a" metalness={0.5} roughness={0.6} />
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
