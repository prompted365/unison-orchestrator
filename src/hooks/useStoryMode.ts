import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CommunicationMode } from "../types";

export interface StoryCamera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  reverseLook?: boolean; // for "The Pull" — camera looks away from motion direction
}

export interface StoryNarration {
  title: string;
  body: string;
}

export interface StoryCallout {
  label: string;
  worldPos: [number, number, number];
  color?: string;
}

interface ActDef {
  title: string;
  duration: number;
  narration: StoryNarration;
  cameraStart: { pos: [number, number, number]; target: [number, number, number] };
  cameraEnd: { pos: [number, number, number]; target: [number, number, number] };
  fov: number;
  orbit?: { radius: number; height: number; center: [number, number, number] };
  actions: { progress: number; fired?: boolean; fn: string }[];
  callouts?: StoryCallout[];
}

export type StoryBand = 'acoustic' | 'light' | 'gravity';

export interface StoryArc {
  band: StoryBand;
  title: string;
  acts: ActDef[];
}

// ─── Deterministic story layout positions (2D px coords) ───
// These override random positions during story mode so camera can find subjects.
export const STORY_LAYOUT = {
  // Objects repositioned for framing
  objects: {
    acoustic: [
      { id: 'gate-1', type: 'wall' as const, x: 340, y: 230, width: 100, height: 14 },
      { id: 'gate-2', type: 'wall' as const, x: 540, y: 260, width: 16, height: 90 },
      { id: 'gate-3', type: 'wall' as const, x: 300, y: 370, width: 80, height: 14 },
    ],
    light: [
      { id: 'lens-1', type: 'lens' as const, x: 340, y: 240, width: 44, height: 44 },
      { id: 'mirror-1', type: 'mirror' as const, x: 460, y: 230, width: 70, height: 22, surfaceAngle: Math.PI * 0.15 },
      { id: 'lens-2', type: 'lens' as const, x: 350, y: 340, width: 36, height: 36 },
    ],
    gravity: [
      { id: 'invariant-1', type: 'mass' as const, x: 340, y: 230, width: 56, height: 56 },
      { id: 'invariant-2', type: 'mass' as const, x: 470, y: 250, width: 68, height: 68 },
      { id: 'invariant-3', type: 'mass' as const, x: 320, y: 340, width: 48, height: 48 },
    ],
  },
  // Agent clusters tighter around origin for camera framing
  clusters: [
    { cx: 370, cy: 250, n: 3 },
    { cx: 440, cy: 260, n: 3 },
    { cx: 380, cy: 320, n: 3 },
    { cx: 430, cy: 330, n: 2 },
    { cx: 360, cy: 290, n: 2 },
  ],
};

// World coordinate helpers (must match Canvas3D)
const SCALE = 0.02;
const CENTER_X = 400, CENTER_Y = 280;
const toW = (px: number) => (px - CENTER_X) * SCALE;
const toWZ = (py: number) => (py - CENTER_Y) * SCALE;

// Object world positions for callouts
const gatePos: [number, number, number] = [toW(340 + 50), 0.2, toWZ(230 + 7)];
const mirrorPos: [number, number, number] = [toW(460 + 35), 0.2, toWZ(230 + 11)];
const lensPos: [number, number, number] = [toW(340 + 22), 0.2, toWZ(240 + 22)];
const massPos: [number, number, number] = [toW(340 + 28), 0.2, toWZ(230 + 28)];
const mogulPos: [number, number, number] = [0, 0.4, 0];

// ─── ACOUSTIC ARC: "The Conductor's Voice" ───
const ACOUSTIC_ACTS: ActDef[] = [
  {
    title: "The Estate",
    duration: 14,
    narration: {
      title: "Act 1 · The Estate",
      body: "Welcome to opTorq Estate — a live governance substrate running on Ubiquity OS. Mogul, the Estate Conductor, orchestrates agents across three signal channels. We start here because every system begins with a single point of authority. The question is: how does that authority propagate without becoming tyranny?",
    },
    cameraStart: { pos: [0, 10, 10], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 5, 6], target: [0, 0, 0] },
    fov: 55,
    actions: [],
    callouts: [{ label: "Mogul — Estate Conductor", worldPos: mogulPos, color: "#ff6633" }],
  },
  {
    title: "The Broadcast",
    duration: 16,
    narration: {
      title: "Act 2 · The Broadcast",
      body: "Mogul emits an acoustic beacon — a spherical pressure wave expanding omnidirectionally. Sound is the most intuitive model for 'reaching everyone nearby.' No targeting, no routing table. Just physics: if you're close enough, you hear it. This is governance by proximity, not permission.",
    },
    cameraStart: { pos: [1, 2, 2], target: [0, 0.3, 0] },
    cameraEnd: { pos: [2, 3, 4], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.15, fn: "setAcoustic" },
      { progress: 0.35, fn: "broadcast" },
    ],
    callouts: [{ label: "Acoustic Beacon", worldPos: [0, 0.6, 0], color: "#ff6633" }],
  },
  {
    title: "Attenuation, Not Permission",
    duration: 18,
    narration: {
      title: "Act 3 · Attenuation, Not Permission",
      body: "Watch the signal cross this boundary. It doesn't get blocked — it gets quieter. Each crossing reduces effective volume by muffling_per_hop. Governance isn't about who is 'allowed' to hear. It's about how far meaning can travel before it decays below the threshold of relevance. Distance is the access control.",
    },
    cameraStart: { pos: [-0.5, 2, 0], target: gatePos },
    cameraEnd: { pos: [-1.2, 1.5, -0.5], target: gatePos },
    fov: 45,
    actions: [
      { progress: 0.2, fn: "highlightBoundary" },
      { progress: 0.4, fn: "broadcast" },
    ],
    callouts: [
      { label: "Attenuation Boundary", worldPos: gatePos, color: "#ff6633" },
      { label: "Signal weakens here →", worldPos: [gatePos[0] + 0.3, gatePos[1] + 0.3, gatePos[2]], color: "#ffaa44" },
    ],
  },
  {
    title: "Warrant Escalation",
    duration: 20,
    narration: {
      title: "Act 4 · Warrant Escalation",
      body: "An unacknowledged beacon escalates. Volume accrues with each repetition. When it crosses the warrant threshold (0.8), an obligation token mints — requiring a stake bond to dismiss. Silence is not consent. If you ignore a valid signal long enough, the system forces you to address it or pay the cost of refusal.",
    },
    cameraStart: { pos: [0, 2.5, 2.5], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0.5, 3, 3.5], target: [0, 0.3, 0] },
    fov: 55,
    actions: [
      { progress: 0.12, fn: "broadcast" },
      { progress: 0.24, fn: "broadcast" },
      { progress: 0.36, fn: "broadcast" },
      { progress: 0.48, fn: "broadcast" },
      { progress: 0.60, fn: "broadcast" },
      { progress: 0.75, fn: "broadcast" },
    ],
    callouts: [{ label: "WARRANT MINTING...", worldPos: [0, 0.8, 0], color: "#ff4444" }],
  },
  {
    title: "The Harmonic Triad",
    duration: 18,
    narration: {
      title: "Act 5 · The Harmonic Triad",
      body: "When BEACON + LESSON + TENSION signals co-exist within the triad window, a harmonic warrant mints automatically. Nobody wrote this rule. It emerged from the signal physics. Governance can be emergent — the system detected a resonance pattern that no single actor authored.",
    },
    cameraStart: { pos: [0, 2.5, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 2.5, 0.1], target: [0, 0.3, 0] },
    orbit: { radius: 3, height: 2.5, center: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.25, fn: "emitBeacon" },
      { progress: 0.45, fn: "emitLesson" },
      { progress: 0.65, fn: "emitTension" },
    ],
    callouts: [
      { label: "BEACON", worldPos: [-0.5, 0.5, -0.5], color: "#ff6633" },
      { label: "LESSON", worldPos: [0.5, 0.5, -0.5], color: "#44cc44" },
      { label: "TENSION", worldPos: [0, 0.5, 0.5], color: "#ff4444" },
    ],
  },
  {
    title: "The Epitaph",
    duration: 16,
    narration: {
      title: "Act 6 · The Epitaph",
      body: "When a signal completes its lifecycle — acknowledged, acted upon, resolved — the Epitaph Extractor compresses the outcome into a durable disposition. The system doesn't store everything. It remembers what mattered. This is institutional memory without institutional bloat.",
    },
    cameraStart: { pos: [-0.5, 1.5, 0.8], target: [-0.4, 0.15, 0.6] },
    cameraEnd: { pos: [-0.5, 1, 0.3], target: [-0.4, 0.15, 0.6] },
    fov: 45,
    actions: [{ progress: 0.4, fn: "dropPin" }],
    callouts: [{ label: "Epitaph Extractor", worldPos: [-0.4, 0.4, 0.6], color: "#cc6622" }],
  },
  {
    title: "The Refusal",
    duration: 16,
    narration: {
      title: "Act 7 · The Refusal",
      body: "On 2026-02-18, this system refused to promote a valid insight to global scope — because blast radius exceeded evidence. Accuracy alone doesn't earn global law. Time, repetition, and institutional review do. This is the Constitution of Attention.",
    },
    cameraStart: { pos: [0, 8, 10], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 6, 8], target: [0, 0, 0] },
    fov: 55,
    actions: [],
    callouts: [{ label: "Blast radius exceeded evidence. Promotion refused.", worldPos: [0, 1.5, 0], color: "#ff4444" }],
  },
];

// ─── LIGHT ARC: "The Speed of Sight" ───
const LIGHT_ACTS: ActDef[] = [
  {
    title: "Entering the Spectrum",
    duration: 14,
    narration: {
      title: "Act 1 · Entering the Spectrum",
      body: "We switch to Light mode because some signals demand instantaneous reach. Light represents high-priority directives — governance actions that cannot afford the luxury of gradual propagation. When something must be seen now, sound is too slow.",
    },
    cameraStart: { pos: [0, 8, 10], target: [0, 0, 0] },
    cameraEnd: { pos: [1, 4, 5], target: [0, 0, 0] },
    fov: 55,
    actions: [{ progress: 0.15, fn: "setLight" }],
    callouts: [{ label: "Mogul", worldPos: mogulPos, color: "#4ecdc4" }],
  },
  {
    title: "Omnidirectional Flash",
    duration: 16,
    narration: {
      title: "Act 2 · Omnidirectional Flash",
      body: "A light signal radiates in all directions simultaneously — at 4,000 px/s normalized. The governance implication: there is no 'nearby first' advantage. Every agent in line-of-sight receives the signal at effectively the same instant. Priority is flat.",
    },
    cameraStart: { pos: [0.5, 2, 2], target: [0, 0.3, 0] },
    cameraEnd: { pos: [1, 3, 4], target: [0, 0.3, 0] },
    fov: 50,
    actions: [{ progress: 0.3, fn: "broadcast" }],
    callouts: [{ label: "4,000 px/s — simultaneous reach", worldPos: [0, 0.7, 0], color: "#4ecdc4" }],
  },
  {
    title: "Reflection and Redirection",
    duration: 18,
    narration: {
      title: "Act 3 · Reflection and Redirection",
      body: "Watch the signal hit the mirror and redirect. Unlike acoustic attenuation, light reflects — it changes direction entirely. Mirrors represent governance structures that intentionally redirect attention. A board meeting, an escalation path, a review gate. The signal survives, but its audience changes.",
    },
    cameraStart: { pos: [1.5, 2, 0], target: mirrorPos },
    cameraEnd: { pos: [2, 1.5, -0.8], target: mirrorPos },
    fov: 45,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.6, fn: "broadcast" },
    ],
    callouts: [
      { label: "Specular Surface", worldPos: mirrorPos, color: "#88ccff" },
      { label: "Reflected beam →", worldPos: [mirrorPos[0] + 0.5, mirrorPos[1] + 0.3, mirrorPos[2] - 0.3], color: "#aaddff" },
    ],
  },
  {
    title: "Lensing Focus",
    duration: 16,
    narration: {
      title: "Act 4 · Lensing Focus",
      body: "Lenses concentrate diffuse light into focused beams. In governance: curation — taking a broad signal and focusing it toward specific recipients. Not everyone needs to see everything. Lenses implement selective amplification without censorship. The signal still exists; it's just concentrated.",
    },
    cameraStart: { pos: [-0.5, 2, 0.5], target: lensPos },
    cameraEnd: { pos: [-1, 1.5, -0.2], target: lensPos },
    fov: 45,
    actions: [{ progress: 0.35, fn: "broadcast" }],
    callouts: [{ label: "Observability Lens — concentrates signal", worldPos: lensPos, color: "#4ecdc4" }],
  },
  {
    title: "Speed Normalization",
    duration: 16,
    narration: {
      title: "Act 5 · Why We Slow Light Down",
      body: "At true scale, light would cross this estate in microseconds — invisible to observation. We normalize speed so you can study the propagation pattern. In production, Mogul's light-band directives arrive instantly. Here, we slow time to let you see the geometry of authority.",
    },
    cameraStart: { pos: [0, 5, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 5, 0.1], target: [0, 0.3, 0] },
    orbit: { radius: 4, height: 5, center: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.6, fn: "broadcast" },
    ],
    callouts: [{ label: "Normalized: 4,000 px/s. Real: 3×10⁸ m/s", worldPos: [0, 1, 0], color: "#4ecdc4" }],
  },
];

// ─── GRAVITY ARC: "The Weight of Consensus" ───
const GRAVITY_ACTS: ActDef[] = [
  {
    title: "Entering the Field",
    duration: 14,
    narration: {
      title: "Act 1 · Entering the Field",
      body: "Gravity mode models the slowest, most persistent signals — the ones that bend the substrate itself. Gravitational signals represent deep consensus: constitutional principles, cultural invariants, the things that warp the space through which all other signals travel.",
    },
    cameraStart: { pos: [0, 8, 10], target: [0, 0, 0] },
    cameraEnd: { pos: [1, 4, 5], target: [0, 0, 0] },
    fov: 55,
    actions: [{ progress: 0.15, fn: "setGravity" }],
    callouts: [{ label: "Mogul", worldPos: mogulPos, color: "#9333ea" }],
  },
  {
    title: "The Gravity Wave",
    duration: 16,
    narration: {
      title: "Act 2 · The Gravity Wave",
      body: "A gravitational signal propagates at 800 px/s — slower than light, faster than sound. But its distinguishing feature isn't speed. It's curvature. Gravity waves don't bounce off mirrors or get muffled by walls. They warp the field that everything else moves through.",
    },
    cameraStart: { pos: [1, 2.5, 3], target: [0, 0.3, 0] },
    cameraEnd: { pos: [-0.5, 2, 2], target: [0, 0.3, 0] },
    fov: 50,
    actions: [{ progress: 0.35, fn: "broadcast" }],
    callouts: [{ label: "800 px/s — warps the field", worldPos: [0, 0.7, 0], color: "#9333ea" }],
  },
  {
    title: "Invariant Masses",
    duration: 18,
    narration: {
      title: "Act 3 · Invariant Masses",
      body: "These dense objects are Invariant Points — constitutional anchors with gravitational weight. They curve the signal field around them, creating wells that attract nearby agents. In governance, these are the non-negotiable principles: trust boundaries, escalation doctrines, rules that exist because removing them would collapse the system.",
    },
    cameraStart: { pos: [-0.5, 2.5, 0], target: massPos },
    cameraEnd: { pos: [-1, 1.5, -0.8], target: massPos },
    fov: 45,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.65, fn: "broadcast" },
    ],
    callouts: [{ label: "Invariant Point — constitutional anchor", worldPos: massPos, color: "#9333ea" }],
  },
  {
    title: "Field Warping",
    duration: 18,
    narration: {
      title: "Act 4 · Field Warping",
      body: "Watch how the wavefront distorts as it passes near an invariant mass. The signal doesn't just slow down — it bends. Agents in the gravitational well receive a version of the signal shaped by the principle it passed through. The geometry does the work.",
    },
    cameraStart: { pos: [0, 3, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 3, 0.1], target: [0, 0.3, 0] },
    orbit: { radius: 3.5, height: 3, center: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.2, fn: "broadcast" },
      { progress: 0.5, fn: "broadcast" },
      { progress: 0.8, fn: "broadcast" },
    ],
    callouts: [{ label: "Terrain ripples with each wave", worldPos: [0, 0.5, 0], color: "#9333ea" }],
  },
  {
    title: "The Pull",
    duration: 14,
    narration: {
      title: "Act 5 · The Pull",
      body: "Every mass exerts pull. Stand too close and the field bends you toward it. This is what constitutional gravity feels like — you don't choose to align. The topology chooses for you.",
    },
    // Camera starts far, facing OUTWARD. Position moves toward mass. Target stays away. "Sucked in ass-first."
    cameraStart: { pos: [3, 2, 0], target: [5, 3, 1] },
    cameraEnd: { pos: [massPos[0], 1.5, massPos[2]], target: [5, 3, 1] },
    fov: 50,
    actions: [],
    callouts: [{ label: "← You are being pulled", worldPos: [2, 1.5, 0], color: "#ff44ff" }],
  },
  {
    title: "The Weight of Consensus",
    duration: 16,
    narration: {
      title: "Act 6 · The Weight of Consensus",
      body: "Every invariant mass creates a persistent warp. Together, they form a topology — a landscape of values that every signal must navigate. We built the gravity band to model the things that don't change with each message, but shape how every message is received. Defend Meaning. Measure Signals. Honor the Canon.",
    },
    cameraStart: { pos: [0, 10, 12], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 7, 9], target: [0, 0, 0] },
    fov: 55,
    actions: [],
    callouts: [],
  },
];

const STORY_ARCS: StoryArc[] = [
  { band: 'acoustic', title: "The Conductor's Voice", acts: ACOUSTIC_ACTS },
  { band: 'light', title: "The Speed of Sight", acts: LIGHT_ACTS },
  { band: 'gravity', title: "The Weight of Consensus", acts: GRAVITY_ACTS },
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpTuple(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface StoryCallbacks {
  onBroadcast: () => void;
  onDropPin: () => void;
  onSetMode: (mode: CommunicationMode) => void;
  onEmitSignalKind: (kind: 'BEACON' | 'LESSON' | 'TENSION') => void;
}

export function useStoryMode(callbacks: StoryCallbacks) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentArcIndex, setCurrentArcIndex] = useState(0);
  const [currentAct, setCurrentAct] = useState(0);
  const [actProgress, setActProgress] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const firedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const currentArc = STORY_ARCS[currentArcIndex];
  const acts = currentArc.acts;
  const totalActs = acts.length;
  const activeBand = currentArc.band;

  const startStory = useCallback((arcIndex: number) => {
    setCurrentArcIndex(arcIndex);
    setIsPlaying(true);
    setCurrentAct(0);
    setActProgress(0);
    setHighlightId(null);
    firedRef.current.clear();
    lastTimeRef.current = 0;
  }, []);

  const stopStory = useCallback(() => {
    setIsPlaying(false);
    setCurrentAct(0);
    setActProgress(0);
    setHighlightId(null);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const skipAct = useCallback(() => {
    setCurrentAct(prev => {
      const next = prev + 1;
      if (next >= totalActs) {
        stopStory();
        return 0;
      }
      setActProgress(0);
      firedRef.current.clear();
      setHighlightId(null);
      return next;
    });
  }, [totalActs, stopStory]);

  // RAF loop
  useEffect(() => {
    if (!isPlaying) return;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      setCurrentAct(act => {
        const actDef = acts[act];
        if (!actDef) return act;

        setActProgress(prev => {
          const next = prev + dt / actDef.duration;

          actDef.actions.forEach(a => {
            const key = `${act}-${a.progress}`;
            if (next >= a.progress && !firedRef.current.has(key)) {
              firedRef.current.add(key);
              switch (a.fn) {
                case "broadcast": cbRef.current.onBroadcast(); break;
                case "setAcoustic": cbRef.current.onSetMode("acoustic"); break;
                case "setLight": cbRef.current.onSetMode("light"); break;
                case "setGravity": cbRef.current.onSetMode("gravity"); break;
                case "dropPin": cbRef.current.onDropPin(); break;
                case "highlightBoundary": setHighlightId("gate-1"); break;
                case "emitBeacon": cbRef.current.onEmitSignalKind("BEACON"); break;
                case "emitLesson": cbRef.current.onEmitSignalKind("LESSON"); break;
                case "emitTension": cbRef.current.onEmitSignalKind("TENSION"); break;
              }
            }
          });

          if (next >= 1) {
            const nextAct = act + 1;
            if (nextAct >= totalActs) {
              stopStory();
              return 0;
            }
            firedRef.current.clear();
            setHighlightId(null);
            setCurrentAct(nextAct);
            return 0;
          }
          return next;
        });

        return act;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, acts, totalActs, stopStory]);

  const storyCamera = useMemo<StoryCamera | null>(() => {
    if (!isPlaying) return null;
    const act = acts[currentAct];
    if (!act) return null;
    const t = easeInOutCubic(actProgress);

    // Orbit mode
    if (act.orbit) {
      const angle = actProgress * Math.PI * 2;
      const r = act.orbit.radius;
      const c = act.orbit.center;
      return {
        position: [Math.sin(angle) * r + c[0], act.orbit.height, Math.cos(angle) * r + c[2]] as [number, number, number],
        target: c as [number, number, number],
        fov: act.fov,
      };
    }

    return {
      position: lerpTuple(act.cameraStart.pos, act.cameraEnd.pos, t),
      target: lerpTuple(act.cameraStart.target, act.cameraEnd.target, t),
      fov: act.fov,
    };
  }, [isPlaying, acts, currentAct, actProgress]);

  const narration = useMemo<StoryNarration | null>(() => {
    if (!isPlaying) return null;
    return acts[currentAct]?.narration ?? null;
  }, [isPlaying, acts, currentAct]);

  const callouts = useMemo<StoryCallout[]>(() => {
    if (!isPlaying) return [];
    return acts[currentAct]?.callouts ?? [];
  }, [isPlaying, acts, currentAct]);

  return {
    isPlaying,
    currentAct,
    actProgress,
    totalActs,
    storyCamera,
    narration,
    highlightId,
    activeBand,
    arcTitle: currentArc.title,
    storyArcs: STORY_ARCS,
    callouts,
    startStory,
    stopStory,
    skipAct,
  };
}
