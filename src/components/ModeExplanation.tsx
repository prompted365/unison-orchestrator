import { CommunicationMode } from "../types";

interface ModeExplanationProps {
  mode: CommunicationMode;
}

const MODE_DESCRIPTIONS = {
  acoustic: {
    title: 'Acoustic · Siren Channel',
    description: 'Local + muffled. 343 m/s. **Permission gates** hard‑occlude; echoes WARN. Sirens escalate within container scope — muffling_per_hop attenuates across boundaries.'
  },
  light: {
    title: 'Light / EM · CogPR Channel', 
    description: 'Broad + attenuated. Photons at c. **Observability lenses** and mirrors DRAW topology (no hard occlusion). CogPR proposals propagate cross-scope — weakened but never fully blocked.'
  },
  gravity: {
    title: 'Gravitational · Warrant Channel',
    description: 'Global + warps phase. Metric ripples at c. **Invariant masses** SHEAR timing. Warrants and priors persist through all obstacles but warp timing — drift, demurrage, phase transitions.'
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