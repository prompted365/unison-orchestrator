import { useState, useCallback } from "react";
import { CommunicationMode, WorldObject, OrchestratorState } from "../types";

const TASK_REQUIREMENTS = {
  'Data Processing': ['compute', 'storage'],
  'Network Sync': ['network', 'compute'],
  'Security Check': ['security', 'compute'],
  'Load Balance': ['network', 'analytics'],
  'Cache Update': ['storage', 'network']
};

const TASK_LIST = Object.keys(TASK_REQUIREMENTS);

export const useOrchestrator = (mode: CommunicationMode, objects: WorldObject[]) => {
  const [state, setState] = useState<OrchestratorState>({
    field: {
      latency: 0.12,
      risk: 0.06,
      congestion: 0.08,
      timestamp: performance.now()
    },
    covenant: {
      softBlock: {
        penaltyMax: 0.7,
        decayMs: 3000
      }
    }
  });

  const [taskIndex, setTaskIndex] = useState(0);

  const softPrereq = useCallback((task: string, capabilities: string[]) => {
    const needed = TASK_REQUIREMENTS[task as keyof typeof TASK_REQUIREMENTS] || ['compute'];
    const have = needed.filter(req => capabilities.includes(req)).length / needed.length;
    const penalty = (1 - have) * state.covenant.softBlock.penaltyMax;
    return { value: have, penalty };
  }, [state.covenant.softBlock.penaltyMax]);

  const score = useCallback((agent: any, task: string, snr: number) => {
    const fit = softPrereq(task, agent.capabilities);
    const blockers = 0.3 * state.field.risk + 0.2 * state.field.congestion + 0.2 * agent.load;
    const prior = 0.2 * 0.6; // exemplar bias
    return 1.2 * fit.value + prior + 0.8 * snr - blockers - fit.penalty;
  }, [state.field, softPrereq]);

  const tick = useCallback(() => {
    const obstacleFactor = Math.min(0.3, objects.length * 0.02);
    const base = mode === 'gravity' ? 0.1 : mode === 'light' ? 0.12 : 0.14;
    
    setState(prev => ({
      ...prev,
      field: {
        latency: Number((base + obstacleFactor).toFixed(2)),
        risk: Number((0.05 + obstacleFactor).toFixed(2)),
        congestion: Number((0.06 + Math.random() * 0.02).toFixed(2)),
        timestamp: performance.now()
      }
    }));
  }, [mode, objects]);

  const getNextTask = useCallback(() => {
    const task = TASK_LIST[taskIndex % TASK_LIST.length];
    setTaskIndex(prev => prev + 1);
    return task;
  }, [taskIndex]);

  return {
    state,
    tick,
    score,
    softPrereq,
    getNextTask
  };
};