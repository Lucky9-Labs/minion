'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useProjectStore } from '@/store/projectStore';
import { useGameStore } from '@/store/gameStore';
import { Building } from './Building';
import { MinionEntity } from './MinionEntity';
import { GolemEntity } from './GolemEntity';
import { VillageGround } from './VillageGround';

interface VillageSceneProps {
  onBuildingClick?: (projectId: string) => void;
  onEmptyClick?: () => void;
  selectedProjectId?: string | null;
}

export function VillageScene({
  onBuildingClick,
  onEmptyClick,
  selectedProjectId,
}: VillageSceneProps) {
  const { projects, scanProjects, isScanning } = useProjectStore();
  const { minions, golems } = useGameStore();
  const [cameraDistance, setCameraDistance] = useState(20);

  // Initial scan and polling
  useEffect(() => {
    scanProjects();
    const interval = setInterval(() => {
      scanProjects();
    }, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [scanProjects]);

  // Calculate camera distance based on number of buildings
  useEffect(() => {
    if (projects.length === 0) {
      setCameraDistance(20);
      return;
    }

    // Find the furthest building from center
    let maxDistance = 0;
    for (const project of projects) {
      const dist = Math.sqrt(
        project.building.position.x ** 2 + project.building.position.z ** 2
      );
      maxDistance = Math.max(maxDistance, dist);
    }

    // Add padding and set minimum
    const newDistance = Math.max(20, maxDistance * 2 + 15);
    setCameraDistance(newDistance);
  }, [projects]);

  // Calculate ground size based on buildings
  const groundSize = useMemo(() => {
    if (projects.length === 0) return 30;
    let maxDist = 0;
    for (const project of projects) {
      const dist = Math.sqrt(
        project.building.position.x ** 2 + project.building.position.z ** 2
      );
      maxDist = Math.max(maxDist, dist);
    }
    return Math.max(30, maxDist * 2 + 20);
  }, [projects]);

  // Handle ground click
  const handleGroundClick = useCallback(
    (event: THREE.Event) => {
      // Check if we clicked on a building
      // @ts-expect-error - three.js event type
      if (event.object?.userData?.isBuilding) {
        return;
      }
      onEmptyClick?.();
    },
    [onEmptyClick]
  );

  // Get minions assigned to worktrees
  const assignedMinions = useMemo(() => {
    const assigned: Array<{
      minion: (typeof minions)[0];
      position: [number, number, number];
      projectName: string;
    }> = [];

    for (const project of projects) {
      for (const worktree of project.worktrees) {
        if (worktree.minionId) {
          const minion = minions.find((m) => m.id === worktree.minionId);
          if (minion) {
            // Position minion near the building with some offset
            const offset = assigned.filter((a) => a.projectName === project.name).length;
            assigned.push({
              minion,
              position: [
                project.building.position.x + 2 + offset * 0.5,
                0,
                project.building.position.z + 2,
              ],
              projectName: project.name,
            });
          }
        }
      }
    }

    return assigned;
  }, [projects, minions]);

  return (
    <Canvas shadows>
      <PerspectiveCamera
        makeDefault
        position={[cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7]}
        fov={50}
      />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={10}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 20]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Sky color */}
      <color attach="background" args={['#87CEEB']} />
      <fog attach="fog" args={['#87CEEB', groundSize * 0.8, groundSize * 2]} />

      {/* Ground */}
      <VillageGround size={groundSize} onClick={handleGroundClick} />

      {/* Buildings */}
      {projects.map((project) => (
        <Building
          key={project.id}
          type={project.building.type}
          stage={project.building.stage}
          level={project.building.level}
          position={[project.building.position.x, 0, project.building.position.z]}
          onClick={() => onBuildingClick?.(project.id)}
          isSelected={selectedProjectId === project.id}
          name={project.name}
        />
      ))}

      {/* Minions working on projects */}
      {assignedMinions.map(({ minion, position }) => (
        <MinionEntity
          key={minion.id}
          minion={{ ...minion, position: { x: position[0], y: position[1], z: position[2] } }}
        />
      ))}

      {/* Golems */}
      {golems.map((golem) => (
        <GolemEntity key={golem.id} golem={golem} />
      ))}

      {/* Loading indicator */}
      {isScanning && projects.length === 0 && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
        </mesh>
      )}
    </Canvas>
  );
}
