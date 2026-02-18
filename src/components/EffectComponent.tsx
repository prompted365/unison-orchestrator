import { Effect } from "../types";

interface EffectComponentProps {
  effect: Effect;
}

export const EffectComponent = ({ effect }: EffectComponentProps) => {
  const getEffectClass = () => {
    switch (effect.type) {
      case 'ring': return 'wave-ring';
      case 'acoustic-wave': return 'acoustic-wave';
      case 'gravity-wave': return 'gravity-wave';
      case 'echo': return 'echo-ring';
      case 'smear': return 'light-smear';
      case 'metric': return 'gravity-metric';
      case 'arc': return 'wave-ring';
      case 'ray': return 'light-ray';
      case 'reflection': return 'effect-reflection';
      case 'refraction': return 'effect-refraction';
      case 'triad-resonance': return 'effect-triad-resonance';
      case 'warrant-pulse': return 'effect-warrant-pulse';
      default: return '';
    }
  };

  const getStyle = (): React.CSSProperties => {
    const size = effect.size || 4;
    const baseStyle: React.CSSProperties = {
      left: `${effect.x - size / 2}px`,
      top: `${effect.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`
    };

    if (effect.type === 'ray') {
      const angle = effect.size || 0;
      return {
        left: `${effect.x}px`,
        top: `${effect.y}px`,
        transform: `rotate(${angle}rad)`,
        width: '120px',
        height: '2px',
        transformOrigin: 'left center',
        opacity: 0.35,
        borderRadius: '1px'
      };
    }

    if (effect.type === 'triad-resonance') {
      return {
        ...baseStyle,
        width: '80px',
        height: '80px',
        left: `${effect.x - 40}px`,
        top: `${effect.y - 40}px`,
      };
    }

    if (effect.type === 'warrant-pulse') {
      return {
        ...baseStyle,
        width: '60px',
        height: '60px',
        left: `${effect.x - 30}px`,
        top: `${effect.y - 30}px`,
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
