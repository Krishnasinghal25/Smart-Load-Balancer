import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';

const TYPE_COLOR = {
  compute: '#ff2bd6',
  io: '#00f0ff',
  balanced: '#a855f7',
  default: '#39ff14',
};

// A single glowing packet that flies from the core to its target server
// along an arced bezier path, leaving a neon trail, then reports done.
function Packet({ target, color, onDone }) {
  const ref = useRef();
  const t = useRef(0);
  const duration = 0.9 + Math.random() * 0.5;

  const curve = useMemo(() => {
    const start = new THREE.Vector3(0, 0, 0);
    const end = new THREE.Vector3(...target);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 1.6 + Math.random() * 0.8; // arc height
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [target]);

  useFrame((_, dt) => {
    t.current += dt / duration;
    if (t.current >= 1) { onDone(); return; }
    if (ref.current) {
      const p = curve.getPoint(Math.min(1, t.current));
      ref.current.position.set(p.x, p.y, p.z);
    }
  });

  return (
    <Trail width={1.1} length={5} color={color} attenuation={(w) => w * w} decay={1}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

// Spawns packets from the live request feed toward the right server node.
export default function RequestParticles({ liveRequests = [], positions = {} }) {
  const [packets, setPackets] = useState([]);
  const seen = useRef(new Set());

  useEffect(() => {
    const fresh = [];
    for (const r of liveRequests) {
      if (seen.current.has(r.id)) continue;
      seen.current.add(r.id);
      const target = positions[r.serverId];
      if (!target) continue;
      fresh.push({
        key: r.id + Math.random().toString(36).slice(2, 5),
        target,
        color: TYPE_COLOR[r.type] || TYPE_COLOR.default,
      });
    }
    // Keep the seen-set from growing unbounded
    if (seen.current.size > 500) seen.current = new Set([...seen.current].slice(-200));
    if (fresh.length) setPackets((prev) => [...prev, ...fresh].slice(-60));
  }, [liveRequests, positions]);

  const remove = (key) => setPackets((prev) => prev.filter((p) => p.key !== key));

  return (
    <group>
      {packets.map((p) => (
        <Packet key={p.key} target={p.target} color={p.color} onDone={() => remove(p.key)} />
      ))}
    </group>
  );
}
