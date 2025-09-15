import { CommunicationMode } from "../types";

interface HUDProps {
  mode: CommunicationMode;
  orchestrator: any;
}

const PHYSICS_PROFILES = {
  acoustic: { v: 343, label: 'Acoustic' },
  light: { v: 3e8, label: 'Light/EM' },
  gravity: { v: 3e8, label: 'Gravitational' }
};

const PX_PER_METER = 60;
const TTL = 0.25;

export const HUD = ({ mode, orchestrator }: HUDProps) => {
  const profile = PHYSICS_PROFILES[mode];
  const maxRange = profile.v * TTL;
  
  const formatMeters = (meters: number) => {
    return meters > 1000 
      ? `${(meters / 1000).toFixed(2)} km`
      : `${Math.round(meters)} m`;
  };

  return (
    <div className="hud-panel animate-slide-in">
      <h4 className="text-sm font-bold text-primary mb-3">System Status</h4>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Mode</span>
          <span className="text-primary font-mono">{profile.label}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">v</span>
          <span className="text-primary font-mono">
            {profile.v === 343 ? '343 m/s' : '3×10⁸ m/s'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">TTL</span>
          <span className="text-primary font-mono">{TTL} s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">px/m</span>
          <span className="text-primary font-mono">{PX_PER_METER}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Rmax</span>
          <span className="text-primary font-mono">~{formatMeters(maxRange)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Latency</span>
          <span className="text-primary font-mono">{orchestrator.state.field.latency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Risk</span>
          <span className="text-primary font-mono">{orchestrator.state.field.risk}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-secondary-foreground">Congestion</span>
          <span className="text-primary font-mono">{orchestrator.state.field.congestion}</span>
        </div>
      </div>
    </div>
  );
};