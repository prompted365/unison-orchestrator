import { CommunicationMode, AgentSignalState, Wavefront } from "../types";
import { Signal, Warrant } from "../types/orchestration";

interface HUDProps {
  mode: CommunicationMode;
  orchestrator: any;
  wavefronts: Wavefront[];
  agentSignals: Map<string, AgentSignalState>;
  signals: Signal[];
  warrants: Warrant[];
  triadCount: number;
}

const MODE_HUD = {
  acoustic: {
    channel: 'Siren (Acoustic)',
    propagation: '343 m/s (scaled)',
    muffling: 'muffling_per_hop: 5',
    band: 'PRIMITIVE (0 dB)',
  },
  light: {
    channel: 'CogPR (Light/EM)',
    propagation: 'c (scaled)',
    muffling: 'cross-scope attenuation',
    band: 'COGNITIVE (−6 dB)',
  },
  gravity: {
    channel: 'Warrant (Gravitational)',
    propagation: 'c (scaled)',
    muffling: 'phase_warp_factor',
    band: 'PRIMITIVE (0 dB)',
  }
};

const PHASE_LABELS = ['Stable', 'Ripple', 'Surge', 'Breach', 'Cascade'];
const PHASE_COLORS = ['hsl(120,70%,50%)', 'hsl(60,80%,50%)', 'hsl(30,90%,50%)', 'hsl(0,80%,50%)', 'hsl(270,80%,60%)'];

export const HUD = ({ mode, orchestrator, wavefronts, agentSignals, signals, warrants, triadCount }: HUDProps) => {
  const hud = MODE_HUD[mode];
  const { field } = orchestrator.state;

  // Compute SNR range
  let minSnr = 1, maxSnr = 0;
  agentSignals.forEach(s => {
    if (s.snr > 0.01) {
      minSnr = Math.min(minSnr, s.snr);
      maxSnr = Math.max(maxSnr, s.snr);
    }
  });
  if (maxSnr === 0) minSnr = 0;

  const highestWarrant = warrants.reduce((max, w) => Math.max(max, w.priority), 0);

  // Compute total warrant amplification per tick
  const warrantAmp = warrants
    .filter(w => w.status === 'active')
    .reduce((sum, w) => sum + w.priority * 0.03, 0);

  return (
    <div className="hud-panel animate-slide-in">
      <h4 className="text-sm font-bold text-primary mb-3">Manifold Status</h4>
      <div className="space-y-1.5 text-xs">
        {/* Static mode info */}
        <Row label="Channel" value={hud.channel} />
        <Row label="Propagation" value={hud.propagation} />
        <Row label="Muffling/hop" value={hud.muffling} />
        <Row label="Band Budget" value={hud.band} />

        <div className="border-t border-secondary/30 my-1" />

        {/* Live simulation telemetry */}
        <Row label="Active Wavefronts" value={String(wavefronts.length)} highlight={wavefronts.length > 0} />
        <Row label="Active Signals" value={String(signals.length)} highlight={signals.length > 0} />
        <Row label="Active Warrants" value={warrants.length > 0 ? `${warrants.length} (pri: ${highestWarrant.toFixed(2)})` : '0'} highlight={warrants.length > 0} />
        <Row label="Warrant Amp" value={warrantAmp > 0 ? `+${warrantAmp.toFixed(4)}/tick` : '—'} highlight={warrantAmp > 0} />
        <Row label="Triads Detected" value={String(triadCount)} highlight={triadCount > 0} />
        <Row label="Agent SNR Range" value={maxSnr > 0 ? `${minSnr.toFixed(2)} – ${maxSnr.toFixed(2)}` : '—'} />

        <div className="border-t border-secondary/30 my-1" />

        {/* Barometer */}
        <div className="flex justify-between items-center">
          <span className="text-secondary-foreground">Barometer Phase</span>
          <span className="text-primary font-mono flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: PHASE_COLORS[field.barometerPhase] }}
            />
            {field.barometerPhase} · {PHASE_LABELS[field.barometerPhase]}
          </span>
        </div>
        <Row label="Demurrage Rate" value={`${field.demurrageRate}/cyc`} />
        <Row label="Field Latency" value={String(field.fieldLatency)} />
        <Row label="Breach Risk" value={String(field.breachRisk)} highlight={field.breachRisk > 0.2} />
        <Row label="Signal Congestion" value={String(field.signalCongestion)} />
      </div>
    </div>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-secondary-foreground">{label}</span>
    <span className={`font-mono ${highlight ? 'text-accent' : 'text-primary'}`}>{value}</span>
  </div>
);
