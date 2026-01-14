'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TowerFloor } from '@/types/game';
import { STONE_COLORS, WOOD_COLORS } from './buildings/materials/StoneMaterial';

const FLOOR_HEIGHT = 2.5; // Taller floors for more impressive tower
const FLOOR_WIDTH = 4.0;  // Wider for more presence
const FLOOR_DEPTH = 4.0;

// Keep accent colors for windows/glows - these give each floor its identity
const FLOOR_ACCENT_COLORS: Record<TowerFloor, { accent: string; glow: string }> = {
  library: { accent: '#8b5cf6', glow: '#c4b5fd' },
  workshop: { accent: '#f59e0b', glow: '#fde68a' },
  forge: { accent: '#ef4444', glow: '#fca5a5' },
  observatory: { accent: '#06b6d4', glow: '#a5f3fc' },
  portal: { accent: '#10b981', glow: '#6ee7b7' },
};

// Seeded random for consistent stone variation
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface FloorMeshProps {
  floor: TowerFloor;
  index: number;
  isUnlocked: boolean;
}

function FloorMesh({ floor, index, isUnlocked }: FloorMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const accentColors = FLOOR_ACCENT_COLORS[floor];

  // Generate stone block positions for this floor
  const stoneBlocks = useMemo(() => {
    const blocks: Array<{
      position: [number, number, number];
      size: [number, number, number];
      color: string;
      face: 'front' | 'right' | 'back' | 'left';
    }> = [];

    const colors = [STONE_COLORS.light, STONE_COLORS.medium, STONE_COLORS.dark];
    const blockRows = 5;
    const blockCols = 4;
    const blockHeight = (FLOOR_HEIGHT - 0.4) / blockRows;
    const mortarGap = 0.03;

    // Generate blocks for each face
    const faces: Array<{ face: 'front' | 'right' | 'back' | 'left'; rotation: number; offset: [number, number] }> = [
      { face: 'front', rotation: 0, offset: [0, FLOOR_DEPTH / 2] },
      { face: 'right', rotation: Math.PI / 2, offset: [FLOOR_WIDTH / 2, 0] },
      { face: 'back', rotation: Math.PI, offset: [0, -FLOOR_DEPTH / 2] },
      { face: 'left', rotation: -Math.PI / 2, offset: [-FLOOR_WIDTH / 2, 0] },
    ];

    faces.forEach(({ face }, faceIndex) => {
      const faceWidth = face === 'front' || face === 'back' ? FLOOR_WIDTH : FLOOR_DEPTH;
      const baseBlockWidth = (faceWidth - 0.8) / blockCols; // Leave room for corners

      for (let row = 0; row < blockRows; row++) {
        const rowOffset = row % 2 === 0 ? 0 : baseBlockWidth * 0.4;

        for (let col = 0; col < blockCols; col++) {
          const seed = index * 1000 + faceIndex * 100 + row * 10 + col;
          const widthVar = 0.85 + seededRandom(seed) * 0.3;
          const blockWidth = baseBlockWidth * widthVar;
          const depthVar = 1 + seededRandom(seed + 50) * 0.08;

          const x = -faceWidth / 2 + 0.4 + col * (baseBlockWidth + mortarGap) + blockWidth / 2 + rowOffset;
          const y = 0.2 + row * (blockHeight + mortarGap) + blockHeight / 2;

          if (x + blockWidth / 2 > faceWidth / 2 - 0.4) continue;

          const colorIndex = Math.floor(seededRandom(seed + 25) * colors.length);
          blocks.push({
            position: [x - faceWidth / 2 + 0.4, y, 0.08 * depthVar],
            size: [blockWidth - 0.02, blockHeight - 0.02, 0.12 * depthVar],
            color: colors[colorIndex],
            face,
          });
        }
      }
    });

    return blocks;
  }, [index]);

  // Subtle animation for unlocked floors
  useFrame((state) => {
    if (groupRef.current && isUnlocked) {
      const offset = Math.sin(state.clock.elapsedTime * 0.5 + index * 0.5) * 0.015;
      groupRef.current.position.y = index * FLOOR_HEIGHT + offset;
    }
  });

  const baseY = index * FLOOR_HEIGHT;
  const opacity = isUnlocked ? 1 : 0.4;

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      {/* Main floor body - gray stone base */}
      <mesh castShadow receiveShadow position={[0, FLOOR_HEIGHT / 2, 0]}>
        <boxGeometry args={[FLOOR_WIDTH, FLOOR_HEIGHT, FLOOR_DEPTH]} />
        <meshStandardMaterial
          color={isUnlocked ? STONE_COLORS.medium : '#374151'}
          roughness={0.85}
          metalness={0.05}
          transparent={!isUnlocked}
          opacity={opacity}
        />
      </mesh>

      {/* Stone blocks on each face for 3D texture (only when unlocked) */}
      {isUnlocked && (
        <>
          {/* Front face blocks */}
          <group position={[0, 0, FLOOR_DEPTH / 2]}>
            {stoneBlocks.filter(b => b.face === 'front').map((block, i) => (
              <mesh key={i} position={block.position} castShadow>
                <boxGeometry args={block.size} />
                <meshStandardMaterial color={block.color} roughness={0.9} />
              </mesh>
            ))}
          </group>
          {/* Right face blocks */}
          <group position={[FLOOR_WIDTH / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            {stoneBlocks.filter(b => b.face === 'right').map((block, i) => (
              <mesh key={i} position={block.position} castShadow>
                <boxGeometry args={block.size} />
                <meshStandardMaterial color={block.color} roughness={0.9} />
              </mesh>
            ))}
          </group>
          {/* Back face blocks */}
          <group position={[0, 0, -FLOOR_DEPTH / 2]} rotation={[0, Math.PI, 0]}>
            {stoneBlocks.filter(b => b.face === 'back').map((block, i) => (
              <mesh key={i} position={block.position} castShadow>
                <boxGeometry args={block.size} />
                <meshStandardMaterial color={block.color} roughness={0.9} />
              </mesh>
            ))}
          </group>
          {/* Left face blocks */}
          <group position={[-FLOOR_WIDTH / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            {stoneBlocks.filter(b => b.face === 'left').map((block, i) => (
              <mesh key={i} position={block.position} castShadow>
                <boxGeometry args={block.size} />
                <meshStandardMaterial color={block.color} roughness={0.9} />
              </mesh>
            ))}
          </group>
        </>
      )}

      {/* Stone trim at bottom */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.15, 0.2, FLOOR_DEPTH + 0.15]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} />
      </mesh>

      {/* Stone trim at top */}
      <mesh castShadow receiveShadow position={[0, FLOOR_HEIGHT - 0.1, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.1, 0.2, FLOOR_DEPTH + 0.1]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
      </mesh>

      {/* Corner pillars - stone with accent color caps */}
      <CornerPillar position={[-FLOOR_WIDTH / 2, 0, FLOOR_DEPTH / 2]} accentColor={isUnlocked ? accentColors.accent : STONE_COLORS.dark} height={FLOOR_HEIGHT} />
      <CornerPillar position={[FLOOR_WIDTH / 2, 0, FLOOR_DEPTH / 2]} accentColor={isUnlocked ? accentColors.accent : STONE_COLORS.dark} height={FLOOR_HEIGHT} />
      <CornerPillar position={[-FLOOR_WIDTH / 2, 0, -FLOOR_DEPTH / 2]} accentColor={isUnlocked ? accentColors.accent : STONE_COLORS.dark} height={FLOOR_HEIGHT} />
      <CornerPillar position={[FLOOR_WIDTH / 2, 0, -FLOOR_DEPTH / 2]} accentColor={isUnlocked ? accentColors.accent : STONE_COLORS.dark} height={FLOOR_HEIGHT} />

      {/* Windows on visible sides (front and right for isometric view) */}
      {isUnlocked && (
        <>
          {/* Front window */}
          <Window position={[0, FLOOR_HEIGHT / 2, FLOOR_DEPTH / 2 + 0.01]} glowColor={accentColors.glow} />
          {/* Right window */}
          <Window position={[FLOOR_WIDTH / 2 + 0.01, FLOOR_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} glowColor={accentColors.glow} />
          {/* Left window (visible from some angles) */}
          <Window position={[-FLOOR_WIDTH / 2 - 0.01, FLOOR_HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]} glowColor={accentColors.glow} />
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

function CornerPillar({ position, accentColor, height }: { position: [number, number, number]; accentColor: string; height: number }) {
  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main pillar body - stone */}
      <mesh castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[0.4, height, 0.4]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.85} />
      </mesh>
      {/* Pillar cap - accent color */}
      <mesh castShadow position={[0, height + 0.08, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.5]} />
        <meshStandardMaterial color={accentColor} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Pillar base - stone */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.5]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Window({ position, rotation = [0, 0, 0], glowColor }: { position: [number, number, number]; rotation?: [number, number, number]; glowColor: string }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Window frame - dark stone */}
      <mesh>
        <boxGeometry args={[0.7, 0.9, 0.08]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} />
      </mesh>
      {/* Window glow - keeps floor identity */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.85} />
      </mesh>
      {/* Window cross bars - iron */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.5, 0.06, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[0.06, 0.7, 0.02]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.7} />
      </mesh>
    </group>
  );
}

function TowerRoof({ height }: { height: number }) {
  return (
    <group position={[0, height, 0]}>
      {/* Roof base platform - stone */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.3, 0.2, FLOOR_DEPTH + 0.3]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
      </mesh>

      {/* Conical roof with wood planks */}
      <mesh castShadow position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.8, 2.2, 4]} />
        <meshStandardMaterial color={WOOD_COLORS.medium} roughness={0.8} />
      </mesh>

      {/* Roof edge trim - wood */}
      <mesh castShadow position={[0, 0.25, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.15, 4]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
      </mesh>

      {/* Spire base - stone */}
      <mesh castShadow position={[0, 2.3, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.4, 8]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
      </mesh>

      {/* Spire - gold accent */}
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
        <meshStandardMaterial color="#4a4a4a" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Flag - 3D box */}
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
      {/* Main stone foundation - layered for visible 3D depth */}
      <mesh receiveShadow castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 0.8, 1.2, FLOOR_DEPTH + 0.8]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.95} />
      </mesh>

      {/* Foundation step 1 */}
      <mesh receiveShadow castShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 1.2, 0.6, FLOOR_DEPTH + 1.2]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.95} />
      </mesh>

      {/* Foundation step 2 */}
      <mesh receiveShadow castShadow position={[0, -0.9, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 1.6, 0.5, FLOOR_DEPTH + 1.6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
      </mesh>

      {/* Base platform - lowest visible layer */}
      <mesh receiveShadow castShadow position={[0, -1.3, 0]}>
        <boxGeometry args={[FLOOR_WIDTH + 2.0, 0.4, FLOOR_DEPTH + 2.0]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.95} />
      </mesh>

      {/* Steps leading to door - stone */}
      <mesh receiveShadow castShadow position={[0, 0.5, FLOOR_DEPTH / 2 + 0.4]}>
        <boxGeometry args={[2.0, 0.4, 0.8]} />
        <meshStandardMaterial color={STONE_COLORS.medium} roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 0.2, FLOOR_DEPTH / 2 + 0.9]}>
        <boxGeometry args={[2.2, 0.35, 0.7]} />
        <meshStandardMaterial color={STONE_COLORS.dark} roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, -0.1, FLOOR_DEPTH / 2 + 1.3]}>
        <boxGeometry args={[2.4, 0.3, 0.6]} />
        <meshStandardMaterial color={STONE_COLORS.darker} roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, -0.35, FLOOR_DEPTH / 2 + 1.65]}>
        <boxGeometry args={[2.6, 0.25, 0.5]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
      </mesh>

      {/* Door archway - deep inset */}
      <mesh position={[0, 1.0, FLOOR_DEPTH / 2 - 0.1]} castShadow>
        <boxGeometry args={[1.6, 2.0, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Door - wood */}
      <mesh position={[0, 0.95, FLOOR_DEPTH / 2 + 0.05]}>
        <boxGeometry args={[1.2, 1.8, 0.15]} />
        <meshStandardMaterial color={WOOD_COLORS.darkStain} roughness={0.75} />
      </mesh>

      {/* Door metal bands - iron */}
      <mesh position={[0, 0.4, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.0, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.6, FLOOR_DEPTH / 2 + 0.15]}>
        <boxGeometry args={[1.25, 0.1, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Door handle - brass */}
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
      {/* Iron bracket */}
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.08, 0.2]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* Torch body - wood */}
      <mesh castShadow position={[0, 0.2, 0.05]}>
        <cylinderGeometry args={[0.04, 0.06, 0.35, 8]} />
        <meshStandardMaterial color={WOOD_COLORS.dark} roughness={0.85} />
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
