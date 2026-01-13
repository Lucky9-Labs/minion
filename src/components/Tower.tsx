'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TowerFloor } from '@/types/game';
import { TOWER_FLOORS } from '@/types/game';

const FLOOR_HEIGHT = 2.5; // Taller floors for more impressive tower
const FLOOR_WIDTH = 4.0;  // Wider for more presence
const FLOOR_DEPTH = 4.0;
const WALL_THICKNESS = 0.4;

const FLOOR_COLORS: Record<TowerFloor, { main: string; accent: string; glow: string }> = {
  library: { main: '#6d28d9', accent: '#8b5cf6', glow: '#c4b5fd' },
  workshop: { main: '#b45309', accent: '#f59e0b', glow: '#fde68a' },
  forge: { main: '#b91c1c', accent: '#ef4444', glow: '#fca5a5' },
  observatory: { main: '#0e7490', accent: '#06b6d4', glow: '#a5f3fc' },
  portal: { main: '#047857', accent: '#10b981', glow: '#6ee7b7' },
};

interface FloorMeshProps {
  floor: TowerFloor;
  index: number;
  isUnlocked: boolean;
}

function FloorMesh({ floor, index, isUnlocked }: FloorMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = FLOOR_COLORS[floor];

  // Subtle animation for unlocked floors
  useFrame((state) => {
    if (groupRef.current && isUnlocked) {
      const offset = Math.sin(state.clock.elapsedTime * 0.5 + index * 0.5) * 0.015;
      groupRef.current.position.y = index * FLOOR_HEIGHT + offset;
    }
  });

  const baseY = index * FLOOR_HEIGHT;
  const floorColor = isUnlocked ? colors.main : '#374151';
  const accentColor = isUnlocked ? colors.accent : '#4b5563';
  const opacity = isUnlocked ? 1 : 0.4;

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* Main floor body - with beveled edges for depth */}
      <mesh castShadow receiveShadow position={[0, FLOOR_HEIGHT / 2, 0]}>
        <boxGeometry args={[FLOOR_WIDTH, FLOOR_HEIGHT * 0.85, FLOOR_DEPTH]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.75}
          metalness={0.1}
          transparent={!isUnlocked}
          opacity={opacity}
        />
      </mesh>

      {/* Stone trim at bottom - creates visual separation */}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.15, 0.16, FLOOR_DEPTH + 0.15]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>

      {/* Stone trim at top */}
      <mesh castShadow receiveShadow position={[0, FLOOR_HEIGHT * 0.92, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.1, 0.12, FLOOR_DEPTH + 0.1]} />
        <meshStandardMaterial color="#52525b" roughness={0.85} />
      </mesh>

      {/* Corner pillars for 3D depth - front left */}
      <CornerPillar position={[-FLOOR_WIDTH / 2, 0, FLOOR_DEPTH / 2]} color={accentColor} height={FLOOR_HEIGHT} />
      {/* Front right */}
      <CornerPillar position={[FLOOR_WIDTH / 2, 0, FLOOR_DEPTH / 2]} color={accentColor} height={FLOOR_HEIGHT} />
      {/* Back left */}
      <CornerPillar position={[-FLOOR_WIDTH / 2, 0, -FLOOR_DEPTH / 2]} color={accentColor} height={FLOOR_HEIGHT} />
      {/* Back right */}
      <CornerPillar position={[FLOOR_WIDTH / 2, 0, -FLOOR_DEPTH / 2]} color={accentColor} height={FLOOR_HEIGHT} />

      {/* Windows on visible sides (front and right for isometric view) */}
      {isUnlocked && (
        <>
          {/* Front window */}
          <Window position={[0, FLOOR_HEIGHT / 2, FLOOR_DEPTH / 2 + 0.01]} glowColor={colors.glow} />
          {/* Right window */}
          <Window position={[FLOOR_WIDTH / 2 + 0.01, FLOOR_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} glowColor={colors.glow} />
          {/* Left window (visible from some angles) */}
          <Window position={[-FLOOR_WIDTH / 2 - 0.01, FLOOR_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} glowColor={colors.glow} />
        </>
      )}

      {/* Locked floor overlay */}
      {!isUnlocked && (
        <mesh position={[0, FLOOR_HEIGHT / 2, FLOOR_DEPTH / 2 + 0.02]}>
          <planeGeometry args={[1, 0.8]} />
          <meshBasicMaterial color="#71717a" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function CornerPillar({ position, color, height }: { position: [number, number, number]; color: string; height: number }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main pillar body */}
      <mesh castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[0.4, height, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Pillar cap */}
      <mesh castShadow position={[0, height + 0.08, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Pillar base */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Window({ position, rotation = [0, 0, 0], glowColor }: { position: [number, number, number]; rotation?: [number, number, number]; glowColor: string }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Window frame */}
      <mesh>
        <boxGeometry args={[0.7, 0.9, 0.08]} />
        <meshStandardMaterial color="#27272a" roughness={0.8} />
      </mesh>
      {/* Window glow */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.85} />
      </mesh>
      {/* Window cross bars */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.5, 0.06, 0.02]} />
        <meshStandardMaterial color="#18181b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.06, 0.7, 0.02]} />
        <meshStandardMaterial color="#18181b" roughness={0.9} />
      </mesh>
    </group>
  );
}

function TowerRoof({ height }: { height: number }) {
  return (
    <group position={[0, height, 0]}>
      {/* Roof base platform */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.3, 0.2, FLOOR_DEPTH + 0.3]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>

      {/* Conical roof with more segments for smoothness */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <coneGeometry args={[2.8, 2.2, 4]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.7} flatShading />
      </mesh>

      {/* Roof edge trim */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.15, 4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Spire base */}
      <mesh castShadow position={[0, 2.3, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.4, 8]} />
        <meshStandardMaterial color="#44403c" roughness={0.85} />
      </mesh>

      {/* Spire */}
      <mesh castShadow position={[0, 3.0, 0]}>
        <coneGeometry args={[0.2, 1.2, 8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Spire orb */}
      <mesh castShadow position={[0, 3.7, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" metalness={0.8} roughness={0.2} emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>

      {/* Flag pole */}
      <mesh position={[0.35, 3.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial color="#78716c" roughness={0.7} />
      </mesh>

      {/* Flag - 3D box instead of plane */}
      <mesh position={[0.7, 3.6, 0]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.6, 0.35, 0.03]} />
        <meshStandardMaterial color="#dc2626" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TowerBase() {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Main stone foundation - THICK layered for visible 3D depth */}
      <mesh receiveShadow castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.8, 1.2, FLOOR_DEPTH + 0.8]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>

      {/* Foundation step 1 */}
      <mesh receiveShadow castShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 1.2, 0.6, FLOOR_DEPTH + 1.2]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.95} />
      </mesh>

      {/* Foundation step 2 */}
      <mesh receiveShadow castShadow position={[0, -0.9, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 1.6, 0.5, FLOOR_DEPTH + 1.6]} />
        <meshStandardMaterial color="#333333" roughness={0.95} />
      </mesh>

      {/* Base platform - lowest visible layer */}
      <mesh receiveShadow castShadow position={[0, -1.3, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 2.0, 0.4, FLOOR_DEPTH + 2.0]} />
        <meshStandardMaterial color="#292929" roughness={0.95} />
      </mesh>

      {/* Steps leading to door - 4 levels for depth */}
      <mesh receiveShadow castShadow position={[0, 0.5, FLOOR_DEPTH / 2 + 0.4]}>
        <boxGeometry args={[2.0, 0.4, 0.8]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.2, FLOOR_DEPTH / 2 + 0.9]}>
        <boxGeometry args={[2.2, 0.35, 0.7]} />
        <meshStandardMaterial color="#525252" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, -0.1, FLOOR_DEPTH / 2 + 1.3]}>
        <boxGeometry args={[2.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, -0.35, FLOOR_DEPTH / 2 + 1.65]}>
        <boxGeometry args={[2.6, 0.25, 0.5]} />
        <meshStandardMaterial color="#424242" roughness={0.9} />
      </mesh>

      {/* Door archway - deep inset for 3D effect */}
      <mesh position={[0, 1.0, FLOOR_DEPTH / 2 - 0.1]} castShadow>
        <boxGeometry args={[1.6, 2.0, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.95, FLOOR_DEPTH / 2 + 0.05]}>
        <boxGeometry args={[1.2, 1.8, 0.15]} />
        <meshStandardMaterial color="#5c3317" roughness={0.75} />
      </mesh>

      {/* Door metal bands */}
      <mesh position={[0, 0.4, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.0, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.4, 0.9, FLOOR_DEPTH / 2 + 0.22]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#b8860b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Torches on either side of door */}
      <Torch position={[-1.4, 1.2, FLOOR_DEPTH / 2 + 0.1]} />
      <Torch position={[1.4, 1.2, FLOOR_DEPTH / 2 + 0.1]} />
    </group>
  );
}

function Torch({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Bracket */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.08, 0.2]} />
        <meshStandardMaterial color="#44403c" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* Torch body */}
      <mesh castShadow position={[0, 0.2, 0.05]}>
        <cylinderGeometry args={[0.04, 0.06, 0.35, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.85} />
      </mesh>
      {/* Flame glow */}
      <mesh position={[0, 0.45, 0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.9} />
      </mesh>
      {/* Flame inner */}
      <mesh position={[0, 0.48, 0.05]}>
        <coneGeometry args={[0.04, 0.12, 6]} />
        <meshBasicMaterial color="#fef3c7" />
      </mesh>
    </group>
  );
}

interface TowerProps {
  unlockedFloors: TowerFloor[];
}

export function Tower({ unlockedFloors }: TowerProps) {
  const allFloors: TowerFloor[] = ['library', 'workshop', 'forge', 'observatory', 'portal'];
  const displayedFloors = allFloors.slice(0, Math.max(unlockedFloors.length, 1));

  return (
    <group position={[0, 0.15, 0]}>
      <TowerBase />
      {displayedFloors.map((floor, index) => (
        <FloorMesh
          key={floor}
          floor={floor}
          index={index}
          isUnlocked={unlockedFloors.includes(floor)}
        />
      ))}
      <TowerRoof height={displayedFloors.length * FLOOR_HEIGHT} />
    </group>
  );
}
