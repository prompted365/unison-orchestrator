import { CommunicationMode } from "../types";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from "./ui/collapsible";

interface ModeExplanationProps {
  mode: CommunicationMode;
}

const MODE_DESCRIPTIONS = {
  acoustic: {
    title: 'Acoustic · Siren Channel',
    description: 'Local + muffled. 343 m/s. **Permission gates** hard‑occlude; echoes WARN. muffling_per_hop = 5 attenuates across container boundaries. Sirens follow escalation lifecycle: ACTIVE → ACKNOWLEDGED → DISMISSED. breach_flags auto-trigger new Sirens when thresholds cross. Band: PRIMITIVE (0 dB) — always audible within scope.'
  },
  light: {
    title: 'Light / EM · CogPR Channel',
    description: 'Broad + attenuated. Photons at c. **Observability lenses** and mirrors DRAW topology (no hard occlusion). CogPR lifecycle: propose → review → merge/reject via /grapple. Cross-scope attenuation weakens but never fully blocks. Band: COGNITIVE (−6 dB) — moderate propagation, requires attention to hear.'
  },
  gravity: {
    title: 'Gravitational · Warrant Channel',
    description: 'Global + warps phase. Metric ripples at c. **Invariant masses** SHEAR timing. Warrants mint on: volume_threshold, harmonic_triad, or circuit_breaker conditions. Dismissal requires stake bond. **Demurrage** decays volume over time — phase-dependent rate. Band: PRIMITIVE (0 dB) — bypasses **muffling** entirely.'
  }
};

export const ModeExplanation = ({ mode }: ModeExplanationProps) => {
  const { title, description } = MODE_DESCRIPTIONS[mode];

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left cursor-pointer group py-1">
        <h3 className="font-bold text-primary text-xs">{title}</h3>
        <span className="text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
          (tap to learn more)
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto group-data-[state=open]:rotate-180 transition-transform">▾</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-secondary/20 border-l-4 border-primary p-4 rounded-lg mt-1">
          <p className="text-[11px] text-secondary-foreground leading-relaxed">
            {description.split('**').map((part, index) =>
              index % 2 === 1 ? <strong key={index} className="text-primary">{part}</strong> : part
            )}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
