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

// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical mapping (internal → ontology/glossary term):
//   'wall'   → Attenuation Boundary — graduated signal degradation per hop
//   'lens'   → Observability Lens — selective signal amplification
//   'mirror' → Specular Surface — directional signal redirection
//   'mass'   → Invariant Field tension plate — constitutional anchor with gravity well
// Gap D8: Internal type names diverge from canonical vocabulary.
//   Talos should use canonical names in its entity registry.
// Constraint: x,y,width,height in 2D pixel space. Object sits on terrain at
//   worldPos = ((x + w/2 - 400) * 0.02, terrainHeight, (y + h/2 - 280) * 0.02)
// Constraint: Walls MUST sit flush with terrain — no floating geometry.
//   The platform beneath must deform to accommodate the boundary footprint.
// ════════════════════════════════════════════════════════════════
// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Wall: translucent box with mode-colored wireframe overlay, 3 horizontal scan lines
// Lens: torus ring with transparent fill, cyan emissive glow
// Mirror: flat reflective plane with arrow indicator pointing reflection normal
// Mass: solid sphere with outer event horizon, accretion disk rings, purple bloom
// Legibility: Each object type has unique silhouette — identifiable without labels at 10+ units
// Talos: Objects scale with width/height * 0.02. A 56px mass = 1.12 world units ≈ ~3.4m diameter
// ════════════════════════════════════════════════════════════════
export interface WorldObject {
  id: string;
  type: 'wall' | 'lens' | 'mirror' | 'mass';  // [CE] see canonical mapping above
  x: number;      // [CE] 2D pixel x — top-left corner
  y: number;      // [CE] 2D pixel y — top-left corner
  width: number;  // [CE] 2D pixel width
  height: number; // [CE] 2D pixel height
  surfaceAngle?: number; // [CE] radians, mirror reflection normal orientation
}

// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical: ModalPin — maps to Epitaph (glossary: "conformation-proximity memory
//   artifact encoding a failure mode's shape"). Spawns from an agent node after
//   signal lifecycle completes. Compressed into durable disposition by epitaph_extractor.
// Gap: No link back to source signal ID or warrant that triggered the epitaph.
// Gap: No governance tic timestamp — uses wall-clock createdAt (see D9).
// Constraint: TTL in ms. Pin auto-removes after TTL. In Talos, TTL should be
//   denominated in tics, not wall-clock ms.
// ════════════════════════════════════════════════════════════════
// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Renders as: burn-up ember animation → rising stem → floating card
// The burn-up originates from the source agent node — communicates "death and
//   crystallization" without text. Card appears after 1s delay.
// Talos: Pin stem height ~1.2 world units. Card at 1.8 units above terrain.
//   Scale stem to building height proportions in city context.
// ════════════════════════════════════════════════════════════════
export interface ModalPin {
  id: string;
  mode: CommunicationMode;
  x: number;  // [CE] 2D pixel coords — spawns near source agent
  y: number;
  title: string;
  body: string;
  tags: string;
  effect: any;  // [CE] governance side-effect payload — type varies by mode
  ttl: number;  // [CE] milliseconds — should be tics in Talos (see D9)
  createdAt: number;
}

// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Effect is a transient visual overlay triggered by broadcasts, triads, warrants.
// Not persisted. Duration in ms. Used for flash/bloom/ring effects only.
// ════════════════════════════════════════════════════════════════
export interface Effect {
  id: string;
  type: 'ring' | 'echo' | 'smear' | 'arc' | 'metric' | 'ray' | 'acoustic-wave' | 'gravity-wave'
    | 'reflection' | 'refraction' | 'triad-resonance' | 'warrant-pulse';
  x: number;  // [CE] 2D pixel coords
  y: number;
  size?: number;
  color?: string;
  duration?: number;
  createdAt: number;
}

// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical: Wavefront — the spatial propagation shell of a signal emission.
//   Maps to the CGG signal lifecycle: emission → propagation → reception → decay.
//   Energy follows inverse-square + absorption (acoustic/light) or near-lossless (gravity).
// Constraint: velocity in px/s (scaled, not real). See usePhysics for real-world mapping:
//   acoustic=200 px/s (~4s to cross 800px), light=4000 px/s (~0.2s), gravity=800 px/s (~1s)
// Constraint: isBeam=true creates directional ray (mirror reflections) — translates along
//   angle instead of expanding radially. Used for Specular Surface interactions only.
// Gap D4: No distinction between broadcast wavefront and Astragals point-to-point delivery.
//   Astragals should render as sealed directional tubes, not expanding spheres.
// ════════════════════════════════════════════════════════════════
// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Acoustic: warm wireframe sphere (hue 20-35°), orange pressure glow at origin
// Light: bright white leading-edge shell + cyan inner volume, flash bloom at origin
// Gravity: distorted wireframe sphere with sub-bass vertex displacement, inner plasma
//   core, equatorial shockwave ring, purple bloom. Terrain deforms under passage.
// Beam: tight cylinder with bright core + diffuse outer glow — reads as "directed energy"
// Legibility: Mode identifiable by color alone. Energy readable from opacity.
// ════════════════════════════════════════════════════════════════
export interface Wavefront {
  id: string;
  sourceX: number;  // [CE] 2D pixel coords — emission origin
  sourceY: number;
  radius: number;   // [CE] expanding radius in px — drives 3D sphere scale via SCALE=0.02
  energy: number;   // [CE] 0-1, decays per physics model. Wavefront pruned at MIN_ENERGY=0.01
  velocity: number; // [CE] px/s (normalized, not physical). See usePhysics PHYSICS_PROFILES
  mode: CommunicationMode;
  isEcho: boolean;   // [CE] spawned by wall reflection (acoustic only)
  isBeam?: boolean;  // [CE] directional beam from mirror reflection — translates, doesn't expand
  parentId?: string; // [CE] lineage — which wavefront spawned this echo/reflection
  angle?: number;    // [CE] radians, beam travel direction
  createdAt: number; // [CE] wall-clock ms — not governance tic (see D9)
  hasSpawnedEchoes?: Set<string>; // [CE] prevents duplicate echo spawning per object
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
