import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ModeSelector } from "./ModeSelector";
import { Canvas3D } from "./Canvas3D";
import { Controls } from "./Controls";
import { ManifoldDashboard } from "./ManifoldDashboard";
import { GradientPanel } from "./GradientPanel";
import { ModeExplanation } from "./ModeExplanation";
import { StoryOverlay } from "./StoryOverlay";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { useSimulation } from "../hooks/useSimulation";
import { useSignalEngine } from "../hooks/useSignalEngine";
import { useGradientConfig } from "../hooks/useGradientConfig";
import { useTimeScale } from "../hooks/useTimeScale";
import { useStoryMode } from "../hooks/useStoryMode";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect } from "../types";

export const UbiquityApp = () => {
  const [mode, setMode] = useState<CommunicationMode>("acoustic");
  const [cockpitNodeId, setCockpitNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [modalPins, setModalPins] = useState<ModalPin[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [emittingAgentIds, setEmittingAgentIds] = useState<string[]>([]);

  const [isManifoldOpen, setIsManifoldOpen] = useState(false);
  const [isGradientOpen, setIsGradientOpen] = useState(false);

  const { timeScale, setTimeScale, presets, annotation, normalizationNote } = useTimeScale(mode);
  const timeScaleRef = useRef(timeScale);
  timeScaleRef.current = timeScale;

  const orchestrator = useOrchestrator(mode, objects);
  const simulation = useSimulation(mode, nodes, objects, timeScaleRef);
  const signalEngine = useSignalEngine(
    mode,
    orchestrator.state.field.demurrageRate,
    orchestrator.state.field.breachRisk
  );
  const gradientConfig = useGradientConfig();

  const handleEmitSignalKind = useCallback((kind: 'BEACON' | 'LESSON' | 'TENSION') => {
    const orch = nodes.find(n => n.type === 'orchestrator');
    if (!orch) return;
    simulation.emitWavefront(orch.x, orch.y);
    signalEngine.emitSignal(kind);
  }, [nodes, simulation, signalEngine]);

  const broadcastRef = useRef(() => {});
  const dropPinRef = useRef(() => {});

  const storyMode = useStoryMode({
    onBroadcast: () => broadcastRef.current(),
    onDropPin: () => dropPinRef.current(),
    onSetMode: setMode,
    onEmitSignalKind: handleEmitSignalKind,
  });

  const economicBridge = useMemo(
    () => orchestrator.getEconomicBridge(signalEngine.warrants),
    [orchestrator, signalEngine.warrants]
  );

  // Continuous agent emissions
  const autoEmitRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (autoEmitRef.current) clearInterval(autoEmitRef.current);
    autoEmitRef.current = setInterval(() => {
      setNodes(prev => {
        const agents = prev.filter(n => n.type === 'agent');
        if (agents.length === 0) return prev;
        const count = 1 + Math.floor(Math.random() * 2);
        const emittedIds: string[] = [];
        for (let i = 0; i < count; i++) {
          const agent = agents[Math.floor(Math.random() * agents.length)];
          simulation.emitWavefront(agent.x, agent.y);
          const kind = mode === 'acoustic' && Math.random() < 0.6 ? 'TENSION' as const : undefined;
          signalEngine.emitSignal(kind);
          emittedIds.push(agent.id);
        }
        setEmittingAgentIds(emittedIds);
        setTimeout(() => setEmittingAgentIds([]), 800);
        return prev;
      });
    }, 2000 + Math.random() * 2000);

    return () => {
      if (autoEmitRef.current) clearInterval(autoEmitRef.current);
    };
  }, [simulation, signalEngine]);

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
          { id: 'mirror-1', type: 'mirror', x: 610, y: 160, width: 70, height: 22, surfaceAngle: Math.PI * 0.15 },
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

    simulation.emitWavefront(orch.x, orch.y);
    signalEngine.emitSignal();
    orchestrator.tick();

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

  // Wire story callbacks to real handlers
  broadcastRef.current = handleBroadcast;
  dropPinRef.current = handleDropPin;

  const activeWarrantCount = signalEngine.warrants.filter(w => w.status === 'active').length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-primary/10 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xs sm:text-sm font-bold font-mono text-primary tracking-wider whitespace-nowrap">
            Constitution of Attention
          </h1>
          <span className="hidden sm:inline text-[10px] text-muted-foreground/60 font-mono">
            opTorq Estate — Ubiquity OS
          </span>
        </div>

        <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center">
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>

        <div className="flex items-center gap-1.5 order-2 sm:order-3">
          <button
            onClick={storyMode.isPlaying ? storyMode.stopStory : storyMode.startStory}
            className={`drawer-toggle-btn ${storyMode.isPlaying ? 'active' : ''}`}
            title="Story Mode"
          >
            <span className="text-sm">🎬</span>
            <span className="hidden md:inline text-[10px]">Story</span>
          </button>
          <button
            onClick={() => setIsGradientOpen(prev => !prev)}
            className={`drawer-toggle-btn ${isGradientOpen ? 'active' : ''}`}
            title="Gradient Config"
          >
            <span className="text-sm">🎛️</span>
            <span className="hidden md:inline text-[10px]">Gradient</span>
          </button>
          <button
            onClick={() => setIsManifoldOpen(prev => !prev)}
            className={`drawer-toggle-btn ${isManifoldOpen ? 'active' : ''}`}
            title="Manifold Status"
          >
            <span className="text-sm">📡</span>
            <span className="hidden md:inline text-[10px]">Manifold</span>
            {activeWarrantCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-[8px] text-destructive-foreground flex items-center justify-center font-bold">
                {activeWarrantCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 3D Canvas — dominant viewport */}
      <div className="flex-1 relative min-h-0">
        <Canvas3D
          mode={mode}
          nodes={nodes}
          objects={objects}
          modalPins={modalPins}
          effects={effects}
          wavefronts={simulation.wavefronts}
          agentSignals={simulation.agentSignals}
          onCanvasClick={handleBroadcast}
          cockpitNodeId={cockpitNodeId}
          onEnterCockpit={setCockpitNodeId}
          onExitCockpit={() => setCockpitNodeId(null)}
          emittingAgentIds={emittingAgentIds}
          storyCamera={storyMode.storyCamera}
          storyHighlightId={storyMode.highlightId}
        />
        {storyMode.isPlaying && (
          <StoryOverlay
            currentAct={storyMode.currentAct}
            totalActs={storyMode.totalActs}
            actProgress={storyMode.actProgress}
            narration={storyMode.narration}
            onSkip={storyMode.skipAct}
            onExit={storyMode.stopStory}
          />
        )}
      </div>

      {/* Controls + Explanation */}
      <div className="shrink-0 px-4 py-3 space-y-2 border-t border-primary/10">
        <Controls
          onBroadcast={handleBroadcast}
          onAddObject={handleAddObject}
          onDropPin={handleDropPin}
          onClear={handleClear}
          warrants={signalEngine.warrants}
          onAcknowledgeWarrant={signalEngine.acknowledgeWarrant}
          onDismissWarrant={signalEngine.dismissWarrant}
          mode={mode}
          timeScale={timeScale}
          onSetTimeScale={setTimeScale}
          timeAnnotation={annotation}
          normalizationNote={normalizationNote}
          presets={presets}
        />
        <ModeExplanation mode={mode} />
      </div>

      {/* Manifold Drawer — right */}
      {isManifoldOpen && (
        <div className="drawer-backdrop" onClick={() => setIsManifoldOpen(false)} />
      )}
      <div className={`drawer-right ${isManifoldOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-primary font-mono">Manifold Status</h3>
          <button
            onClick={() => setIsManifoldOpen(false)}
            className="text-muted-foreground hover:text-primary transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-1">
          <ManifoldDashboard
            mode={mode}
            orchestrator={orchestrator}
            wavefronts={simulation.wavefronts}
            agentSignals={simulation.agentSignals}
            signals={signalEngine.signals}
            warrants={signalEngine.warrants}
            triadCount={signalEngine.triadCount}
            triads={signalEngine.triads}
            census={signalEngine.census}
            warrantLifecycle={signalEngine.warrantLifecycle}
            phaseTier={orchestrator.phaseTier}
            breachFlags={orchestrator.breachFlags}
            economicBridge={economicBridge}
            onAcknowledgeWarrant={signalEngine.acknowledgeWarrant}
            onDismissWarrant={signalEngine.dismissWarrant}
          />
        </div>
      </div>

      {/* Gradient Drawer — left */}
      {isGradientOpen && (
        <div className="drawer-backdrop" onClick={() => setIsGradientOpen(false)} />
      )}
      <div className={`drawer-left ${isGradientOpen ? 'open' : ''}`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-primary font-mono">🎛️ Gradient Config</h3>
          <button
            onClick={() => setIsGradientOpen(false)}
            className="text-muted-foreground hover:text-primary transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-1">
          <GradientPanel
            levers={gradientConfig.levers}
            labels={gradientConfig.labels}
            onSetLever={gradientConfig.setLever}
            onApplyPreset={gradientConfig.applyPreset}
          />
        </div>
      </div>
    </div>
  );
};
