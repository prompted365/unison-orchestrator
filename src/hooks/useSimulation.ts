// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Wavefront lifecycle engine — the spatial propagation loop.
// Canonical mapping: Signal emission → wavefront expansion → agent reception → energy decay
//
// COORDINATE SPACE: All positions in 2D pixel coords (800×560 canvas).
//   CANVAS_W=800, CANVAS_H=560. MAX_RADIUS = diagonal ≈ 976px.
//   Wavefronts pruned when radius > MAX_RADIUS or energy < MIN_ENERGY (0.01).
//
// TIME MODEL: Uses wall-clock via requestAnimationFrame.
//   dt capped at 50ms to prevent physics explosion on tab-switch.
//   timeScaleRef allows story mode to control simulation speed.
//   Gap D9: No governance tic model — all timestamps are performance.now() ms.
//
// WAVEFRONT INTERACTIONS:
//   Acoustic + wall → echo wavefront (0.85× velocity, reduced energy)
//   Light + lens → focused wavefront (1.6× energy, 0.8× velocity)
//   Light + mirror → beam wavefront (isBeam=true, directional, 0.85 energy)
//   Gravity + mass → time dilation (reduced effective velocity near masses)
//
// AGENT RECEPTION: Wavefront "reaches" agent when wf.radius >= distance - 8px.
//   SNR computed via inverse-square + absorption + wall attenuation.
//   Multiple wavefronts stack (totalSnr). SNR decays at 0.97× per frame when no signal.
//
// Gap D3: No agent inbox integration — reception is passive SNR observation only.
//   In Talos, reception should create inbox work-items with state machine lifecycle.
// Gap D4: No Astragals — all delivery is broadcast. Point-to-point guaranteed
//   delivery would bypass the wavefront system entirely.
// ════════════════════════════════════════════════════════════════
import { useRef, useCallback, useEffect, useState } from "react";
import { CommunicationMode, Node, WorldObject, Wavefront, AgentSignalState } from "../types";
import { usePhysics } from "./usePhysics";

const CANVAS_W = 800;   // [CE] 2D canvas width in pixels
const CANVAS_H = 560;   // [CE] 2D canvas height in pixels
const MAX_RADIUS = Math.sqrt(CANVAS_W * CANVAS_W + CANVAS_H * CANVAS_H); // [CE] diagonal = prune boundary
const MIN_ENERGY = 0.01; // [CE] energy floor — wavefronts below this are garbage-collected

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
          const newEnergy = wf.energy * (1 - age / 1.5); // [CE] beams fade in ~1.5s — light disperses
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
      // [CE] Cap light-interaction wavefronts (beams + focused) to prevent pile-up
      const activeLightChildren = updated.filter(w => w.isBeam || (w.lightGeneration ?? 0) > 0).length;

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

        // Light lens focus — each pass through a lens disperses energy (no infinite cascade)
        const lightGen = wf.lightGeneration ?? 0;
        if (currentMode === 'light' && !wf.isEcho && lightGen < 3 && wf.energy > 0.05 && activeLightChildren < 10) {
          const focuses = phys.computeLensFocus(wf.sourceX, wf.sourceY, wf.radius, currentObjects);
          focuses.forEach(focus => {
            if (wf.hasSpawnedEchoes!.has(focus.objectId)) return;
            wf.hasSpawnedEchoes!.add(focus.objectId);
            // Each lens pass loses ~50% energy (dispersal, chromatic aberration)
            const dispersedEnergy = wf.energy * focus.focusFactor * 0.5;
            if (dispersedEnergy < MIN_ENERGY) return;
            newWavefronts.push({
              id: `wf-focus-${wfCounter++}`,
              sourceX: focus.x,
              sourceY: focus.y,
              radius: 3,
              energy: dispersedEnergy,
              velocity: wf.velocity * 0.8,
              mode: currentMode,
              isEcho: false,
              parentId: wf.id,
              lightGeneration: lightGen + 1,
              createdAt: time,
              hasSpawnedEchoes: new Set()
            });
          });
        }

        // Light mirror reflections → beam wavefronts (energy lost per reflection)
        if (currentMode === 'light' && !wf.isBeam && lightGen < 3 && wf.energy > 0.05) {
          const reflections = phys.computeMirrorReflections(wf.sourceX, wf.sourceY, wf.radius, currentObjects);
          reflections.forEach(refl => {
            if (wf.hasSpawnedEchoes!.has(refl.objectId)) return;
            wf.hasSpawnedEchoes!.add(refl.objectId);
            // Each reflection absorbs ~30% (surface imperfection, scattering)
            const reflectedEnergy = refl.energy * wf.energy * 0.7;
            if (reflectedEnergy < MIN_ENERGY) return;
            newWavefronts.push({
              id: `wf-refl-${wfCounter++}`,
              sourceX: refl.x,
              sourceY: refl.y,
              radius: 3,
              energy: reflectedEnergy,
              velocity: wf.velocity,
              mode: currentMode,
              isEcho: false,
              isBeam: true,
              parentId: wf.id,
              angle: refl.angle,
              lightGeneration: lightGen + 1,
              createdAt: time,
              hasSpawnedEchoes: new Set()
            });
          });
        }
      });

      // ═══ Estate relay: global wavefront reaches Estate Primary → spawn local re-emission ═══
      // The Primary "translates" the global signal into estate-local context.
      // Sub-nodes can't hear global wavefronts — they only respond to these relays.
      const estatePrimaries = currentNodes.filter(n => n.isEstatePrimary && n.estateId);
      // [CE] Cap estate-local wavefronts to prevent runaway pile-up
      const activeEstateWfs = updated.filter(w => w.isEstateLocal).length + newWavefronts.filter(w => w.isEstateLocal).length;
      updated.forEach(wf => {
        if (wf.isEstateLocal) return; // don't relay already-local signals
        if (activeEstateWfs >= 6) return; // [CE] Hard cap on estate-local wavefronts
        if (!wf.hasSpawnedEchoes) wf.hasSpawnedEchoes = new Set();

        estatePrimaries.forEach(primary => {
          const relayKey = `estate-relay-${primary.id}`;
          if (wf.hasSpawnedEchoes!.has(relayKey)) return;

          const distPx = phys.getPixelDistance(
            { x: primary.x, y: primary.y },
            { x: wf.sourceX, y: wf.sourceY }
          );

          // Wavefront has reached the estate primary
          if (wf.radius >= distPx - 8) {
            wf.hasSpawnedEchoes!.add(relayKey);
            // Spawn estate-local relay from the Primary's position
            newWavefronts.push({
              id: `wf-estate-${wfCounter++}`,
              sourceX: primary.x,
              sourceY: primary.y,
              radius: 5,
              energy: wf.energy * 0.9, // slight loss in translation
              velocity: wf.velocity * 0.7, // local signals propagate slower (deliberation)
              mode: currentMode,
              isEcho: false,
              isEstateLocal: true,
              estateId: primary.estateId,
              parentId: wf.id,
              createdAt: time,
              hasSpawnedEchoes: new Set()
            });
          }
        });
      });

      // ═══ Sub-node echo-back: estate sub-nodes echo 0.8s after receiving local relay ═══
      const estateSubNodes = currentNodes.filter(n => n.estateId && !n.isEstatePrimary);
      updated.forEach(wf => {
        if (!wf.isEstateLocal || !wf.estateId) return;
        if (wf.isEcho) return; // [CE] Prevent cascade: sub-echoes must NOT trigger more sub-echoes
        if (!wf.hasSpawnedEchoes) wf.hasSpawnedEchoes = new Set();

        estateSubNodes.forEach(sub => {
          if (sub.estateId !== wf.estateId) return;
          const echoKey = `sub-echo-${sub.id}`;
          if (wf.hasSpawnedEchoes!.has(echoKey)) return;

          const distPx = phys.getPixelDistance(
            { x: sub.x, y: sub.y },
            { x: wf.sourceX, y: wf.sourceY }
          );

          if (wf.radius >= distPx - 8) {
            wf.hasSpawnedEchoes!.add(echoKey);
            // Delayed echo: spawn with small radius after 0.8s equivalent offset
            const primary = currentNodes.find(n => n.estateId === sub.estateId && n.isEstatePrimary);
            if (primary) {
              newWavefronts.push({
                id: `wf-sub-echo-${wfCounter++}`,
                sourceX: sub.x,
                sourceY: sub.y,
                radius: 5,
                energy: wf.energy * 0.6,
                velocity: wf.velocity * 0.5,
                mode: currentMode,
                isEcho: true,
                isEstateLocal: true,
                estateId: wf.estateId,
                parentId: wf.id,
                createdAt: time,
                hasSpawnedEchoes: new Set()
              });
            }
          }
        });
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
        // Estate sub-nodes can't hear global wavefronts — only estate-local relays
        const isSubNode = agent.estateId && !agent.isEstatePrimary;
        if (isSubNode && !wf.isEstateLocal) return;
        // Estate-local wavefronts only reach nodes in the same estate
        if (wf.isEstateLocal && wf.estateId && agent.estateId !== wf.estateId) return;
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
