// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    TALOS INTEGRATION — MIGRATION CHECKLIST                  ║
// ║                                                                              ║
// ║  D1. No Entity Standing (citizen/resident/ambassador/guest…)                ║
// ║      → Node needs `standing` field for visual + access differentiation       ║
// ║  D2. No Actor Mode (none/invoked/delegated/autonomous/collective)           ║
// ║      → Node.type is only 'orchestrator'|'agent'; needs actor_mode            ║
// ║  D3. Agent Inbox Not Modeled                                                 ║
// ║      → No lateral agent-to-agent work-item routing or queue visualization    ║
// ║  D4. Astragals Not Modeled                                                   ║
// ║      → No high-assurance WAL-backed point-to-point transport                 ║
// ║  D5. No Lineage / Edge Visualization                                         ║
// ║      → Only orchestrator→agent lines; no SPAWNED/DELEGATED_BY/ACTED_FOR      ║
// ║  D6. Governance Lattice Absent                                               ║
// ║      → No rung hierarchy (site < domain < estate < federation < global)      ║
// ║  D7. Coordinate System Undocumented                                          ║
// ║      → 2D px (800×560) → 3D via SCALE=0.02, center (400,280)               ║
// ║  D8. Object Types Use Internal Names                                         ║
// ║      → 'wall'→Attenuation Boundary, 'mass'→Invariant Field tension plate     ║
// ║  D9. No Tic / Governance Time                                                ║
// ║      → Simulation uses wall-clock only; no governance epoch boundaries       ║
// ║  D10. CogPR / Artifact Subgraph Absent                                       ║
// ║      → No signals/mandates/rules/policies rendered as scene entities         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical: CommunicationMode — maps to CGG v3 signal bands
//   'acoustic' = PRIMITIVE band, omnidirectional pub/sub with muffling_per_hop
//   'light'    = COGNITIVE band, high-speed broadcast with lensing/reflection
//   'gravity'  = PRIMITIVE band (field-level), constitutional pressure waves
// Gap: No SOCIAL or PRESTIGE bands modeled spatially (handled in useSignalEngine)
// ════════════════════════════════════════════════════════════════
export type CommunicationMode = 'acoustic' | 'light' | 'gravity';

// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical: Node — maps to entity_ontology.entity_kind + actor subgraph
//   'orchestrator' = Mogul (actor_mode: autonomous), estate-level conductor
//   'agent' = any actor subgraph member (ghost_chorus, economy_whisper, etc.)
// Gap D1: Missing `standing` (citizen|resident|ambassador|guest|…) — determines
//   access scope and visual ring in Talos. Currently all agents treated equally.
// Gap D2: Missing `actor_mode` (none|invoked|delegated|autonomous|collective) —
//   a delegated ephemeral worker looks identical to an autonomous citizen.
// Gap D3: Missing `inbox` queue depth — agents have no visible inbox geometry.
// Constraint: x,y are 2D pixel coords in 800×560 canvas space.
//   Talos world transform: worldX = (x - 400) * 0.02, worldZ = (y - 280) * 0.02
// ════════════════════════════════════════════════════════════════
// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Encodes: `strength` drives SNR-based hue shift (red→yellow→cyan)
// Encodes: `actorGroup` determines geometry (icosahedron=ghost, octahedron=epitaph, sphere=default)
// Legibility: Group identity readable from geometry alone; SNR from color temperature
// Talos: Sphere radius 0.12-0.20 world units ≈ 6-10px at default camera. Scale to
//   Talos building proportions: 1 world unit ≈ ~3m real-world equivalent.
// ════════════════════════════════════════════════════════════════
export interface Node {
  id: string;
  type: 'orchestrator' | 'agent';
  x: number;  // [CE] 2D pixel x in 800px canvas — not world coords
  y: number;  // [CE] 2D pixel y in 560px canvas — not world coords
  capabilities: string[];  // [CE] maps to actor_subgraph capabilities from ontology
  load: number;
  lastSNR: number;
  strength?: 'weak' | 'medium' | 'strong';  // [VG] drives color encoding
  actorGroup?: string;   // [CE] canonical: ghost_chorus | economy_whisper | ecotone_gate | drift_tracker | epitaph_extractor
  actorIndex?: number;
}

export interface WorldObject {
  id: string;
  type: 'wall' | 'lens' | 'mirror' | 'mass';
  x: number;
  y: number;
  width: number;
  height: number;
  surfaceAngle?: number; // radians, for mirror orientation
}

export interface ModalPin {
  id: string;
  mode: CommunicationMode;
  x: number;
  y: number;
  title: string;
  body: string;
  tags: string;
  effect: any;
  ttl: number;
  createdAt: number;
}

export interface Effect {
  id: string;
  type: 'ring' | 'echo' | 'smear' | 'arc' | 'metric' | 'ray' | 'acoustic-wave' | 'gravity-wave'
    | 'reflection' | 'refraction' | 'triad-resonance' | 'warrant-pulse';
  x: number;
  y: number;
  size?: number;
  color?: string;
  duration?: number;
  createdAt: number;
}

export interface Wavefront {
  id: string;
  sourceX: number;
  sourceY: number;
  radius: number;
  energy: number;
  velocity: number; // px per second (scaled)
  mode: CommunicationMode;
  isEcho: boolean;
  isBeam?: boolean; // directional beam (mirror reflection) — does not expand radially
  parentId?: string;
  angle?: number; // for directional wavefronts (reflections)
  createdAt: number;
  hasSpawnedEchoes?: Set<string>; // track which objects already spawned echoes
}

export interface AgentSignalState {
  agentId: string;
  snr: number;
  peakSnr: number;
  receivedAt: number;
  phaseDelay: number;
}

export interface OrchestratorState {
  field: {
    fieldLatency: number;
    breachRisk: number;
    signalCongestion: number;
    barometerPhase: number;
    demurrageRate: number;
    timestamp: number;
  };
  covenant: {
    softBlock: {
      penaltyMax: number;
      decayMs: number;
    };
  };
}

export interface PhysicsProfile {
  velocity: number;
  alpha: number;
  echoes: boolean;
  label: string;
}
