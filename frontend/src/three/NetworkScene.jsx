import { useMemo, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Float, Html } from '@react-three/drei';
import CoreOrb from './CoreOrb';
import ServerNode from './ServerNode';
import RequestParticles from './RequestParticles';

// Lays out server nodes on a circle around the core and wires the whole
// interactive scene together.
export default function NetworkScene({ state }) {
  const servers = state?.servers || [];
  const liveRequests = state?.routing?.liveRequests || [];
  const requestRate = state?.system?.requestRate || 0;
  const anyHealthy = (state?.system?.healthyServers || 0) > 0;

  // Deterministic circular layout -> positions keyed by server id.
  const { positions, nodes } = useMemo(() => {
    const radius = 4.2;
    const positions = {};
    const nodes = servers.map((s, i) => {
      const angle = (i / Math.max(1, servers.length)) * Math.PI * 2 - Math.PI / 2;
      const y = Math.sin(i * 1.7) * 0.6; // slight vertical scatter
      const pos = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
      positions[s.id] = pos;
      return { server: s, pos };
    });
    return { positions, nodes };
  }, [servers]);

  return (
    <Canvas camera={{ position: [0, 3.5, 11], fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={['#05060d']} />
      <fog attach="fog" args={['#05060d', 12, 26]} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 4]} intensity={0.6} color="#a855f7" />

      <Suspense fallback={<Html center><span style={{ color: '#00f0ff' }}>booting scene…</span></Html>}>
        <Stars radius={60} depth={40} count={2500} factor={4} saturation={0} fade speed={1} />

        <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
          <CoreOrb requestRate={requestRate} healthy={anyHealthy} />
        </Float>

        {nodes.map(({ server, pos }) => (
          <ServerNode key={server.id} position={pos} server={server} />
        ))}

        <RequestParticles liveRequests={liveRequests} positions={positions} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={6}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
