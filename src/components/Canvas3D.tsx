import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect, Wavefront, AgentSignalState } from "../types";

// ─── Constants ───────────────────────────────────────────────────────
const SCALE = 0.02; // 1px → 0.02 world units → 800px = 16 units
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
}

// ─── 3D Node (sphere + label) ────────────────────────────────────────
const Node3D = ({
  node, mode, signal, onEnterCockpit, isCockpitTarget, isEmitting
}: {
  node: Node; mode: CommunicationMode;
  signal?: AgentSignalState;
  onEnterCockpit: (id: string) => void;
  isCockpitTarget: boolean;
  isEmitting?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const emitRingRef = useRef<THREE.Mesh>(null);
  const emitLightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const emitPhase = useRef(0);

  const isOrch = node.type === 'orchestrator';
  const snr = signal?.snr ?? (isOrch ? 1 : 0);
  const color = isOrch ? MODE_COLORS[mode] : new THREE.Color().setHSL(
    snr > 0.6 ? 180 / 360 : snr > 0.25 ? 45 / 360 : 0, snr > 0.05 ? 0.8 : 0.2, snr > 0.05 ? 0.6 : 0.35
  );
  const radius = isOrch ? 0.25 : 0.12 + snr * 0.08;

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    if (isOrch) {
      meshRef.current.rotation.y += dt * 0.5;
    }
    // Pulse emissive
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + snr * 1.5 + (isOrch ? Math.sin(Date.now() * 0.003) * 0.3 : 0);

    // Emission ring animation
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
    if (isOrch) return 'Conductor (Mogul)';
    const group = node.actorGroup ? ACTOR_GROUP_LABELS[node.actorGroup] || node.actorGroup : 'Agent';
    const idx = node.actorIndex != null ? ` #${node.actorIndex + 1}` : '';
    const caps = node.capabilities.map(c => ACTOR_GROUP_LABELS[c] || c).join(', ');
    return `${group}${idx}\n[${caps}]\nSNR: ${snr.toFixed(3)}`;
  }, [isOrch, node, snr]);

  const px = toWorld(node.x - CENTER_X);
  const pz = toWorld(node.y - CENTER_Y);

  return (
    <group position={[px, isOrch ? 0.3 : 0.15, pz]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onDoubleClick={(e) => { e.stopPropagation(); onEnterCockpit(node.id); }}
      >
        {isOrch ? <octahedronGeometry args={[radius, 1]} /> : <sphereGeometry args={[radius, 16, 16]} />}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={isCockpitTarget ? 0.3 : 1}
        />
      </mesh>

      {/* SNR halo */}
      {snr > 0.05 && !isCockpitTarget && (
        <mesh>
          <ringGeometry args={[radius + 0.05, radius + 0.05 + snr * 0.3, 32]} />
          <meshBasicMaterial color={color} transparent opacity={snr * 0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label always visible */}
      <Html
        position={[0, radius + 0.2, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      >
        <div style={{
          background: 'hsla(240,10%,4%,0.85)',
          border: '1px solid hsla(180,100%,67%,0.3)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 10,
          color: '#e0e0e0',
          fontFamily: 'monospace',
        }}>
          {isOrch ? 'Conductor' : (node.actorGroup ? ACTOR_GROUP_LABELS[node.actorGroup] || node.actorGroup : node.id)}
        </div>
      </Html>

      {/* Hover tooltip */}
      {hovered && (
        <Html position={[0, radius + 0.55, 0]} center distanceFactor={6}>
          <div style={{
            background: 'hsla(240,10%,6%,0.95)',
            border: '1px solid hsla(180,100%,67%,0.5)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: '#f0f0f0',
            fontFamily: 'monospace',
            maxWidth: 220,
            whiteSpace: 'pre-wrap',
            boxShadow: '0 0 20px hsla(180,100%,67%,0.3)',
            pointerEvents: 'none',
          }}>
            {tooltip}
            <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>Double-click → Cockpit</div>
          </div>
        </Html>
      )}

      {/* Point light for orchestrator */}
      {isOrch && <pointLight color={color} intensity={2} distance={5} />}

      {/* Emission flash ring */}
      {emitPhase.current > 0.001 && (
        <>
          <mesh ref={emitRingRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius + 0.05, radius + 0.15, 32]} />
            <meshBasicMaterial
              color={mode === 'acoustic' ? '#ff6633' : color}
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            ref={emitLightRef}
            color={mode === 'acoustic' ? '#ff6633' : color}
            intensity={0}
            distance={3}
          />
        </>
      )}
    </group>
  );
};

// ─── 3D World Object (wall / lens / mirror / mass) ───────────────────
const Object3D = ({ obj }: { obj: WorldObject }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const w = toWorld(obj.width);
  const h = toWorld(obj.height);
  const px = toWorld(obj.x + obj.width / 2 - CENTER_X);
  const pz = toWorld(obj.y + obj.height / 2 - CENTER_Y);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    if (obj.type === 'mass') {
      meshRef.current.rotation.y += dt * 0.2;
    }
  });

  const label = obj.type === 'wall' ? 'Permission Gate'
    : obj.type === 'lens' ? 'Observability Lens'
    : obj.type === 'mirror' ? 'Mirror'
    : 'Invariant Mass';

  const color = obj.type === 'wall' ? '#666'
    : obj.type === 'lens' ? '#4ecdc4'
    : obj.type === 'mirror' ? '#8ecae6'
    : '#9333ea';

  const height3D = obj.type === 'wall' ? 0.3 : obj.type === 'mass' ? Math.max(w, h) : 0.15;

  return (
    <group position={[px, height3D / 2, pz]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {obj.type === 'mass' ? (
          <sphereGeometry args={[Math.max(w, h) / 2, 24, 24]} />
        ) : obj.type === 'lens' ? (
          <torusGeometry args={[Math.max(w, h) / 2, 0.04, 8, 24]} />
        ) : (
          <boxGeometry args={[w, height3D, h]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={obj.type === 'mass' ? 0.6 : 0.2}
          transparent
          opacity={obj.type === 'lens' ? 0.5 : obj.type === 'mass' ? 0.7 : 0.85}
          metalness={obj.type === 'mirror' ? 0.9 : 0.3}
          roughness={obj.type === 'mirror' ? 0.1 : 0.6}
        />
      </mesh>

      {/* Gravity well ring for masses */}
      {obj.type === 'mass' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height3D / 2 + 0.01, 0]}>
          <ringGeometry args={[Math.max(w, h) / 2, Math.max(w, h) / 2 + 0.5, 48]} />
          <meshBasicMaterial color="#9333ea" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, height3D / 2 + 0.25, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'hsla(240,10%,4%,0.8)',
          border: `1px solid ${color}44`,
          borderRadius: 5,
          padding: '2px 6px',
          fontSize: 9,
          color: '#ccc',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      </Html>

      {/* Hover details */}
      {hovered && (
        <Html position={[0, height3D / 2 + 0.5, 0]} center distanceFactor={6}>
          <div style={{
            background: 'hsla(240,10%,6%,0.95)',
            border: `1px solid ${color}88`,
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 10,
            color: '#eee',
            fontFamily: 'monospace',
            pointerEvents: 'none',
          }}>
            {label} ({obj.width}×{obj.height}px)
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── 3D Wavefront (expanding sphere shell) ───────────────────────────
const Wavefront3D = ({ wf }: { wf: Wavefront }) => {
  const r = toWorld(wf.radius);
  const px = toWorld(wf.sourceX - CENTER_X);
  const pz = toWorld(wf.sourceY - CENTER_Y);
  const color = MODE_COLORS[wf.mode];
  const opacity = Math.min(0.5, wf.energy * 0.6);
  if (opacity < 0.01 || r > 12) return null;

  return (
    <mesh position={[px, 0.1, pz]}>
      <sphereGeometry args={[r, 32, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        wireframe={wf.isEcho}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ─── 3D Modal Pin (floating card) ────────────────────────────────────
const Pin3D = ({ pin }: { pin: ModalPin }) => {
  const px = toWorld(pin.x - CENTER_X);
  const pz = toWorld(pin.y - CENTER_Y);
  const modeColor = pin.mode === 'acoustic' ? '#ff9933' : pin.mode === 'light' ? '#4ecdc4' : '#9333ea';

  return (
    <group position={[px, 1.2, pz]}>
      {/* Stem line */}
      <mesh>
        <cylinderGeometry args={[0.01, 0.01, 1, 6]} />
        <meshBasicMaterial color={modeColor} transparent opacity={0.4} />
      </mesh>

      <Html position={[0, 0.6, 0]} center distanceFactor={6}>
        <div style={{
          background: 'hsla(240,10%,4%,0.95)',
          border: `1px solid ${modeColor}66`,
          borderRadius: 8,
          padding: '8px 12px',
          maxWidth: 200,
          fontFamily: 'monospace',
          boxShadow: `0 4px 20px ${modeColor}33`,
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 10, color: modeColor, marginBottom: 4 }}>
            {pin.title}
          </div>
          <div style={{ fontSize: 9, color: '#bbb', marginBottom: 4, whiteSpace: 'pre-wrap' }}>
            {pin.body}
          </div>
          <div style={{ fontSize: 8, color: '#888' }}>{pin.tags}</div>
        </div>
      </Html>
    </group>
  );
};

// ─── Connection lines (conductor → agents) ──────────────────────────
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

    return agents.map(agent => {
      const ax = toWorld(agent.x - CENTER_X);
      const az = toWorld(agent.y - CENTER_Y);
      const sig = agentSignals.get(agent.id);
      const snr = sig?.snr ?? 0;

      const points: THREE.Vector3[] = [];
      if (mode === 'gravity' && masses.length > 0) {
        // Bezier curve bent toward masses
        const mx = (ox + ax) / 2;
        const mz = (oz + az) / 2;
        let pullX = 0, pullZ = 0, totalW = 0;
        masses.forEach(m => {
          const cx = toWorld(m.x + m.width / 2 - CENTER_X);
          const cz = toWorld(m.y + m.height / 2 - CENTER_Y);
          const dist = Math.sqrt((mx - cx) ** 2 + (mz - cz) ** 2);
          const w = (toWorld(m.width) + toWorld(m.height)) / (dist + 1);
          pullX += (cx - mx) * w;
          pullZ += (cz - mz) * w;
          totalW += w;
        });
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(ox, 0.2, oz),
          new THREE.Vector3(mx + pullX * 1.5, 0.4, mz + pullZ * 1.5),
          new THREE.Vector3(ax, 0.15, az)
        );
        points.push(...curve.getPoints(20));
      } else {
        points.push(new THREE.Vector3(ox, 0.2, oz), new THREE.Vector3(ax, 0.15, az));
      }

      return { points, snr, id: agent.id };
    });
  }, [orchestrator, agents, agentSignals, mode, masses]);

  return (
    <group ref={linesRef}>
      {lines.map(l => {
        if (l.snr < 0.02) return null;
        return (
          <Line
            key={l.id}
            points={l.points}
            color={MODE_COLORS[mode]}
            transparent
            opacity={Math.max(0.05, l.snr * 0.5)}
            lineWidth={1.5}
          />
        );
      })}
    </group>
  );
};

// ─── Grid floor ──────────────────────────────────────────────────────
const Floor = ({ mode }: { mode: CommunicationMode }) => {
  const color = MODE_COLORS[mode];
  return (
    <group>
      <gridHelper args={[20, 40, color, new THREE.Color(color).multiplyScalar(0.15)]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#050510" metalness={0.8} roughness={0.6} />
      </mesh>
    </group>
  );
};

// ─── Cockpit Camera Controller ───────────────────────────────────────
const CockpitCamera = ({ targetNode, onExit }: { targetNode: Node; onExit: () => void }) => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(0);

  const targetPos = useMemo(() => new THREE.Vector3(
    toWorld(targetNode.x - CENTER_X),
    0.5,
    toWorld(targetNode.y - CENTER_Y)
  ), [targetNode]);

  // Smoothly move camera to cockpit on mount
  useEffect(() => {
    camera.position.copy(targetPos);
    yaw.current = 0;
    pitch.current = 0;
  }, [camera, targetPos]);

  // Key listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Escape') onExit();
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement) {
        yaw.current -= e.movementX * 0.002;
        pitch.current = Math.max(-1.2, Math.min(1.2, pitch.current - e.movementY * 0.002));
      }
    };
    const onClick = () => {
      document.body.requestPointerLock?.();
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousemove', onMouse);
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('click', onClick);
      document.exitPointerLock?.();
    };
  }, [onExit]);

  useFrame((_, dt) => {
    const speed = 3;
    const dir = new THREE.Vector3();

    if (keys.current.has('KeyW')) dir.z -= 1;
    if (keys.current.has('KeyS')) dir.z += 1;
    if (keys.current.has('KeyA')) dir.x -= 1;
    if (keys.current.has('KeyD')) dir.x += 1;
    if (keys.current.has('Space')) dir.y += 1;
    if (keys.current.has('ShiftLeft')) dir.y -= 1;

    dir.normalize().multiplyScalar(speed * dt);

    // Apply yaw rotation to movement
    const euler = new THREE.Euler(0, yaw.current, 0, 'YXZ');
    dir.applyEuler(euler);

    velocity.current.lerp(dir, 0.15);
    camera.position.add(velocity.current);

    // Apply look-around
    const lookEuler = new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ');
    camera.quaternion.setFromEuler(lookEuler);
  });

  return null;
};

// ─── Scene (inner Canvas content) ────────────────────────────────────
const Scene = ({
  mode, nodes, objects, modalPins, wavefronts, agentSignals,
  cockpitNodeId, onEnterCockpit, onExitCockpit, onCanvasClick, emittingAgentIds
}: Omit<Canvas3DProps, 'effects'>) => {
  const orchestratorNode = useMemo(() => nodes.find(n => n.type === 'orchestrator'), [nodes]);
  const agents = useMemo(() => nodes.filter(n => n.type === 'agent'), [nodes]);
  const masses = useMemo(() => objects.filter(o => o.type === 'mass'), [objects]);
  const cockpitNode = useMemo(() => cockpitNodeId ? nodes.find(n => n.id === cockpitNodeId) : null, [cockpitNodeId, nodes]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 3]} intensity={0.4} />

      {/* Stars background */}
      <Stars radius={50} depth={30} count={2000} factor={3} fade speed={0.5} />

      {/* Floor grid */}
      <Floor mode={mode} />

      {/* Camera controls */}
      {cockpitNode ? (
        <CockpitCamera targetNode={cockpitNode} onExit={onExitCockpit} />
      ) : (
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2.1}
          target={[0, 0, 0]}
        />
      )}

      {/* Click plane for emission */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.03, 0]}
        onClick={(e) => { e.stopPropagation(); onCanvasClick(); }}
        visible={false}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial />
      </mesh>

      {/* Connection lines */}
      {orchestratorNode && (
        <ConnectionLines
          orchestrator={orchestratorNode}
          agents={agents}
          agentSignals={agentSignals}
          mode={mode}
          masses={masses}
        />
      )}

      {/* Wavefronts */}
      {wavefronts.map(wf => (
        <Wavefront3D key={wf.id} wf={wf} />
      ))}

      {/* World objects */}
      {objects.map(obj => (
        <Object3D key={obj.id} obj={obj} />
      ))}

      {/* Nodes */}
      {nodes.map(node => (
        <Node3D
          key={node.id}
          node={node}
          mode={mode}
          signal={agentSignals.get(node.id)}
          onEnterCockpit={onEnterCockpit}
          isCockpitTarget={node.id === cockpitNodeId}
          isEmitting={emittingAgentIds?.includes(node.id)}
        />
      ))}

      {/* Modal pins */}
      {modalPins.map(pin => (
        <Pin3D key={pin.id} pin={pin} />
      ))}
    </>
  );
};

// ─── Main Export ─────────────────────────────────────────────────────
export const Canvas3D = (props: Canvas3DProps) => {
  return (
    <div className="relative w-full h-[560px] rounded-2xl overflow-hidden border border-primary/20"
      style={{ background: '#050510' }}
    >
      <Canvas
        camera={{ position: [0, 8, 10], fov: 55, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene {...props} />
      </Canvas>

      {/* Cockpit overlay HUD */}
      {props.cockpitNodeId && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-px bg-primary/40" />
            <div className="w-px h-6 bg-primary/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Cockpit info */}
          <div className="absolute top-4 left-4 font-mono text-xs text-primary/70 space-y-1">
            <div>COCKPIT: {props.cockpitNodeId}</div>
            <div>WASD = fly · Mouse = look · ESC = exit</div>
          </div>

          {/* Exit button */}
          <button
            className="absolute top-4 right-4 pointer-events-auto control-btn text-xs"
            onClick={props.onExitCockpit}
          >
            Exit Cockpit [ESC]
          </button>

          {/* Vignette */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 50%, hsla(240,10%,4%,0.6) 100%)',
            }}
          />
        </div>
      )}
    </div>
  );
};
