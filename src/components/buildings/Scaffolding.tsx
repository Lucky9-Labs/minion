'use client';

import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';

interface ScaffoldingProps {
  buildingWidth: number;
  buildingDepth: number;
  floorCount: number; // Number of open PRs = scaffold floors
  baseHeight: number; // Start above existing building height
  floorHeight?: number; // Height per floor
}

// Medieval wooden scaffolding component
export function Scaffolding({
  buildingWidth,
  buildingDepth,
  floorCount,
  baseHeight,
  floorHeight = 2,
}: ScaffoldingProps) {
  // Wood material for scaffolding
  const woodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x8b4513, // Sienna brown
        roughness: 0.9,
        metalness: 0.0,
      }),
    []
  );

  const darkWoodMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x654321, // Darker brown for accents
        roughness: 0.85,
        metalness: 0.0,
      }),
    []
  );

  // Generate scaffolding geometry
  const scaffoldingElements = useMemo(() => {
    const elements: ReactNode[] = [];
    const poleRadius = 0.08;
    const beamRadius = 0.06;
    const plankThickness = 0.05;

    // Offset from building edge
    const offset = 0.3;
    const halfWidth = buildingWidth / 2 + offset;
    const halfDepth = buildingDepth / 2 + offset;

    // Corner positions for vertical poles
    const corners = [
      [-halfWidth, -halfDepth],
      [halfWidth, -halfDepth],
      [halfWidth, halfDepth],
      [-halfWidth, halfDepth],
    ];

    // Generate scaffolding for each floor (each open PR)
    for (let floor = 0; floor < floorCount; floor++) {
      const floorY = baseHeight + floor * floorHeight;
      const floorKey = `floor-${floor}`;

      // Vertical poles at corners (extend from floor to floor+1)
      corners.forEach(([x, z], cornerIndex) => {
        elements.push(
          <mesh
            key={`${floorKey}-pole-${cornerIndex}`}
            position={[x, floorY + floorHeight / 2, z]}
            material={woodMaterial}
          >
            <cylinderGeometry args={[poleRadius, poleRadius, floorHeight + 0.2, 8]} />
          </mesh>
        );
      });

      // Horizontal beams connecting poles at top of each floor
      const topY = floorY + floorHeight;

      // Front and back beams (along X axis)
      [-halfDepth, halfDepth].forEach((z, zIndex) => {
        elements.push(
          <mesh
            key={`${floorKey}-beam-x-${zIndex}`}
            position={[0, topY, z]}
            rotation={[0, 0, Math.PI / 2]}
            material={darkWoodMaterial}
          >
            <cylinderGeometry args={[beamRadius, beamRadius, buildingWidth + offset * 2, 6]} />
          </mesh>
        );
      });

      // Left and right beams (along Z axis)
      [-halfWidth, halfWidth].forEach((x, xIndex) => {
        elements.push(
          <mesh
            key={`${floorKey}-beam-z-${xIndex}`}
            position={[x, topY, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={darkWoodMaterial}
          >
            <cylinderGeometry args={[beamRadius, beamRadius, buildingDepth + offset * 2, 6]} />
          </mesh>
        );
      });

      // Diagonal bracing on each side
      const braceLength = Math.sqrt(floorHeight ** 2 + buildingWidth ** 2) * 0.5;
      const braceAngle = Math.atan2(floorHeight, buildingWidth);

      // Front diagonal brace
      elements.push(
        <mesh
          key={`${floorKey}-brace-front`}
          position={[0, floorY + floorHeight / 2, -halfDepth]}
          rotation={[0, 0, braceAngle]}
          material={darkWoodMaterial}
        >
          <cylinderGeometry args={[beamRadius * 0.7, beamRadius * 0.7, braceLength, 6]} />
        </mesh>
      );

      // Back diagonal brace
      elements.push(
        <mesh
          key={`${floorKey}-brace-back`}
          position={[0, floorY + floorHeight / 2, halfDepth]}
          rotation={[0, 0, -braceAngle]}
          material={darkWoodMaterial}
        >
          <cylinderGeometry args={[beamRadius * 0.7, beamRadius * 0.7, braceLength, 6]} />
        </mesh>
      );

      // Wooden planks as walkway platform
      const plankWidth = 0.2;
      const plankCount = Math.floor((buildingWidth + offset * 2) / plankWidth);
      const startX = -halfWidth + plankWidth / 2;

      // Platform on front side (where workers stand)
      for (let i = 0; i < plankCount; i++) {
        elements.push(
          <mesh
            key={`${floorKey}-plank-front-${i}`}
            position={[startX + i * plankWidth, topY + plankThickness / 2, -halfDepth]}
            material={woodMaterial}
          >
            <boxGeometry args={[plankWidth - 0.02, plankThickness, 0.8]} />
          </mesh>
        );
      }

      // Platform on back side
      for (let i = 0; i < plankCount; i++) {
        elements.push(
          <mesh
            key={`${floorKey}-plank-back-${i}`}
            position={[startX + i * plankWidth, topY + plankThickness / 2, halfDepth]}
            material={woodMaterial}
          >
            <boxGeometry args={[plankWidth - 0.02, plankThickness, 0.8]} />
          </mesh>
        );
      }

      // Safety rail on outer edge of platforms
      const railHeight = 0.4;
      elements.push(
        <mesh
          key={`${floorKey}-rail-front`}
          position={[0, topY + railHeight / 2, -halfDepth - 0.35]}
          rotation={[0, 0, Math.PI / 2]}
          material={darkWoodMaterial}
        >
          <cylinderGeometry args={[beamRadius * 0.5, beamRadius * 0.5, buildingWidth + offset * 2, 6]} />
        </mesh>
      );

      elements.push(
        <mesh
          key={`${floorKey}-rail-back`}
          position={[0, topY + railHeight / 2, halfDepth + 0.35]}
          rotation={[0, 0, Math.PI / 2]}
          material={darkWoodMaterial}
        >
          <cylinderGeometry args={[beamRadius * 0.5, beamRadius * 0.5, buildingWidth + offset * 2, 6]} />
        </mesh>
      );
    }

    return elements;
  }, [buildingWidth, buildingDepth, floorCount, baseHeight, floorHeight, woodMaterial, darkWoodMaterial]);

  if (floorCount === 0) return null;

  return <group name="scaffolding">{scaffoldingElements}</group>;
}

export default Scaffolding;
