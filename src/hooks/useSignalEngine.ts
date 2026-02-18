import { useState, useCallback, useRef, useEffect } from "react";
import { CommunicationMode } from "../types";
import { Signal, Warrant, HarmonicTriad, SignalKind, SignalBand } from "../types/orchestration";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

const SIGNAL_TTL_S = 20; // seconds in sim-time
const WARRANT_TTL_S = 30;
const TRIAD_WINDOW_S = 5;
const VOLUME_THRESHOLD = 0.8;

const MODE_BAND: Record<CommunicationMode, SignalBand> = {
  acoustic: 'PRIMITIVE',
  light: 'COGNITIVE',
  gravity: 'PRIMITIVE'
};

export const useSignalEngine = (mode: CommunicationMode, demurrageRate: number, breachRisk: number) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [triads, setTriads] = useState<HarmonicTriad[]>([]);
  const [triadCount, setTriadCount] = useState(0);

  const lastTickRef = useRef(performance.now());
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const warrantsRef = useRef<Warrant[]>([]);
  warrantsRef.current = warrants;

  // Tick the signal engine - called from simulation loop or interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setSignals(prev => {
        let updated = prev.map(sig => {
          const age = (now - sig.createdAt) / 1000;
          if (age > SIGNAL_TTL_S) return { ...sig, volume: 0, escalation: 'EXPIRED' as const };

          let vol = sig.volume + sig.volumeRate * dt;

          // Warrant amplification: active warrants boost volume
          const matchingWarrants = warrantsRef.current.filter(
            w => w.status === 'active' && w.sourceSignalIds.includes(sig.id)
          );
          const warrantBoost = matchingWarrants.reduce((sum, w) => sum + w.priority * 0.03, 0);
          vol += warrantBoost * dt;

          vol = Math.min(vol, sig.maxVolume);
          // Demurrage decay
          vol -= demurrageRate * vol * dt * 1000;
          vol = Math.max(0, vol);

          return { ...sig, volume: vol };
        });

        // Remove expired
        updated = updated.filter(s => s.volume > 0.001 && s.escalation !== 'EXPIRED');
        return updated;
      });

      // Warrant expiry
      setWarrants(prev =>
        prev.filter(w => {
          const age = (now - w.createdAt) / 1000;
          return age < WARRANT_TTL_S && w.status === 'active';
        })
      );
    }, 100); // 10Hz tick

    return () => clearInterval(interval);
  }, [demurrageRate]);

  // Check for warrant minting conditions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();

      setSignals(prev => {
        // Volume threshold check
        prev.forEach(sig => {
          if (sig.volume > VOLUME_THRESHOLD && sig.escalation === 'ACTIVE') {
            mintWarrant([sig.id], 'volume_threshold', sig.band, sig.volume);
          }
        });

        // Harmonic triad detection
        const activeKinds = new Set(prev.filter(s => s.escalation === 'ACTIVE').map(s => s.kind));
        if (activeKinds.has('BEACON') && activeKinds.has('LESSON') && activeKinds.has('TENSION')) {
          const beacon = prev.find(s => s.kind === 'BEACON' && s.escalation === 'ACTIVE');
          const lesson = prev.find(s => s.kind === 'LESSON' && s.escalation === 'ACTIVE');
          const tension = prev.find(s => s.kind === 'TENSION' && s.escalation === 'ACTIVE');
          if (beacon && lesson && tension) {
            const oldest = Math.min(beacon.createdAt, lesson.createdAt, tension.createdAt);
            if ((now - oldest) / 1000 < TRIAD_WINDOW_S) {
              const triadExists = triads.some(t =>
                t.primitiveId === beacon.id && t.cognitiveId === lesson.id && t.tensionId === tension.id
              );
              if (!triadExists) {
                const warrantId = nextId('warrant');
                const newTriad: HarmonicTriad = {
                  primitiveId: beacon.id,
                  cognitiveId: lesson.id,
                  tensionId: tension.id,
                  detectedAt: now,
                  warrantId
                };
                setTriads(p => [...p, newTriad]);
                setTriadCount(p => p + 1);
                mintWarrant([beacon.id, lesson.id, tension.id], 'harmonic_triad', 'SOCIAL', 0.9);
              }
            }
          }
        }

        return prev;
      });

      // Circuit breaker
      if (breachRisk > 0.25) {
        setWarrants(prev => {
          const hasCb = prev.some(w => w.mintingCondition === 'circuit_breaker' && w.status === 'active');
          if (!hasCb) {
            mintWarrant([], 'circuit_breaker', MODE_BAND[modeRef.current], breachRisk);
          }
          return prev;
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [breachRisk, triads]);

  const mintWarrant = useCallback((sourceIds: string[], condition: Warrant['mintingCondition'], band: SignalBand, priority: number) => {
    const w: Warrant = {
      id: nextId('warrant'),
      sourceSignalIds: sourceIds,
      mintingCondition: condition,
      band,
      priority: Math.min(1, priority),
      scope: modeRef.current,
      status: 'active',
      stakeBond: 0.1 + priority * 0.4,
      payload: {},
      createdAt: performance.now()
    };
    setWarrants(prev => [...prev, w]);
  }, []);

  const emitSignal = useCallback((kind?: SignalKind) => {
    const kinds: SignalKind[] = ['BEACON', 'LESSON', 'OPPORTUNITY', 'TENSION'];
    const selectedKind = kind || kinds[Math.floor(Math.random() * kinds.length)];
    const band = MODE_BAND[modeRef.current];

    // TENSION signals (sirens) escalate faster
    const isTension = selectedKind === 'TENSION';
    const sig: Signal = {
      id: nextId('signal'),
      kind: selectedKind,
      band,
      volume: 0.1 + Math.random() * 0.3,
      volumeRate: isTension ? (0.04 + Math.random() * 0.04) : (0.02 + Math.random() * 0.04),
      maxVolume: 0.7 + Math.random() * 0.3,
      ttlHours: SIGNAL_TTL_S / 3600, // scaled
      hearingTargets: [],
      escalation: 'ACTIVE',
      sourceActorId: 'orchestrator',
      createdAt: performance.now()
    };
    setSignals(prev => [...prev, sig]);
  }, []);

  const acknowledgeWarrant = useCallback((id: string) => {
    setWarrants(prev => prev.map(w => w.id === id ? { ...w, status: 'acknowledged' as const } : w));
  }, []);

  const dismissWarrant = useCallback((id: string) => {
    setWarrants(prev => prev.map(w => w.id === id ? { ...w, status: 'dismissed' as const } : w));
  }, []);

  // Reset on mode change
  useEffect(() => {
    setSignals([]);
    setWarrants([]);
    setTriads([]);
  }, [mode]);

  return {
    signals,
    warrants,
    triads,
    triadCount,
    emitSignal,
    acknowledgeWarrant,
    dismissWarrant
  };
};
