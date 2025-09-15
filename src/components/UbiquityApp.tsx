import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";
import { ModeSelector } from "./ModeSelector";
import { Canvas } from "./Canvas";
import { Controls } from "./Controls";
import { HUD } from "./HUD";
import { ModeExplanation } from "./ModeExplanation";
import { useOrchestrator } from "../hooks/useOrchestrator";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect } from "../types";

export const UbiquityApp = () => {
  const [mode, setMode] = useState<CommunicationMode>("acoustic");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [objects, setObjects] = useState<WorldObject[]>([]);
  const [modalPins, setModalPins] = useState<ModalPin[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);

  const orchestrator = useOrchestrator(mode, objects);

  // Initialize scene
  const initializeScene = useCallback(() => {
    setNodes([]);
    setObjects([]);
    setModalPins([]);
    setEffects([]);
    
    // Create orchestrator node
    const orchestratorNode: Node = {
      id: 'orchestrator',
      type: 'orchestrator',
      x: 400,
      y: 280,
      capabilities: ['broadcast'],
      load: 0,
      lastSNR: 1
    };

    // Create agent nodes in clusters
    const agents: Node[] = [];
    const clusters = [
      { cx: 310, cy: 210, n: 3 },
      { cx: 500, cy: 230, n: 3 },
      { cx: 360, cy: 370, n: 3 },
      { cx: 470, cy: 360, n: 2 },
      { cx: 270, cy: 300, n: 2 }
    ];

    const capabilities = ['compute', 'storage', 'network', 'security', 'analytics'];
    let agentId = 0;

    clusters.forEach(cluster => {
      for (let i = 0; i < cluster.n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 36;
        const x = Math.max(16, Math.min(784, cluster.cx + Math.cos(angle) * distance));
        const y = Math.max(16, Math.min(544, cluster.cy + Math.sin(angle) * distance));
        
        const agentCapabilities = capabilities
          .sort(() => Math.random() - 0.5)
          .slice(0, 2 + Math.floor(Math.random() * 2));

        agents.push({
          id: `agent-${agentId++}`,
          type: 'agent',
          x,
          y,
          capabilities: agentCapabilities,
          load: Math.random() * 0.8 + 0.1,
          lastSNR: 0
        });
      }
    });

    setNodes([orchestratorNode, ...agents]);

    // Add initial objects based on mode
    const initialObjects = getInitialObjects(mode);
    setObjects(initialObjects);
  }, [mode]);

  const getInitialObjects = (currentMode: CommunicationMode): WorldObject[] => {
    switch (currentMode) {
      case 'acoustic':
        return [
          { id: 'wall-1', type: 'wall', x: 100, y: 80, width: 130, height: 14 },
          { id: 'wall-2', type: 'wall', x: 640, y: 210, width: 16, height: 110 },
          { id: 'wall-3', type: 'wall', x: 220, y: 450, width: 90, height: 14 }
        ];
      case 'light':
        return [
          { id: 'lens-1', type: 'lens', x: 120, y: 110, width: 44, height: 44 },
          { id: 'mirror-1', type: 'mirror', x: 610, y: 160, width: 70, height: 22 },
          { id: 'lens-2', type: 'lens', x: 180, y: 430, width: 36, height: 36 }
        ];
      case 'gravity':
        return [
          { id: 'mass-1', type: 'mass', x: 140, y: 130, width: 56, height: 56 },
          { id: 'mass-2', type: 'mass', x: 590, y: 190, width: 68, height: 68 },
          { id: 'mass-3', type: 'mass', x: 210, y: 410, width: 48, height: 48 }
        ];
      default:
        return [];
    }
  };

  // Initialize on mount and mode change
  useEffect(() => {
    initializeScene();
  }, [initializeScene]);

  const handleBroadcast = useCallback(() => {
    orchestrator.tick();
    // Implementation will be added in Canvas component
  }, [orchestrator]);

  const handleAddObject = useCallback(() => {
    const x = Math.random() * 600 + 100;
    const y = Math.random() * 400 + 80;
    
    let newObject: WorldObject;
    switch (mode) {
      case 'acoustic':
        newObject = {
          id: `wall-${Date.now()}`,
          type: 'wall',
          x,
          y,
          width: 60,
          height: 12
        };
        break;
      case 'light':
        newObject = {
          id: `lens-${Date.now()}`,
          type: 'lens',
          x,
          y,
          width: 34,
          height: 34
        };
        break;
      case 'gravity':
        newObject = {
          id: `mass-${Date.now()}`,
          type: 'mass',
          x,
          y,
          width: 46,
          height: 46
        };
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
    
    // Remove pin after TTL
    setTimeout(() => {
      setModalPins(prev => prev.filter(pin => pin.id !== newPin.id));
    }, newPin.ttl);
  }, [mode]);

  const getModalPinData = (currentMode: CommunicationMode) => {
    switch (currentMode) {
      case 'acoustic':
        return {
          title: 'Avoid 440Hz near corners',
          body: 'Echo density suggests specular traps. Lower gain, raise threshold.',
          tags: '#acoustic #wisdom',
          effect: { type: 'penalty', delta: 0.08 }
        };
      case 'light':
        return {
          title: 'Reflection note',
          body: 'Mirror flingback at α≈42°. Prefer diffuse lane; deweight specular.',
          tags: '#optics #routing',
          effect: { focus: -0.12 }
        };
      case 'gravity':
        return {
          title: 'Drift advisory',
          body: 'Shear pocket detected. Stagger starts; shrink batch size.',
          tags: '#gravity #timing',
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
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Ubiquity Communication Modes
          </h1>
          <p className="text-sm text-secondary-foreground max-w-4xl mx-auto">
            Production‑grade, Harmony‑compliant demo. Acoustic echoes WARN, Light reflections DRAW, 
            Gravity ripples SHEAR. Epitaphs are modal: warnings, reflection notes, or drift advisories.
          </p>
        </div>

        {/* Mode Selector */}
        <ModeSelector mode={mode} onModeChange={setMode} />

        {/* Canvas */}
        <Canvas
          mode={mode}
          nodes={nodes}
          objects={objects}
          modalPins={modalPins}
          effects={effects}
          onBroadcast={handleBroadcast}
          setNodes={setNodes}
          setEffects={setEffects}
          orchestrator={orchestrator}
        />

        {/* Controls */}
        <Controls
          onBroadcast={handleBroadcast}
          onAddObject={handleAddObject}
          onDropPin={handleDropPin}
          onClear={handleClear}
        />

        {/* Mode Explanation */}
        <ModeExplanation mode={mode} />
      </div>

      {/* HUD */}
      <HUD mode={mode} orchestrator={orchestrator} />
    </div>
  );
};