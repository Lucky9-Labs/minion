'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { BuildingStage } from '@/types/project';
import { AnimatedDoor } from './AnimatedDoor';
import { StoneWall, PitchedWoodRoof, CornerQuoin, STONE_COLORS, WOOD_COLORS } from './materials/StoneMaterial';

interface CottageBuildingProps {
  stage: BuildingStage;
  level: number;
  position: [number, number, number];
  onClick?: () => void;
  isSelected?: boolean;
  buildingId?: string;
}

export function CottageBuilding({
  stage,
  level,
  position,
  onClick,
  isSelected,
  buildingId,
}: CottageBuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const collisionMeshesRef = useRef<THREE.Mesh[]>([]);
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
  const showStoneDetail = stage === 'constructed' || stage === 'decorated';

  // Create collision meshes when building is visible
  useEffect(() => {
    if (!groupRef.current || stage === 'planning') {
      // Clear collision meshes if planning or no group
      collisionMeshesRef.current.forEach((mesh) => {
        groupRef.current?.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      collisionMeshesRef.current = [];
      return;
    }

    // Clear previous meshes
    collisionMeshesRef.current.forEach((mesh) => {
      groupRef.current?.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    collisionMeshesRef.current = [];

    const collisionMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
    const meshes: THREE.Mesh[] = [];

    const wallThickness = 0.15;
    const doorWidth = 0.6;
    const doorHeight = 1.0;

    // Front wall (south) - split for door opening
    const frontWallHeight = totalHeight;
    const frontWallWidth = 1.8;

    // Left section of front wall (left of door)
    const frontLeftGeo = new THREE.BoxGeometry(
      (frontWallWidth - doorWidth) / 2,
      frontWallHeight,
      wallThickness
    );
    const frontLeft = new THREE.Mesh(frontLeftGeo, collisionMaterial);
    frontLeft.position.set(-(doorWidth / 2 + (frontWallWidth - doorWidth) / 4), totalHeight / 2 + 0.2, 0.83);
    frontLeft.userData.isCollisionMesh = true;
    groupRef.current.add(frontLeft);
    meshes.push(frontLeft);

    // Right section of front wall (right of door)
    const frontRight = new THREE.Mesh(frontLeftGeo, collisionMaterial);
    frontRight.position.set(doorWidth / 2 + (frontWallWidth - doorWidth) / 4, totalHeight / 2 + 0.2, 0.83);
    frontRight.userData.isCollisionMesh = true;
    groupRef.current.add(frontRight);
    meshes.push(frontRight);

    // Above door section
    const aboveDoorGeo = new THREE.BoxGeometry(doorWidth, frontWallHeight - doorHeight, wallThickness);
    const aboveDoor = new THREE.Mesh(aboveDoorGeo, collisionMaterial);
    aboveDoor.position.set(0, doorHeight + (frontWallHeight - doorHeight) / 2 + 0.2, 0.83);
    aboveDoor.userData.isCollisionMesh = true;
    groupRef.current.add(aboveDoor);
    meshes.push(aboveDoor);

    // Back wall (north) - solid
    const backWallGeo = new THREE.BoxGeometry(frontWallWidth, frontWallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, collisionMaterial);
    backWall.position.set(0, totalHeight / 2 + 0.2, -0.83);
    backWall.userData.isCollisionMesh = true;
    groupRef.current.add(backWall);
    meshes.push(backWall);

    // Left wall (west) - solid
    const sideWallWidth = 1.5;
    const leftWallGeo = new THREE.BoxGeometry(wallThickness, frontWallHeight, sideWallWidth);
    const leftWall = new THREE.Mesh(leftWallGeo, collisionMaterial);
    leftWall.position.set(-0.83, totalHeight / 2 + 0.2, 0);
    leftWall.userData.isCollisionMesh = true;
    groupRef.current.add(leftWall);
    meshes.push(leftWall);

    // Right wall (east) - solid
    const rightWall = new THREE.Mesh(leftWallGeo, collisionMaterial);
    rightWall.position.set(0.83, totalHeight / 2 + 0.2, 0);
    rightWall.userData.isCollisionMesh = true;
    groupRef.current.add(rightWall);
    meshes.push(rightWall);

    // Roof collision (optional - allows player to collide with roof from inside)
    if (showRoof) {
      const roofGeo = new THREE.BoxGeometry(2.2, 0.3, 2.2);
      const roof = new THREE.Mesh(roofGeo, collisionMaterial);
      roof.position.set(0, totalHeight + 0.5, 0);
      roof.userData.isCollisionMesh = true;
      groupRef.current.add(roof);
      meshes.push(roof);
    }

    // Scaffolding collision meshes (if visible)
    if (showScaffolding) {
      const scaffoldPositions = [
        [-1.2, -1.2],
        [1.2, -1.2],
        [-1.2, 1.2],
        [1.2, 1.2],
      ];

      // Vertical poles
      for (const [x, z] of scaffoldPositions) {
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, totalHeight + 1, 8);
        const pole = new THREE.Mesh(poleGeo, collisionMaterial);
        pole.position.set(x, totalHeight / 2 + 0.5, z);
        pole.userData.isCollisionMesh = true;
        groupRef.current.add(pole);
        meshes.push(pole);
      }

      // Horizontal beams
      const beamLevels = [0.5, 1.5, 2.5].slice(0, Math.ceil(totalHeight));
      for (const y of beamLevels) {
        // Front beam
        const beamFrontGeo = new THREE.BoxGeometry(2.4, 0.1, 0.1);
        const beamFront = new THREE.Mesh(beamFrontGeo, collisionMaterial);
        beamFront.position.set(0, y, -1.2);
        beamFront.userData.isCollisionMesh = true;
        groupRef.current.add(beamFront);
        meshes.push(beamFront);

        // Back beam
        const beamBack = new THREE.Mesh(beamFrontGeo, collisionMaterial);
        beamBack.position.set(0, y, 1.2);
        beamBack.userData.isCollisionMesh = true;
        groupRef.current.add(beamBack);
        meshes.push(beamBack);
      }
    }

    collisionMeshesRef.current = meshes;

    // Cleanup function
    return () => {
      meshes.forEach((mesh) => {
        groupRef.current?.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [stage, totalHeight, showRoof, showScaffolding]);

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Foundation/Base - gray stone */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} transparent opacity={opacity} />
      </mesh>

      {/* Main walls - stone blocks when detailed, solid when building */}
      {stage !== 'planning' && (
        <>
          {showStoneDetail ? (
            <>
              {/* Front wall with stone blocks */}
              <StoneWall
                width={1.8}
                height={totalHeight}
                depth={0.15}
                position={[0, totalHeight / 2 + 0.2, 0.83]}
                blockRows={Math.max(3, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={1}
              />
              {/* Back wall */}
              <StoneWall
                width={1.8}
                height={totalHeight}
                depth={0.15}
                position={[0, totalHeight / 2 + 0.2, -0.83]}
                blockRows={Math.max(3, Math.floor(totalHeight / 0.5))}
                blockCols={4}
                opacity={opacity}
                seed={2}
              />
              {/* Left wall */}
              <StoneWall
                width={1.5}
                height={totalHeight}
                depth={0.15}
                position={[-0.83, totalHeight / 2 + 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(3, Math.floor(totalHeight / 0.5))}
                blockCols={3}
                opacity={opacity}
                seed={3}
              />
              {/* Right wall */}
              <StoneWall
                width={1.5}
                height={totalHeight}
                depth={0.15}
                position={[0.83, totalHeight / 2 + 0.2, 0]}
                rotation={[0, Math.PI / 2, 0]}
                blockRows={Math.max(3, Math.floor(totalHeight / 0.5))}
                blockCols={3}
                opacity={opacity}
                seed={4}
              />
              {/* Corner quoins */}
              <CornerQuoin height={totalHeight} position={[-0.85, totalHeight / 2 + 0.2, 0.85]} opacity={opacity} />
              <CornerQuoin height={totalHeight} position={[0.85, totalHeight / 2 + 0.2, 0.85]} opacity={opacity} />
              <CornerQuoin height={totalHeight} position={[-0.85, totalHeight / 2 + 0.2, -0.85]} opacity={opacity} />
              <CornerQuoin height={totalHeight} position={[0.85, totalHeight / 2 + 0.2, -0.85]} opacity={opacity} />
            </>
          ) : (
            /* Simple solid walls during construction */
            <mesh position={[0, totalHeight / 2 + 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.8, totalHeight, 1.8]} />
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

      {/* Roof - wood plank pitched style */}
      {showRoof && (
        <PitchedWoodRoof
          width={2.2}
          depth={2.2}
          roofHeight={1.0}
          position={[0, totalHeight + 0.2, 0]}
          opacity={stage === 'scaffolding' ? 0.5 : opacity}
          seed={10}
          woodTone="medium"
        />
      )}

      {/* Chimney - gray stone */}
      {showRoof && (
        <group position={[0.5, totalHeight + 0.8, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.8, 0.3]} />
            <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} transparent opacity={opacity} />
          </mesh>
          {/* Chimney cap */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.35, 0.1, 0.35]} />
            <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} transparent opacity={opacity} />
          </mesh>
        </group>
      )}

      {/* Door - animated when constructed, static otherwise */}
      {stage !== 'planning' && stage === 'constructed' || stage === 'decorated' ? (
        <AnimatedDoor
          position={[0, 0, 0.9]}
          width={0.6}
          height={1.0}
          buildingId={buildingId}
        />
      ) : stage !== 'planning' ? (
        <mesh position={[0, 0.5, 0.91]} castShadow>
          <boxGeometry args={[0.5, 0.8, 0.05]} />
          <meshStandardMaterial color={WOOD_COLORS.dark} transparent opacity={opacity} />
        </mesh>
      ) : null}

      {/* Windows */}
      {stage !== 'planning' && stage !== 'foundation' && (
        <>
          {/* Window frames - dark wood */}
          <mesh position={[0.6, 1, 0.91]} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.06]} />
            <meshStandardMaterial color={WOOD_COLORS.darkStain} transparent opacity={opacity} />
          </mesh>
          <mesh position={[0.6, 1, 0.93]} castShadow>
            <boxGeometry args={[0.25, 0.25, 0.02]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.8} />
          </mesh>
          <mesh position={[-0.6, 1, 0.91]} castShadow>
            <boxGeometry args={[0.35, 0.35, 0.06]} />
            <meshStandardMaterial color={WOOD_COLORS.darkStain} transparent opacity={opacity} />
          </mesh>
          <mesh position={[-0.6, 1, 0.93]} castShadow>
            <boxGeometry args={[0.25, 0.25, 0.02]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={opacity * 0.8} />
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
            </mesh>
          ))}
          {/* Horizontal beams */}
          {[0.5, 1.5, 2.5].slice(0, Math.ceil(totalHeight)).map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, -1.2]} castShadow>
                <boxGeometry args={[2.4, 0.08, 0.08]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
              </mesh>
              <mesh position={[0, y, 1.2]} castShadow>
                <boxGeometry args={[2.4, 0.08, 0.08]} />
                <meshStandardMaterial color={WOOD_COLORS.medium} />
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
            <meshStandardMaterial color={WOOD_COLORS.weathered} />
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
              <meshStandardMaterial color={WOOD_COLORS.medium} />
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
