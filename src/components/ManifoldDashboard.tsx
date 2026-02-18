import { CommunicationMode, AgentSignalState, Wavefront } from "../types";
import {
  Signal, Warrant, HarmonicTriad,
  BreachFlags, PhaseTier, EconomicBridgeState,
  SignalCensus, WarrantLifecycle
} from "../types/orchestration";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from "./ui/collapsible";

interface ManifoldDashboardProps {
  mode: CommunicationMode;
  orchestrator: any;
  wavefronts: Wavefront[];
  agentSignals: Map<string, AgentSignalState>;
  signals: Signal[];
  warrants: Warrant[];
  triadCount: number;
  triads: HarmonicTriad[];
  census: SignalCensus;
  warrantLifecycle: WarrantLifecycle;
  phaseTier: PhaseTier;
  breachFlags: BreachFlags;
  economicBridge: EconomicBridgeState;
  onAcknowledgeWarrant: (id: string) => void;
  onDismissWarrant: (id: string) => void;
}

const PHASE_LABELS = ['Stable', 'Ripple', 'Surge', 'Breach', 'Cascade'];
const PHASE_COLORS = ['hsl(120,70%,50%)', 'hsl(60,80%,50%)', 'hsl(30,90%,50%)', 'hsl(0,80%,50%)', 'hsl(270,80%,60%)'];

const MINTING_ICONS: Record<string, string> = {
  volume_threshold: '📊',
  harmonic_triad: '🔺',
  circuit_breaker: '⚡',
};

const SectionHeader = ({ label, descriptor }: { label: string; descriptor: string }) => (
  <CollapsibleTrigger className="flex flex-col w-full py-1.5 hover:bg-secondary/30 rounded px-1 transition-colors cursor-pointer group">
    <div className="flex items-center justify-between w-full">
      <span className="text-xs font-bold text-primary/80 group-hover:text-primary transition-colors">{label}</span>
      <span className="text-[10px] text-muted-foreground group-data-[state=open]:rotate-180 transition-transform">▾</span>
    </div>
    <span className="text-[10px] text-muted-foreground/60 text-left leading-tight">{descriptor}</span>
  </CollapsibleTrigger>
);

const Row = ({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) => (
  <div className="flex justify-between text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono ${danger ? 'text-destructive' : highlight ? 'text-accent' : 'text-primary'}`}>{value}</span>
  </div>
);

const BreachDot = ({ label, active }: { label: string; active: boolean }) => (
  <div className="flex items-center gap-1 text-[10px]">
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${active ? 'bg-destructive shadow-[0_0_6px_hsl(0,84%,60%)]' : 'bg-muted-foreground/30'}`} />
    <span className={active ? 'text-destructive' : 'text-muted-foreground/50'}>{label}</span>
  </div>
);

const BandBar = ({ band, count, db }: { band: string; count: number; db: string }) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className="w-20 text-muted-foreground font-mono">{band} ({db})</span>
    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full bg-primary/70 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, count * 15)}%` }}
      />
    </div>
    <span className="text-primary font-mono w-4 text-right">{count}</span>
  </div>
);

export const ManifoldDashboard = ({
  mode, orchestrator, wavefronts, agentSignals,
  signals, warrants, triadCount, triads,
  census, warrantLifecycle, phaseTier, breachFlags, economicBridge,
  onAcknowledgeWarrant, onDismissWarrant,
}: ManifoldDashboardProps) => {
  const { field } = orchestrator.state;

  let minSnr = 1, maxSnr = 0;
  agentSignals.forEach(s => {
    if (s.snr > 0.01) {
      minSnr = Math.min(minSnr, s.snr);
      maxSnr = Math.max(maxSnr, s.snr);
    }
  });
  if (maxSnr === 0) minSnr = 0;

  const warrantAmp = warrants
    .filter(w => w.status === 'active')
    .reduce((sum, w) => sum + w.priority * 0.03, 0);

  const activeWarrants = warrants.filter(w => w.status === 'active');

  return (
    <div className="space-y-1 p-3 w-full">
      {/* Section A: Constitution — defaultOpen */}
      <Collapsible defaultOpen>
        <SectionHeader label="⚖️ Constitution" descriptor="System phase and safety flags" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-muted-foreground">Phase</span>
            <span className="text-primary font-mono flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: PHASE_COLORS[field.barometerPhase] }}
              />
              {field.barometerPhase} · {PHASE_LABELS[field.barometerPhase]} · {phaseTier}
            </span>
          </div>
          <Row label="Demurrage" value={`${field.demurrageRate}/cyc`} />
          <div className="flex gap-2 flex-wrap mt-1">
            <BreachDot label="FROZEN" active={breachFlags.frozen} />
            <BreachDot label="RESERVE" active={breachFlags.reserve_breach} />
            <BreachDot label="RATE" active={breachFlags.rate_band_breach} />
            <BreachDot label="MINT" active={breachFlags.mint_halted} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10" />

      {/* Section B: Signal Census — collapsed */}
      <Collapsible>
        <SectionHeader label="📡 Signal Census" descriptor="What the manifold hears right now" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-mono">
            <span className="text-muted-foreground">BEACON</span><span className="text-primary text-right">{census.byKind.BEACON}</span>
            <span className="text-muted-foreground">LESSON</span><span className="text-primary text-right">{census.byKind.LESSON}</span>
            <span className="text-muted-foreground">OPPORTUNITY</span><span className="text-primary text-right">{census.byKind.OPPORTUNITY}</span>
            <span className="text-muted-foreground">TENSION</span><span className="text-accent text-right">{census.byKind.TENSION}</span>
          </div>
          <div className="space-y-0.5 mt-1">
            <BandBar band="PRIMITIVE" count={census.byBand.PRIMITIVE} db="0dB" />
            <BandBar band="COGNITIVE" count={census.byBand.COGNITIVE} db="-6dB" />
            <BandBar band="SOCIAL" count={census.byBand.SOCIAL} db="-12dB" />
            <BandBar band="PRESTIGE" count={census.byBand.PRESTIGE} db="muted" />
          </div>
          {census.loudest && (
            <Row label="Loudest" value={`${census.loudest.kind} ${census.loudest.volume.toFixed(2)}`} highlight />
          )}
          <Row label="Warrant Amp" value={warrantAmp > 0 ? `+${warrantAmp.toFixed(4)}/tick` : '—'} highlight={warrantAmp > 0} />
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10" />

      {/* Section C: Warrant Docket — collapsed */}
      <Collapsible>
        <SectionHeader label="📜 Warrant Docket" descriptor="Escalated conflicts awaiting resolution" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
            <div><span className="text-primary">{warrantLifecycle.active}</span><br/><span className="text-muted-foreground">ACT</span></div>
            <div><span className="text-primary">{warrantLifecycle.acknowledged}</span><br/><span className="text-muted-foreground">ACK</span></div>
            <div><span className="text-muted-foreground">{warrantLifecycle.dismissed}</span><br/><span className="text-muted-foreground">DIS</span></div>
            <div><span className="text-muted-foreground">{warrantLifecycle.expired}</span><br/><span className="text-muted-foreground">EXP</span></div>
          </div>
          {activeWarrants.slice(0, 5).map(w => (
            <div key={w.id} className="rounded border border-primary/20 p-1.5 text-[10px] space-y-1 bg-secondary/30">
              <div className="flex justify-between items-center">
                <span>{MINTING_ICONS[w.mintingCondition] || '?'} {w.mintingCondition}</span>
                <span className="text-primary font-mono">pri: {w.priority.toFixed(2)}</span>
              </div>
              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${w.priority * 100}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">stake: {w.stakeBond.toFixed(2)}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onAcknowledgeWarrant(w.id)}
                    className="px-1.5 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/40 transition-colors text-[9px]"
                  >
                    ACK
                  </button>
                  <button
                    onClick={() => onDismissWarrant(w.id)}
                    className="px-1.5 py-0.5 rounded bg-destructive/20 text-destructive hover:bg-destructive/40 transition-colors text-[9px]"
                  >
                    DIS (−{w.stakeBond.toFixed(2)})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10" />

      {/* Section D: Harmonic Triads — collapsed */}
      <Collapsible>
        <SectionHeader label="🔺 Harmonic Triads" descriptor="Meaningful signal convergences" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <Row label="Total Detected" value={String(triadCount)} highlight={triadCount > 0} />
          {triads.slice(-3).map((t, i) => (
            <div key={i} className="text-[10px] font-mono rounded border border-[hsl(45,100%,50%)]/30 p-1 bg-[hsl(45,100%,50%)]/5">
              BEACON + LESSON + TENSION → Warrant
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10" />

      {/* Section E: Economic Bridge — collapsed */}
      <Collapsible>
        <SectionHeader label="💰 Economic Bridge" descriptor="Stake, demurrage, and disbursement" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <Row label="Demurrage Tier" value={`${economicBridge.demurrage_tier} (${field.demurrageRate}/cyc)`} />
          <Row label="Locked Stake" value={`${economicBridge.locked_stake} nUCoin`} highlight={economicBridge.locked_stake > 0} />
          <Row label="Penalty Accrued" value={`${economicBridge.penalty_accrued} nUCoin`} danger={economicBridge.penalty_accrued > 0} />
          <Row
            label="Disbursement"
            value={economicBridge.disbursement_safe ? 'SAFE' : 'UNSAFE'}
            highlight={economicBridge.disbursement_safe}
            danger={!economicBridge.disbursement_safe}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10" />

      {/* Section F: Hearing Map — collapsed */}
      <Collapsible>
        <SectionHeader label="👂 Hearing Map" descriptor="How agents hear each other" />
        <CollapsibleContent className="space-y-1 pt-1 pl-1">
          <Row label="Active Wavefronts" value={String(wavefronts.length)} highlight={wavefronts.length > 0} />
          <Row label="Agent SNR Range" value={maxSnr > 0 ? `${minSnr.toFixed(2)} – ${maxSnr.toFixed(2)}` : '—'} />
          <Row label="Field Latency" value={String(field.fieldLatency)} />
          <Row label="Signal Congestion" value={String(field.signalCongestion)} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
