import { useRef, useEffect, useCallback, Dispatch, SetStateAction } from "react";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect } from "../types";
import { NodeComponent } from "./NodeComponent";
import { ObjectComponent } from "./ObjectComponent";
import { ModalPinComponent } from "./ModalPinComponent";
import { EffectComponent } from "./EffectComponent";
import { usePhysics } from "../hooks/usePhysics";

interface CanvasProps {
  mode: CommunicationMode;
  nodes: Node[];
  objects: WorldObject[];
  modalPins: ModalPin[];
  effects: Effect[];
  onBroadcast: () => void;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEffects: Dispatch<SetStateAction<Effect[]>>;
  orchestrator: any;
  triggerBroadcast: number;
}

export const Canvas = ({
  mode,
  nodes,
  objects,
  modalPins,
  effects,
  onBroadcast,
  setNodes,
  setEffects,
  orchestrator,
  triggerBroadcast
}: CanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const physics = usePhysics(mode);

  const addEffect = useCallback((effect: Omit<Effect, 'id' | 'createdAt'>) => {
    const newEffect: Effect = {
      ...effect,
      id: `effect-${Date.now()}-${Math.random()}`,
      createdAt: Date.now()
    };
    
    setEffects(prev => [...prev, newEffect]);
    
    // Remove effect after duration
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, effect.duration || 2000);
  }, [setEffects]);

  const handleBroadcast = useCallback(() => {
    orchestrator.tick();
    
    const orchestratorNode = nodes.find(n => n.type === 'orchestrator');
    if (!orchestratorNode) return;

    // Create distinct initial broadcast wave for each mode
    if (mode === 'acoustic') {
      addEffect({
        type: 'acoustic-wave',
        x: orchestratorNode.x,
        y: orchestratorNode.y,
        duration: 2500
      });
    } else if (mode === 'light') {
      addEffect({
        type: 'ring',
        x: orchestratorNode.x,
        y: orchestratorNode.y,
        duration: 2000
      });
    } else if (mode === 'gravity') {
      addEffect({
        type: 'gravity-wave',
        x: orchestratorNode.x,
        y: orchestratorNode.y,
        duration: 3000
      });
    }

    // Process agents with physics
    const agents = nodes.filter(n => n.type === 'agent');
    const task = orchestrator.getNextTask();

    agents.forEach((agent, index) => {
      const distance = physics.getDistance(orchestratorNode, agent);
      const blocked = physics.isOccluded(orchestratorNode, agent, objects);
      const snr = physics.calculateSignal(distance, blocked);
      const delay = physics.getDelay(distance);

      setTimeout(() => {
        // Update agent visual state
        const updatedNodes = nodes.map(n => {
          if (n.id === agent.id) {
            let strength: 'weak' | 'medium' | 'strong' = 'weak';
            if (snr > 0.7) strength = 'strong';
            else if (snr > 0.35) strength = 'medium';
            
            return { ...n, lastSNR: snr, strength };
          }
          return n;
        });
        setNodes(updatedNodes);

        // Show task processing
        const score = orchestrator.score(agent, task, snr);
        const success = score > 0.4;
        
        // Add task badge effect
        addEffect({
          type: 'ring',
          x: agent.x + 14,
          y: agent.y - 10,
          size: 1,
          duration: 2200
        });

        // Mode-specific effects
        if (mode === 'gravity') {
          const skew = physics.getPhaseSkew(agent, objects);
          addEffect({
            type: 'ring',
            x: agent.x + 10,
            y: agent.y - 18,
            size: 1,
            duration: 1600
          });
        }
      }, delay * 250);
    });

    // Mode-specific effects
    if (mode === 'acoustic') {
      setTimeout(() => {
        objects.filter(obj => obj.type === 'wall').forEach((wall, i) => {
          setTimeout(() => {
            addEffect({
              type: 'echo',
              x: wall.x + wall.width / 2,
              y: wall.y + wall.height / 2
            });
          }, i * 120);
        });
      }, 600);
    } else if (mode === 'light') {
      // Light rays
      const beamCount = 18;
      for (let i = 0; i < beamCount; i++) {
        const angle = (i / beamCount) * Math.PI * 2;
        addEffect({
          type: 'ray',
          x: orchestratorNode.x,
          y: orchestratorNode.y,
          size: angle,
          duration: 1200
        });
      }

      setTimeout(() => {
        objects.filter(obj => obj.type === 'lens' || obj.type === 'mirror').forEach((obj, i) => {
          setTimeout(() => {
            addEffect({
              type: 'smear',
              x: obj.x + obj.width / 2,
              y: obj.y + obj.height / 2,
              size: 76
            });
          }, i * 110);
        });
      }, 300);
    } else if (mode === 'gravity') {
      addEffect({
        type: 'metric',
        x: orchestratorNode.x,
        y: orchestratorNode.y,
        size: 120
      });

      objects.filter(obj => obj.type === 'mass').forEach((mass, i) => {
        setTimeout(() => {
          addEffect({
            type: 'metric',
            x: mass.x + mass.width / 2,
            y: mass.y + mass.height / 2,
            size: 74
          });
        }, i * 140);
      });
    }
  }, [mode, nodes, objects, orchestrator, physics, setNodes]);

  // Handle broadcast trigger from Controls button
  useEffect(() => {
    if (triggerBroadcast > 0) {
      console.log('Canvas broadcast triggered from Controls');
      handleBroadcast();
    }
  }, [triggerBroadcast, handleBroadcast]);

  // Handle canvas click broadcast
  const handleCanvasClick = useCallback(() => {
    console.log('Canvas broadcast triggered from click');
    handleBroadcast();
  }, [handleBroadcast]);

  return (
    <div 
      ref={canvasRef}
      className="canvas-container h-[560px] relative"
      aria-live="polite"
      aria-label="Interactive orchestration canvas"
      onClick={handleCanvasClick}
    >
      {/* Render objects */}
      {objects.map(obj => (
        <ObjectComponent key={obj.id} object={obj} />
      ))}

      {/* Render nodes */}
      {nodes.map(node => (
        <NodeComponent key={node.id} node={node} />
      ))}

      {/* Render modal pins */}
      {modalPins.map(pin => (
        <ModalPinComponent key={pin.id} pin={pin} />
      ))}

      {/* Render effects */}
      {effects.map(effect => (
        <EffectComponent key={effect.id} effect={effect} />
      ))}
    </div>
  );
};