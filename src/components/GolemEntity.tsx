'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Golem } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface GolemEntityProps {
  golem: Golem;
}

// Golem is 5x larger than minions (minion scale is 0.5, so golem is 2.5)
const GOLEM_SCALE = 2.5;

// Golem color palette - rocky with crystal accents
const GOLEM_COLORS = {
  // Rocky base
  rockBase: '#5c5247',
  rockDark: '#4a433b',
  rockLight: '#6e6459',

  // Crystal accents
  crystalOrange: '#ff6b35',
  crystalOrangeGlow: '#ff8855',
  crystalBlue: '#4da6ff',
  crystalBlueGlow: '#66b8ff',

  // Eye
  eyeCore: '#ff6b35',
  eyeGlow: '#ffaa66',
};

export function GolemEntity({ golem }: GolemEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const eyeRef = useRef<THREE.Mesh>(null);
  const eyeGlowRef = useRef<THREE.PointLight>(null);

  const [hovered, setHovered] = useState(false);

  const selectedGolemId = useGameStore((state) => state.selectedGolemId);
  const possessedGolemId = useGameStore((state) => state.possessedGolemId);
  const setSelectedGolem = useGameStore((state) => state.setSelectedGolem);
  const possessGolem = useGameStore((state) => state.possessGolem);

  const isSelected = selectedGolemId === golem.id;
  const isPossessed = possessedGolemId === golem.id;

  // Create rocky geometry with flat shading for angular look
  const torsoGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(1.2, 1.6, 0.8, 2, 2, 2);
    // Deterministic pseudo-random displacement for organic rock feel
    // Using a simple hash function based on vertex index
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x) - 0.5;
    };
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setX(i, positions.getX(i) + seededRandom(i * 3) * 0.08);
      positions.setY(i, positions.getY(i) + seededRandom(i * 3 + 1) * 0.08);
      positions.setZ(i, positions.getZ(i) + seededRandom(i * 3 + 2) * 0.08);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Animation: Idle - minimal movement, heavy creature
  const animateIdle = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Very subtle breathing motion
    groupRef.current.position.y = golem.position.y + Math.sin(time * 0.8) * 0.02;

    // Floating hands gentle bob
    if (leftHandRef.current && rightHandRef.current) {
      leftHandRef.current.position.y = -0.2 + Math.sin(time * 1.2) * 0.05;
      rightHandRef.current.position.y = -0.2 + Math.sin(time * 1.2 + Math.PI) * 0.05;
    }

    // Eye glow pulse
    if (eyeGlowRef.current) {
      eyeGlowRef.current.intensity = 0.8 + Math.sin(time * 2) * 0.3;
    }
  }, [golem.position.y]);

  // Animation: Traveling - heavy stomping
  const animateTraveling = useCallback((time: number) => {
    if (!groupRef.current) return;

    const walkCycle = time * 2; // Slower than minions
    const stomp = Math.abs(Math.sin(walkCycle)) * 0.08;
    groupRef.current.position.y = golem.position.y + stomp;

    // Heavy body sway
    groupRef.current.rotation.z = Math.sin(walkCycle) * 0.03;

    // Leg movement - heavy stomps
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.position.y = -0.7 + Math.max(0, Math.sin(walkCycle)) * 0.15;
      rightLegRef.current.position.y = -0.7 + Math.max(0, Math.sin(walkCycle + Math.PI)) * 0.15;
    }

    // Floating hands swing with momentum
    if (leftHandRef.current && rightHandRef.current) {
      leftHandRef.current.position.y = -0.2 + Math.sin(walkCycle) * 0.1;
      leftHandRef.current.position.z = 0.1 + Math.sin(walkCycle) * 0.15;
      rightHandRef.current.position.y = -0.2 + Math.sin(walkCycle + Math.PI) * 0.1;
      rightHandRef.current.position.z = 0.1 + Math.sin(walkCycle + Math.PI) * 0.15;
    }

    // Eye glow intensifies
    if (eyeGlowRef.current) {
      eyeGlowRef.current.intensity = 1.2 + Math.sin(time * 3) * 0.2;
    }
  }, [golem.position.y]);

  // Animation: Stomping (special action state)
  const animateStomping = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Ground pound motion
    const stompCycle = time * 4;
    const pound = Math.abs(Math.sin(stompCycle)) * 0.15;
    groupRef.current.position.y = golem.position.y + pound;

    // Hands slam down
    if (leftHandRef.current && rightHandRef.current) {
      const armSlam = Math.sin(stompCycle) > 0 ? -0.3 : 0.1;
      leftHandRef.current.position.y = armSlam;
      rightHandRef.current.position.y = armSlam;
    }

    // Eye flares
    if (eyeGlowRef.current) {
      eyeGlowRef.current.intensity = 1.5 + Math.abs(Math.sin(stompCycle)) * 0.5;
    }
  }, [golem.position.y]);

  useFrame((state) => {
    if (!groupRef.current || isPossessed) return;

    const time = state.clock.elapsedTime;

    switch (golem.state) {
      case 'idle':
        animateIdle(time);
        break;
      case 'traveling':
        animateTraveling(time);
        break;
      case 'stomping':
        animateStomping(time);
        break;
    }

    // Eye color cycling (subtle shift between orange and blue)
    if (eyeRef.current) {
      const colorShift = (Math.sin(time * 0.5) + 1) / 2;
      const color = new THREE.Color(GOLEM_COLORS.crystalOrange).lerp(
        new THREE.Color(GOLEM_COLORS.crystalBlue),
        colorShift * 0.3
      );
      (eyeRef.current.material as THREE.MeshStandardMaterial).emissive = color;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (isSelected) {
      // Second click on selected golem - enter possession mode
      possessGolem(golem.id);
    } else {
      // First click - select
      setSelectedGolem(golem.id);
    }
  };

  // Don't render if possessed (will be handled by first-person view)
  if (isPossessed) {
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={[golem.position.x, golem.position.y, golem.position.z]}
      scale={GOLEM_SCALE}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* === STUMP LEGS === */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[0.35, -0.7, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.3, 0.5, 6]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.rockBase}
            roughness={0.95}
            metalness={0.1}
            flatShading
          />
        </mesh>
        {/* Crystal accent on leg */}
        <mesh castShadow position={[0.15, 0.1, 0.1]} rotation={[0.3, 0.5, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalBlue}
            emissive={GOLEM_COLORS.crystalBlue}
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[-0.35, -0.7, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.25, 0.3, 0.5, 6]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.rockBase}
            roughness={0.95}
            metalness={0.1}
            flatShading
          />
        </mesh>
        {/* Crystal accent on leg */}
        <mesh castShadow position={[-0.15, 0.15, 0.08]} rotation={[-0.2, -0.3, 0]}>
          <octahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalOrange}
            emissive={GOLEM_COLORS.crystalOrange}
            emissiveIntensity={0.3}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* === MASSIVE TORSO === */}
      <group position={[0, 0.4, 0]}>
        {/* Main body - rocky box */}
        <mesh castShadow geometry={torsoGeometry}>
          <meshStandardMaterial
            color={GOLEM_COLORS.rockBase}
            roughness={0.95}
            metalness={0.1}
            flatShading
          />
        </mesh>

        {/* Rocky protrusions for texture */}
        <mesh castShadow position={[0.5, 0.3, 0.3]} rotation={[0.2, 0.5, 0.3]}>
          <boxGeometry args={[0.3, 0.25, 0.2]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[-0.45, -0.2, 0.35]} rotation={[-0.1, -0.3, 0.1]}>
          <boxGeometry args={[0.25, 0.3, 0.2]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockLight} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[0.3, -0.5, 0.2]} rotation={[0.1, 0.2, -0.2]}>
          <boxGeometry args={[0.2, 0.2, 0.15]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>

        {/* Crystal clusters on torso */}
        {/* Large orange crystal cluster */}
        <group position={[0.4, 0.5, 0.35]} rotation={[0.3, 0.4, 0.2]}>
          <mesh castShadow>
            <octahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial
              color={GOLEM_COLORS.crystalOrange}
              emissive={GOLEM_COLORS.crystalOrange}
              emissiveIntensity={0.4}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
          <mesh castShadow position={[0.08, -0.05, 0.05]} rotation={[0.5, 0.3, 0]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial
              color={GOLEM_COLORS.crystalOrangeGlow}
              emissive={GOLEM_COLORS.crystalOrangeGlow}
              emissiveIntensity={0.3}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* Blue crystal cluster */}
        <group position={[-0.35, 0.2, 0.4]} rotation={[-0.2, -0.3, 0.1]}>
          <mesh castShadow>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial
              color={GOLEM_COLORS.crystalBlue}
              emissive={GOLEM_COLORS.crystalBlue}
              emissiveIntensity={0.4}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
          <mesh castShadow position={[-0.06, 0.08, 0.02]} rotation={[0.2, -0.4, 0.3]}>
            <octahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial
              color={GOLEM_COLORS.crystalBlueGlow}
              emissive={GOLEM_COLORS.crystalBlueGlow}
              emissiveIntensity={0.3}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* Small crystal accents scattered */}
        <mesh castShadow position={[0.1, -0.6, 0.38]} rotation={[0.5, 0, 0.2]}>
          <octahedronGeometry args={[0.06, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalBlue}
            emissive={GOLEM_COLORS.crystalBlue}
            emissiveIntensity={0.3}
            roughness={0.3}
          />
        </mesh>
        <mesh castShadow position={[-0.2, 0.6, 0.3]} rotation={[-0.3, 0.4, 0]}>
          <octahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalOrange}
            emissive={GOLEM_COLORS.crystalOrange}
            emissiveIntensity={0.3}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* === TINY HEAD === */}
      <group position={[0, 1.4, 0.1]}>
        {/* Small rocky head */}
        <mesh castShadow>
          <sphereGeometry args={[0.15, 5, 4]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.rockDark}
            roughness={0.9}
            flatShading
          />
        </mesh>

        {/* Crystal eye - the soul of the golem */}
        <mesh
          ref={eyeRef}
          position={[0, 0, 0.12]}
        >
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.eyeCore}
            emissive={GOLEM_COLORS.eyeCore}
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.3}
          />
        </mesh>

        {/* Eye glow light */}
        <pointLight
          ref={eyeGlowRef}
          position={[0, 0, 0.2]}
          color={GOLEM_COLORS.eyeGlow}
          intensity={0.8}
          distance={2}
          decay={2}
        />

        {/* Small crystal horn/protrusion */}
        <mesh castShadow position={[0.08, 0.1, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.03, 0.1, 4]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalOrange}
            emissive={GOLEM_COLORS.crystalOrange}
            emissiveIntensity={0.2}
            roughness={0.4}
          />
        </mesh>
      </group>

      {/* === FLOATING HANDS === */}
      {/* Left Hand */}
      <group ref={leftHandRef} position={[0.9, -0.2, 0.1]}>
        {/* Main hand mass */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.25, 0.2]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.rockBase}
            roughness={0.95}
            flatShading
          />
        </mesh>
        {/* Fingers - chunky stone digits */}
        <mesh castShadow position={[0.15, -0.05, 0.08]}>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[0.05, -0.08, 0.08]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockBase} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[-0.05, -0.06, 0.08]}>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>
        {/* Thumb */}
        <mesh castShadow position={[-0.15, 0.02, 0.08]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.07, 0.12, 0.07]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockLight} roughness={0.95} flatShading />
        </mesh>
        {/* Crystal knuckle accent */}
        <mesh castShadow position={[0.05, 0.1, 0.12]} rotation={[0.3, 0.2, 0]}>
          <octahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalBlue}
            emissive={GOLEM_COLORS.crystalBlue}
            emissiveIntensity={0.3}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Right Hand */}
      <group ref={rightHandRef} position={[-0.9, -0.2, 0.1]}>
        {/* Main hand mass */}
        <mesh castShadow>
          <boxGeometry args={[0.35, 0.25, 0.2]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.rockBase}
            roughness={0.95}
            flatShading
          />
        </mesh>
        {/* Fingers */}
        <mesh castShadow position={[-0.15, -0.05, 0.08]}>
          <boxGeometry args={[0.08, 0.2, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[-0.05, -0.08, 0.08]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockBase} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[0.05, -0.06, 0.08]}>
          <boxGeometry args={[0.08, 0.18, 0.08]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockDark} roughness={0.95} flatShading />
        </mesh>
        {/* Thumb */}
        <mesh castShadow position={[0.15, 0.02, 0.08]} rotation={[0, 0, -0.5]}>
          <boxGeometry args={[0.07, 0.12, 0.07]} />
          <meshStandardMaterial color={GOLEM_COLORS.rockLight} roughness={0.95} flatShading />
        </mesh>
        {/* Crystal knuckle accent */}
        <mesh castShadow position={[-0.05, 0.1, 0.12]} rotation={[-0.2, -0.3, 0]}>
          <octahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial
            color={GOLEM_COLORS.crystalOrange}
            emissive={GOLEM_COLORS.crystalOrange}
            emissiveIntensity={0.3}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Selection ring - larger for golem */}
      {(isSelected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#fbbf24' : '#ffffff'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* State indicator */}
      <GolemStateIndicator state={golem.state} />

      {/* Name label on hover */}
      {(hovered || isSelected) && (
        <Html
          position={[0, 1.8, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-gray-900/90 text-white px-2 py-1 rounded text-sm font-medium">
            {golem.name}
            <span className="text-gray-400 ml-1 text-xs">(Golem)</span>
          </div>
          {isSelected && (
            <div className="text-xs text-amber-400 text-center mt-1">
              Click again to enter
            </div>
          )}
        </Html>
      )}
    </group>
  );
}

function GolemStateIndicator({ state }: { state: Golem['state'] }) {
  if (state === 'idle') return null;

  const colors: Record<Golem['state'], string> = {
    idle: '#6b7280',
    traveling: '#3b82f6',
    stomping: '#ef4444',
  };

  return (
    <mesh position={[0, 1.7, 0]}>
      <sphereGeometry args={[0.1, 6, 5]} />
      <meshBasicMaterial color={colors[state]} />
    </mesh>
  );
}
