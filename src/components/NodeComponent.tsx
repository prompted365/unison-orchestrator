import { Node } from "../types";

interface NodeComponentProps {
  node: Node;
}

const ACTOR_GROUP_LABELS: Record<string, string> = {
  ghost_chorus: 'Ghost Chorus',
  economy_whisper: 'Economy Whisper',
  ecotone_gate: 'Ecotone Gate',
  drift_tracker: 'Drift Tracker',
  epitaph_extractor: 'Epitaph Extractor'
};

export const NodeComponent = ({ node }: NodeComponentProps) => {
  const getNodeClass = () => {
    const baseClass = 'node';
    if (node.type === 'orchestrator') {
      return `${baseClass} node-orchestrator`;
    } else {
      const strength = node.strength || 'weak';
      return `${baseClass} node-agent ${strength}`;
    }
  };

  const getTooltip = () => {
    if (node.type === 'orchestrator') {
      return 'Conductor (Mogul)';
    }
    const groupLabel = node.actorGroup ? ACTOR_GROUP_LABELS[node.actorGroup] || node.actorGroup : 'Agent';
    const idx = node.actorIndex != null ? ` #${node.actorIndex + 1}` : '';
    const caps = node.capabilities.map(c => ACTOR_GROUP_LABELS[c] || c).join(', ');
    return `${groupLabel}${idx} [${caps}]`;
  };

  return (
    <div
      className={getNodeClass()}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`
      }}
      title={getTooltip()}
    />
  );
};
