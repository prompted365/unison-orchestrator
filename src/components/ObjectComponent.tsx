import { WorldObject } from "../types";

interface ObjectComponentProps {
  object: WorldObject;
}

export const ObjectComponent = ({ object }: ObjectComponentProps) => {
  const getObjectClass = () => {
    switch (object.type) {
      case 'wall':
        return 'object-wall';
      case 'lens':
        return 'object-lens';
      case 'mirror':
        return 'object-lens'; // Same styling as lens
      case 'mass':
        return 'object-mass';
      default:
        return '';
    }
  };

  return (
    <div
      className={getObjectClass()}
      style={{
        left: `${object.x}px`,
        top: `${object.y}px`,
        width: `${object.width}px`,
        height: `${object.height}px`
      }}
      title={`${object.type} (${object.width}×${object.height})`}
    />
  );
};