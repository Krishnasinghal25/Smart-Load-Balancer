import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, Octahedron, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';

function healthColor(score, healthy) {
  if (!healthy) return '#ff2e63';
  if (score > 75) return '#39ff14';
  if (score > 45) return '#ffb800';
  return '#ff2e63';
}

// A backend server node: health-colored octahedron that pulses with active
// connections, wired back to the core with a glowing tether.
export default function ServerNode({ position, server }) {
  const mesh = useRef();
  const glow = useRef();
  const [hovered, setHovered] = useState(false);

  const color = healthColor(server.healthScore, server.healthy);
  const active = server.activeConnections || 0;
  const openBreaker = server.circuit === 'OPEN';

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.5;
      mesh.current.rotation.x += dt * 0.2;
      const base = 1 + Math.min(0.5, active * 0.06);
      const flick = openBreaker ? 0.85 + Math.random() * 0.3 : 1;
      mesh.current.scale.setScalar((base + Math.sin(t * 2) * 0.04) * flick);
    }
    if (glow.current) {
      glow.current.material.opacity = 0.15 + Math.min(0.35, active * 0.03) + Math.sin(t * 4) * 0.04;
    }
  });

  return (
    <group position={position}>
      {/* Tether to core */}
      <Line
        points={[[0, 0, 0], [-position[0], -position[1], -position[2]]]}
        color={color}
        lineWidth={openBreaker ? 0.5 : 1.4}
        transparent
        opacity={openBreaker ? 0.15 : 0.4}
        dashed={openBreaker}
        dashScale={4}
      />

      {/* Glow halo */}
      <Sphere ref={glow} args={[0.9, 24, 24]}>
        <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
      </Sphere>

      {/* Node body */}
      <Octahedron
        ref={mesh}
        args={[0.5, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 2.2 : 1.3} metalness={0.7} roughness={0.2} />
      </Octahedron>

      <pointLight color={color} intensity={1.6} distance={5} />

      {/* Label */}
      <Billboard position={[0, 1.15, 0]}>
        <Text fontSize={0.28} color={color} anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#05060d">
          {server.id}
        </Text>
        <Text position={[0, -0.34, 0]} fontSize={0.17} color="#8ea6c8" anchorX="center" anchorY="middle">
          {server.healthy ? `${server.latency}ms · h${server.healthScore}` : 'OFFLINE'}
        </Text>
        {server.circuit !== 'CLOSED' && (
          <Text position={[0, -0.62, 0]} fontSize={0.15} color={server.circuit === 'OPEN' ? '#ff2e63' : '#ffb800'} anchorX="center" anchorY="middle">
            ⚡ {server.circuit}
          </Text>
        )}
      </Billboard>
    </group>
  );
}
