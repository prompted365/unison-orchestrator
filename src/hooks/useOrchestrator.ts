import { useState, useCallback } from "react";
import { CommunicationMode, WorldObject, OrchestratorState } from "../types";

const TASK_REQUIREMENTS = {
  'Siren Tick': ['ghost_chorus', 'ecotone_gate'],
  'Warrant Triage': ['drift_tracker', 'economy_whisper'],
  'CogPR Review': ['economy_whisper', 'ghost_chorus'],
  'Harmonic Scan': ['ecotone_gate', 'drift_tracker'],
  'Drift Measurement': ['drift_tracker', 'epitaph_extractor']
};

const TASK_LIST = Object.keys(TASK_REQUIREMENTS);

export const useOrchestrator = (mode: CommunicationMode, objects: WorldObject[]) => {
  const [state, setState] = useState<OrchestratorState>({
    field: {
      fieldLatency: 0.12,
      breachRisk: 0.06,
      signalCongestion: 0.08,
      barometerPhase: 0,
      demurrageRate: 0.0001,
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
    const needed = TASK_REQUIREMENTS[task as keyof typeof TASK_REQUIREMENTS] || ['ghost_chorus'];
    const have = needed.filter(req => capabilities.includes(req)).length / needed.length;
    const penalty = (1 - have) * state.covenant.softBlock.penaltyMax;
    return { value: have, penalty };
  }, [state.covenant.softBlock.penaltyMax]);

  const score = useCallback((agent: any, task: string, snr: number) => {
    const fit = softPrereq(task, agent.capabilities);
    const blockers = 0.3 * state.field.breachRisk + 0.2 * state.field.signalCongestion + 0.2 * agent.load;
    const prior = 0.2 * 0.6;
    return 1.2 * fit.value + prior + 0.8 * snr - blockers - fit.penalty;
  }, [state.field, softPrereq]);

  const tick = useCallback(() => {
    const obstacleFactor = Math.min(0.3, objects.length * 0.02);
    const base = mode === 'gravity' ? 0.1 : mode === 'light' ? 0.12 : 0.14;
    
    setState(prev => {
      const newPhase = Math.min(4, Math.floor(obstacleFactor * 14)) as 0 | 1 | 2 | 3 | 4;
      const demurrageByPhase = [0.0001, 0.00015, 0.0002, 0.00025, 0.0003];
      return {
        ...prev,
        field: {
          fieldLatency: Number((base + obstacleFactor).toFixed(2)),
          breachRisk: Number((0.05 + obstacleFactor).toFixed(2)),
          signalCongestion: Number((0.06 + Math.random() * 0.02).toFixed(2)),
          barometerPhase: newPhase,
          demurrageRate: demurrageByPhase[newPhase],
          timestamp: performance.now()
        }
      };
    });
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
