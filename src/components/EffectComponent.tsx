import { Effect } from "../types";

interface EffectComponentProps {
  effect: Effect;
}

export const EffectComponent = ({ effect }: EffectComponentProps) => {
  const getEffectClass = () => {
    switch (effect.type) {
      case 'ring':
        return 'wave-ring';
      case 'echo':
        return 'echo-ring';
      case 'smear':
        return 'light-smear';
      case 'metric':
        return 'gravity-metric';
      case 'arc':
        return 'wave-ring'; // Similar to ring
      case 'ray':
        return 'wave-ring'; // Light ray effect
      default:
        return '';
    }
  };

  const getStyle = () => {
    const baseStyle = {
      left: `${effect.x - 2}px`,
      top: `${effect.y - 2}px`,
      width: '4px',
      height: '4px'
    };

    if (effect.size) {
      const size = effect.size;
      return {
        ...baseStyle,
        left: `${effect.x - size / 2}px`,
        top: `${effect.y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`
      };
    }

    if (effect.type === 'ray') {
      // Special handling for light rays
      const angle = effect.size || 0;
      const length = 120;
      return {
        ...baseStyle,
        transform: `rotate(${angle}rad)`,
        width: `${length}px`,
        height: '2px',
        transformOrigin: 'left center',
        opacity: 0.35,
        borderRadius: '1px'
      };
    }

    return baseStyle;
  };

  return (
    <div
      className={getEffectClass()}
      style={getStyle()}
    />
  );
};