export type CommunicationMode = 'acoustic' | 'light' | 'gravity';

export interface Node {
  id: string;
  type: 'orchestrator' | 'agent';
  x: number;
  y: number;
  capabilities: string[];
  load: number;
  lastSNR: number;
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
  type: 'ring' | 'echo' | 'smear' | 'arc' | 'metric' | 'ray';
  x: number;
  y: number;
  size?: number;
  color?: string;
  duration?: number;
  createdAt: number;
}

export interface OrchestratorState {
  field: {
    latency: number;
    risk: number;
    congestion: number;
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