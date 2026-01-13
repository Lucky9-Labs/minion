'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface AnimatedDoorProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  buildingId?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export function AnimatedDoor({
  position,
  rotation = [0, 0, 0],
  width = 1.0,
  height = 2.0,
  buildingId,
  onOpen,
  onClose,
}: AnimatedDoorProps) {
  const doorRef = useRef<THREE.Group>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [doorAngle, setDoorAngle] = useState(0);
  const loadInterior = useGameStore((state) => state.loadInterior);
  const viewMode = useGameStore((state) => state.viewMode);

  // Proximity detection threshold
  const openDistance = 2.5;
  const closeDistance = 3.5;

  // Check proximity to player/wizard
  useFrame((state) => {
    if (!doorRef.current || viewMode !== 'firstPerson') return;

    // Get camera position (player position in first-person mode)
    const cameraPos = state.camera.position;

    // Get door world position
    const doorWorldPos = new THREE.Vector3();
    doorRef.current.getWorldPosition(doorWorldPos);

    // Calculate horizontal distance (ignore Y)
    const dx = cameraPos.x - doorWorldPos.x;
    const dz = cameraPos.z - doorWorldPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Open/close based on distance with hysteresis
    if (!isOpen && distance < openDistance) {
      setIsOpen(true);
      if (onOpen) onOpen();
      if (buildingId) loadInterior(buildingId);
    } else if (isOpen && distance > closeDistance) {
      setIsOpen(false);
      if (onClose) onClose();
    }
  });

  // Animate door swing
  useFrame((_, delta) => {
    const targetAngle = isOpen ? Math.PI / 2 : 0;
    const speed = 3; // radians per second

    if (Math.abs(doorAngle - targetAngle) > 0.01) {
      const newAngle = THREE.MathUtils.lerp(doorAngle, targetAngle, 1 - Math.exp(-speed * delta));
      setDoorAngle(newAngle);
    }
  });

  return (
    <group ref={doorRef} position={position} rotation={rotation}>
      {/* Door frame */}
      <group>
        {/* Left frame */}
        <mesh position={[-(width / 2 + 0.05), height / 2, 0]} castShadow>
          <boxGeometry args={[0.1, height + 0.1, 0.15]} />
          <meshStandardMaterial color="#4a3728" roughness={0.8} />
        </mesh>
        {/* Right frame */}
        <mesh position={[(width / 2 + 0.05), height / 2, 0]} castShadow>
          <boxGeometry args={[0.1, height + 0.1, 0.15]} />
          <meshStandardMaterial color="#4a3728" roughness={0.8} />
        </mesh>
        {/* Top frame */}
        <mesh position={[0, height + 0.05, 0]} castShadow>
          <boxGeometry args={[width + 0.2, 0.1, 0.15]} />
          <meshStandardMaterial color="#4a3728" roughness={0.8} />
        </mesh>
      </group>

      {/* Door panel - rotates around hinge point (left edge) */}
      <group position={[-width / 2, 0, 0]} rotation={[0, doorAngle, 0]}>
        <mesh position={[width / 2, height / 2, 0]} castShadow>
          <boxGeometry args={[width - 0.05, height - 0.05, 0.08]} />
          <meshStandardMaterial color="#654321" roughness={0.75} />
        </mesh>

        {/* Door handle */}
        <mesh position={[width - 0.15, height / 2, 0.06]} castShadow>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#b8860b" metalness={0.6} roughness={0.4} />
        </mesh>

        {/* Door metal bands */}
        {[0.3, 0.5, 0.7].map((yFrac, i) => (
          <mesh key={i} position={[width / 2, height * yFrac, 0.045]} castShadow>
            <boxGeometry args={[width - 0.1, 0.08, 0.02]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Door threshold */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[width + 0.2, 0.04, 0.3]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.9} />
      </mesh>
    </group>
  );
}
