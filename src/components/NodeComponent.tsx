import { Node } from "../types";

interface NodeComponentProps {
  node: Node;
}

export const NodeComponent = ({ node }: NodeComponentProps) => {
  const getNodeClass = () => {
    const baseClass = 'node';
    if (node.type === 'orchestrator') {
      return `${baseClass} node-orchestrator`;
    } else {
      const strength = (node as any).strength || 'weak';
      return `${baseClass} node-agent ${strength}`;
    }
  };

  return (
    <div
      className={getNodeClass()}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`
      }}
      title={`${node.type === 'orchestrator' ? 'Conductor' : 'Actor'}: ${node.capabilities.join(', ')}`}
    />
  );
};