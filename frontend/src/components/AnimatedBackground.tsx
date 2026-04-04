"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);

  const [positions, velocities, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      [0.055, 0.647, 0.914], // blue #0ea5e9
      [0.545, 0.361, 0.965], // purple #8b5cf6
      [0.063, 0.725, 0.506], // green #10b981
      [0.024, 0.714, 0.831], // cyan #06b6d4
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 20;
      pos[i3 + 1] = (Math.random() - 0.5) * 20;
      pos[i3 + 2] = (Math.random() - 0.5) * 10;

      vel[i3] = (Math.random() - 0.5) * 0.005;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.005;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i3] = c[0];
      col[i3 + 1] = c[1];
      col[i3 + 2] = c[2];
    }
    return [pos, vel, col];
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const geo = mesh.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      arr[i3] += velocities[i3] + Math.sin(t * 0.3 + i) * 0.002;
      arr[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.2 + i) * 0.002;
      arr[i3 + 2] += velocities[i3 + 2];

      // Wrap around
      if (arr[i3] > 10) arr[i3] = -10;
      if (arr[i3] < -10) arr[i3] = 10;
      if (arr[i3 + 1] > 10) arr[i3 + 1] = -10;
      if (arr[i3 + 1] < -10) arr[i3 + 1] = 10;
      if (arr[i3 + 2] > 5) arr[i3 + 2] = -5;
      if (arr[i3 + 2] < -5) arr[i3 + 2] = 5;
    }
    posAttr.needsUpdate = true;
    mesh.current.rotation.y = t * 0.02;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function GridFloor() {
  const ref = useRef<THREE.GridHelper>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.z = (state.clock.elapsedTime * 0.3) % 2;
    }
  });

  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#0ea5e920", "#0ea5e908"]}
      position={[0, -5, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

function FloatingOrbs() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={group}>
      {[
        { pos: [3, 2, -2] as [number, number, number], color: "#0ea5e9", scale: 0.4 },
        { pos: [-4, -1, -3] as [number, number, number], color: "#8b5cf6", scale: 0.3 },
        { pos: [1, -3, -4] as [number, number, number], color: "#10b981", scale: 0.25 },
        { pos: [-2, 3, -5] as [number, number, number], color: "#06b6d4", scale: 0.35 },
      ].map((orb, i) => (
        <mesh key={i} position={orb.pos}>
          <sphereGeometry args={[orb.scale, 16, 16]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
}

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ alpha: true, antialias: false }}
        style={{ background: "transparent" }}
      >
        <Particles count={150} />
        <FloatingOrbs />
        <GridFloor />
      </Canvas>
    </div>
  );
}
