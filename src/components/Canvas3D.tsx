import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect, Wavefront, AgentSignalState } from "../types";
import { StoryCamera, StoryCallout } from "../hooks/useStoryMode";

// ─── Constants ───────────────────────────────────────────────────────
const SCALE = 0.02;
const toWorld = (px: number) => px * SCALE;
const CENTER_X = 400, CENTER_Y = 280;

const MODE_COLORS: Record<CommunicationMode, THREE.Color> = {
  acoustic: new THREE.Color().setHSL(25 / 360, 1, 0.6),
  light: new THREE.Color().setHSL(180 / 360, 1, 0.67),
  gravity: new THREE.Color().setHSL(270 / 360, 1, 0.7),
};

const ACTOR_GROUP_LABELS: Record<string, string> = {
  ghost_chorus: 'Ghost Chorus',
  economy_whisper: 'Economy Whisper',
  ecotone_gate: 'Ecotone Gate',
  drift_tracker: 'Drift Tracker',
  epitaph_extractor: 'Epitaph Extractor',
};

const ACTOR_GROUP_DESCRIPTIONS: Record<string, string> = {
  ghost_chorus: 'Voice of the dead. Injects failure dispositions\ninto runtime threads near lethal topologies.',
  economy_whisper: 'Tracks economic pressure signals.\nDemurrage, stake bonds, mint freezes.',
  ecotone_gate: 'Boundary mediator. Governs attenuation\nacross container crossings.',
  drift_tracker: 'Monitors signal drift and phase decay.\nFlags when meaning degrades over distance.',
  epitaph_extractor: 'Compresses resolved signal lifecycles\ninto durable dispositions for the chorus.',
};

// ─── Procedural Terrain Noise ────────────────────────────────────────
// Simple value noise with multiple octaves for natural terrain
function hash2D(x: number, z: number): number {
  let n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);

  const a = hash2D(ix, iz);
  const b = hash2D(ix + 1, iz);
  const c = hash2D(ix, iz + 1);
  const d = hash2D(ix + 1, iz + 1);

  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

function terrainNoise(x: number, z: number): number {
  // Multi-octave for realistic terrain
  let h = 0;
  h += smoothNoise(x * 0.8, z * 0.8) * 0.5;      // Large rolling hills
  h += smoothNoise(x * 1.6, z * 1.6) * 0.25;      // Medium undulation
  h += smoothNoise(x * 3.2, z * 3.2) * 0.12;      // Rocky detail
  h += smoothNoise(x * 6.4, z * 6.4) * 0.06;      // Fine grit
  h += smoothNoise(x * 12.8, z * 12.8) * 0.03;    // Micro texture
  return h;
}

/** Sample terrain height at world-space x, z coordinates */
function getTerrainHeight(worldX: number, worldZ: number): number {
  const n = terrainNoise(worldX * 0.5 + 50, worldZ * 0.5 + 50);
  // Scale: max height ~0.8 units, with valleys dipping to ~-0.3
  return (n - 0.45) * 1.4;
}

// ─── Prop types ──────────────────────────────────────────────────────
interface Canvas3DProps {
  mode: CommunicationMode;
  nodes: Node[];
  objects: WorldObject[];
  modalPins: ModalPin[];
  effects: Effect[];
  wavefronts: Wavefront[];
  agentSignals: Map<string, AgentSignalState>;
  onCanvasClick: () => void;
  cockpitNodeId: string | null;
  onEnterCockpit: (nodeId: string) => void;
  onExitCockpit: () => void;
  emittingAgentIds?: string[];
  storyCamera?: StoryCamera | null;
  storyHighlightId?: string | null;
  storyCallouts?: StoryCallout[];
}

// ─── 3D Node (sphere + label) ────────────────────────────────────────
const Node3D = ({
  node, mode, signal, onEnterCockpit, isCockpitTarget, isEmitting, hideLabels
}: {
  node: Node; mode: CommunicationMode;
  signal?: AgentSignalState;
  onEnterCockpit: (id: string) => void;
  isCockpitTarget: boolean;
  isEmitting?: boolean;
  hideLabels?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const emitRingRef = useRef<THREE.Mesh>(null);
  const emitLightRef = useRef<THREE.PointLight>(null);
  const ghostWispRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const emitPhase = useRef(0);

  const isOrch = node.type === 'orchestrator';
  const isGhostChorus = node.actorGroup === 'ghost_chorus';
  const isEpitaphExtractor = node.actorGroup === 'epitaph_extractor';
  const snr = signal?.snr ?? (isOrch ? 1 : 0);

  const color = isOrch ? MODE_COLORS[mode]
    : isGhostChorus ? new THREE.Color().setHSL(200 / 360, 0.15, 0.5 + snr * 0.15)
    : isEpitaphExtractor ? new THREE.Color().setHSL(30 / 360, 0.7, 0.45 + snr * 0.2)
    : new THREE.Color().setHSL(
        snr > 0.6 ? 180 / 360 : snr > 0.25 ? 45 / 360 : 0,
        snr > 0.05 ? 0.8 : 0.2,
        snr > 0.05 ? 0.6 : 0.35
      );

  const radius = isOrch ? 0.25 : isGhostChorus ? 0.1 + snr * 0.06 : 0.12 + snr * 0.08;

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    if (isOrch) {
      meshRef.current.rotation.y += dt * 0.5;
      mat.emissiveIntensity = 0.3 + snr * 1.5 + Math.sin(Date.now() * 0.003) * 0.3;
    } else if (isGhostChorus) {
      const flicker = Math.sin(Date.now() * 0.005 + node.x * 0.1) * 0.15
        + Math.sin(Date.now() * 0.013) * 0.1;
      mat.opacity = 0.3 + flicker + snr * 0.2;
      mat.emissiveIntensity = 0.8 + Math.sin(Date.now() * 0.004) * 0.4;
      meshRef.current.rotation.y += dt * 0.15;
    } else if (isEpitaphExtractor) {
      mat.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.002) * 0.3;
    } else {
      mat.emissiveIntensity = 0.3 + snr * 1.5;
    }

    if (ghostWispRef.current && isGhostChorus) {
      ghostWispRef.current.rotation.y += dt * 0.25;
      ghostWispRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const t = Date.now() * 0.001 + i * 1.5;
        mesh.position.y = 0.05 + Math.sin(t) * 0.12;
        const wMat = mesh.material as THREE.MeshBasicMaterial;
        wMat.opacity = 0.12 + Math.sin(t * 1.3) * 0.08;
      });
    }

    if (isEmitting) {
      emitPhase.current = Math.min(emitPhase.current + dt * 2.5, 1);
    } else {
      emitPhase.current = Math.max(emitPhase.current - dt * 3, 0);
    }
    if (emitRingRef.current) {
      const scale = 0.3 + emitPhase.current * 1.5;
      emitRingRef.current.scale.set(scale, scale, scale);
      const ringMat = emitRingRef.current.material as THREE.MeshBasicMaterial;
      ringMat.opacity = (1 - emitPhase.current) * 0.6;
    }
    if (emitLightRef.current) {
      emitLightRef.current.intensity = emitPhase.current * 3;
    }
  });

  const tooltip = useMemo(() => {
    if (isOrch) return 'Mogul — Estate Conductor';
    const group = node.actorGroup ? ACTOR_GROUP_LABELS[node.actorGroup] || node.actorGroup : 'Agent';
    const idx = node.actorIndex != null ? ` #${node.actorIndex + 1}` : '';
    const desc = node.actorGroup ? ACTOR_GROUP_DESCRIPTIONS[node.actorGroup] || '' : '';
    const caps = node.capabilities.map(c => ACTOR_GROUP_LABELS[c] || c).join(', ');
    return `${group}${idx}\n${desc}\n[${caps}]\nSNR: ${snr.toFixed(3)}`;
  }, [isOrch, node, snr]);

  const px = toWorld(node.x - CENTER_X);
  const pz = toWorld(node.y - CENTER_Y);
  const terrainY = getTerrainHeight(px, pz);
  const baseY = terrainY + (isOrch ? 0.3 : 0.15);

  return (
    <group position={[px, baseY, pz]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onDoubleClick={(e) => { e.stopPropagation(); onEnterCockpit(node.id); }}
      >
        {isOrch ? (
          <octahedronGeometry args={[radius, 1]} />
        ) : isGhostChorus ? (
          <icosahedronGeometry args={[radius, 0]} />
        ) : isEpitaphExtractor ? (
          <octahedronGeometry args={[radius, 0]} />
        ) : (
          <sphereGeometry args={[radius, 16, 16]} />
        )}
        <meshStandardMaterial
          color={isGhostChorus ? '#556677' : color}
          emissive={isGhostChorus ? '#7799aa' : isEpitaphExtractor ? '#cc6622' : color}
          emissiveIntensity={isGhostChorus ? 0.8 : 0.5}
          metalness={isGhostChorus ? 0.05 : 0.4}
          roughness={isGhostChorus ? 0.9 : 0.3}
          transparent
          opacity={isGhostChorus ? 0.35 : isCockpitTarget ? 0.3 : 1}
          side={isGhostChorus ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>

      {isGhostChorus && (
        <group ref={ghostWispRef}>
          {[0, 1, 2, 3, 4].map(i => {
            const angle = (i / 5) * Math.PI * 2;
            const dist = radius + 0.08;
            return (
              <mesh key={i} position={[Math.cos(angle) * dist, 0.05, Math.sin(angle) * dist]}>
                <sphereGeometry args={[0.012, 4, 4]} />
                <meshBasicMaterial color="#99bbcc" transparent opacity={0.15} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}

      {isGhostChorus && (
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.002, 0.008, 0.35, 4]} />
          <meshBasicMaterial color="#8899bb" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      )}

      {isEpitaphExtractor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[radius + 0.02, radius + 0.06, 16]} />
          <meshBasicMaterial color="#cc5500" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}

      {snr > 0.05 && !isCockpitTarget && !isGhostChorus && (
        <mesh>
          <ringGeometry args={[radius + 0.05, radius + 0.05 + snr * 0.3, 32]} />
          <meshBasicMaterial color={color} transparent opacity={snr * 0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {!hideLabels && (
        <Html position={[0, radius + 0.2, 0]} center distanceFactor={8} zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          <div style={{
            background: isGhostChorus ? 'hsla(210,15%,8%,0.65)' : 'hsla(240,10%,4%,0.75)',
            border: `1px solid ${isGhostChorus ? 'hsla(210,30%,55%,0.15)' : 'hsla(180,100%,67%,0.2)'}`,
            borderRadius: 4, padding: '1px 6px', fontSize: 9,
            color: isGhostChorus ? '#7788aa' : '#c0c0c0',
            fontFamily: 'monospace', letterSpacing: '0.03em',
            fontStyle: isGhostChorus ? 'italic' : 'normal',
          }}>
            {isOrch ? 'Conductor' : (node.actorGroup ? ACTOR_GROUP_LABELS[node.actorGroup] || node.actorGroup : node.id)}
          </div>
        </Html>
      )}

      {hovered && !hideLabels && (
        <Html position={[0, radius + 0.55, 0]} center distanceFactor={6} zIndexRange={[8, 0]}>
          <div style={{
            background: 'hsla(240,10%,6%,0.95)',
            border: `1px solid ${isGhostChorus ? 'hsla(210,30%,55%,0.35)' : 'hsla(180,100%,67%,0.4)'}`,
            borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#f0f0f0',
            fontFamily: 'monospace', maxWidth: 220, whiteSpace: 'pre-wrap',
            boxShadow: isGhostChorus ? '0 0 15px hsla(210,30%,50%,0.12)' : '0 0 12px hsla(180,100%,67%,0.2)',
            pointerEvents: 'none',
          }}>
            {tooltip}
            <div style={{ fontSize: 8, color: '#888', marginTop: 3 }}>Double-click → Cockpit</div>
          </div>
        </Html>
      )}

      {isOrch && <pointLight color={color} intensity={2} distance={5} />}
      {isGhostChorus && <pointLight color="#7799aa" intensity={0.25} distance={1} />}

      {emitPhase.current > 0.001 && (
        <>
          <mesh ref={emitRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius + 0.05, radius + 0.15, 32]} />
            <meshBasicMaterial
              color={isGhostChorus ? '#7799bb' : mode === 'acoustic' ? '#ff6633' : color}
              transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false}
            />
          </mesh>
          <pointLight
            ref={emitLightRef}
            color={isGhostChorus ? '#7799bb' : mode === 'acoustic' ? '#ff6633' : color}
            intensity={0} distance={3}
          />
        </>
      )}
    </group>
  );
};

// ─── Gravity Well Floor Rings ────────────────────────────────────────
const GravityWellRings = ({ size, position }: { size: number; position: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rs = size * 0.004;
  const radii = [rs * 1.5, rs * 2.8, rs * 4.5, rs * 6.5, rs * 9];
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.12;
    // Pulse the rings
    groupRef.current.children.forEach((child, i) => {
      const m = child as THREE.Mesh;
      const mat = m.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(Date.now() * 0.002 + i * 0.8) * 0.1;
      mat.opacity = Math.max(0.05, (0.45 - i * 0.08) + pulse);
    });
  });
  return (
    <group ref={groupRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {radii.map((r, i) => (
        <mesh key={i}>
          <ringGeometry args={[r, r + 0.02, 64]} />
          <meshBasicMaterial color={i < 2 ? "#a855f7" : "#7c3aed"} transparent opacity={0.45 - i * 0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

// ─── 3D World Object ─────────────────────────────────────────────────
const Object3D = ({ obj, mode, hideLabels }: { obj: WorldObject; mode: CommunicationMode; hideLabels?: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const w = toWorld(obj.width);
  const h = toWorld(obj.height);
  const px = toWorld(obj.x + obj.width / 2 - CENTER_X);
  const pz = toWorld(obj.y + obj.height / 2 - CENTER_Y);
  const terrainY = getTerrainHeight(px, pz);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    if (obj.type === 'mass') meshRef.current.rotation.y += dt * 0.12;
  });

  const label = obj.type === 'wall' ? 'Attenuation Boundary'
    : obj.type === 'lens' ? 'Observability Lens'
    : obj.type === 'mirror' ? 'Specular Surface'
    : 'Invariant Mass';

  const height3D = obj.type === 'wall' ? 0.3 : obj.type === 'mass' ? Math.max(w, h) : 0.15;
  const surfAngle = obj.surfaceAngle ?? 0;

  return (
    <group position={[px, terrainY + height3D / 2, pz]}>
      {obj.type === 'wall' && (
        <>
          <mesh ref={meshRef}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
          >
            <boxGeometry args={[w, height3D, h]} />
            <meshStandardMaterial color="#1a1a2e" emissive={MODE_COLORS[mode]} emissiveIntensity={0.15}
              metalness={0.1} roughness={0.7} transparent opacity={0.55} />
          </mesh>
          <mesh><boxGeometry args={[w * 0.95, height3D * 0.8, h * 0.95]} />
            <meshBasicMaterial color={MODE_COLORS[mode]} transparent opacity={0.08} depthWrite={false} /></mesh>
          <mesh><boxGeometry args={[w * 1.005, height3D * 1.01, h * 1.005]} />
            <meshBasicMaterial color={MODE_COLORS[mode]} wireframe transparent opacity={0.2} /></mesh>
          {[0.3, 0.6, 0.9].map((offset, i) => (
            <mesh key={i} position={[0, (offset - 0.5) * height3D * 0.8, 0]}>
              <boxGeometry args={[w * 1.02, 0.01, h * 1.02]} />
              <meshBasicMaterial color={MODE_COLORS[mode]} transparent opacity={0.3 - i * 0.08} depthWrite={false} />
            </mesh>
          ))}
        </>
      )}

      {obj.type === 'lens' && (
        <>
          <mesh ref={meshRef}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
          >
            <torusGeometry args={[Math.max(w, h) / 2, 0.04, 16, 32]} />
            <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={0.4} metalness={0.7} roughness={0.15} transparent opacity={0.75} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[Math.max(w, h) / 2 - 0.02, 32]} />
            <meshStandardMaterial color="#88ffee" emissive="#4ecdc4" emissiveIntensity={0.06} metalness={0.95} roughness={0.05} transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
          <pointLight color="#4ecdc4" intensity={0.8} distance={1.5} />
        </>
      )}

      {obj.type === 'mirror' && (
        <group rotation={[0, surfAngle, 0]}>
          <mesh ref={meshRef}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
          >
            <boxGeometry args={[w, 0.025, h]} />
            <meshStandardMaterial color="#e8f4fd" emissive="#8ecae6" emissiveIntensity={0.2} metalness={0.98} roughness={0.02} />
          </mesh>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w * 0.9, h * 0.9]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.06} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.35, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
          <mesh position={[0, 0.36, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.018, 0.045, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
          <pointLight color="#88ccff" intensity={0.5} distance={1} />
        </group>
      )}

      {obj.type === 'mass' && (
        <>
          <mesh ref={meshRef}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
          >
            <sphereGeometry args={[Math.max(w, h) / 2, 32, 32]} />
            <meshStandardMaterial color="#0a0020" emissive="#7c3aed" emissiveIntensity={0.9} metalness={0.85} roughness={0.15} transparent opacity={0.92} />
          </mesh>
          {/* Outer event horizon glow */}
          <mesh>
            <sphereGeometry args={[Math.max(w, h) / 2 + 0.05, 32, 32]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} />
          </mesh>
          {/* Accretion disk */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(w, h) / 2 + 0.06, Math.max(w, h) / 2 + 0.2, 48]} />
            <meshBasicMaterial color="#c084fc" transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <pointLight color="#9333ea" intensity={3} distance={4} decay={1.5} />
          <pointLight color="#c084fc" intensity={1} distance={2} decay={2} />
          <GravityWellRings size={obj.width + obj.height} position={[0, -height3D / 2 + 0.01, 0]} />
        </>
      )}

      {!hideLabels && (
        <Html position={[0, height3D / 2 + 0.25, 0]} center distanceFactor={10} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'hsla(240,10%,4%,0.7)', border: '1px solid hsla(0,0%,50%,0.2)',
            borderRadius: 4, padding: '1px 5px', fontSize: 8, color: '#aaa', fontFamily: 'monospace', whiteSpace: 'nowrap',
          }}>{label}</div>
        </Html>
      )}

      {hovered && !hideLabels && (
        <Html position={[0, height3D / 2 + 0.5, 0]} center distanceFactor={6} zIndexRange={[8, 0]}>
          <div style={{
            background: 'hsla(240,10%,6%,0.95)', border: '1px solid hsla(0,0%,60%,0.3)',
            borderRadius: 6, padding: '5px 8px', fontSize: 9, color: '#ddd', fontFamily: 'monospace', pointerEvents: 'none',
          }}>{label} ({obj.width}×{obj.height}px)</div>
        </Html>
      )}
    </group>
  );
};

// ─── Wavefronts ──────────────────────────────────────────────────────
const Wavefront3D = ({ wf, objects }: { wf: Wavefront; objects: WorldObject[] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const r = toWorld(wf.radius);
  const px = toWorld(wf.sourceX - CENTER_X);
  const pz = toWorld(wf.sourceY - CENTER_Y);
  const color = MODE_COLORS[wf.mode];
  const opacity = Math.min(0.6, wf.energy * 0.7);
  if (opacity < 0.01 || (!wf.isBeam && r > 12)) return null;

  const terrainY = getTerrainHeight(px, pz);
  const emitterY = terrainY + (wf.sourceX === 400 && wf.sourceY === 280 ? 0.3 : 0.15);

  if (wf.isBeam && wf.angle != null) {
    const beamLength = 0.4;
    const brightness = Math.min(1, wf.energy * 1.5);
    return (
      <group position={[px, terrainY + 0.12, pz]}>
        <mesh rotation={[0, -wf.angle + Math.PI / 2, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, beamLength, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={brightness * 0.95} depthWrite={false} />
        </mesh>
        <mesh rotation={[0, -wf.angle + Math.PI / 2, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, beamLength * 0.8, 8]} />
          <meshBasicMaterial color="#88eeff" transparent opacity={brightness * 0.25} depthWrite={false} />
        </mesh>
        <pointLight color="#88eeff" intensity={brightness * 4} distance={2} />
      </group>
    );
  }

  if (wf.mode === 'acoustic') {
    const hue = 20 + (1 - wf.energy) * 15;
    const sat = 0.85 + wf.energy * 0.15;
    const lit = 0.4 + wf.energy * 0.25;
    const waveColor = new THREE.Color().setHSL(hue / 360, sat, lit);
    if (wf.isEcho) {
      return (
        <mesh ref={meshRef} position={[px, emitterY, pz]}>
          <sphereGeometry args={[r, 16, 12]} />
          <meshBasicMaterial color={new THREE.Color().setHSL(40 / 360, 0.6, 0.4)} transparent opacity={opacity * 0.45} wireframe depthWrite={false} />
        </mesh>
      );
    }
    return (
      <group position={[px, emitterY, pz]}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[r, 24, 16]} />
          <meshBasicMaterial color={waveColor} transparent opacity={opacity * 0.55} wireframe depthWrite={false} />
        </mesh>
        {/* Warm pressure glow at origin */}
        {r < 0.8 && <pointLight color="#ff6633" intensity={opacity * 3} distance={2} decay={2} />}
      </group>
    );
  }

  if (wf.mode === 'light') {
    return (
      <group position={[px, emitterY, pz]}>
        {/* Bright leading edge shell */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[r, 32, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Colored inner volume */}
        <mesh>
          <sphereGeometry args={[Math.max(0, r - 0.015), 32, 24]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.08} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        {/* Flash bloom at origin when fresh */}
        {r < 1 && <pointLight color="#4ecdc4" intensity={opacity * 8} distance={3} decay={2} />}
      </group>
    );
  }

  if (wf.mode === 'gravity') {
    return <GravityWavefrontSphere r={r} position={[px, emitterY, pz]} opacity={opacity} objects={objects} px={px} pz={pz} />;
  }

  return null;
};

const GravityWavefrontSphere = ({ r, position, opacity }: {
  r: number; position: [number, number, number]; opacity: number;
  objects: WorldObject[]; px: number; pz: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.SphereGeometry>(null);
  const innerGeoRef = useRef<THREE.SphereGeometry>(null);
  const shockRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!geoRef.current || !meshRef.current) return;
    const geo = geoRef.current;
    const pos = geo.attributes.position;
    const time = Date.now() * 0.001;

    // Heavy, churning displacement — the 808 DROP
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      // Deep sub-bass ripple + harmonic crunch
      const subBass = Math.sin(len * 4 - time * 3) * 0.08 * opacity;
      const crunch = Math.sin(len * 12 - time * 5) * 0.025 * opacity;
      const wobble = Math.sin(len * 2 + time * 1.5 + y * 3) * 0.04 * opacity;
      const scale = r / len;
      const disp = subBass + crunch + wobble;
      pos.setXYZ(i,
        x * scale + (x / len) * disp,
        y * scale + (y / len) * disp * 1.3,
        z * scale + (z / len) * disp
      );
    }
    pos.needsUpdate = true;

    // Inner plasma core
    if (innerGeoRef.current && innerRef.current) {
      const ipos = innerGeoRef.current.attributes.position;
      const innerR = r * 0.6;
      for (let i = 0; i < ipos.count; i++) {
        const x = ipos.getX(i), y = ipos.getY(i), z = ipos.getZ(i);
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const pulse = Math.sin(len * 6 + time * 4) * 0.05 * opacity;
        const sc = innerR / len;
        ipos.setXYZ(i, x * sc + (x / len) * pulse, y * sc + (y / len) * pulse, z * sc + (z / len) * pulse);
      }
      ipos.needsUpdate = true;
    }

    // Shockwave ring at equator
    if (shockRef.current) {
      const pulse = 1 + Math.sin(time * 6) * 0.15;
      shockRef.current.scale.set(r * pulse, r * pulse, r * pulse);
      (shockRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.35 * (0.5 + Math.sin(time * 4) * 0.5);
    }
  });

  return (
    <group position={position}>
      {/* Outer distorted shell */}
      <mesh ref={meshRef}>
        <sphereGeometry ref={geoRef} args={[r, 32, 24]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={opacity * 0.45} side={THREE.DoubleSide} depthWrite={false} wireframe />
      </mesh>
      {/* Inner plasma volume */}
      <mesh ref={innerRef}>
        <sphereGeometry ref={innerGeoRef} args={[r * 0.6, 24, 16]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={opacity * 0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Equatorial shockwave ring */}
      <mesh ref={shockRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.0, 48]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={opacity * 0.3} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Gravity light — purple bloom */}
      <pointLight color="#9333ea" intensity={opacity * 6} distance={r * 3 + 1} decay={2} />
    </group>
  );
};

// ─── Epitaph Effects ─────────────────────────────────────────────────
const EpitaphEmbers = ({ color, birthAge }: { color: string; birthAge: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i, angle: (i / 14) * Math.PI * 2 + Math.random() * 0.4,
      speed: 0.3 + Math.random() * 0.7, drift: (Math.random() - 0.5) * 0.3,
      size: 0.015 + Math.random() * 0.02, delay: Math.random() * 0.3,
    })), []);
  useFrame(() => { if (groupRef.current) groupRef.current.visible = birthAge < 2.5; });
  if (birthAge > 2.5) return null;
  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {particles.map(p => {
        const t = Math.max(0, birthAge - p.delay);
        if (t <= 0) return null;
        const progress = Math.min(t / 1.8, 1);
        const y = progress * 1.2 * p.speed;
        const x = Math.sin(p.angle) * (1 - progress) * 0.3 + p.drift * progress;
        const z = Math.cos(p.angle) * (1 - progress) * 0.3;
        const op = progress < 0.7 ? 1 : (1 - (progress - 0.7) / 0.3);
        const sc = p.size * (1 - progress * 0.6);
        return (
          <mesh key={p.id} position={[x, y, z]}>
            <sphereGeometry args={[sc, 6, 6]} />
            <meshBasicMaterial color={progress < 0.4 ? '#ff4400' : progress < 0.7 ? '#ffaa22' : color}
              transparent opacity={op * 0.9} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const Pin3D = ({ pin, hideLabels }: { pin: ModalPin; hideLabels?: boolean }) => {
  const px = toWorld(pin.x - CENTER_X);
  const pz = toWorld(pin.y - CENTER_Y);
  const terrainY = getTerrainHeight(px, pz);
  const modeColor = pin.mode === 'acoustic' ? '#ff9933' : pin.mode === 'light' ? '#4ecdc4' : '#9333ea';
  const birthAge = useRef(0);
  const [age, setAge] = useState(0);
  const stemRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((_, dt) => {
    birthAge.current += dt;
    if (Math.floor(birthAge.current * 10) !== Math.floor(age * 10)) setAge(birthAge.current);
    if (stemRef.current) {
      const p = Math.min(1, birthAge.current / 1.2);
      const e = 1 - Math.pow(1 - p, 3);
      stemRef.current.scale.set(1, e, 1);
      stemRef.current.position.y = e * 0.5;
    }
    if (glowRef.current) {
      glowRef.current.intensity = birthAge.current < 1.5 ? Math.sin(birthAge.current * 4) * 2 + 2 : 0.5;
    }
  });

  const cardOpacity = Math.min(1, Math.max(0, (age - 1.0) / 0.8));

  return (
    <group position={[px, terrainY + 1.2, pz]}>
      <EpitaphEmbers color={modeColor} birthAge={age} />
      <pointLight ref={glowRef} color={modeColor} intensity={0} distance={3} />
      {age < 2 && (
        <mesh position={[0, -0.5, 0]}>
          <octahedronGeometry args={[0.04 + (1 - Math.min(1, age / 1.5)) * 0.06, 0]} />
          <meshBasicMaterial color={age < 0.8 ? '#ff6600' : modeColor} transparent opacity={Math.max(0, 1 - age / 2)} depthWrite={false} />
        </mesh>
      )}
      <mesh ref={stemRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.015, 1, 6]} />
        <meshBasicMaterial color={modeColor} transparent opacity={Math.min(0.6, age * 0.5)} />
      </mesh>
      {!hideLabels && cardOpacity > 0.01 && (
        <Html position={[0, 0.6, 0]} center distanceFactor={6} zIndexRange={[5, 0]}>
          <div style={{
            background: 'hsla(240,10%,4%,0.9)', border: `1px solid ${modeColor}44`,
            borderRadius: 6, padding: '6px 10px', maxWidth: 180, fontFamily: 'monospace',
            boxShadow: `0 2px 12px ${modeColor}22`, pointerEvents: 'none',
            opacity: cardOpacity, transform: `translateY(${(1 - cardOpacity) * 8}px)`,
            transition: 'opacity 0.3s, transform 0.3s',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: 9, color: modeColor, marginBottom: 3 }}>{pin.title}</div>
            <div style={{ fontSize: 8, color: '#aaa', marginBottom: 3, whiteSpace: 'pre-wrap' }}>{pin.body}</div>
            <div style={{ fontSize: 7, color: '#777' }}>{pin.tags}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Connection lines ────────────────────────────────────────────────
const ConnectionLines = ({
  orchestrator, agents, agentSignals, mode, masses
}: {
  orchestrator: Node; agents: Node[];
  agentSignals: Map<string, AgentSignalState>;
  mode: CommunicationMode; masses: WorldObject[];
}) => {
  const linesRef = useRef<THREE.Group>(null);
  const lines = useMemo(() => {
    const ox = toWorld(orchestrator.x - CENTER_X);
    const oz = toWorld(orchestrator.y - CENTER_Y);
    const oY = getTerrainHeight(ox, oz) + 0.3;

    return agents.map(agent => {
      const ax = toWorld(agent.x - CENTER_X);
      const az = toWorld(agent.y - CENTER_Y);
      const aY = getTerrainHeight(ax, az) + 0.15;
      const sig = agentSignals.get(agent.id);
      const snr = sig?.snr ?? 0;

      const points: THREE.Vector3[] = [];
      if (mode === 'gravity' && masses.length > 0) {
        const mx = (ox + ax) / 2;
        const mz = (oz + az) / 2;
        let pullX = 0, pullZ = 0;
        masses.forEach(m => {
          const cx = toWorld(m.x + m.width / 2 - CENTER_X);
          const cz = toWorld(m.y + m.height / 2 - CENTER_Y);
          const dist = Math.sqrt((mx - cx) ** 2 + (mz - cz) ** 2);
          const w = (toWorld(m.width) + toWorld(m.height)) / (dist + 1);
          pullX += (cx - mx) * w;
          pullZ += (cz - mz) * w;
        });
        const midY = getTerrainHeight(mx + pullX * 1.5, mz + pullZ * 1.5) + 0.4;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(ox, oY, oz),
          new THREE.Vector3(mx + pullX * 1.5, midY, mz + pullZ * 1.5),
          new THREE.Vector3(ax, aY, az)
        );
        points.push(...curve.getPoints(20));
      } else {
        // Add intermediate terrain-following points
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const lx = ox + (ax - ox) * t;
          const lz = oz + (az - oz) * t;
          const ly = getTerrainHeight(lx, lz) + 0.15 + (1 - Math.abs(t - 0.5) * 2) * 0.15;
          points.push(new THREE.Vector3(lx, ly, lz));
        }
      }

      return { points, snr, id: agent.id };
    });
  }, [orchestrator, agents, agentSignals, mode, masses]);

  return (
    <group ref={linesRef}>
      {lines.map(l => {
        if (l.snr < 0.02) return null;
        return (
          <Line key={l.id} points={l.points} color={MODE_COLORS[mode]}
            transparent opacity={Math.max(0.05, l.snr * 0.5)} lineWidth={1.5} />
        );
      })}
    </group>
  );
};

// ─── Dynamic Terrain Mesh (suspension bridge quilt over the deep) ────
const Terrain = ({ mode, objects, wavefronts }: {
  mode: CommunicationMode; objects: WorldObject[]; wavefronts: Wavefront[];
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.LineSegments>(null);
  const majorGridRef = useRef<THREE.LineSegments>(null);
  const modeColor = MODE_COLORS[mode];
  const SIZE = 20;
  const SEGMENTS = 128;

  // Store base heights for reference
  const baseHeights = useMemo(() => {
    const heights = new Float32Array((SEGMENTS + 1) * (SEGMENTS + 1));
    for (let iz = 0; iz <= SEGMENTS; iz++) {
      for (let ix = 0; ix <= SEGMENTS; ix++) {
        const x = (ix / SEGMENTS - 0.5) * SIZE;
        const z = (iz / SEGMENTS - 0.5) * SIZE;
        heights[iz * (SEGMENTS + 1) + ix] = getTerrainHeight(x, z);
      }
    }
    return heights;
  }, []);

  // Pre-compute mass world positions
  const massAnchors = useMemo(() => objects.filter(o => o.type === 'mass').map(m => ({
    wx: toWorld(m.x + m.width / 2 - CENTER_X),
    wz: toWorld(m.y + m.height / 2 - CENTER_Y),
    strength: (m.width + m.height) * 0.0015,
  })), [objects]);

  // Create geometries
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      const h = getTerrainHeight(x, z);
      pos.setZ(i, h);
      const brightness = 0.02 + (h + 0.5) * 0.06;
      const tint = 0.015 + (h + 0.5) * 0.03;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint * 0.8;
      colors[i * 3 + 2] = brightness;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  const GRID_DIV = 40;
  const gridGeo = useMemo(() => {
    const positions = new Float32Array(((GRID_DIV + 1) * GRID_DIV + (GRID_DIV + 1) * GRID_DIV) * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  const MAJOR_DIV = 8;
  const MAJOR_STEPS = 80;
  const majorGridGeo = useMemo(() => {
    const positions = new Float32Array(((MAJOR_DIV + 1) * MAJOR_STEPS + (MAJOR_DIV + 1) * MAJOR_STEPS) * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Animate terrain each frame — the plates breathe
  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const pos = geo.attributes.position;
    const colorAttr = geo.attributes.color;
    const time = Date.now() * 0.001;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // plane Y = world Z before rotation
      const ix = Math.round((x / SIZE + 0.5) * SEGMENTS);
      const iz = Math.round((z / SIZE + 0.5) * SEGMENTS);
      const baseH = baseHeights[Math.min(iz, SEGMENTS) * (SEGMENTS + 1) + Math.min(ix, SEGMENTS)] ?? 0;

      // 1. Tectonic drift — slow deep undulations ("waters of the deep")
      const tectonicA = Math.sin(x * 0.3 + time * 0.15) * Math.cos(z * 0.25 + time * 0.12) * 0.08;
      const tectonicB = Math.sin(x * 0.7 - time * 0.08 + 1.5) * Math.sin(z * 0.5 + time * 0.1) * 0.04;
      const tectonicC = Math.cos(x * 0.15 + z * 0.2 + time * 0.05) * 0.06;

      // 2. Mass anchoring — invariant masses pin the terrain, creating tension
      let massPin = 0;
      let massTension = 0;
      for (const anchor of massAnchors) {
        const dist = Math.sqrt((x - anchor.wx) ** 2 + (z - anchor.wz) ** 2);
        if (dist < 3) {
          // Near masses, terrain is pulled DOWN (gravity well) and stabilized
          const falloff = Math.exp(-dist * dist * 0.5);
          massPin -= falloff * anchor.strength * 0.8;
          // Suppress tectonic motion near anchors (they pin the bridge)
          massTension += falloff;
          // Add subtle orbital creaking around the anchor
          massPin += Math.sin(dist * 4 - time * 0.8) * falloff * 0.015;
        }
      }
      const tectonicDampen = Math.max(0, 1 - massTension * 2);

      // 3. Signal pressure — wavefronts push the terrain surface
      let signalPressure = 0;
      for (const wf of wavefronts) {
        const wfx = toWorld(wf.sourceX - CENTER_X);
        const wfz = toWorld(wf.sourceY - CENTER_Y);
        const wfr = toWorld(wf.radius);
        const dist = Math.sqrt((x - wfx) ** 2 + (z - wfz) ** 2);
        const edgeDist = Math.abs(dist - wfr);

        if (wf.mode === 'gravity') {
          // GRAVITY SLAM — massive terrain deformation
          // Leading shockwave ridge
          if (edgeDist < 0.8) {
            const shockwave = Math.cos(edgeDist * Math.PI / 0.8) * 0.5 + 0.5;
            signalPressure += shockwave * wf.energy * 0.18;
          }
          // Deep trough behind the wavefront
          if (dist < wfr) {
            const depth = wf.energy * 0.06 * Math.exp(-dist * 0.3);
            signalPressure -= depth;
            // Sub-harmonic terrain rumble inside the wavefront
            const rumble = Math.sin(dist * 6 - time * 3) * wf.energy * 0.02 * Math.exp(-dist * 0.2);
            signalPressure += rumble;
          }
        } else {
          // Acoustic/Light — gentler ripple
          if (edgeDist < 0.5) {
            const ripple = Math.cos(edgeDist * Math.PI / 0.5) * 0.5 + 0.5;
            signalPressure += ripple * wf.energy * 0.04;
          }
          if (dist < wfr) {
            signalPressure -= wf.energy * 0.008 * Math.exp(-dist * 0.5);
          }
        }
      }

      // Combine
      const dynamicH = baseH
        + (tectonicA + tectonicB + tectonicC) * tectonicDampen
        + massPin
        + signalPressure;

      pos.setZ(i, dynamicH);

      // Update vertex colors — valleys shift cooler, ridges warmer during tectonic motion
      const shift = (dynamicH - baseH) * 0.3;
      const brightness = 0.02 + (dynamicH + 0.5) * 0.06;
      const tint = 0.015 + (dynamicH + 0.5) * 0.03;
      colorAttr.setXYZ(i,
        Math.max(0, tint + shift * 0.02),
        Math.max(0, tint * 0.8 - Math.abs(shift) * 0.01),
        Math.max(0, brightness - shift * 0.01)
      );
    }

    pos.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geo.computeVertexNormals();

    // Update grid overlays to follow dynamic terrain
    if (gridRef.current) {
      const gridPos = gridRef.current.geometry.attributes.position;
      let idx = 0;
      for (let i = 0; i <= GRID_DIV; i++) {
        const gz = (i / GRID_DIV - 0.5) * SIZE;
        for (let j = 0; j < GRID_DIV; j++) {
          const x1 = (j / GRID_DIV - 0.5) * SIZE;
          const x2 = ((j + 1) / GRID_DIV - 0.5) * SIZE;
          const y1 = sampleDynamicHeight(pos, x1, gz, SIZE, SEGMENTS) + 0.005;
          const y2 = sampleDynamicHeight(pos, x2, gz, SIZE, SEGMENTS) + 0.005;
          gridPos.setXYZ(idx++, x1, y1, gz);
          gridPos.setXYZ(idx++, x2, y2, gz);
        }
      }
      for (let i = 0; i <= GRID_DIV; i++) {
        const gx = (i / GRID_DIV - 0.5) * SIZE;
        for (let j = 0; j < GRID_DIV; j++) {
          const z1 = (j / GRID_DIV - 0.5) * SIZE;
          const z2 = ((j + 1) / GRID_DIV - 0.5) * SIZE;
          const y1 = sampleDynamicHeight(pos, gx, z1, SIZE, SEGMENTS) + 0.005;
          const y2 = sampleDynamicHeight(pos, gx, z2, SIZE, SEGMENTS) + 0.005;
          gridPos.setXYZ(idx++, gx, y1, z1);
          gridPos.setXYZ(idx++, gx, y2, z2);
        }
      }
      gridPos.needsUpdate = true;
    }

    if (majorGridRef.current) {
      const mgPos = majorGridRef.current.geometry.attributes.position;
      let idx = 0;
      for (let i = 0; i <= MAJOR_DIV; i++) {
        const gz = (i / MAJOR_DIV - 0.5) * SIZE;
        for (let j = 0; j < MAJOR_STEPS; j++) {
          const x1 = (j / MAJOR_STEPS - 0.5) * SIZE;
          const x2 = ((j + 1) / MAJOR_STEPS - 0.5) * SIZE;
          mgPos.setXYZ(idx++, x1, sampleDynamicHeight(pos, x1, gz, SIZE, SEGMENTS) + 0.008, gz);
          mgPos.setXYZ(idx++, x2, sampleDynamicHeight(pos, x2, gz, SIZE, SEGMENTS) + 0.008, gz);
        }
      }
      for (let i = 0; i <= MAJOR_DIV; i++) {
        const gx = (i / MAJOR_DIV - 0.5) * SIZE;
        for (let j = 0; j < MAJOR_STEPS; j++) {
          const z1 = (j / MAJOR_STEPS - 0.5) * SIZE;
          const z2 = ((j + 1) / MAJOR_STEPS - 0.5) * SIZE;
          mgPos.setXYZ(idx++, gx, sampleDynamicHeight(pos, gx, z1, SIZE, SEGMENTS) + 0.008, z1);
          mgPos.setXYZ(idx++, gx, sampleDynamicHeight(pos, gx, z2, SIZE, SEGMENTS) + 0.008, z2);
        }
      }
      mgPos.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial vertexColors metalness={0.6} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments ref={gridRef}>
        <primitive object={gridGeo} attach="geometry" />
        <lineBasicMaterial color={modeColor} transparent opacity={0.08} />
      </lineSegments>
      <lineSegments ref={majorGridRef}>
        <primitive object={majorGridGeo} attach="geometry" />
        <lineBasicMaterial color={modeColor} transparent opacity={0.15} />
      </lineSegments>
    </group>
  );
};

/** Sample height from the dynamic (already-displaced) plane geometry */
function sampleDynamicHeight(
  pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, worldX: number, worldZ: number,
  size: number, segments: number
): number {
  const fx = (worldX / size + 0.5) * segments;
  const fz = (worldZ / size + 0.5) * segments;
  const ix = Math.min(Math.max(Math.round(fx), 0), segments);
  const iz = Math.min(Math.max(Math.round(fz), 0), segments);
  const idx = iz * (segments + 1) + ix;
  return pos.getZ(idx);
}

// ─── Cockpit Camera ──────────────────────────────────────────────────
const CockpitCamera = ({ targetNode, onExit }: { targetNode: Node; onExit: () => void }) => {
  const { camera, gl } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(0);

  const targetPos = useMemo(() => {
    const px = toWorld(targetNode.x - CENTER_X);
    const pz = toWorld(targetNode.y - CENTER_Y);
    return new THREE.Vector3(px, getTerrainHeight(px, pz) + 0.5, pz);
  }, [targetNode]);

  useEffect(() => { camera.position.copy(targetPos); yaw.current = 0; pitch.current = 0; }, [camera, targetPos]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Escape') { document.exitPointerLock?.(); onExit(); }
      if (e.code === 'Space' || e.code === 'ShiftLeft') e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        yaw.current -= e.movementX * 0.002;
        pitch.current = Math.max(-1.4, Math.min(1.4, pitch.current - e.movementY * 0.002));
      }
    };
    const onClick = () => { if (!document.pointerLockElement) canvas.requestPointerLock?.(); };
    let dragging = false;
    const onPD = (e: PointerEvent) => { if (!document.pointerLockElement && e.button === 0) dragging = true; };
    const onPM = (e: PointerEvent) => {
      if (dragging && !document.pointerLockElement) {
        yaw.current -= e.movementX * 0.003;
        pitch.current = Math.max(-1.4, Math.min(1.4, pitch.current - e.movementY * 0.003));
      }
    };
    const onPU = () => { dragging = false; };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    document.addEventListener('mousemove', onMouse);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('pointerdown', onPD);
    window.addEventListener('pointermove', onPM);
    window.addEventListener('pointerup', onPU);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      document.removeEventListener('mousemove', onMouse);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerdown', onPD);
      window.removeEventListener('pointermove', onPM);
      window.removeEventListener('pointerup', onPU);
      document.exitPointerLock?.();
    };
  }, [onExit, gl]);

  useFrame((_, dt) => {
    const speed = 3;
    const dir = new THREE.Vector3();
    if (keys.current.has('KeyW')) dir.z -= 1;
    if (keys.current.has('KeyS')) dir.z += 1;
    if (keys.current.has('KeyA')) dir.x -= 1;
    if (keys.current.has('KeyD')) dir.x += 1;
    if (keys.current.has('Space')) dir.y += 1;
    if (keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')) dir.y -= 1;
    dir.normalize().multiplyScalar(speed * dt);
    dir.applyEuler(new THREE.Euler(0, yaw.current, 0, 'YXZ'));
    velocity.current.lerp(dir, 0.15);
    camera.position.add(velocity.current);
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));
  });

  return null;
};

// ─── Story Camera ────────────────────────────────────────────────────
const StoryCameraController = ({ storyCamera }: { storyCamera: StoryCamera }) => {
  const { camera } = useThree();
  const posTarget = useRef(new THREE.Vector3(...storyCamera.position));
  const lookTarget = useRef(new THREE.Vector3(...storyCamera.target));
  useEffect(() => {
    posTarget.current.set(...storyCamera.position);
    lookTarget.current.set(...storyCamera.target);
  }, [storyCamera]);
  useFrame(() => {
    camera.position.lerp(posTarget.current, 0.04);
    camera.lookAt(lookTarget.current.x, lookTarget.current.y, lookTarget.current.z);
  });
  return null;
};

const StoryHighlight = ({ obj }: { obj: WorldObject }) => {
  const ringRef = useRef<THREE.Mesh>(null);
  const px = toWorld(obj.x + obj.width / 2 - CENTER_X);
  const pz = toWorld(obj.y + obj.height / 2 - CENTER_Y);
  const ty = getTerrainHeight(px, pz);
  useFrame(() => {
    if (!ringRef.current) return;
    const t = Date.now() * 0.003;
    ringRef.current.scale.set(1 + Math.sin(t) * 0.15, 1 + Math.sin(t) * 0.15, 1 + Math.sin(t) * 0.15);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t * 1.5) * 0.2;
  });
  return (
    <mesh ref={ringRef} position={[px, ty + 0.35, pz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.6, 32]} />
      <meshBasicMaterial color="#00ffcc" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
};

// ─── Story Callout 3D (in-scene HTML labels) ─────────────────────────
const StoryCallout3D = ({ callout }: { callout: StoryCallout }) => {
  return (
    <group position={callout.worldPos}>
      <Html center distanceFactor={6} zIndexRange={[100, 50]}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <div style={{
          background: 'hsla(240,10%,4%,0.85)',
          border: `1px solid ${callout.color || '#00ffcc'}55`,
          borderRadius: 6,
          padding: '3px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: callout.color || '#00ffcc',
          fontFamily: 'monospace',
          letterSpacing: '0.04em',
          boxShadow: `0 0 12px ${callout.color || '#00ffcc'}22`,
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          {callout.label}
        </div>
      </Html>
      {/* Small marker dot */}
      <mesh>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color={callout.color || '#00ffcc'} transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

// ─── Scene ───────────────────────────────────────────────────────────
const Scene = ({
  mode, nodes, objects, modalPins, wavefronts, agentSignals,
  cockpitNodeId, onEnterCockpit, onExitCockpit, onCanvasClick, emittingAgentIds,
  storyCamera, storyHighlightId, storyCallouts
}: Omit<Canvas3DProps, 'effects'>) => {
  const hideLabels = !!storyCamera;
  const orchestratorNode = useMemo(() => nodes.find(n => n.type === 'orchestrator'), [nodes]);
  const agents = useMemo(() => nodes.filter(n => n.type === 'agent'), [nodes]);
  const masses = useMemo(() => objects.filter(o => o.type === 'mass'), [objects]);
  const cockpitNode = useMemo(() => cockpitNodeId ? nodes.find(n => n.id === cockpitNodeId) : null, [cockpitNodeId, nodes]);

  return (
    <>
      {/* Hemisphere ambient — warm sky, cool ground */}
      <hemisphereLight args={['#ffe8c8', '#0a0a2a', 0.6]} />

      {/* The Sun — distant star mesh */}
      <group position={[80, 60, -40]}>
        <mesh>
          <sphereGeometry args={[4, 32, 32]} />
          <meshBasicMaterial color="#fff4d6" />
        </mesh>
        {/* Solar corona glow */}
        <mesh>
          <sphereGeometry args={[5.5, 32, 32]} />
          <meshBasicMaterial color="#ffdd88" transparent opacity={0.15} />
        </mesh>
        <mesh>
          <sphereGeometry args={[7, 32, 32]} />
          <meshBasicMaterial color="#ffcc66" transparent opacity={0.05} />
        </mesh>
        <pointLight color="#fff4d6" intensity={5} distance={200} decay={1} />
      </group>

      {/* Primary sunlight — directional from the sun's position, with shadow */}
      <directionalLight
        position={[80, 60, -40]}
        intensity={1.8}
        color="#fff0d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={80}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.002}
      />

      {/* Cool fill from opposite side — reflected skylight */}
      <directionalLight
        position={[-40, 30, 30]}
        intensity={0.4}
        color="#8899cc"
      />

      {/* Warm hearth glow at center */}
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#ff9944" distance={20} decay={2} />
      <Stars radius={50} depth={30} count={2000} factor={3} fade speed={0.5} />
      <Terrain mode={mode} objects={objects} wavefronts={wavefronts} />

      {storyCamera ? (
        <StoryCameraController storyCamera={storyCamera} />
      ) : cockpitNode ? (
        <CockpitCamera targetNode={cockpitNode} onExit={onExitCockpit} />
      ) : (
        <OrbitControls makeDefault enablePan enableZoom enableRotate
          minDistance={2} maxDistance={25} maxPolarAngle={Math.PI / 2.1} target={[0, 0, 0]} />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}
        onClick={(e) => { e.stopPropagation(); onCanvasClick(); }} visible={false}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial />
      </mesh>

      {orchestratorNode && (
        <ConnectionLines orchestrator={orchestratorNode} agents={agents}
          agentSignals={agentSignals} mode={mode} masses={masses} />
      )}

      {wavefronts.map(wf => <Wavefront3D key={wf.id} wf={wf} objects={objects} />)}
      {objects.map(obj => <Object3D key={obj.id} obj={obj} mode={mode} hideLabels={hideLabels} />)}
      {nodes.map(node => (
        <Node3D key={node.id} node={node} mode={mode}
          signal={agentSignals.get(node.id)} onEnterCockpit={onEnterCockpit}
          isCockpitTarget={node.id === cockpitNodeId}
          isEmitting={emittingAgentIds?.includes(node.id)} hideLabels={hideLabels} />
      ))}
      {modalPins.map(pin => <Pin3D key={pin.id} pin={pin} hideLabels={hideLabels} />)}

      {storyHighlightId && (() => {
        const hlObj = objects.find(o => o.id === storyHighlightId);
        return hlObj ? <StoryHighlight obj={hlObj} /> : null;
      })()}

      {/* Story callout labels */}
      {storyCallouts?.map((c, i) => (
        <StoryCallout3D key={`callout-${i}`} callout={c} />
      ))}
    </>
  );
};

// ─── Main Export ─────────────────────────────────────────────────────
export const Canvas3D = (props: Canvas3DProps) => {
  return (
    <div className="relative w-full h-full overflow-hidden border border-primary/20" style={{ background: '#050510' }}>
      <Canvas camera={{ position: [0, 8, 10], fov: 55, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
        <Scene {...props} />
      </Canvas>

      {props.cockpitNodeId && (
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-px bg-primary/40" />
            <div className="w-px h-6 bg-primary/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="absolute top-4 left-4 font-mono text-xs text-primary/70 space-y-1">
            <div>COCKPIT: {props.cockpitNodeId}</div>
            <div>WASD = fly · Mouse = look · ESC = exit</div>
          </div>
          <button className="absolute top-4 right-4 pointer-events-auto control-btn text-xs"
            onClick={props.onExitCockpit}>Exit Cockpit [ESC]</button>
          <div className="absolute inset-0 rounded-2xl"
            style={{ background: 'radial-gradient(ellipse at center, transparent 50%, hsla(240,10%,4%,0.6) 100%)' }} />
        </div>
      )}
    </div>
  );
};
