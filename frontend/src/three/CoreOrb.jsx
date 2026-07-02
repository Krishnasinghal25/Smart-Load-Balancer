import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Icosahedron, Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';

// The central "AI core" — a pulsing, rotating neon brain that reacts to load.
export default function CoreOrb({ requestRate = 0, healthy = true }) {
  const inner = useRef();
  const wire = useRef();
  const glow = useRef();
  const ring1 = useRef();
  const ring2 = useRef();

  const color = healthy ? '#00f0ff' : '#ff2e63';

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.06 + Math.min(0.4, requestRate * 0.01);
    if (inner.current) {
      inner.current.rotation.y += dt * 0.4;
      inner.current.rotation.x += dt * 0.15;
      inner.current.scale.setScalar(pulse);
    }
    if (wire.current) {
      wire.current.rotation.y -= dt * 0.25;
      wire.current.rotation.z += dt * 0.1;
      wire.current.scale.setScalar(pulse * 1.15);
    }
    if (glow.current) {
      glow.current.scale.setScalar(pulse * 1.9 + Math.sin(t * 3) * 0.05);
      glow.current.material.opacity = 0.12 + Math.sin(t * 3) * 0.03;
    }
    if (ring1.current) ring1.current.rotation.z += dt * 0.6;
    if (ring2.current) ring2.current.rotation.z -= dt * 0.4;
  });

  return (
    <group>
      {/* Outer additive glow */}
      <Sphere ref={glow} args={[1, 32, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </Sphere>

      {/* Solid emissive core */}
      <Icosahedron ref={inner} args={[0.9, 1]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} roughness={0.2} metalness={0.6} />
      </Icosahedron>

      {/* Wireframe shell */}
      <Icosahedron ref={wire} args={[1.05, 1]}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
      </Icosahedron>

      {/* Orbiting rings */}
      <group ref={ring1} rotation={[Math.PI / 2.2, 0, 0]}>
        <Ring args={[1.7, 1.74, 64]}>
          <meshBasicMaterial color="#a855f7" transparent opacity={0.55} side={THREE.DoubleSide} />
        </Ring>
      </group>
      <group ref={ring2} rotation={[Math.PI / 1.7, 0.5, 0]}>
        <Ring args={[2.05, 2.08, 64]}>
          <meshBasicMaterial color="#ff2bd6" transparent opacity={0.4} side={THREE.DoubleSide} />
        </Ring>
      </group>

      <pointLight color={color} intensity={4} distance={12} />
    </group>
  );
}
