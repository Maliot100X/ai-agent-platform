"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, OrbitControls, MeshDistortMaterial, Text, Float } from "@react-three/drei";
import * as THREE from "three";

function Planet({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += speaking ? 0.008 : 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const distort = speaking ? 0.45 : listening ? 0.3 : 0.15;
  const speed = speaking ? 4 : listening ? 2.5 : 1;
  const color = speaking ? "#8b5cf6" : listening ? "#0ea5e9" : "#06b6d4";

  return (
    <Sphere ref={meshRef} args={[1.2, 64, 64]}>
      <MeshDistortMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.3}
        metalness={0.9}
        distort={distort}
        speed={speed}
        transparent
        opacity={0.9}
      />
    </Sphere>
  );
}

function Rings({ speaking }: { speaking: boolean }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += 0.003;
      ring1Ref.current.rotation.x = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
    if (ring2Ref.current) ring2Ref.current.rotation.z -= 0.002;
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += 0.001;
      ring3Ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2, 0.025, 16, 100]} />
        <meshStandardMaterial
          color={speaking ? "#a78bfa" : "#0ea5e9"}
          emissive={speaking ? "#a78bfa" : "#0ea5e9"}
          emissiveIntensity={0.6}
          transparent opacity={0.7}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0.5, 0.3, 0.1]}>
        <torusGeometry args={[1.8, 0.02, 16, 80]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.4} transparent opacity={0.5} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[1.2, 0.5, 0.3]}>
        <torusGeometry args={[2.3, 0.015, 16, 60]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

const TICKERS = [
  { symbol: "BTC", color: "#f7931a", angle: 0, radius: 2.8 },
  { symbol: "ETH", color: "#627eea", angle: Math.PI * 0.33, radius: 3.0 },
  { symbol: "SOL", color: "#00ffa3", angle: Math.PI * 0.66, radius: 2.7 },
  { symbol: "PUMP", color: "#ff6b9d", angle: Math.PI * 1.0, radius: 3.1 },
  { symbol: "DOGE", color: "#c3a634", angle: Math.PI * 1.33, radius: 2.9 },
  { symbol: "AVAX", color: "#e84142", angle: Math.PI * 1.66, radius: 2.8 },
  { symbol: "LINK", color: "#2a5ada", angle: Math.PI * 0.5, radius: 3.2 },
  { symbol: "MATIC", color: "#8247e5", angle: Math.PI * 1.5, radius: 3.0 },
];

function CryptoTickers({ speaking }: { speaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speaking ? 0.01 : 0.004;
    }
  });

  return (
    <group ref={groupRef}>
      {TICKERS.map((t) => {
        const x = Math.cos(t.angle) * t.radius;
        const z = Math.sin(t.angle) * t.radius;
        const y = Math.sin(t.angle * 2) * 0.3;
        return (
          <Float key={t.symbol} speed={2.5} rotationIntensity={0.3} floatIntensity={0.6}>
            <group position={[x, y, z]}>
              {/* Token sphere with glow */}
              <mesh>
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshStandardMaterial
                  color={t.color}
                  emissive={t.color}
                  emissiveIntensity={speaking ? 1.2 : 0.6}
                />
              </mesh>
              {/* Outer glow */}
              <mesh>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshStandardMaterial
                  color={t.color}
                  emissive={t.color}
                  emissiveIntensity={0.3}
                  transparent
                  opacity={0.15}
                />
              </mesh>
              {/* Ticker label */}
              <Text
                position={[0, 0.3, 0]}
                fontSize={0.14}
                color={t.color}
                anchorX="center"
                anchorY="middle"
                font={undefined}
              >
                {t.symbol}
              </Text>
            </group>
          </Float>
        );
      })}
    </group>
  );
}

function DataStreams({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 120;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2.5;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const palette = [[0.055, 0.647, 0.914], [0.545, 0.361, 0.965], [0, 1, 0.64], [0.969, 0.573, 0.102]];
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return [pos, col];
  }, []);

  useFrame(() => {
    if (ref.current && active) {
      ref.current.rotation.y += 0.005;
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.01;
        if (arr[i + 1] > 1.5) arr[i + 1] = -1.5;
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
      <pointsMaterial size={0.05} vertexColors transparent opacity={active ? 0.7 : 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
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
    <div className="w-full h-[320px] rounded-2xl overflow-hidden glass-card">
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 3, 5]} intensity={1.2} color="#0ea5e9" />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#8b5cf6" />
        <pointLight position={[0, 5, 0]} intensity={0.3} color="#f59e0b" />
        <Planet speaking={speaking} listening={listening} />
        <Rings speaking={speaking} />
        <CryptoTickers speaking={speaking} />
        <DataStreams active={connected} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={speaking ? 2.5 : 0.7} />
      </Canvas>
    </div>
  );
}
