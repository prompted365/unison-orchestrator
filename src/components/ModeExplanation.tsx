import { CommunicationMode } from "../types";

interface ModeExplanationProps {
  mode: CommunicationMode;
}

const MODE_DESCRIPTIONS = {
  acoustic: {
    title: 'Acoustic',
    description: 'Mechanical waves at 343 m/s. **Walls** hard‑occlude; echoes WARN. Epitaphs: natural‑language warnings that tune soft‑block penalties.'
  },
  light: {
    title: 'Light / EM', 
    description: 'Photons at c. Lenses/mirrors DRAW topology (no hard occlusion). Reflection notes bias routing/focus.'
  },
  gravity: {
    title: 'Gravitational',
    description: 'Metric ripples at c. Masses SHEAR timing. Drift advisories adjust start order & batch size.'
  }
};

export const ModeExplanation = ({ mode }: ModeExplanationProps) => {
  const { title, description } = MODE_DESCRIPTIONS[mode];

  return (
    <div className="bg-secondary/20 border-l-4 border-primary p-6 rounded-lg animate-slide-in">
      <h3 className="font-bold text-primary mb-2">{title}</h3>
      <p className="text-sm text-secondary-foreground leading-relaxed">
        {description.split('**').map((part, index) => 
          index % 2 === 1 ? <strong key={index} className="text-primary">{part}</strong> : part
        )}
      </p>
    </div>
  );
};