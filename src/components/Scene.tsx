'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

// Spinning cube
function SpinningCube() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

// Floating Island
function FloatingIsland() {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[14, 1, 14]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[13, 2, 13]} />
        <meshStandardMaterial color="#a3761c" />
      </mesh>
      <mesh position={[0, -3.5, 0]}>
        <boxGeometry args={[11, 2, 11]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, -5.5, 0]}>
        <boxGeometry args={[9, 2, 9]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
      <mesh position={[0, -7.5, 0]}>
        <coneGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  );
}

// Tree
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[0.7, 1.5, 8]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

// Simple Tower
function SimpleTower() {
  return (
    <group position={[0, 0.5, 0]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 1, 4]} />
        <meshStandardMaterial color="#4a4a4a" />
      </mesh>
      {/* Floor 1 - Library */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.5, 2, 3.5]} />
        <meshStandardMaterial color="#6d28d9" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[2.5, 2, 4]} />
        <meshStandardMaterial color="#1e3a5f" />
      </mesh>
    </group>
  );
}

export function Scene() {
  return (
    <Canvas
      camera={{ position: [20, 20, 20], fov: 45 }}
      gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      frameloop="always"
      style={{ width: '100%', height: '100%', display: 'block', background: 'red' }}
      onCreated={(state) => {
        console.log('R3F Canvas created!', state);
        console.log('Renderer:', state.gl);
        console.log('Scene children:', state.scene.children.length);
        state.gl.setClearColor('#87ceeb', 1);
      }}
    >
      {/* Background */}
      <color attach="background" args={['#87ceeb']} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />

      {/* Scene content */}
      <FloatingIsland />
      <SimpleTower />
      <SpinningCube />

      {/* Trees */}
      <Tree position={[-4, 0.5, -3]} />
      <Tree position={[4, 0.5, -4]} />
      <Tree position={[-5, 0.5, 3]} />
      <Tree position={[3, 0.5, 5]} />

      {/* Controls */}
      <OrbitControls target={[0, 2, 0]} />
    </Canvas>
  );
}
