import * as THREE from 'three';
import type { Building } from '@/types/project';

export interface PathSegment {
  points: THREE.Vector3[]; // Bezier control points
  width: number;
}

// Generate organic curved paths connecting buildings to the main street and tower
export function generateVillagePaths(buildings: Building[]): PathSegment[] {
  const paths: PathSegment[] = [];
  const mainStreetWidth = 2.5;
  const pathWidth = 1.2;

  // Find the tower (center point)
  const tower = buildings.find(b => b.type === 'tower');
  const towerPos = tower ? new THREE.Vector3(tower.position.x, 0, tower.position.z) : new THREE.Vector3(0, 0, 0);

  // Create main street running from tower southward
  const mainStreetLength = Math.max(
    ...buildings.map(b => Math.abs(b.position.z)),
    20 // Minimum length
  );

  // Main street path
  paths.push({
    points: [
      new THREE.Vector3(towerPos.x, 0, towerPos.z - 2),
      new THREE.Vector3(towerPos.x, 0, towerPos.z + 5),
      new THREE.Vector3(towerPos.x, 0, towerPos.z + mainStreetLength * 0.5),
      new THREE.Vector3(towerPos.x, 0, towerPos.z + mainStreetLength + 5),
    ],
    width: mainStreetWidth,
  });

  // Generate paths from each building to the main street
  for (const building of buildings) {
    if (building.type === 'tower') continue; // Skip tower

    const buildingPos = new THREE.Vector3(building.position.x, 0, building.position.z);

    // Calculate connection point on main street
    const streetX = towerPos.x;
    const streetZ = building.position.z;

    // Determine which side of street the building is on
    const isLeftSide = building.position.x < streetX;

    // Create organic curve from building to street
    // Use cubic bezier with control points that curve naturally
    const curveStrength = 0.3 + Math.random() * 0.2;
    const midX = buildingPos.x + (streetX - buildingPos.x) * curveStrength;

    const pathPoints = [
      buildingPos.clone(),
      new THREE.Vector3(midX, 0, buildingPos.z + (isLeftSide ? 0.5 : -0.5)),
      new THREE.Vector3(streetX + (isLeftSide ? -0.5 : 0.5), 0, streetZ),
      new THREE.Vector3(streetX, 0, streetZ),
    ];

    paths.push({
      points: pathPoints,
      width: pathWidth,
    });
  }

  return paths;
}

// Generate points along a cubic bezier curve
export function getCurvePoints(controlPoints: THREE.Vector3[], segments: number = 20): THREE.Vector3[] {
  const curve = new THREE.CubicBezierCurve3(
    controlPoints[0],
    controlPoints[1],
    controlPoints[2],
    controlPoints[3]
  );

  return curve.getPoints(segments);
}

// Generate geometry for a path segment
export function generatePathGeometry(segment: PathSegment): THREE.BufferGeometry {
  const { points, width } = segment;
  const curvePoints = getCurvePoints(points, 30);

  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const halfWidth = width / 2;

  for (let i = 0; i < curvePoints.length; i++) {
    const point = curvePoints[i];

    // Calculate tangent direction
    let tangent: THREE.Vector3;
    if (i === 0) {
      tangent = curvePoints[1].clone().sub(point).normalize();
    } else if (i === curvePoints.length - 1) {
      tangent = point.clone().sub(curvePoints[i - 1]).normalize();
    } else {
      tangent = curvePoints[i + 1].clone().sub(curvePoints[i - 1]).normalize();
    }

    // Calculate perpendicular (normal in XZ plane)
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);

    // Add two vertices (left and right of center line)
    const left = point.clone().add(normal.clone().multiplyScalar(halfWidth));
    const right = point.clone().add(normal.clone().multiplyScalar(-halfWidth));

    // Add slight Y offset for visibility
    left.y = 0.02;
    right.y = 0.02;

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);

    // UVs for texture mapping
    const u = i / (curvePoints.length - 1);
    uvs.push(0, u);
    uvs.push(1, u);

    // Create triangles (quads between consecutive pairs)
    if (i < curvePoints.length - 1) {
      const baseIndex = i * 2;
      // First triangle
      indices.push(baseIndex, baseIndex + 2, baseIndex + 1);
      // Second triangle
      indices.push(baseIndex + 1, baseIndex + 2, baseIndex + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}
