// CGG v3 Type Stubs — Signal Manifold Architecture
// These are the type foundation for the state machine phase.

export type SignalKind = 'BEACON' | 'LESSON' | 'OPPORTUNITY' | 'TENSION';
export type SignalBand = 'PRIMITIVE' | 'COGNITIVE' | 'SOCIAL' | 'PRESTIGE';
export type EscalationStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'EXPIRED';

export interface Signal {
  id: string;
  kind: SignalKind;
  band: SignalBand;
  volume: number;
  volumeRate: number;
  maxVolume: number;
  ttlHours: number;
  hearingTargets: string[];
  escalation: EscalationStatus;
  sourceActorId: string;
  createdAt: number;
}

export type WarrantMintingCondition = 'volume_threshold' | 'harmonic_triad' | 'circuit_breaker';
export type WarrantStatus = 'active' | 'acknowledged' | 'dismissed' | 'expired';

export interface Warrant {
  id: string;
  sourceSignalIds: string[];
  mintingCondition: WarrantMintingCondition;
  band: SignalBand;
  priority: number;
  scope: string;
  status: WarrantStatus;
  stakeBond: number;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface HarmonicTriad {
  primitiveId: string;
  cognitiveId: string;
  tensionId: string;
  detectedAt: number;
  warrantId: string | null;
}

export type TransitionPhase = 0 | 1 | 2 | 3 | 4;

export interface BarometerState {
  phase: TransitionPhase;
  demurrageRate: number;
  breachFlags: string[];
  activeSignalsCount: number;
}
