"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, OrbitControls, MeshDistortMaterial, Text, Float } from "@react-three/drei";
import * as THREE from "three";

function Planet({ speaking, listening }: { speaking: boolean; listening: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const distort = speaking ? 0.4 : listening ? 0.25 : 0.15;
  const speed = speaking ? 3 : listening ? 2 : 1;
  const color = speaking ? "#8b5cf6" : listening ? "#0ea5e9" : "#06b6d4";

  return (
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
  );
}

function Rings({ speaking }: { speaking: boolean }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += 0.002;
      ring1Ref.current.rotation.x = 0.3 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= 0.001;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2, 0.03, 16, 100]} />
        <meshStandardMaterial
          color={speaking ? "#a78bfa" : "#0ea5e9"}
          emissive={speaking ? "#a78bfa" : "#0ea5e9"}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0.5, 0.3, 0.1]}>
        <torusGeometry args={[1.8, 0.02, 16, 80]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

const TICKERS = [
  { symbol: "BTC", color: "#f7931a", angle: 0 },
  { symbol: "ETH", color: "#627eea", angle: Math.PI * 0.4 },
  { symbol: "SOL", color: "#00ffa3", angle: Math.PI * 0.8 },
  { symbol: "PUMP", color: "#ff6b9d", angle: Math.PI * 1.2 },
  { symbol: "DOGE", color: "#c3a634", angle: Math.PI * 1.6 },
];

function CryptoTickers({ speaking }: { speaking: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += speaking ? 0.008 : 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {TICKERS.map((t) => {
        const r = 2.8;
        const x = Math.cos(t.angle) * r;
        const z = Math.sin(t.angle) * r;
        return (
          <Float key={t.symbol} speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group position={[x, 0, z]}>
              {/* Token sphere */}
              <mesh>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial
                  color={t.color}
                  emissive={t.color}
                  emissiveIntensity={speaking ? 1 : 0.5}
                />
              </mesh>
              {/* Ticker label */}
              <Text
                position={[0, 0.25, 0]}
                fontSize={0.15}
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
    const count = 80;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 2;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      const palette = [[0.055, 0.647, 0.914], [0.545, 0.361, 0.965], [0, 1, 0.64]];
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return [pos, col];
  }, []);

  useFrame(() => {
    if (ref.current && active) {
      ref.current.rotation.y += 0.004;
      const arr = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] += 0.008;
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
      <pointsMaterial size={0.04} vertexColors transparent opacity={active ? 0.6 : 0.2} blending={THREE.AdditiveBlending} depthWrite={false} />
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
    <div className="w-full h-[300px] rounded-2xl overflow-hidden glass-card">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.15} />
        <pointLight position={[5, 3, 5]} intensity={1} color="#0ea5e9" />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#8b5cf6" />
        <Planet speaking={speaking} listening={listening} />
        <Rings speaking={speaking} />
        <CryptoTickers speaking={speaking} />
        <DataStreams active={connected} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={speaking ? 2 : 0.5} />
      </Canvas>
    </div>
  );
}
