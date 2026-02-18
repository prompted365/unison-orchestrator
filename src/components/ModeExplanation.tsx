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
    description: 'Signal propagation through container boundaries. **Attenuation boundaries** reduce effective volume by muffling_per_hop per crossing. Unacknowledged beacons escalate via warrant until addressed by the recipient or their upstream governance logic. Band: PRIMITIVE (0 dB).'
  },
  light: {
    title: 'Light / EM · CogPR Channel',
    description: 'Broad signal propagation. **Observability lenses** focus attention topology; **specular surfaces** reflect beams at computed angles. CogPR lifecycle: propose, review, merge/reject via /grapple. Cross-scope attenuation weakens but never blocks. Band: COGNITIVE (−6 dB).'
  },
  gravity: {
    title: 'Gravitational · Warrant Channel',
    description: 'Global phase-warping signals. **Invariant masses** shear timing via demurrage. Warrants mint on volume_threshold, harmonic_triad, or circuit_breaker. Dismissal requires stake bond. Protects serious inquiry; guards excessive influence sans trust. Band: PRIMITIVE (0 dB) — bypasses muffling.'
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
