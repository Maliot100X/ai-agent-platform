"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, OrbitControls, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function Planet({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.002;
      ringRef.current.rotation.x = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  const distort = speaking ? 0.4 : listening ? 0.25 : 0.15;
  const speed = speaking ? 3 : listening ? 2 : 1;
  const color = speaking ? "#8b5cf6" : listening ? "#0ea5e9" : "#06b6d4";

  return (
    <group>
      {/* Main planet */}
      <Sphere ref={meshRef} args={[1.2, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.8}
          distort={distort}
          speed={speed}
          transparent
          opacity={0.9}
        />
      </Sphere>

      {/* Ring */}
      <mesh ref={ringRef} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2, 0.03, 16, 100]} />
        <meshStandardMaterial
          color={speaking ? "#a78bfa" : "#0ea5e9"}
          emissive={speaking ? "#a78bfa" : "#0ea5e9"}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Second ring */}
      <mesh rotation={[0.5, 0.3, 0.1]}>
        <torusGeometry args={[1.8, 0.02, 16, 80]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  );
}

function OrbitingTokens({ speaking }: { speaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  const tokens = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      distance: 2.5 + Math.random() * 0.5,
      speed: 0.3 + Math.random() * 0.3,
      size: 0.06 + Math.random() * 0.04,
      color: ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#a78bfa", "#fbbf24"][i],
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speaking ? 0.01 : 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {tokens.map((t, i) => {
        const x = Math.cos(t.angle) * t.distance;
        const z = Math.sin(t.angle) * t.distance;
        const y = Math.sin(t.angle * 2) * 0.3;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[t.size, 8, 8]} />
            <meshStandardMaterial
              color={t.color}
              emissive={t.color}
              emissiveIntensity={speaking ? 1 : 0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function DataStreams({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 100;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const c = [0.055, 0.647, 0.914]; // cyan
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];
    }
    return [pos, col];
  }, []);

  useFrame((state) => {
    if (ref.current && active) {
      ref.current.rotation.y += 0.005;
      const posArr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < posArr.length; i += 3) {
        posArr[i + 1] += 0.01;
        if (posArr[i + 1] > 1.5) posArr[i + 1] = -1.5;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        vertexColors
        transparent
        opacity={active ? 0.6 : 0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function CryptoPlanet({
  speaking = false,
  listening = false,
  connected = false,
}: {
  speaking?: boolean;
  listening?: boolean;
  connected?: boolean;
}) {
  return (
    <div className="w-full h-[300px] rounded-2xl overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 3, 5]} intensity={1} color="#0ea5e9" />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#8b5cf6" />
        <Planet speaking={speaking} listening={listening} />
        <OrbitingTokens speaking={speaking} />
        <DataStreams active={connected} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={speaking ? 2 : 0.5} />
      </Canvas>
    </div>
  );
}
