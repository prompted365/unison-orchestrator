import { useRef, useCallback, useMemo } from "react";
import { CommunicationMode, Node, WorldObject, ModalPin, Effect, Wavefront, AgentSignalState } from "../types";
import { NodeComponent } from "./NodeComponent";
import { ObjectComponent } from "./ObjectComponent";
import { ModalPinComponent } from "./ModalPinComponent";
import { EffectComponent } from "./EffectComponent";

interface CanvasProps {
  mode: CommunicationMode;
  nodes: Node[];
  objects: WorldObject[];
  modalPins: ModalPin[];
  effects: Effect[];
  wavefronts: Wavefront[];
  agentSignals: Map<string, AgentSignalState>;
  onCanvasClick: () => void;
}

const MODE_COLORS: Record<CommunicationMode, string> = {
  acoustic: 'hsl(25, 100%, 60%)',
  light: 'hsl(180, 100%, 67%)',
  gravity: 'hsl(270, 100%, 70%)'
};

export const Canvas = ({
  mode,
  nodes,
  objects,
  modalPins,
  effects,
  wavefronts,
  agentSignals,
  onCanvasClick
}: CanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const orchestratorNode = useMemo(() => nodes.find(n => n.type === 'orchestrator'), [nodes]);
  const agents = useMemo(() => nodes.filter(n => n.type === 'agent'), [nodes]);
  const masses = useMemo(() => objects.filter(o => o.type === 'mass'), [objects]);

  // Compute geodesic curve control point for gravity mode
  const getGeodesicControlPoint = useCallback((ax: number, ay: number, bx: number, by: number) => {
    if (mode !== 'gravity' || masses.length === 0) return null;
    
    let totalPullX = 0, totalPullY = 0, totalWeight = 0;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    
    masses.forEach(mass => {
      const cx = mass.x + mass.width / 2;
      const cy = mass.y + mass.height / 2;
      const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      const weight = (mass.width + mass.height) / (dist + 50);
      totalPullX += (cx - mx) * weight;
      totalPullY += (cy - my) * weight;
      totalWeight += weight;
    });

    if (totalWeight < 0.01) return null;
    return {
      x: mx + totalPullX * 2,
      y: my + totalPullY * 2
    };
  }, [mode, masses]);

  return (
    <div
      ref={canvasRef}
      className="canvas-container h-[560px] relative"
      aria-live="polite"
      aria-label="Interactive orchestration canvas"
      onClick={onCanvasClick}
    >
      {/* SVG layer for connection lines and wavefronts */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
        {/* Connection lines from conductor to agents */}
        {orchestratorNode && agents.map(agent => {
          const signal = agentSignals.get(agent.id);
          const snr = signal?.snr ?? 0;
          const opacity = Math.max(0.05, snr * 0.6);
          const cp = getGeodesicControlPoint(orchestratorNode.x, orchestratorNode.y, agent.x, agent.y);
          const color = MODE_COLORS[mode];

          if (cp) {
            return (
              <path
                key={`conn-${agent.id}`}
                d={`M ${orchestratorNode.x} ${orchestratorNode.y} Q ${cp.x} ${cp.y} ${agent.x} ${agent.y}`}
                stroke={color}
                strokeWidth={1 + snr * 1.5}
                fill="none"
                opacity={opacity}
                strokeDasharray={snr < 0.2 ? "4 4" : "none"}
              />
            );
          }
          return (
            <line
              key={`conn-${agent.id}`}
              x1={orchestratorNode.x}
              y1={orchestratorNode.y}
              x2={agent.x}
              y2={agent.y}
              stroke={color}
              strokeWidth={1 + snr * 1.5}
              opacity={opacity}
              strokeDasharray={snr < 0.2 ? "4 4" : "none"}
            />
          );
        })}

        {/* Wavefront circles */}
        {wavefronts.map(wf => {
          const color = MODE_COLORS[wf.mode];
          return (
            <circle
              key={wf.id}
              cx={wf.sourceX}
              cy={wf.sourceY}
              r={wf.radius}
              fill="none"
              stroke={color}
              strokeWidth={wf.isEcho ? 1.5 : 2.5}
              opacity={Math.min(0.8, wf.energy * 0.9)}
              strokeDasharray={wf.isEcho ? "6 4" : "none"}
            />
          );
        })}
      </svg>

      {/* Agent SNR halos */}
      {agents.map(agent => {
        const signal = agentSignals.get(agent.id);
        const snr = signal?.snr ?? 0;
        if (snr < 0.05) return null;
        const haloSize = 12 + snr * 30;
        const color = MODE_COLORS[mode];
        return (
          <div
            key={`halo-${agent.id}`}
            className="absolute rounded-full pointer-events-none z-[8]"
            style={{
              left: `${agent.x - haloSize / 2}px`,
              top: `${agent.y - haloSize / 2}px`,
              width: `${haloSize}px`,
              height: `${haloSize}px`,
              background: `radial-gradient(circle, ${color.replace(')', ` / ${snr * 0.5})`)} 0%, transparent 70%)`,
              boxShadow: `0 0 ${snr * 20}px ${color.replace(')', ` / ${snr * 0.4})`)}`,
            }}
          />
        );
      })}

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
