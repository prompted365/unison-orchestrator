export type CommunicationMode = 'acoustic' | 'light' | 'gravity';

export interface Node {
  id: string;
  type: 'orchestrator' | 'agent';
  x: number;
  y: number;
  capabilities: string[];
  load: number;
  lastSNR: number;
  strength?: 'weak' | 'medium' | 'strong';
  actorGroup?: string;
  actorIndex?: number;
}

export interface WorldObject {
  id: string;
  type: 'wall' | 'lens' | 'mirror' | 'mass';
  x: number;
  y: number;
  width: number;
  height: number;
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
