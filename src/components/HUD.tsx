import { CommunicationMode } from "../types";

interface HUDProps {
  mode: CommunicationMode;
  orchestrator: any;
}

const MODE_HUD = {
  acoustic: {
    channel: 'Siren (Acoustic)',
    propagation: '343 m/s',
    muffling: 'muffling_per_hop: 5',
    band: 'PRIMITIVE (0 dB)',
    bandNote: 'Always audible'
  },
  light: {
    channel: 'CogPR (Light/EM)',
    propagation: '3×10⁸ m/s',
    muffling: 'cross-scope attenuation',
    band: 'COGNITIVE (−6 dB)',
    bandNote: 'Moderate propagation'
  },
  gravity: {
    channel: 'Warrant (Gravitational)',
    propagation: '3×10⁸ m/s',
    muffling: 'phase_warp_factor',
    band: 'PRIMITIVE (0 dB)',
    bandNote: 'Bypasses muffling'
  }
};

const PHASE_LABELS = ['Stable', 'Ripple', 'Surge', 'Breach', 'Cascade'];

export const HUD = ({ mode, orchestrator }: HUDProps) => {
  const hud = MODE_HUD[mode];
  const { field } = orchestrator.state;

  return (
    <div className="hud-panel animate-slide-in">
      <h4 className="text-sm font-bold text-primary mb-3">Manifold Status</h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Channel</span>
          <span className="text-primary font-mono">{hud.channel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Propagation</span>
          <span className="text-primary font-mono">{hud.propagation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Muffling/hop</span>
          <span className="text-primary font-mono">{hud.muffling}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Band Budget</span>
          <span className="text-primary font-mono">{hud.band}</span>
        </div>
        <div className="border-t border-secondary/30 my-1" />
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Barometer Phase</span>
          <span className="text-primary font-mono">{field.barometerPhase} · {PHASE_LABELS[field.barometerPhase]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Demurrage Rate</span>
          <span className="text-primary font-mono">{field.demurrageRate}/cyc</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Field Latency</span>
          <span className="text-primary font-mono">{field.fieldLatency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Breach Risk</span>
          <span className="text-primary font-mono">{field.breachRisk}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Signal Congestion</span>
          <span className="text-primary font-mono">{field.signalCongestion}</span>
        </div>
      </div>
    </div>
  );
};
