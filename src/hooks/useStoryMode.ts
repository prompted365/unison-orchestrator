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
  duration: number; // seconds
  narration: StoryNarration;
  cameraStart: { pos: [number, number, number]; target: [number, number, number] };
  cameraEnd: { pos: [number, number, number]; target: [number, number, number] };
  fov: number;
  actions: { progress: number; fired?: boolean; fn: string }[];
}

const ACTS: ActDef[] = [
  {
    title: "The Estate",
    duration: 8,
    narration: {
      title: "The Estate",
      body: "This is opTorq Estate. Mogul, the Estate Conductor, governs a manifold of agents across three signal channels. Every signal obeys physics.",
    },
    cameraStart: { pos: [0, 12, 14], target: [0, 0, 0] },
    cameraEnd: { pos: [3, 8, 10], target: [0, 0, 0] },
    fov: 55,
    actions: [],
  },
  {
    title: "The Broadcast",
    duration: 10,
    narration: {
      title: "The Broadcast",
      body: "Mogul emits an acoustic beacon. Sound propagates omnidirectionally — a spherical pressure wave expanding at ~343 m/s (normalized here to 200 px/s for observation).",
    },
    cameraStart: { pos: [3, 4, 4], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 2, 2], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.25, fn: "setAcoustic" },
      { progress: 0.4, fn: "broadcast" },
    ],
  },
  {
    title: "Attenuation, Not Permission",
    duration: 11,
    narration: {
      title: "Attenuation, Not Permission",
      body: "This boundary doesn't block signals — it attenuates them. Each crossing reduces effective volume by muffling_per_hop. The signal arrived — just quieter.",
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
    duration: 14,
    narration: {
      title: "Warrant Escalation",
      body: "An unacknowledged beacon escalates. Volume accrues. When it crosses the volume threshold (0.8), a Warrant mints — an obligation token requiring stake bond to dismiss. As the warrant strengthens, even distant agents begin to hear.",
    },
    cameraStart: { pos: [0, 3, 3], target: [0, 0.3, 0] },
    cameraEnd: { pos: [2, 5, 6], target: [0, 0.3, 0] },
    fov: 55,
    actions: [
      { progress: 0.2, fn: "broadcast" },
      { progress: 0.35, fn: "broadcast" },
      { progress: 0.5, fn: "broadcast" },
      { progress: 0.65, fn: "broadcast" },
      { progress: 0.8, fn: "broadcast" },
    ],
  },
  {
    title: "The Harmonic Triad",
    duration: 12,
    narration: {
      title: "The Harmonic Triad",
      body: "When BEACON + LESSON + TENSION signals co-exist within the triad window, a harmonic warrant mints automatically. This is emergent governance — not a rule someone wrote, but a resonance the system detected.",
    },
    cameraStart: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    cameraEnd: { pos: [0, 6, 0.1], target: [0, 0.3, 0] },
    fov: 50,
    actions: [
      { progress: 0.3, fn: "emitBeacon" },
      { progress: 0.5, fn: "emitLesson" },
      { progress: 0.65, fn: "emitTension" },
    ],
  },
  {
    title: "The Epitaph",
    duration: 12,
    narration: {
      title: "The Epitaph",
      body: "When a signal completes its lifecycle — acknowledged, acted upon, resolved — the Epitaph Extractor compresses the outcome into a durable disposition. This is how the estate learns. Not by storing everything, but by remembering what mattered.",
    },
    cameraStart: { pos: [3, 2, -2], target: [2, 0.15, -2] },
    cameraEnd: { pos: [3, 1.5, -2], target: [2, 0.15, -2] },
    fov: 45,
    actions: [{ progress: 0.5, fn: "dropPin" }],
  },
  {
    title: "The Refusal",
    duration: 14,
    narration: {
      title: "The Refusal",
      body: "On 2026-02-18, this system demonstrated governance by refusing to promote a valid insight to global scope — because blast radius exceeded evidence. Accuracy alone doesn't earn global law. Time, repetition, and institutional review do. This is the Constitution of Attention.",
    },
    cameraStart: { pos: [0, 10, 12], target: [0, 0, 0] },
    cameraEnd: { pos: [0, 8, 10], target: [0, 0, 0] },
    fov: 55,
    actions: [],
  },
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
  const [currentAct, setCurrentAct] = useState(0);
  const [actProgress, setActProgress] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const firedRef = useRef<Set<string>>(new Set());
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const totalActs = ACTS.length;

  const startStory = useCallback(() => {
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
        const actDef = ACTS[act];
        if (!actDef) return act;

        setActProgress(prev => {
          const next = prev + dt / actDef.duration;

          // Fire actions
          actDef.actions.forEach(a => {
            const key = `${act}-${a.progress}`;
            if (next >= a.progress && !firedRef.current.has(key)) {
              firedRef.current.add(key);
              switch (a.fn) {
                case "broadcast": cbRef.current.onBroadcast(); break;
                case "setAcoustic": cbRef.current.onSetMode("acoustic"); break;
                case "dropPin": cbRef.current.onDropPin(); break;
                case "highlightBoundary": setHighlightId("gate-1"); break;
                case "emitBeacon": cbRef.current.onEmitSignalKind("BEACON"); break;
                case "emitLesson": cbRef.current.onEmitSignalKind("LESSON"); break;
                case "emitTension": cbRef.current.onEmitSignalKind("TENSION"); break;
              }
            }
          });

          if (next >= 1) {
            // Advance act
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
  }, [isPlaying, totalActs, stopStory]);

  const storyCamera = useMemo<StoryCamera | null>(() => {
    if (!isPlaying) return null;
    const act = ACTS[currentAct];
    if (!act) return null;
    const t = easeInOutCubic(actProgress);

    // Special case: Act 5 orbit
    if (currentAct === 4) {
      const angle = actProgress * Math.PI * 2;
      const r = 6;
      return {
        position: [Math.sin(angle) * r, 6, Math.cos(angle) * r] as [number, number, number],
        target: act.cameraStart.target,
        fov: act.fov,
      };
    }

    return {
      position: lerpTuple(act.cameraStart.pos, act.cameraEnd.pos, t),
      target: lerpTuple(act.cameraStart.target, act.cameraEnd.target, t),
      fov: act.fov,
    };
  }, [isPlaying, currentAct, actProgress]);

  const narration = useMemo<StoryNarration | null>(() => {
    if (!isPlaying) return null;
    return ACTS[currentAct]?.narration ?? null;
  }, [isPlaying, currentAct]);

  return {
    isPlaying,
    currentAct,
    actProgress,
    totalActs,
    storyCamera,
    narration,
    highlightId,
    startStory,
    stopStory,
    skipAct,
  };
}
