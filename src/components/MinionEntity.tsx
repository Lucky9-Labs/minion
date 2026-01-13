'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Minion } from '@/types/game';
import { MINION_ROLES } from '@/types/game';
import { useGameStore } from '@/store/gameStore';

interface MinionEntityProps {
  minion: Minion;
}

// Goblin color palette
const GOBLIN_COLORS = {
  skin: '#5a9c4e',
  skinDark: '#4a8340',
  skinLight: '#6eb85e',
  nose: '#4a8340',
  ears: '#4a8340',
  eyes: '#1a1a1a',
  eyeWhite: '#e8e8d0',
  pupil: '#1a1a1a',
  mouth: '#2d4a28',
  overallsMain: '#5c4a3d',
  overallsStrap: '#6b5a4d',
  overallsBuckle: '#c9a227',
  shirt: '#8b7355',
};

type Expression = 'neutral' | 'happy' | 'mischievous' | 'worried';

// Helper to get expression for state
function getExpressionForState(state: Minion['state']): Expression {
  switch (state) {
    case 'idle': return 'mischievous';
    case 'traveling': return 'happy';
    case 'working': return 'neutral';
    case 'stuck': return 'worried';
    case 'returning': return 'happy';
    default: return 'neutral';
  }
}

export function MinionEntity({ minion }: MinionEntityProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Group>(null);
  const rightEarRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [expression, setExpression] = useState<Expression>('neutral');

  // Use refs for timing to avoid calling Math.random during render
  const blinkTimerRef = useRef(0);
  const nextBlinkTimeRef = useRef(4);

  // Initialize random value in effect to avoid impure render
  useEffect(() => {
    nextBlinkTimeRef.current = 3 + Math.random() * 2;
  }, []);

  const selectedMinionId = useGameStore((state) => state.selectedMinionId);
  const setSelectedMinion = useGameStore((state) => state.setSelectedMinion);

  const isSelected = selectedMinionId === minion.id;
  const roleConfig = MINION_ROLES[minion.role];

  // Create geometry for low-poly look
  const headGeometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.22, 6, 5);
    geo.scale(1, 0.9, 0.95);
    return geo;
  }, []);

  // Animation functions using useCallback for stability
  const animateIdle = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Gentle bobbing
    groupRef.current.position.y = minion.position.y + Math.sin(time * 1.5) * 0.03;

    // Subtle body sway
    groupRef.current.rotation.z = Math.sin(time * 0.8) * 0.02;

    // Arms at rest, slight movement
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(time * 1.2) * 0.05;
      rightArmRef.current.rotation.x = Math.sin(time * 1.2 + 0.5) * 0.05;
      leftArmRef.current.rotation.z = 0.2;
      rightArmRef.current.rotation.z = -0.2;
    }

    // Legs at rest
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = 0;
      rightLegRef.current.rotation.x = 0;
    }
  }, [minion.position.y]);

  const animateTraveling = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Bouncy walking motion
    const walkCycle = time * 8;
    const bounce = Math.abs(Math.sin(walkCycle)) * 0.08;
    groupRef.current.position.y = minion.position.y + bounce;

    // Body lean while walking
    groupRef.current.rotation.z = Math.sin(walkCycle) * 0.08;
    groupRef.current.rotation.x = 0.1; // Slight forward lean

    // Arm swing
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(walkCycle) * 0.6;
      rightArmRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.6;
      leftArmRef.current.rotation.z = 0.15 + Math.abs(Math.sin(walkCycle)) * 0.1;
      rightArmRef.current.rotation.z = -0.15 - Math.abs(Math.sin(walkCycle)) * 0.1;
    }

    // Leg swing (opposite to arms)
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
      rightLegRef.current.rotation.x = Math.sin(walkCycle) * 0.5;
    }
  }, [minion.position.y]);

  const animateWorking = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Focused slight bobbing
    groupRef.current.position.y = minion.position.y + Math.sin(time * 3) * 0.02;

    // Arms doing work motion
    if (leftArmRef.current && rightArmRef.current) {
      // One arm working, one holding
      leftArmRef.current.rotation.x = -0.5 + Math.sin(time * 4) * 0.3;
      leftArmRef.current.rotation.z = 0.3;
      rightArmRef.current.rotation.x = -0.3 + Math.sin(time * 4 + Math.PI) * 0.2;
      rightArmRef.current.rotation.z = -0.1;
    }

    // Legs planted
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = 0;
      rightLegRef.current.rotation.x = 0;
    }
  }, [minion.position.y]);

  const animateStuck = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Frustrated shaking
    groupRef.current.position.x = minion.position.x + Math.sin(time * 15) * 0.03;
    groupRef.current.position.y = minion.position.y;

    // Arms flailing in frustration
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = -0.8 + Math.sin(time * 8) * 0.4;
      leftArmRef.current.rotation.z = 0.5 + Math.sin(time * 6) * 0.2;
      rightArmRef.current.rotation.x = -0.8 + Math.sin(time * 8 + 1) * 0.4;
      rightArmRef.current.rotation.z = -0.5 - Math.sin(time * 6 + 1) * 0.2;
    }

    // Stomping legs
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.abs(Math.sin(time * 6)) * 0.3;
      rightLegRef.current.rotation.x = Math.abs(Math.sin(time * 6 + Math.PI)) * 0.3;
    }
  }, [minion.position.x, minion.position.y]);

  const animateReturning = useCallback((time: number) => {
    if (!groupRef.current) return;

    // Happy bouncing
    const bounceCycle = time * 6;
    groupRef.current.position.y = minion.position.y + Math.abs(Math.sin(bounceCycle)) * 0.15;

    // Celebratory body motion
    groupRef.current.rotation.z = Math.sin(bounceCycle * 0.5) * 0.1;

    // Arms up in triumph occasionally
    if (leftArmRef.current && rightArmRef.current) {
      const armUp = Math.sin(time * 2) > 0.5 ? -1.2 : 0;
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.x,
        armUp + Math.sin(bounceCycle) * 0.3,
        0.1
      );
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.x,
        armUp + Math.sin(bounceCycle + Math.PI) * 0.3,
        0.1
      );
      leftArmRef.current.rotation.z = 0.3;
      rightArmRef.current.rotation.z = -0.3;
    }

    // Happy leg movement
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(bounceCycle + Math.PI) * 0.4;
      rightLegRef.current.rotation.x = Math.sin(bounceCycle) * 0.4;
    }
  }, [minion.position.y]);

  // Animation based on state
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Blink logic
    blinkTimerRef.current += delta;
    if (blinkTimerRef.current > nextBlinkTimeRef.current && !isBlinking) {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
      blinkTimerRef.current = 0;
      nextBlinkTimeRef.current = 3 + Math.random() * 2;
    }

    // Animate eyelids for blinking
    if (leftEyelidRef.current && rightEyelidRef.current) {
      const blinkScale = isBlinking ? 1 : 0.1;
      leftEyelidRef.current.scale.y = THREE.MathUtils.lerp(leftEyelidRef.current.scale.y, blinkScale, 0.3);
      rightEyelidRef.current.scale.y = THREE.MathUtils.lerp(rightEyelidRef.current.scale.y, blinkScale, 0.3);
    }

    // Update expression based on state
    const targetExpression = getExpressionForState(minion.state);
    if (targetExpression !== expression) {
      setExpression(targetExpression);
    }

    // Base body animation
    switch (minion.state) {
      case 'idle':
        animateIdle(time);
        break;
      case 'traveling':
        animateTraveling(time);
        break;
      case 'working':
        animateWorking(time);
        break;
      case 'stuck':
        animateStuck(time);
        break;
      case 'returning':
        animateReturning(time);
        break;
    }

    // Animate ears (slight wiggle always)
    if (leftEarRef.current && rightEarRef.current) {
      const earWiggle = Math.sin(time * 2) * 0.05;
      leftEarRef.current.rotation.z = 0.3 + earWiggle;
      rightEarRef.current.rotation.z = -0.3 - earWiggle;
    }

    // Animate eyes looking around
    if (leftEyeRef.current && rightEyeRef.current) {
      const lookX = Math.sin(time * 0.5) * 0.02;
      const lookY = Math.cos(time * 0.7) * 0.01;
      leftEyeRef.current.position.x = 0.08 + lookX;
      leftEyeRef.current.position.y = 0.02 + lookY;
      rightEyeRef.current.position.x = -0.08 + lookX;
      rightEyeRef.current.position.y = 0.02 + lookY;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedMinion(isSelected ? null : minion.id);
  };

  // Get mouth shape based on expression
  const mouthShape = useMemo(() => {
    switch (expression) {
      case 'happy':
        return { scaleX: 1.2, scaleY: 0.8, posY: -0.08, rotation: 0 };
      case 'mischievous':
        return { scaleX: 0.8, scaleY: 0.6, posY: -0.06, rotation: 0.2 };
      case 'worried':
        return { scaleX: 0.6, scaleY: 0.4, posY: -0.1, rotation: 0 };
      default:
        return { scaleX: 1, scaleY: 0.5, posY: -0.08, rotation: 0 };
    }
  }, [expression]);

  return (
    <group
      ref={groupRef}
      position={[minion.position.x, minion.position.y, minion.position.z]}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* === LEGS === */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[0.08, 0.15, 0]}>
        {/* Upper leg */}
        <mesh castShadow position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.15, 5]} />
          <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} roughness={0.8} />
        </mesh>
        {/* Lower leg / foot */}
        <mesh castShadow position={[0, -0.18, 0.02]}>
          <boxGeometry args={[0.08, 0.06, 0.12]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[-0.08, 0.15, 0]}>
        {/* Upper leg */}
        <mesh castShadow position={[0, -0.08, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.15, 5]} />
          <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} roughness={0.8} />
        </mesh>
        {/* Lower leg / foot */}
        <mesh castShadow position={[0, -0.18, 0.02]}>
          <boxGeometry args={[0.08, 0.06, 0.12]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
        </mesh>
      </group>

      {/* === BODY === */}
      {/* Shirt/undershirt */}
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.28, 6]} />
        <meshStandardMaterial color={GOBLIN_COLORS.shirt} roughness={0.8} />
      </mesh>

      {/* Overalls body */}
      <mesh castShadow position={[0, 0.32, 0.02]}>
        <boxGeometry args={[0.28, 0.22, 0.18]} />
        <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} roughness={0.9} />
      </mesh>

      {/* Overall straps */}
      <mesh castShadow position={[0.08, 0.45, 0.08]}>
        <boxGeometry args={[0.04, 0.12, 0.03]} />
        <meshStandardMaterial color={GOBLIN_COLORS.overallsStrap} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.08, 0.45, 0.08]}>
        <boxGeometry args={[0.04, 0.12, 0.03]} />
        <meshStandardMaterial color={GOBLIN_COLORS.overallsStrap} roughness={0.8} />
      </mesh>

      {/* Buckles */}
      <mesh position={[0.08, 0.42, 0.1]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshStandardMaterial color={GOBLIN_COLORS.overallsBuckle} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.42, 0.1]}>
        <boxGeometry args={[0.03, 0.03, 0.01]} />
        <meshStandardMaterial color={GOBLIN_COLORS.overallsBuckle} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* === ARMS === */}
      {/* Left Arm */}
      <group ref={leftArmRef} position={[0.2, 0.4, 0]}>
        {/* Upper arm */}
        <mesh castShadow position={[0.05, -0.06, 0]} rotation={[0, 0, -0.3]}>
          <capsuleGeometry args={[0.04, 0.1, 4, 6]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
        </mesh>
        {/* Lower arm / hand */}
        <mesh castShadow position={[0.1, -0.15, 0]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinLight} roughness={0.7} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[-0.2, 0.4, 0]}>
        {/* Upper arm */}
        <mesh castShadow position={[-0.05, -0.06, 0]} rotation={[0, 0, 0.3]}>
          <capsuleGeometry args={[0.04, 0.1, 4, 6]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
        </mesh>
        {/* Lower arm / hand */}
        <mesh castShadow position={[-0.1, -0.15, 0]}>
          <sphereGeometry args={[0.05, 5, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinLight} roughness={0.7} />
        </mesh>
      </group>

      {/* === HEAD === */}
      <group position={[0, 0.62, 0]}>
        {/* Main head */}
        <mesh castShadow geometry={headGeometry}>
          <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
        </mesh>

        {/* === EARS === */}
        {/* Left Ear */}
        <group ref={leftEarRef} position={[0.2, 0.05, 0]} rotation={[0, 0.3, 0.3]}>
          <mesh castShadow>
            <coneGeometry args={[0.06, 0.18, 4]} />
            <meshStandardMaterial color={GOBLIN_COLORS.ears} roughness={0.7} />
          </mesh>
          {/* Inner ear */}
          <mesh position={[0, 0, 0.02]}>
            <coneGeometry args={[0.03, 0.12, 4]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skinLight} roughness={0.6} />
          </mesh>
        </group>

        {/* Right Ear */}
        <group ref={rightEarRef} position={[-0.2, 0.05, 0]} rotation={[0, -0.3, -0.3]}>
          <mesh castShadow>
            <coneGeometry args={[0.06, 0.18, 4]} />
            <meshStandardMaterial color={GOBLIN_COLORS.ears} roughness={0.7} />
          </mesh>
          {/* Inner ear */}
          <mesh position={[0, 0, 0.02]}>
            <coneGeometry args={[0.03, 0.12, 4]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skinLight} roughness={0.6} />
          </mesh>
        </group>

        {/* === NOSE (comically large) === */}
        <group position={[0, -0.02, 0.2]}>
          {/* Main nose */}
          <mesh castShadow>
            <sphereGeometry args={[0.08, 5, 4]} />
            <meshStandardMaterial color={GOBLIN_COLORS.nose} roughness={0.6} />
          </mesh>
          {/* Nose tip */}
          <mesh castShadow position={[0, -0.02, 0.05]}>
            <sphereGeometry args={[0.04, 4, 3]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skinDark} roughness={0.7} />
          </mesh>
          {/* Nostrils */}
          <mesh position={[0.03, -0.04, 0.02]}>
            <sphereGeometry args={[0.015, 4, 3]} />
            <meshBasicMaterial color="#2d4a28" />
          </mesh>
          <mesh position={[-0.03, -0.04, 0.02]}>
            <sphereGeometry args={[0.015, 4, 3]} />
            <meshBasicMaterial color="#2d4a28" />
          </mesh>
        </group>

        {/* === EYES === */}
        {/* Left Eye */}
        <group position={[0.08, 0.06, 0.16]}>
          {/* Eye white */}
          <mesh>
            <sphereGeometry args={[0.055, 6, 5]} />
            <meshStandardMaterial color={GOBLIN_COLORS.eyeWhite} roughness={0.3} />
          </mesh>
          {/* Pupil */}
          <group ref={leftEyeRef} position={[0, 0.02, 0.03]}>
            <mesh>
              <sphereGeometry args={[0.03, 5, 4]} />
              <meshBasicMaterial color={GOBLIN_COLORS.pupil} />
            </mesh>
            {/* Eye shine */}
            <mesh position={[0.01, 0.01, 0.02]}>
              <sphereGeometry args={[0.008, 4, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* Eyelid */}
          <mesh ref={leftEyelidRef} position={[0, 0.04, 0.04]} scale={[1, 0.1, 1]}>
            <sphereGeometry args={[0.055, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
          </mesh>
        </group>

        {/* Right Eye */}
        <group position={[-0.08, 0.06, 0.16]}>
          {/* Eye white */}
          <mesh>
            <sphereGeometry args={[0.055, 6, 5]} />
            <meshStandardMaterial color={GOBLIN_COLORS.eyeWhite} roughness={0.3} />
          </mesh>
          {/* Pupil */}
          <group ref={rightEyeRef} position={[0, 0.02, 0.03]}>
            <mesh>
              <sphereGeometry args={[0.03, 5, 4]} />
              <meshBasicMaterial color={GOBLIN_COLORS.pupil} />
            </mesh>
            {/* Eye shine */}
            <mesh position={[0.01, 0.01, 0.02]}>
              <sphereGeometry args={[0.008, 4, 3]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          {/* Eyelid */}
          <mesh ref={rightEyelidRef} position={[0, 0.04, 0.04]} scale={[1, 0.1, 1]}>
            <sphereGeometry args={[0.055, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skin} roughness={0.7} />
          </mesh>
        </group>

        {/* Eyebrows (mischievous angle) */}
        <mesh position={[0.08, 0.12, 0.17]} rotation={[0, 0, expression === 'mischievous' ? -0.3 : expression === 'worried' ? 0.3 : -0.1]}>
          <boxGeometry args={[0.06, 0.015, 0.01]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinDark} roughness={0.8} />
        </mesh>
        <mesh position={[-0.08, 0.12, 0.17]} rotation={[0, 0, expression === 'mischievous' ? 0.3 : expression === 'worried' ? -0.3 : 0.1]}>
          <boxGeometry args={[0.06, 0.015, 0.01]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinDark} roughness={0.8} />
        </mesh>

        {/* === MOUTH === */}
        <mesh
          ref={mouthRef}
          position={[0, mouthShape.posY, 0.18]}
          rotation={[0, 0, mouthShape.rotation]}
          scale={[mouthShape.scaleX, mouthShape.scaleY, 1]}
        >
          <planeGeometry args={[0.08, 0.03]} />
          <meshBasicMaterial color={GOBLIN_COLORS.mouth} side={THREE.DoubleSide} />
        </mesh>

        {/* Teeth (showing for mischievous grin) */}
        {expression === 'mischievous' && (
          <>
            <mesh position={[0.02, -0.06, 0.19]}>
              <boxGeometry args={[0.015, 0.02, 0.01]} />
              <meshStandardMaterial color="#f0f0e0" roughness={0.3} />
            </mesh>
            <mesh position={[-0.02, -0.06, 0.19]}>
              <boxGeometry args={[0.015, 0.02, 0.01]} />
              <meshStandardMaterial color="#f0f0e0" roughness={0.3} />
            </mesh>
          </>
        )}
      </group>

      {/* Role-specific accessory */}
      <RoleAccessory role={minion.role} />

      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.35, 0.45, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#fbbf24' : '#ffffff'}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* State indicator */}
      <StateIndicator state={minion.state} />

      {/* Name label on hover */}
      {(hovered || isSelected) && (
        <Html
          position={[0, 1.0, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div className="bg-gray-900/90 text-white px-2 py-1 rounded text-sm font-medium">
            {minion.name}
            <span className="text-gray-400 ml-1 text-xs">({roleConfig.name})</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function RoleAccessory({ role }: { role: Minion['role'] }) {
  switch (role) {
    case 'scout':
      // Spyglass
      return (
        <group position={[0.28, 0.55, 0.08]} rotation={[0.2, 0.3, -Math.PI / 4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.025, 0.04, 0.22, 6]} />
            <meshStandardMaterial color="#8b4513" metalness={0.2} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.04, 6]} />
            <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      );
    case 'scribe':
      // Quill
      return (
        <group position={[0.25, 0.48, 0.06]} rotation={[0.2, 0.2, Math.PI / 5]}>
          <mesh castShadow>
            <coneGeometry args={[0.015, 0.2, 5]} />
            <meshStandardMaterial color="#f5f5dc" roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, -0.12, 0]}>
            <coneGeometry args={[0.008, 0.06, 4]} />
            <meshStandardMaterial color="#2c1810" metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      );
    case 'artificer':
      // Hammer
      return (
        <group position={[0.28, 0.38, 0]} rotation={[0, 0.2, -Math.PI / 3]}>
          <mesh castShadow position={[0, 0.1, 0]}>
            <boxGeometry args={[0.07, 0.09, 0.045]} />
            <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.18, 5]} />
            <meshStandardMaterial color="#8b4513" roughness={0.8} />
          </mesh>
        </group>
      );
  }
}

function StateIndicator({ state }: { state: Minion['state'] }) {
  if (state === 'idle') return null;

  const colors: Record<Minion['state'], string> = {
    idle: '#6b7280',
    traveling: '#3b82f6',
    working: '#f59e0b',
    stuck: '#ef4444',
    returning: '#10b981',
  };

  return (
    <mesh position={[0, 0.95, 0]}>
      <sphereGeometry args={[0.06, 6, 5]} />
      <meshBasicMaterial color={colors[state]} />
    </mesh>
  );
}
