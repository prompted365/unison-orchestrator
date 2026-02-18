import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { CommunicationMode } from "../types";
import {
  Signal, Warrant, HarmonicTriad, SignalKind, SignalBand,
  BreachFlags, SignalCensus, WarrantLifecycle
} from "../types/orchestration";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

const SIGNAL_TTL_S = 20;
const WARRANT_TTL_S = 30;
const TRIAD_WINDOW_S = 5;
const VOLUME_THRESHOLD = 0.8;

const MODE_BAND: Record<CommunicationMode, SignalBand> = {
  acoustic: 'PRIMITIVE',
  light: 'COGNITIVE',
  gravity: 'PRIMITIVE'
};

const SUBSYSTEMS = ['ghost_chorus', 'economy_whisper', 'drift_tracker', 'ecotone_gate', 'epitaph_extractor'];

// Band budget dB multipliers (linear)
const BAND_MULTIPLIER: Record<SignalBand, number> = {
  PRIMITIVE: 1.0,       // 0 dB
  COGNITIVE: 0.5,       // -6 dB
  SOCIAL: 0.25,         // -12 dB
  PRESTIGE: 0.0,        // auto-muted
};

export const deriveBreachFlags = (phase: number): BreachFlags => ({
  rate_band_breach: phase >= 1,
  reserve_breach: phase >= 2,
  mint_halted: phase >= 3,
  frozen: phase >= 4,
});

export const useSignalEngine = (mode: CommunicationMode, demurrageRate: number, breachRisk: number) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [warrants, setWarrants] = useState<Warrant[]>([]);
  const [triads, setTriads] = useState<HarmonicTriad[]>([]);
  const [triadCount, setTriadCount] = useState(0);
  const [warrantLifecycleTotal, setWarrantLifecycleTotal] = useState({ dismissed: 0, expired: 0 });

  const lastTickRef = useRef(performance.now());
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const warrantsRef = useRef<Warrant[]>([]);
  warrantsRef.current = warrants;

  // Signal census
  const census: SignalCensus = useMemo(() => {
    const byKind: Record<SignalKind, number> = { BEACON: 0, LESSON: 0, OPPORTUNITY: 0, TENSION: 0 };
    const byBand: Record<SignalBand, number> = { PRIMITIVE: 0, COGNITIVE: 0, SOCIAL: 0, PRESTIGE: 0 };
    let loudest: SignalCensus['loudest'] = null;

    signals.forEach(s => {
      byKind[s.kind]++;
      byBand[s.band]++;
      if (!loudest || s.volume > loudest.volume) {
        loudest = { kind: s.kind, volume: s.volume, subsystem: s.subsystem };
      }
    });
    return { byKind, byBand, loudest };
  }, [signals]);

  // Warrant lifecycle
  const warrantLifecycle: WarrantLifecycle = useMemo(() => {
    const active = warrants.filter(w => w.status === 'active').length;
    const acknowledged = warrants.filter(w => w.status === 'acknowledged').length;
    return {
      active,
      acknowledged,
      dismissed: warrantLifecycleTotal.dismissed,
      expired: warrantLifecycleTotal.expired,
    };
  }, [warrants, warrantLifecycleTotal]);

  // Tick
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

          // Band budget enforcement
          vol *= BAND_MULTIPLIER[sig.band];

          // Warrant amplification
          const matchingWarrants = warrantsRef.current.filter(
            w => w.status === 'active' && w.sourceSignalIds.includes(sig.id)
          );
          const warrantBoost = matchingWarrants.reduce((sum, w) => sum + w.priority * 0.03, 0);
          vol += warrantBoost * dt;

          vol = Math.min(vol, sig.maxVolume);
          vol -= demurrageRate * vol * dt * 1000;
          vol = Math.max(0, vol);

          return { ...sig, volume: vol };
        });

        updated = updated.filter(s => s.volume > 0.001 && s.escalation !== 'EXPIRED');
        return updated;
      });

      // Warrant expiry
      setWarrants(prev => {
        let expiredCount = 0;
        const kept = prev.filter(w => {
          const age = (now - w.createdAt) / 1000;
          if (age >= WARRANT_TTL_S || w.status === 'dismissed') {
            if (w.status !== 'dismissed') expiredCount++;
            return false;
          }
          return true;
        });
        if (expiredCount > 0) {
          setWarrantLifecycleTotal(p => ({ ...p, expired: p.expired + expiredCount }));
        }
        return kept;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [demurrageRate]);

  // Warrant minting checks
  useEffect(() => {
    const interval = setInterval(() => {
      const now = performance.now();

      setSignals(prev => {
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
    const subsystem = SUBSYSTEMS[Math.floor(Math.random() * SUBSYSTEMS.length)];

    const isTension = selectedKind === 'TENSION';
    const sig: Signal = {
      id: nextId('signal'),
      kind: selectedKind,
      band,
      volume: 0.1 + Math.random() * 0.3,
      volumeRate: isTension ? (0.04 + Math.random() * 0.04) : (0.02 + Math.random() * 0.04),
      maxVolume: 0.7 + Math.random() * 0.3,
      ttlHours: SIGNAL_TTL_S / 3600,
      hearingTargets: [],
      escalation: 'ACTIVE',
      sourceActorId: 'orchestrator',
      createdAt: performance.now(),
      subsystem,
    };
    setSignals(prev => [...prev, sig]);
  }, []);

  const acknowledgeWarrant = useCallback((id: string) => {
    setWarrants(prev => prev.map(w => w.id === id ? { ...w, status: 'acknowledged' as const } : w));
  }, []);

  const dismissWarrant = useCallback((id: string) => {
    setWarrants(prev => prev.map(w => w.id === id ? { ...w, status: 'dismissed' as const } : w));
    setWarrantLifecycleTotal(p => ({ ...p, dismissed: p.dismissed + 1 }));
  }, []);

  // Reset on mode change
  useEffect(() => {
    setSignals([]);
    setWarrants([]);
    setTriads([]);
    setWarrantLifecycleTotal({ dismissed: 0, expired: 0 });
  }, [mode]);

  return {
    signals,
    warrants,
    triads,
    triadCount,
    census,
    warrantLifecycle,
    emitSignal,
    acknowledgeWarrant,
    dismissWarrant
  };
};
