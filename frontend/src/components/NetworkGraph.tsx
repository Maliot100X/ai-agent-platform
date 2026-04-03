"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Line } from "@react-three/drei";
import * as THREE from "three";

function Node({ position, color, size = 0.15 }: { position: [number, number, number]; color: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.001;
    }
  });

  return (
    <Sphere ref={meshRef} args={[size, 16, 16]} position={position}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </Sphere>
  );
}

function NetworkEdge({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  return (
    <Line
      points={[start, end]}
      color="#0ea5e9"
      lineWidth={1}
      opacity={0.3}
      transparent
    />
  );
}

function Scene() {
  const nodes = useMemo(() => [
    { pos: [0, 0, 0] as [number, number, number], color: "#0ea5e9", size: 0.25 },
    { pos: [1.5, 1, 0.5] as [number, number, number], color: "#8b5cf6", size: 0.15 },
    { pos: [-1.5, 0.5, -0.5] as [number, number, number], color: "#10b981", size: 0.15 },
    { pos: [0.5, -1.2, 1] as [number, number, number], color: "#f59e0b", size: 0.15 },
    { pos: [-1, -0.8, -1] as [number, number, number], color: "#ef4444", size: 0.15 },
    { pos: [2, -0.5, -0.5] as [number, number, number], color: "#06b6d4", size: 0.12 },
    { pos: [-0.5, 1.5, 1] as [number, number, number], color: "#a78bfa", size: 0.12 },
  ], []);

  const edges = useMemo(() => [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [3, 4], [1, 6], [5, 3],
  ], []);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      {nodes.map((n, i) => (
        <Node key={i} position={n.pos} color={n.color} size={n.size} />
      ))}
      {edges.map(([a, b], i) => (
        <NetworkEdge key={i} start={nodes[a].pos} end={nodes[b].pos} />
      ))}
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={1} />
    </>
  );
}

export default function NetworkGraph() {
  return (
    <div className="w-full h-[300px] rounded-2xl overflow-hidden glass-card">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
