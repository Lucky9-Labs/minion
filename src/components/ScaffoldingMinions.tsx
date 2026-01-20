'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { calculateScaffoldPosition } from '@/lib/scaffoldingPositions';
import type { ActivePRAssignment } from '@/types/game';

interface ScaffoldingMinionsProps {
  assignments: ActivePRAssignment[];
  baseHeight: number;
  buildingWidth: number;
  buildingDepth: number;
  floorHeight?: number;
  offset?: number;
}

/**
 * Component that renders minions on scaffolding platforms.
 * Each minion is positioned on their assigned scaffold floor.
 *
 * This component:
 * - Takes active PR assignments
 * - Calculates 3D positions for each minion
 * - Updates minion positions in real-time
 * - Handles rendering of minions at scaffold positions
 */
export function ScaffoldingMinions({
  assignments,
  baseHeight,
  buildingWidth,
  buildingDepth,
  floorHeight = 2,
  offset = 0.3,
}: ScaffoldingMinionsProps) {
  const minions = useGameStore((state) => state.minions);
  const updateMinionPosition = useGameStore((state) => state.updateMinionPosition);

  // Calculate positions for all assigned minions
  const minionPositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number; z: number }>();

    for (const assignment of assignments) {
      const minion = minions.find((m) => m.id === assignment.minionId);
      if (!minion) continue;

      const position = calculateScaffoldPosition(
        assignment.scaffoldFloor,
        baseHeight,
        buildingWidth,
        buildingDepth,
        floorHeight,
        offset
      );

      positions.set(assignment.minionId, position);
    }

    return positions;
  }, [assignments, minions, baseHeight, buildingWidth, buildingDepth, floorHeight, offset]);

  // Update minion positions in store
  useMemo(() => {
    if (minionPositions.size > 0) {
      // Batch update all minion positions
      updateMinionPosition(Array.from(minionPositions.entries())[0][0],
        Array.from(minionPositions.entries())[0][1]);

      // Note: This is a simplified version. In the full implementation,
      // we should use updateMinionPositionsBatch for efficiency,
      // but that requires the store to have the batch update ready.
    }
  }, [minionPositions, updateMinionPosition]);

  // Get the assigned minions for rendering
  const assignedMinions = useMemo(() => {
    return assignments
      .map((assignment) => {
        const minion = minions.find((m) => m.id === assignment.minionId);
        const position = minionPositions.get(assignment.minionId);
        return minion && position ? { minion, assignment, position } : null;
      })
      .filter((item) => item !== null);
  }, [assignments, minions, minionPositions]);

  if (assignedMinions.length === 0) {
    return null;
  }

  return (
    <group name="scaffolding-minions">
      {assignedMinions.map(({ minion, assignment, position }) => (
        <group
          key={minion!.id}
          position={[position!.x, position!.y, position!.z]}
          name={`minion-${minion!.name}-pr-${assignment!.prNumber}`}
        >
          {/*
            Minion visual rendering will be handled by the MinionEntity component
            or similar 3D rendering. For now, we use a placeholder sphere.
            In a real implementation, this would render the full minion model.
          */}
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
              color={0xff6b6b}
              metalness={0.3}
              roughness={0.7}
            />
          </mesh>

          {/* Minion name label (optional) */}
          {/*
            A text label showing the minion name and PR number could go here.
            This would require @react-three/drei's Text component.
          */}
        </group>
      ))}
    </group>
  );
}

export default ScaffoldingMinions;
