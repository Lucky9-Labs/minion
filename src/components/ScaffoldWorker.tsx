'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface ScaffoldWorkerProps {
  prNumber: number;
  prTitle: string;
  floorIndex: number;
  baseHeight: number;
  floorHeight: number;
  buildingWidth: number;
  buildingDepth: number;
  projectId?: string;
  minionId?: string; // Optional: if provided, render the actual minion instead of hardcoded goblin
}

// Goblin color palette (same as MinionEntity)
const GOBLIN_COLORS = {
  skin: '#5a9c4e',
  skinDark: '#4a8340',
  overallsMain: '#5c4a3d',
  overallsStrap: '#6b5a4d',
  overallsBuckle: '#c9a227',
  eyes: '#1a1a1a',
  eyeWhite: '#e8e8d0',
};

// Animation state machine phases
type WorkerPhase = 'walking' | 'hammering' | 'looking';

// Worker minion on scaffolding with walk + hammer animation
export function ScaffoldWorker({
  prNumber,
  prTitle,
  floorIndex,
  baseHeight,
  floorHeight,
  buildingWidth,
  buildingDepth,
  minionId,
}: ScaffoldWorkerProps) {
  // Get minion data from store if minionId is provided
  const minions = useGameStore((state) => state.minions);
  const minion = minionId ? minions.find((m) => m.id === minionId) : undefined;

  // Label text: show minion name if available, otherwise just PR number
  const labelText = minion ? `${minion.name} • PR #${prNumber}` : `PR #${prNumber}`;
  const groupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  // Animation state stored in refs to persist across frames
  const stateRef = useRef({
    phase: 'hammering' as WorkerPhase, // Start hammering
    phaseStartTime: -1, // -1 means uninitialized
    targetX: 0,
    currentX: (prNumber % 3 - 1) * 0.4, // Start at different positions
    hammerCount: 0,
    needsNewTarget: true, // Flag to pick new target when entering walking phase
    facingRight: true,
  });

  // Calculate base position on scaffolding platform
  const basePosition = useMemo(() => {
    const platformY = baseHeight + (floorIndex + 1) * floorHeight + 0.1;
    const zOffset = -(buildingDepth / 2 + 0.5); // Front of building
    return { y: platformY, z: zOffset };
  }, [floorIndex, baseHeight, floorHeight, buildingDepth]);

  // Platform walking range
  const walkRange = useMemo(() => {
    const halfWidth = buildingWidth / 2 + 0.1;
    return { min: -halfWidth, max: halfWidth };
  }, [buildingWidth]);

  // Unique timing offset per worker
  const workerOffset = useMemo(() => prNumber * 1.7 + floorIndex * 2.3, [prNumber, floorIndex]);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current || !rightArmRef.current || !bodyRef.current) return;

    const time = state.clock.elapsedTime + workerOffset;
    const s = stateRef.current;

    // Initialize on first frame
    if (s.phaseStartTime < 0) {
      s.phaseStartTime = time;
    }

    // Phase durations
    const walkDuration = 2 + (prNumber % 3) * 0.5; // 2-3.5 seconds
    const hammerDuration = 3 + (prNumber % 2); // 3-4 seconds
    const lookDuration = 1;

    const phaseTime = time - s.phaseStartTime;

    // State machine
    switch (s.phase) {
      case 'walking': {
        // Pick a new target when entering walking phase
        if (s.needsNewTarget) {
          // Pick random spot on platform, different from current
          const range = walkRange.max - walkRange.min;
          s.targetX = walkRange.min + Math.random() * range;
          s.facingRight = s.targetX > s.currentX;
          s.needsNewTarget = false;
        }

        // Move toward target
        const moveSpeed = 0.4;
        const dx = s.targetX - s.currentX;
        if (Math.abs(dx) > 0.05) {
          s.currentX += Math.sign(dx) * moveSpeed * 0.016;
          s.facingRight = dx > 0;
        }

        // Walking leg animation
        const walkCycle = time * 8;
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = Math.sin(walkCycle) * 0.4;
          rightLegRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
        }

        // Arm swing while walking
        rightArmRef.current.rotation.x = Math.sin(walkCycle + Math.PI) * 0.3;
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = Math.sin(walkCycle) * 0.3;
        }

        // Body slight lean forward while walking
        bodyRef.current.rotation.x = 0.1;
        bodyRef.current.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.02;

        // Transition to hammering after reaching target or time elapsed
        if (phaseTime > walkDuration || Math.abs(dx) < 0.1) {
          s.phase = 'hammering';
          s.phaseStartTime = time;
          s.hammerCount = 0;
        }
        break;
      }

      case 'hammering': {
        // Face the building wall (toward +Z)
        groupRef.current.rotation.y = Math.PI;

        // Stop legs
        if (leftLegRef.current && rightLegRef.current) {
          leftLegRef.current.rotation.x = 0;
          rightLegRef.current.rotation.x = 0;
        }

        // Hammering animation - raise arm high, swing down fast
        const hammerSpeed = 4; // Hammers per second
        const hammerPhase = (phaseTime * hammerSpeed) % 1;

        // Arm motion: raise (0-0.3), pause at top (0.3-0.4), swing down (0.4-0.6), impact hold (0.6-1.0)
        let armAngle: number;
        if (hammerPhase < 0.3) {
          // Raise arm up
          armAngle = -0.5 - (hammerPhase / 0.3) * 1.2; // -0.5 to -1.7
        } else if (hammerPhase < 0.4) {
          // Hold at top
          armAngle = -1.7;
        } else if (hammerPhase < 0.6) {
          // Swing down fast
          const swingProgress = (hammerPhase - 0.4) / 0.2;
          armAngle = -1.7 + swingProgress * 2.2; // -1.7 to 0.5
        } else {
          // Hold at impact point
          armAngle = 0.5;
        }
        rightArmRef.current.rotation.x = armAngle;

        // Left arm holds steady, slightly out
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -0.3;
          leftArmRef.current.rotation.z = -0.4;
        }

        // Body leans into hammer swing
        if (hammerPhase >= 0.4 && hammerPhase < 0.6) {
          bodyRef.current.rotation.x = 0.2;
          bodyRef.current.position.y = -0.02;
        } else if (hammerPhase >= 0.6 && hammerPhase < 0.7) {
          // Impact bounce
          bodyRef.current.rotation.x = 0.15;
          bodyRef.current.position.y = 0;
        } else {
          bodyRef.current.rotation.x = 0.05;
          bodyRef.current.position.y = 0;
        }

        // Count hammer swings
        if (hammerPhase < 0.1) {
          s.hammerCount++;
        }

        // Transition to looking after hammering
        if (phaseTime > hammerDuration) {
          s.phase = 'looking';
          s.phaseStartTime = time;
        }
        break;
      }

      case 'looking': {
        // Stand up straight
        bodyRef.current.rotation.x = 0;
        bodyRef.current.position.y = 0;

        // Arms at rest
        rightArmRef.current.rotation.x = 0;
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = 0;
          leftArmRef.current.rotation.z = -0.3;
        }

        // Look around - turn body left and right
        const lookProgress = phaseTime / lookDuration;
        const lookAngle = Math.sin(lookProgress * Math.PI * 2) * 0.6;

        // Transition to walking
        if (phaseTime > lookDuration) {
          s.phase = 'walking';
          s.phaseStartTime = time;
          s.needsNewTarget = true; // Will pick new target on next frame
        }

        // Apply look rotation to whole group temporarily
        groupRef.current.rotation.y = (s.facingRight ? 0 : Math.PI) + lookAngle;
        break;
      }
    }

    // Update position
    groupRef.current.position.x = s.currentX;
    groupRef.current.position.y = basePosition.y;
    groupRef.current.position.z = basePosition.z;

    // Face direction of movement (except during looking phase)
    if (s.phase !== 'looking') {
      groupRef.current.rotation.y = s.facingRight ? 0 : Math.PI;
    }
  });

  // Minion scale (smaller than regular minions to fit on platform)
  const scale = 0.7;

  return (
    <group ref={groupRef} scale={scale}>
      {/* Body group for bobbing */}
      <group ref={bodyRef}>
        {/* Head */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.18, 6, 5]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skin} flatShading />
        </mesh>

        {/* Eyes */}
        <mesh position={[-0.06, 0.52, 0.14]}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.eyeWhite} />
        </mesh>
        <mesh position={[0.06, 0.52, 0.14]}>
          <sphereGeometry args={[0.04, 4, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.eyeWhite} />
        </mesh>
        <mesh position={[-0.06, 0.52, 0.17]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.eyes} />
        </mesh>
        <mesh position={[0.06, 0.52, 0.17]}>
          <sphereGeometry args={[0.02, 4, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.eyes} />
        </mesh>

        {/* Ears */}
        <mesh position={[-0.18, 0.48, 0]} rotation={[0, 0, -0.5]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinDark} flatShading />
        </mesh>
        <mesh position={[0.18, 0.48, 0]} rotation={[0, 0, 0.5]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color={GOBLIN_COLORS.skinDark} flatShading />
        </mesh>

        {/* Torso (overalls) */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.3, 6]} />
          <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} flatShading />
        </mesh>

        {/* Left leg (animated) */}
        <mesh ref={leftLegRef} position={[-0.06, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 5]} />
          <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} flatShading />
        </mesh>
        {/* Right leg (animated) */}
        <mesh ref={rightLegRef} position={[0.06, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 5]} />
          <meshStandardMaterial color={GOBLIN_COLORS.overallsMain} flatShading />
        </mesh>

        {/* Left arm (animated) */}
        <group ref={leftArmRef} position={[-0.16, 0.28, 0]}>
          <mesh rotation={[0, 0, -0.3]}>
            <cylinderGeometry args={[0.03, 0.04, 0.15, 5]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skin} flatShading />
          </mesh>
        </group>

        {/* Right arm (animated - holds hammer) */}
        <group ref={rightArmRef} position={[0.16, 0.28, 0]}>
          <mesh rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.03, 0.04, 0.15, 5]} />
            <meshStandardMaterial color={GOBLIN_COLORS.skin} flatShading />
          </mesh>
          {/* Hammer - larger for visibility */}
          <group position={[0.06, -0.15, 0.06]}>
            {/* Handle */}
            <mesh rotation={[0.3, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.02, 0.28, 6]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Head */}
            <mesh position={[0, -0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
              <boxGeometry args={[0.12, 0.07, 0.07]} />
              <meshStandardMaterial color="#666666" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Hard hat */}
        <mesh position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.14, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#FFD700" flatShading />
        </mesh>
        <mesh position={[0, 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.02, 8]} />
          <meshStandardMaterial color="#FFD700" flatShading />
        </mesh>
      </group>

      {/* Info label - shows minion name (if available) and PR number */}
      <Html
        position={[0, 0.9, 0]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          {labelText}
        </div>
      </Html>
    </group>
  );
}

export default ScaffoldWorker;
