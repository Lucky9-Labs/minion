'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createRiverMaterial, updateRiverMaterial } from '@/lib/effects/RiverMaterial';

interface RiverProps {
  /** Starting position of the river */
  position?: [number, number, number];
  /** Width of the river */
  width?: number;
  /** Length of the river */
  length?: number;
  /** Flow direction (normalized) */
  flowDirection?: [number, number];
  /** Number of segments for smooth curves */
  segments?: number;
  /** Optional path points for curved river - overrides length */
  pathPoints?: [number, number, number][];
}

export function River({
  position = [0, 0.05, 0],
  width = 3,
  length = 20,
  flowDirection = [0, -1],
  segments = 32,
  pathPoints,
}: RiverProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Create river material
  const material = useMemo(() => {
    const mat = createRiverMaterial({
      flowDirection: new THREE.Vector2(flowDirection[0], flowDirection[1]),
      shallowColor: new THREE.Color(0x5da4d4),
      deepColor: new THREE.Color(0x1a5a8a),
      flowSpeed: 0.12,
      rippleScale: 6.0,
      rippleStrength: 0.4,
      opacity: 0.9,
    });
    materialRef.current = mat;
    return mat;
  }, [flowDirection]);

  // Create river geometry
  const geometry = useMemo(() => {
    if (pathPoints && pathPoints.length >= 2) {
      // Create curved river from path points
      return createCurvedRiverGeometry(pathPoints, width, segments);
    } else {
      // Simple straight river
      return new THREE.PlaneGeometry(width, length, segments, segments);
    }
  }, [width, length, segments, pathPoints]);

  // Animate the material
  useFrame((_, delta) => {
    if (materialRef.current) {
      updateRiverMaterial(materialRef.current, delta);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      material={material}
      receiveShadow
    />
  );
}

/**
 * Create geometry for a curved river following a path
 */
function createCurvedRiverGeometry(
  points: [number, number, number][],
  width: number,
  segments: number
): THREE.BufferGeometry {
  // Create a smooth curve through the points
  const curve = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(p[0], p[1], p[2]))
  );

  // Get points along the curve
  const curvePoints = curve.getPoints(segments);

  // Build geometry with width
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < curvePoints.length; i++) {
    const point = curvePoints[i];

    // Get tangent for perpendicular direction
    const t = i / (curvePoints.length - 1);
    const tangent = curve.getTangentAt(t);
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

    // Create two vertices at this point (left and right edge)
    const leftPoint = point.clone().addScaledVector(perpendicular, -width / 2);
    const rightPoint = point.clone().addScaledVector(perpendicular, width / 2);

    // In XZ plane (Y is up), we need X and Z for the plane
    vertices.push(leftPoint.x, leftPoint.z);
    vertices.push(rightPoint.x, rightPoint.z);

    // UV coordinates
    uvs.push(0, t);
    uvs.push(1, t);

    // Create triangles
    if (i < curvePoints.length - 1) {
      const baseIdx = i * 2;
      // First triangle
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      // Second triangle
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }
  }

  // Convert to 3D vertices (add Y=0)
  const vertices3D: number[] = [];
  for (let i = 0; i < vertices.length; i += 2) {
    vertices3D.push(vertices[i], 0, vertices[i + 1]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices3D, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * River bank/shore decoration component
 */
interface RiverBankProps {
  riverPosition: [number, number, number];
  width: number;
  length: number;
  side: 'left' | 'right';
}

export function RiverBank({ riverPosition, width, length, side }: RiverBankProps) {
  const offset = side === 'left' ? -width / 2 - 0.5 : width / 2 + 0.5;

  return (
    <group position={[riverPosition[0] + offset, riverPosition[1], riverPosition[2]]}>
      {/* River bank (sandy/muddy edge) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1, length]} />
        <meshStandardMaterial color="#8b7355" roughness={0.95} />
      </mesh>

      {/* Rocks along the bank */}
      {Array.from({ length: Math.floor(length / 3) }).map((_, i) => (
        <mesh
          key={i}
          position={[(Math.random() - 0.5) * 0.5, 0.1, -length / 2 + i * 3 + Math.random() * 2]}
          rotation={[Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3]}
          castShadow
        >
          <dodecahedronGeometry args={[0.15 + Math.random() * 0.1, 0]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
        </mesh>
      ))}

      {/* Reeds/grass */}
      {Array.from({ length: Math.floor(length / 2) }).map((_, i) => (
        <group
          key={`reed-${i}`}
          position={[(Math.random() - 0.5) * 0.3, 0, -length / 2 + i * 2 + Math.random()]}
        >
          {[0, 1, 2].map((j) => (
            <mesh
              key={j}
              position={[(j - 1) * 0.08, 0.2 + Math.random() * 0.1, 0]}
              rotation={[0.1 * (Math.random() - 0.5), 0, 0.05 * (Math.random() - 0.5)]}
            >
              <cylinderGeometry args={[0.01, 0.02, 0.4 + Math.random() * 0.2, 4]} />
              <meshStandardMaterial color="#3d5c3d" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
