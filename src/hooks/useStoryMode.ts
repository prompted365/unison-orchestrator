import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { CommunicationMode } from "../types";

export interface StoryCamera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface StoryNarration {
  title: string;
  body: string;
}

interface ActDef {
  title: string;
  duration: number;
  narration: StoryNarration;
  cameraStart: { pos: [number, number, number]; target: [number, number, number] };
  cameraEnd: { pos: [number, number, number]; target: [number, number, number] };
  fov: number;
  actions: { progress: number; fired?: boolean; fn: string }[];
}

export type StoryBand = 'acoustic' | 'light' | 'gravity';

export interface StoryArc {
  band: StoryBand;
  title: string;
  acts: ActDef[];
}

// ─── ACOUSTIC ARC: "The Conductor's Voice" ───
const ACOUSTIC_ACTS: ActDef[] = [
  {
    title: "The Estate",
    duration: 12,
    narration: {
      title: "Act 1 · The Estate",
      body: "Welcome to opTorq Estate — a live governance substrate running on Ubiquity OS. Mogul, the Estate Conductor, orchestrates agents across three signal channels. We start here because every system begins with a single point of authority. The question is: how does that authority propagate without becoming tyranny?",
    },
    cameraStart: { pos: [0, 12, 14], target: [0, 0, 0] },
    cameraEnd: { pos: [3, 8, 10], target: [0, 0, 0] },
    fov: 55,
    actions: [],
  },
  {
    title: "The Broadcast",
    duration: 14,
    narration: {
      title: "Act 2 · The Broadcast",
      body: "Mogul emits an acoustic beacon — a spherical pressure wave expanding omnidirectionally. We chose acoustic first because sound is the most intuitive model for 'reaching everyone nearby.' No targeting, no routing table. Just physics: if you're close enough, you hear it. This is governance by proximity, not permission.",
    },
    cameraStart: { pos: [3, 4, 4], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 2, 2], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.2, fn: "setAcoustic" },
      { progress: 0.4, fn: "broadcast" },
    ],
  },
  {
    title: "Attenuation, Not Permission",
    duration: 15,
    narration: {
      title: "Act 3 · Attenuation, Not Permission",
      body: "Watch the signal cross this boundary. It doesn't get blocked — it gets quieter. Each crossing reduces effective volume by muffling_per_hop. This is the key insight: governance isn't about who is 'allowed' to hear. It's about how far meaning can travel before it decays below the threshold of relevance. Distance is the access control.",
    },
    cameraStart: { pos: [-2, 3, 1], target: [-2, 0.15, -1] },
    cameraEnd: { pos: [-4, 2, -1], target: [-3, 0.15, -2] },
    fov: 45,
    actions: [
      { progress: 0.3, fn: "highlightBoundary" },
      { progress: 0.55, fn: "broadcast" },
    ],
  },
  {
    title: "Warrant Escalation",
    duration: 18,
    narration: {
      title: "Act 4 · Warrant Escalation",
      body: "An unacknowledged beacon doesn't vanish — it escalates. Volume accrues with each repetition. When it crosses the warrant threshold (0.8), an obligation token mints — requiring a stake bond to dismiss. This is why we built escalation into the physics: silence is not consent. If you ignore a valid signal long enough, the system forces you to address it or pay the cost of refusal.",
    },
    cameraStart: { pos: [0, 3, 3], target: [0, 0.3, 0] },
    cameraEnd: { pos: [2, 5, 6], target: [0, 0.3, 0] },
    fov: 55,
    actions: [
      { progress: 0.15, fn: "broadcast" },
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.45, fn: "broadcast" },
      { progress: 0.6, fn: "broadcast" },
      { progress: 0.75, fn: "broadcast" },
      { progress: 0.88, fn: "broadcast" },
    ],
  },
  {
    title: "The Harmonic Triad",
    duration: 16,
    narration: {
      title: "Act 5 · The Harmonic Triad",
      body: "When BEACON + LESSON + TENSION signals co-exist within the triad window, a harmonic warrant mints automatically. Nobody wrote this rule. It emerged from the signal physics. This is why we orbit the scene here — to show you that governance can be emergent. The system detected a resonance pattern that no single actor authored.",
    },
    cameraStart: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.25, fn: "emitBeacon" },
      { progress: 0.45, fn: "emitLesson" },
      { progress: 0.65, fn: "emitTension" },
    ],
  },
  {
    title: "The Epitaph",
    duration: 14,
    narration: {
      title: "Act 6 · The Epitaph",
      body: "When a signal completes its lifecycle — acknowledged, acted upon, resolved — the Epitaph Extractor compresses the outcome into a durable disposition. We zoom in here to show that the system doesn't store everything. It remembers what mattered. This is institutional memory without institutional bloat.",
    },
    cameraStart: { pos: [3, 2, -2], target: [2, 0.15, -2] },
    cameraEnd: { pos: [3, 1.5, -2], target: [2, 0.15, -2] },
    fov: 45,
    actions: [{ progress: 0.45, fn: "dropPin" }],
  },
  {
    title: "The Refusal",
    duration: 16,
    narration: {
      title: "Act 7 · The Refusal",
      body: "On 2026-02-18, this system refused to promote a valid insight to global scope — because blast radius exceeded evidence. We pull back to the full estate view for this moment because it matters at every scale: accuracy alone doesn't earn global law. Time, repetition, and institutional review do. This is the Constitution of Attention.",
    },
    cameraStart: { pos: [0, 10, 12], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 8, 10], target: [0, 0, 0] },
    fov: 55,
    actions: [],
  },
];

// ─── LIGHT ARC: "The Speed of Sight" ───
const LIGHT_ACTS: ActDef[] = [
  {
    title: "Entering the Spectrum",
    duration: 12,
    narration: {
      title: "Act 1 · Entering the Spectrum",
      body: "We switch to Light mode because some signals demand instantaneous reach. In the estate, light represents high-priority directives — governance actions that cannot afford the luxury of gradual propagation. When something must be seen now, sound is too slow.",
    },
    cameraStart: { pos: [0, 12, 14], target: [0, 0, 0] },
    cameraEnd: { pos: [2, 6, 8], target: [0, 0, 0] },
    fov: 55,
    actions: [{ progress: 0.15, fn: "setLight" }],
  },
  {
    title: "Omnidirectional Flash",
    duration: 14,
    narration: {
      title: "Act 2 · Omnidirectional Flash",
      body: "A light signal radiates in all directions simultaneously — at 4,000 px/s normalized speed (modeling ~3×10⁸ m/s). We show this because the governance implication is profound: there is no 'nearby first' advantage. Every agent in line-of-sight receives the signal at effectively the same instant. Priority is flat.",
    },
    cameraStart: { pos: [3, 4, 5], target: [0, 0.3, 0] },
    cameraEnd: { pos: [-1, 3, 3], target: [0, 0.3, 0] },
    fov: 50,
    actions: [{ progress: 0.35, fn: "broadcast" }],
  },
  {
    title: "Reflection and Redirection",
    duration: 15,
    narration: {
      title: "Act 3 · Reflection and Redirection",
      body: "Watch the signal hit the mirror and redirect. Unlike acoustic attenuation, light reflects — it doesn't just get quieter, it changes direction entirely. Mirrors in the estate represent governance structures that intentionally redirect attention. A board meeting, an escalation path, a review gate. The signal survives, but its audience changes.",
    },
    cameraStart: { pos: [4, 3, 0], target: [3, 0.15, -1] },
    cameraEnd: { pos: [5, 2, -2], target: [3, 0.15, -1] },
    fov: 45,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.6, fn: "broadcast" },
    ],
  },
  {
    title: "Lensing Focus",
    duration: 14,
    narration: {
      title: "Act 4 · Lensing Focus",
      body: "Lenses concentrate diffuse light into focused beams. In governance terms, this is curation — taking a broad signal and focusing it toward specific recipients. Not everyone needs to see everything. Lenses are how the estate implements selective amplification without censorship. The signal still exists; it's just concentrated.",
    },
    cameraStart: { pos: [-2, 3, 2], target: [-1, 0.15, 0] },
    cameraEnd: { pos: [-3, 2, 0], target: [-1, 0.15, 0] },
    fov: 45,
    actions: [
      { progress: 0.35, fn: "broadcast" },
    ],
  },
  {
    title: "Speed Normalization",
    duration: 14,
    narration: {
      title: "Act 5 · Why We Slow Light Down",
      body: "At true scale, light would cross this estate in microseconds — invisible to observation. We normalize speed so you can study the propagation pattern. This isn't a limitation; it's a design choice. In production, Mogul's light-band directives arrive instantly. Here, we slow time to let you see the geometry of authority.",
    },
    cameraStart: { pos: [0, 8, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 8, 0.1], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.6, fn: "broadcast" },
    ],
  },
];

// ─── GRAVITY ARC: "The Weight of Consensus" ───
const GRAVITY_ACTS: ActDef[] = [
  {
    title: "Entering the Field",
    duration: 12,
    narration: {
      title: "Act 1 · Entering the Field",
      body: "Gravity mode models the slowest, most persistent signals — the ones that bend the substrate itself. In the estate, gravitational signals represent deep consensus: constitutional principles, cultural invariants, the things that warp the space through which all other signals travel.",
    },
    cameraStart: { pos: [0, 12, 14], target: [0, 0, 0] },
    cameraEnd: { pos: [2, 6, 8], target: [0, 0, 0] },
    fov: 55,
    actions: [{ progress: 0.15, fn: "setGravity" }],
  },
  {
    title: "The Gravity Wave",
    duration: 15,
    narration: {
      title: "Act 2 · The Gravity Wave",
      body: "A gravitational signal propagates at 800 px/s — slower than light, faster than sound. But its distinguishing feature isn't speed. It's curvature. Gravity waves don't bounce off mirrors or get muffled by walls. They warp the field that everything else moves through. When consensus shifts, the entire topology changes.",
    },
    cameraStart: { pos: [3, 4, 5], target: [0, 0.3, 0] },
    cameraEnd: { pos: [-1, 3, 3], target: [0, 0.3, 0] },
    fov: 50,
    actions: [{ progress: 0.35, fn: "broadcast" }],
  },
  {
    title: "Invariant Masses",
    duration: 16,
    narration: {
      title: "Act 3 · Invariant Masses",
      body: "These dense objects are Invariant Points — constitutional anchors with gravitational weight. They curve the signal field around them, creating wells that attract nearby agents. In governance, these are the non-negotiable principles: trust boundaries, escalation doctrines, the rules that exist because removing them would collapse the system.",
    },
    cameraStart: { pos: [-2, 3, 1], target: [-1, 0.15, 0] },
    cameraEnd: { pos: [-3, 2, -1], target: [-1, 0.15, 0] },
    fov: 45,
    actions: [
      { progress: 0.3, fn: "broadcast" },
      { progress: 0.65, fn: "broadcast" },
    ],
  },
  {
    title: "Field Warping",
    duration: 16,
    narration: {
      title: "Act 4 · Field Warping",
      body: "Watch how the wavefront distorts as it passes near an invariant mass. The signal doesn't just slow down — it bends. Agents in the gravitational well receive a version of the signal shaped by the principle it passed through. This is how constitutional values filter governance signals without explicit rules. The geometry does the work.",
    },
    cameraStart: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.2, fn: "broadcast" },
      { progress: 0.5, fn: "broadcast" },
      { progress: 0.8, fn: "broadcast" },
    ],
  },
  {
    title: "The Weight of Consensus",
    duration: 16,
    narration: {
      title: "Act 5 · The Weight of Consensus",
      body: "We pull back to show the full field. Every invariant mass creates a persistent warp. Together, they form a topology — a landscape of values that every signal must navigate. This is why we built the gravity band: to model the things that don't change with each message, but shape how every message is received. Defend Meaning. Measure Signals. Honor the Canon.",
    },
    cameraStart: { pos: [0, 10, 12], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 8, 10], target: [0, 0, 0] },
    fov: 55,
    actions: [],
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

    // Orbit for "Harmonic Triad" (acoustic act 5) and "Field Warping" (gravity act 4) and "Speed Normalization" (light act 5)
    if (act.cameraStart.pos[0] === act.cameraEnd.pos[0] &&
        act.cameraStart.pos[1] === act.cameraEnd.pos[1] &&
        act.cameraStart.pos[2] === act.cameraEnd.pos[2] &&
        act.cameraStart.pos[2] < 1) {
      const angle = actProgress * Math.PI * 2;
      const r = 6;
      return {
        position: [Math.sin(angle) * r, act.cameraStart.pos[1], Math.cos(angle) * r] as [number, number, number],
        target: act.cameraStart.target,
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
    startStory,
    stopStory,
    skipAct,
  };
}
