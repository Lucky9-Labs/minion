'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

interface RatProps {
  initialPosition: [number, number, number];
  /** Bounds for rat movement [minX, maxX, minZ, maxZ] */
  bounds?: [number, number, number, number];
  /** Seed for deterministic behavior */
  seed?: number;
}

type RatState = 'idle' | 'scurrying' | 'fleeing' | 'eating';

// Simple seeded random
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function Rat({ initialPosition, bounds = [-10, 10, -10, 10], seed = 0 }: RatProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState(new THREE.Vector3(...initialPosition));
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...initialPosition));
  const [state, setState] = useState<RatState>('idle');
  const [rotation, setRotation] = useState(seededRandom(seed) * Math.PI * 2);
  const [idleTimer, setIdleTimer] = useState(2 + seededRandom(seed + 1) * 3);
  const [bodyBob, setBodyBob] = useState(0);

  const viewMode = useGameStore((s) => s.viewMode);

  // Rat colors
  const bodyColor = useMemo(() => {
    const hue = 0.08 + seededRandom(seed + 2) * 0.04; // Brown-gray range
    const sat = 0.2 + seededRandom(seed + 3) * 0.2;
    const light = 0.25 + seededRandom(seed + 4) * 0.1;
    return new THREE.Color().setHSL(hue, sat, light);
  }, [seed]);

  // Movement speed based on state
  const speed = state === 'fleeing' ? 4 : state === 'scurrying' ? 2 : 0;

  useFrame((frameState, delta) => {
    if (!groupRef.current) return;

    const cameraPos = frameState.camera.position;
    const distanceToPlayer = position.distanceTo(
      new THREE.Vector3(cameraPos.x, position.y, cameraPos.z)
    );

    // Flee from player in first-person mode
    if (viewMode === 'firstPerson' && distanceToPlayer < 4 && state !== 'fleeing') {
      setState('fleeing');
      // Run away from player
      const fleeDir = new THREE.Vector3()
        .subVectors(position, new THREE.Vector3(cameraPos.x, position.y, cameraPos.z))
        .normalize();
      const newTarget = position.clone().addScaledVector(fleeDir, 5 + Math.random() * 3);
      // Clamp to bounds
      newTarget.x = Math.max(bounds[0], Math.min(bounds[1], newTarget.x));
      newTarget.z = Math.max(bounds[2], Math.min(bounds[3], newTarget.z));
      setTargetPosition(newTarget);
    }

    // State machine
    switch (state) {
      case 'idle':
        setIdleTimer((t) => t - delta);
        // Random twitching
        setBodyBob((b) => b + delta * 8);
        if (idleTimer <= 0) {
          // Decide next action
          if (Math.random() < 0.7) {
            setState('scurrying');
            // Pick random nearby target
            const angle = Math.random() * Math.PI * 2;
            const dist = 2 + Math.random() * 4;
            const newTarget = position.clone();
            newTarget.x += Math.cos(angle) * dist;
            newTarget.z += Math.sin(angle) * dist;
            // Clamp to bounds
            newTarget.x = Math.max(bounds[0], Math.min(bounds[1], newTarget.x));
            newTarget.z = Math.max(bounds[2], Math.min(bounds[3], newTarget.z));
            setTargetPosition(newTarget);
          } else {
            setState('eating');
            setIdleTimer(1 + Math.random() * 2);
          }
        }
        break;

      case 'scurrying':
      case 'fleeing':
        // Move toward target
        const direction = new THREE.Vector3().subVectors(targetPosition, position);
        const distance = direction.length();

        if (distance > 0.1) {
          direction.normalize();
          const moveAmount = Math.min(speed * delta, distance);
          position.addScaledVector(direction, moveAmount);

          // Update rotation to face movement direction
          setRotation(Math.atan2(direction.x, direction.z));

          // Scurry animation
          setBodyBob((b) => b + delta * 20);
        } else {
          // Reached target
          setState('idle');
          setIdleTimer(1 + Math.random() * 3);
        }
        break;

      case 'eating':
        setBodyBob((b) => b + delta * 4);
        setIdleTimer((t) => t - delta);
        if (idleTimer <= 0) {
          setState('idle');
          setIdleTimer(1 + Math.random() * 2);
        }
        break;
    }

    // Update mesh position
    groupRef.current.position.copy(position);
    groupRef.current.rotation.y = rotation;
  });

  // Body bob animation values
  const bobY = Math.sin(bodyBob) * (state === 'scurrying' || state === 'fleeing' ? 0.03 : 0.005);
  const tailWag = Math.sin(bodyBob * 1.5) * 0.3;

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.08 + bobY, 0]} castShadow>
        <capsuleGeometry args={[0.04, 0.12, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.09 + bobY, 0.1]} castShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* Snout */}
      <mesh position={[0, 0.07 + bobY, 0.14]} rotation={[0.3, 0, 0]} castShadow>
        <coneGeometry args={[0.02, 0.04, 6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.8} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.065 + bobY, 0.16]}>
        <sphereGeometry args={[0.008, 6, 4]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Eyes */}
      {[-0.015, 0.015].map((x, i) => (
        <mesh key={i} position={[x, 0.11 + bobY, 0.12]}>
          <sphereGeometry args={[0.008, 6, 4]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}

      {/* Ears */}
      {[-0.025, 0.025].map((x, i) => (
        <mesh key={`ear-${i}`} position={[x, 0.13 + bobY, 0.08]} rotation={[0.3, x > 0 ? 0.3 : -0.3, 0]}>
          <circleGeometry args={[0.02, 8]} />
          <meshStandardMaterial color="#d4a8a8" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* Tail */}
      <group position={[0, 0.06 + bobY, -0.08]} rotation={[0.5 + tailWag * 0.2, tailWag, 0]}>
        <mesh>
          <cylinderGeometry args={[0.006, 0.003, 0.15, 4]} />
          <meshStandardMaterial color="#d4a8a8" roughness={0.9} />
        </mesh>
      </group>

      {/* Legs (simplified - just small bumps) */}
      {[
        [-0.02, 0.02, 0.04],
        [0.02, 0.02, 0.04],
        [-0.02, 0.02, -0.04],
        [0.02, 0.02, -0.04],
      ].map((pos, i) => (
        <mesh key={`leg-${i}`} position={[pos[0], pos[1] + bobY, pos[2]]}>
          <sphereGeometry args={[0.015, 4, 4]} />
          <meshStandardMaterial color={bodyColor} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Spawn multiple rats in an area
 */
interface RatSpawnerProps {
  /** Center position for spawning */
  center: [number, number, number];
  /** Spawn radius */
  radius?: number;
  /** Number of rats */
  count?: number;
  /** Y position for rats */
  groundY?: number;
}

export function RatSpawner({
  center,
  radius = 8,
  count = 5,
  groundY = 0.02,
}: RatSpawnerProps) {
  const rats = useMemo(() => {
    const ratData: { position: [number, number, number]; seed: number }[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seededRandom(i * 100) * 0.5;
      const dist = radius * 0.3 + seededRandom(i * 200) * radius * 0.7;

      ratData.push({
        position: [
          center[0] + Math.cos(angle) * dist,
          groundY,
          center[2] + Math.sin(angle) * dist,
        ],
        seed: i * 1234,
      });
    }

    return ratData;
  }, [center, radius, count, groundY]);

  const bounds: [number, number, number, number] = [
    center[0] - radius,
    center[0] + radius,
    center[2] - radius,
    center[2] + radius,
  ];

  return (
    <>
      {rats.map((rat, i) => (
        <Rat
          key={i}
          initialPosition={rat.position}
          bounds={bounds}
          seed={rat.seed}
        />
      ))}
    </>
  );
}
