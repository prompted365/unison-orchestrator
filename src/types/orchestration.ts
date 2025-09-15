export interface CommunicationChannel {
  id: string;
  mode: 'acoustic' | 'light' | 'gravity' | 'quantum' | 'neural';
  capacity: number;
  latency: number;
  reliability: number;
  range: number;
}

export interface Agent {
  id: string;
  type: 'orchestrator' | 'worker' | 'supervisor' | 'specialist';
  capabilities: string[];
  load: number;
  status: 'idle' | 'busy' | 'error' | 'offline';
  channels: CommunicationChannel[];
  lastHeartbeat: number;
}

export interface Task {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requirements: string[];
  payload: any;
  deadline?: number;
  dependencies?: string[];
}

export interface SwarmState {
  agents: Agent[];
  tasks: Task[];
  channels: CommunicationChannel[];
  topology: 'mesh' | 'star' | 'ring' | 'hierarchical' | 'hybrid';
  performance: {
    throughput: number;
    errorRate: number;
    averageLatency: number;
  };
}

export interface CommunicationProtocol {
  name: string;
  version: string;
  handshake: (agent: Agent) => Promise<boolean>;
  broadcast: (message: any, channel: CommunicationChannel) => Promise<void>;
  unicast: (message: any, target: string, channel: CommunicationChannel) => Promise<void>;
  multicast: (message: any, targets: string[], channel: CommunicationChannel) => Promise<void>;
}

export interface OrchestrationEngine {
  swarmState: SwarmState;
  protocols: CommunicationProtocol[];
  
  // Core orchestration methods
  initializeSwarm: (config: SwarmConfig) => Promise<void>;
  addAgent: (agent: Agent) => Promise<void>;
  removeAgent: (agentId: string) => Promise<void>;
  assignTask: (task: Task, agentId?: string) => Promise<void>;
  broadcast: (message: any) => Promise<void>;
  
  // Advanced patterns
  loadBalance: () => Promise<void>;
  failover: (failedAgentId: string) => Promise<void>;
  scaleUp: (count: number) => Promise<void>;
  scaleDown: (count: number) => Promise<void>;
}

export interface SwarmConfig {
  topology: SwarmState['topology'];
  maxAgents: number;
  communicationModes: Array<CommunicationChannel['mode']>;
  failoverPolicy: 'immediate' | 'graceful' | 'manual';
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'capability-based' | 'geographic';
}

// Harmony-style covenant structures for advanced orchestration
export interface Covenant {
  id: string;
  version: string;
  constraints: {
    maxLatency: number;
    minReliability: number;
    maxErrorRate: number;
  };
  policies: {
    taskAssignment: 'automatic' | 'manual' | 'hybrid';
    failureHandling: 'retry' | 'reassign' | 'escalate';
    communicationMode: 'prefer-fast' | 'prefer-reliable' | 'adaptive';
  };
  softBlocks: {
    penaltyThreshold: number;
    decayTime: number;
    maxPenalty: number;
  };
}

// Advanced communication patterns for complex scenarios
export interface CommunicationPattern {
  name: string;
  type: 'broadcast' | 'gossip' | 'epidemic' | 'hierarchical' | 'ring' | 'mesh';
  reliability: number;
  scalability: number;
  latency: number;
  overhead: number;
}

export const COMMUNICATION_PATTERNS: Record<string, CommunicationPattern> = {
  homeskillet_orchestration: {
    name: 'Homeskillet Multi-Layer Orchestration',
    type: 'hierarchical',
    reliability: 0.95,
    scalability: 0.9,
    latency: 0.1,
    overhead: 0.15
  },
  harmony_conductor: {
    name: 'Harmony Swarm Conductor',
    type: 'mesh',
    reliability: 0.98,
    scalability: 0.85,
    latency: 0.08,
    overhead: 0.25
  },
  oracle_prophetic: {
    name: 'Oracle Prophetic Insight',
    type: 'broadcast',
    reliability: 0.92,
    scalability: 0.95,
    latency: 0.12,
    overhead: 0.1
  },
  quadset_parallel: {
    name: 'Quadset Parallel Processing',
    type: 'ring',
    reliability: 0.88,
    scalability: 0.98,
    latency: 0.15,
    overhead: 0.05
  }
};