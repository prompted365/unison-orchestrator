import { useRef, useCallback, useEffect, useState } from "react";
import { CommunicationMode, Node, WorldObject, Wavefront, AgentSignalState } from "../types";
import { usePhysics } from "./usePhysics";

const CANVAS_W = 800;
const CANVAS_H = 560;
const MAX_RADIUS = Math.sqrt(CANVAS_W * CANVAS_W + CANVAS_H * CANVAS_H);
const MIN_ENERGY = 0.01;

let wfCounter = 0;

export const useSimulation = (
  mode: CommunicationMode,
  nodes: Node[],
  objects: WorldObject[],
  timeScaleRef?: React.MutableRefObject<number>
) => {
  const physics = usePhysics(mode);
  const [wavefronts, setWavefronts] = useState<Wavefront[]>([]);
  const [agentSignals, setAgentSignals] = useState<Map<string, AgentSignalState>>(new Map());

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const wavefrontsRef = useRef(wavefronts);
  wavefrontsRef.current = wavefronts;
  const physicsRef = useRef(physics);
  physicsRef.current = physics;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback((time: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const rawDt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
    const dt = rawDt * (timeScaleRef?.current ?? 1); // apply time scale
    lastTimeRef.current = time;
    const phys = physicsRef.current;
    const currentNodes = nodesRef.current;
    const currentObjects = objectsRef.current;
    const currentMode = modeRef.current;

    setWavefronts(prev => {
      let updated = prev.map(wf => {
        // Beam wavefronts translate along angle instead of expanding radially
        if (wf.isBeam && wf.angle != null) {
          const dx = Math.cos(wf.angle) * wf.velocity * dt;
          const dy = Math.sin(wf.angle) * wf.velocity * dt;
          const age = (time - wf.createdAt) / 1000;
          const newEnergy = wf.energy * (1 - age / 2.5); // fade over ~2.5s
          return {
            ...wf,
            sourceX: wf.sourceX + dx,
            sourceY: wf.sourceY + dy,
            radius: wf.radius + wf.velocity * dt * 0.02, // very slight expansion for visibility
            energy: Math.max(0, newEnergy)
          };
        }

        // Time dilation for gravity mode
        let effectiveVelocity = wf.velocity;
        if (currentMode === 'gravity') {
          const dilation = phys.computeTimeDilation(wf.sourceX, wf.sourceY, currentObjects);
          const edgeDilation = phys.computeTimeDilation(
            wf.sourceX + wf.radius * 0.7,
            wf.sourceY + wf.radius * 0.7,
            currentObjects
          );
          effectiveVelocity *= (dilation + edgeDilation) / 2;
        }

        const newRadius = wf.radius + effectiveVelocity * dt;

        // Energy decay: inverse-square from source
        const distMeters = newRadius / 60;
        let newEnergy: number;
        if (currentMode === 'gravity') {
          newEnergy = wf.energy * 0.998; // Gravity barely decays
        } else {
          const inverseSquare = 1 / (1 + distMeters * distMeters * 0.1);
          const absorption = Math.exp(-phys.profile.alpha * distMeters);
          newEnergy = wf.energy * inverseSquare * absorption;
          newEnergy = wf.energy - (wf.energy - newEnergy) * dt * 2;
        }

        return { ...wf, radius: newRadius, energy: Math.max(0, newEnergy) };
      });

      // Spawn echo/reflection wavefronts
      const newWavefronts: Wavefront[] = [];

      updated.forEach(wf => {
        if (!wf.hasSpawnedEchoes) wf.hasSpawnedEchoes = new Set();

        // Acoustic echoes from walls
        if (currentMode === 'acoustic' && !wf.isEcho) {
          const echoSources = phys.computeEchoSources(wf.sourceX, wf.sourceY, currentObjects);
          echoSources.forEach(echo => {
            if (wf.hasSpawnedEchoes!.has(echo.objectId)) return;
            const objDist = phys.getPixelDistance(
              { x: wf.sourceX, y: wf.sourceY },
              { x: echo.x, y: echo.y }
            );
            if (wf.radius >= objDist * 0.9) {
              wf.hasSpawnedEchoes!.add(echo.objectId);
              newWavefronts.push({
                id: `wf-echo-${wfCounter++}`,
                sourceX: echo.x,
                sourceY: echo.y,
                radius: 5,
                energy: echo.energy * wf.energy,
                velocity: wf.velocity * 0.85,
                mode: currentMode,
                isEcho: true,
                parentId: wf.id,
                createdAt: time,
                hasSpawnedEchoes: new Set()
              });
            }
          });
        }

        // Light lens focus
        if (currentMode === 'light' && !wf.isEcho) {
          const focuses = phys.computeLensFocus(wf.sourceX, wf.sourceY, wf.radius, currentObjects);
          focuses.forEach(focus => {
            if (wf.hasSpawnedEchoes!.has(focus.objectId)) return;
            wf.hasSpawnedEchoes!.add(focus.objectId);
            newWavefronts.push({
              id: `wf-focus-${wfCounter++}`,
              sourceX: focus.x,
              sourceY: focus.y,
              radius: 3,
              energy: wf.energy * focus.focusFactor,
              velocity: wf.velocity * 0.8,
              mode: currentMode,
              isEcho: false,
              parentId: wf.id,
              createdAt: time,
              hasSpawnedEchoes: new Set()
            });
          });
        }

        // Light mirror reflections → spawn beam wavefronts
        if (currentMode === 'light' && !wf.isBeam) {
          const reflections = phys.computeMirrorReflections(wf.sourceX, wf.sourceY, wf.radius, currentObjects);
          reflections.forEach(refl => {
            if (wf.hasSpawnedEchoes!.has(refl.objectId)) return;
            wf.hasSpawnedEchoes!.add(refl.objectId);
            newWavefronts.push({
              id: `wf-refl-${wfCounter++}`,
              sourceX: refl.x,
              sourceY: refl.y,
              radius: 3,
              energy: refl.energy * wf.energy,
              velocity: wf.velocity,
              mode: currentMode,
              isEcho: false,
              isBeam: true, // directional beam, not expanding sphere
              parentId: wf.id,
              angle: refl.angle,
              createdAt: time,
              hasSpawnedEchoes: new Set()
            });
          });
        }
      });

      // Prune dead wavefronts
      updated = updated.filter(wf => wf.energy > MIN_ENERGY && wf.radius < MAX_RADIUS);

      return [...updated, ...newWavefronts];
    });

    // Compute per-agent SNR from active wavefronts
    const agents = currentNodes.filter(n => n.type === 'agent');
    const wfs = wavefrontsRef.current;
    const newSignals = new Map<string, AgentSignalState>();

    agents.forEach(agent => {
      let totalSnr = 0;
      let peakSnr = 0;
      let totalDelay = 0;
      let hitCount = 0;

      wfs.forEach(wf => {
        const distPx = phys.getPixelDistance(
          { x: agent.x, y: agent.y },
          { x: wf.sourceX, y: wf.sourceY }
        );

        // Has the wavefront reached this agent?
        if (wf.radius >= distPx - 8) {
          const distM = distPx / 60;
          const attenuation = phys.computeAttenuation(
            { x: wf.sourceX, y: wf.sourceY },
            agent,
            currentObjects
          );
          let snr = phys.calculateSignal(distM, attenuation) * wf.energy;

          // Gravity phase delay
          if (currentMode === 'gravity') {
            const dilation = phys.computeTimeDilation(agent.x, agent.y, currentObjects);
            totalDelay += (1 - dilation) * 500;
          }

          totalSnr += snr;
          peakSnr = Math.max(peakSnr, snr);
          hitCount++;
        }
      });

      const avgSnr = hitCount > 0 ? Math.min(1, totalSnr) : (newSignals.get(agent.id)?.snr ?? 0) * 0.97;

      newSignals.set(agent.id, {
        agentId: agent.id,
        snr: avgSnr,
        peakSnr: Math.max(peakSnr, newSignals.get(agent.id)?.peakSnr ?? 0),
        receivedAt: hitCount > 0 ? time : 0,
        phaseDelay: totalDelay
      });
    });

    setAgentSignals(newSignals);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Start/stop loop
  useEffect(() => {
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Reset on mode change
  useEffect(() => {
    setWavefronts([]);
    setAgentSignals(new Map());
  }, [mode]);

  const emitWavefront = useCallback((sourceX: number, sourceY: number) => {
    const prof = physicsRef.current.profile;
    const newWf: Wavefront = {
      id: `wf-${wfCounter++}`,
      sourceX,
      sourceY,
      radius: 5,
      energy: 1,
      velocity: prof.velocity,
      mode: modeRef.current,
      isEcho: false,
      createdAt: performance.now(),
      hasSpawnedEchoes: new Set()
    };
    setWavefronts(prev => [...prev, newWf]);
  }, []);

  const reset = useCallback(() => {
    setWavefronts([]);
    setAgentSignals(new Map());
  }, []);

  return { wavefronts, agentSignals, emitWavefront, reset };
};
