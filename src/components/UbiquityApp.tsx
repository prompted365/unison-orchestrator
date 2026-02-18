import { useState, useEffect, useCallback } from "react";
import { ModeSelector } from "./ModeSelector";
import { Canvas } from "./Canvas";
import { Controls } from "./Controls";
import { HUD } from "./HUD";
import { ModeExplanation } from "./ModeExplanation";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useSimulation } from "../hooks/useSimulation";
import { useSignalEngine } from "../hooks/useSignalEngine";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect } from "../types";

export const UbiquityApp = () => {
  const [mode, setMode] = useState<CommunicationMode>("acoustic");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [modalPins, setModalPins] = useState<ModalPin[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);

  const orchestrator = useOrchestrator(mode, objects);
  const simulation = useSimulation(mode, nodes, objects);
  const signalEngine = useSignalEngine(
    mode,
    orchestrator.state.field.demurrageRate,
    orchestrator.state.field.breachRisk
  );

  // Update agent node strength from simulation SNR
  useEffect(() => {
    if (simulation.agentSignals.size === 0) return;
    setNodes(prev => prev.map(n => {
      if (n.type !== 'agent') return n;
      const sig = simulation.agentSignals.get(n.id);
      if (!sig) return n;
      let strength: 'weak' | 'medium' | 'strong' = 'weak';
      if (sig.snr > 0.6) strength = 'strong';
      else if (sig.snr > 0.25) strength = 'medium';
      return { ...n, lastSNR: sig.snr, strength };
    }));
  }, [simulation.agentSignals]);

  // Initialize scene
  const initializeScene = useCallback(() => {
    setNodes([]);
    setObjects([]);
    setModalPins([]);
    setEffects([]);
    simulation.reset();

    const orchestratorNode: Node = {
      id: 'orchestrator',
      type: 'orchestrator',
      x: 400,
      y: 280,
      capabilities: ['broadcast'],
      load: 0,
      lastSNR: 1
    };

    const agents: Node[] = [];
    const clusters = [
      { cx: 310, cy: 210, n: 3 },
      { cx: 500, cy: 230, n: 3 },
      { cx: 360, cy: 370, n: 3 },
      { cx: 470, cy: 360, n: 2 },
      { cx: 270, cy: 300, n: 2 }
    ];

    const subsystems = ['ghost_chorus', 'economy_whisper', 'drift_tracker', 'ecotone_gate', 'epitaph_extractor'];
    const clusterGroups = ['ghost_chorus', 'economy_whisper', 'ecotone_gate', 'drift_tracker', 'epitaph_extractor'];
    let agentId = 0;

    clusters.forEach((cluster, clusterIdx) => {
      for (let i = 0; i < cluster.n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 36;
        const x = Math.max(16, Math.min(784, cluster.cx + Math.cos(angle) * distance));
        const y = Math.max(16, Math.min(544, cluster.cy + Math.sin(angle) * distance));

        const agentCapabilities = subsystems
          .sort(() => Math.random() - 0.5)
          .slice(0, 2 + Math.floor(Math.random() * 2));

        agents.push({
          id: `agent-${agentId++}`,
          type: 'agent',
          x,
          y,
          capabilities: agentCapabilities,
          load: Math.random() * 0.8 + 0.1,
          lastSNR: 0,
          actorGroup: clusterGroups[clusterIdx],
          actorIndex: i
        });
      }
    });

    setNodes([orchestratorNode, ...agents]);
    setObjects(getInitialObjects(mode));
  }, [mode]);

  const getInitialObjects = (currentMode: CommunicationMode): WorldObject[] => {
    switch (currentMode) {
      case 'acoustic':
        return [
          { id: 'gate-1', type: 'wall', x: 100, y: 80, width: 130, height: 14 },
          { id: 'gate-2', type: 'wall', x: 640, y: 210, width: 16, height: 110 },
          { id: 'gate-3', type: 'wall', x: 220, y: 450, width: 90, height: 14 }
        ];
      case 'light':
        return [
          { id: 'lens-1', type: 'lens', x: 120, y: 110, width: 44, height: 44 },
          { id: 'mirror-1', type: 'mirror', x: 610, y: 160, width: 70, height: 22 },
          { id: 'lens-2', type: 'lens', x: 180, y: 430, width: 36, height: 36 }
        ];
      case 'gravity':
        return [
          { id: 'invariant-1', type: 'mass', x: 140, y: 130, width: 56, height: 56 },
          { id: 'invariant-2', type: 'mass', x: 590, y: 190, width: 68, height: 68 },
          { id: 'invariant-3', type: 'mass', x: 210, y: 410, width: 48, height: 48 }
        ];
      default:
        return [];
    }
  };

  useEffect(() => {
    initializeScene();
  }, [initializeScene]);

  const handleBroadcast = useCallback(() => {
    const orch = nodes.find(n => n.type === 'orchestrator');
    if (!orch) return;

    // Emit wavefront into simulation
    simulation.emitWavefront(orch.x, orch.y);

    // Emit signal into CGG engine
    signalEngine.emitSignal();

    // Tick orchestrator state
    orchestrator.tick();

    // Visual effect for broadcast origin
    const effectType = mode === 'acoustic' ? 'acoustic-wave' : mode === 'light' ? 'ring' : 'gravity-wave';
    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      type: effectType as Effect['type'],
      x: orch.x,
      y: orch.y,
      duration: mode === 'acoustic' ? 2500 : mode === 'gravity' ? 3000 : 2000,
      createdAt: Date.now()
    };
    setEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, newEffect.duration || 2000);

    // Light rays
    if (mode === 'light') {
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const rayEffect: Effect = {
          id: `ray-${Date.now()}-${i}`,
          type: 'ray',
          x: orch.x,
          y: orch.y,
          size: angle,
          duration: 1200,
          createdAt: Date.now()
        };
        setEffects(prev => [...prev, rayEffect]);
        setTimeout(() => {
          setEffects(prev => prev.filter(e => e.id !== rayEffect.id));
        }, 1200);
      }
    }

    // Triad resonance effect if triads detected
    if (signalEngine.triads.length > 0) {
      const triadEffect: Effect = {
        id: `triad-${Date.now()}`,
        type: 'triad-resonance',
        x: orch.x,
        y: orch.y,
        size: 80,
        duration: 3000,
        createdAt: Date.now()
      };
      setEffects(prev => [...prev, triadEffect]);
      setTimeout(() => {
        setEffects(prev => prev.filter(e => e.id !== triadEffect.id));
      }, 3000);
    }
  }, [mode, nodes, simulation, signalEngine, orchestrator]);

  const handleAddObject = useCallback(() => {
    const x = Math.random() * 600 + 100;
    const y = Math.random() * 400 + 80;

    let newObject: WorldObject;
    switch (mode) {
      case 'acoustic':
        newObject = { id: `gate-${Date.now()}`, type: 'wall', x, y, width: 60, height: 12 };
        break;
      case 'light':
        newObject = { id: `lens-${Date.now()}`, type: 'lens', x, y, width: 34, height: 34 };
        break;
      case 'gravity':
        newObject = { id: `invariant-${Date.now()}`, type: 'mass', x, y, width: 46, height: 46 };
        break;
    }
    setObjects(prev => [...prev, newObject]);
  }, [mode]);

  const handleDropPin = useCallback(() => {
    const x = Math.random() * 600 + 100;
    const y = Math.random() * 400 + 80;
    const pinData = getModalPinData(mode);
    const newPin: ModalPin = {
      id: `pin-${Date.now()}`,
      mode,
      x,
      y,
      ...pinData,
      ttl: mode === 'acoustic' ? 6000 : 5000,
      createdAt: Date.now()
    };
    setModalPins(prev => [...prev, newPin]);
    setTimeout(() => {
      setModalPins(prev => prev.filter(pin => pin.id !== newPin.id));
    }, newPin.ttl);
  }, [mode]);

  const getModalPinData = (currentMode: CommunicationMode) => {
    switch (currentMode) {
      case 'acoustic':
        return {
          title: 'Siren: Avoid 440Hz near corners',
          body: 'Echo density suggests specular traps. Lower gain, raise threshold. Muffling increases per hop.',
          tags: '#siren #acoustic #escalation',
          effect: { type: 'penalty', delta: 0.08 }
        };
      case 'light':
        return {
          title: 'CogPR: Reflection note',
          body: 'Mirror flingback at α≈42°. Prefer diffuse lane; deweight specular. Cross-scope attenuation observed.',
          tags: '#cogpr #optics #proposal',
          effect: { focus: -0.12 }
        };
      case 'gravity':
        return {
          title: 'Warrant: Drift advisory',
          body: 'Shear pocket detected. Stagger starts; shrink batch size. Invariant field warping phase.',
          tags: '#warrant #gravity #phase',
          effect: { skew: 1.2 }
        };
    }
  };

  const handleClear = useCallback(() => {
    initializeScene();
  }, [initializeScene]);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Signal Manifold Monitor
          </h1>
          <p className="text-sm text-secondary-foreground max-w-4xl mx-auto">
            Hybrid physics simulator × CGG semantic layer. Acoustic = Sirens (local, muffled).
            Light = CogPR (broad, attenuated). Gravity = Warrants (global, phase-warping).
            Epitaphs are modal: warnings, reflection notes, or drift advisories.
          </p>
        </div>

        <ModeSelector mode={mode} onModeChange={setMode} />

        <Canvas
          mode={mode}
          nodes={nodes}
          objects={objects}
          modalPins={modalPins}
          effects={effects}
          wavefronts={simulation.wavefronts}
          agentSignals={simulation.agentSignals}
          onCanvasClick={handleBroadcast}
        />

        <Controls
          onBroadcast={handleBroadcast}
          onAddObject={handleAddObject}
          onDropPin={handleDropPin}
          onClear={handleClear}
        />

        <ModeExplanation mode={mode} />
      </div>

      <HUD
        mode={mode}
        orchestrator={orchestrator}
        wavefronts={simulation.wavefronts}
        agentSignals={simulation.agentSignals}
        signals={signalEngine.signals}
        warrants={signalEngine.warrants}
        triadCount={signalEngine.triadCount}
      />
    </div>
  );
};
