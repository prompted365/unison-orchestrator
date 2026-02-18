import { CommunicationMode } from "../types";
import { Warrant } from "../types/orchestration";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider
} from "./ui/tooltip";

interface ControlsProps {
  onBroadcast: () => void;
  onAddObject: () => void;
  onDropPin: () => void;
  onClear: () => void;
  warrants?: Warrant[];
  onAcknowledgeWarrant?: (id: string) => void;
  onDismissWarrant?: (id: string) => void;
  // Time scale
  mode?: CommunicationMode;
  timeScale?: number;
  onSetTimeScale?: (scale: number) => void;
  timeAnnotation?: string;
  normalizationNote?: string;
  presets?: readonly number[];
}

const ControlButton = ({
  label, shortLabel, tooltip, onClick, variant
}: {
  label: string; shortLabel: string; tooltip: string;
  onClick: () => void; variant?: 'accent' | 'destructive';
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        className={`control-btn text-xs sm:text-sm ${
          variant === 'accent' ? 'border-accent/50 text-accent hover:bg-accent hover:text-black' :
          variant === 'destructive' ? 'border-destructive/50 text-destructive hover:bg-destructive hover:text-foreground' :
          ''
        }`}
        onClick={onClick}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs">
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

export const Controls = ({
  onBroadcast, onAddObject, onDropPin, onClear,
  warrants, onAcknowledgeWarrant, onDismissWarrant,
  mode, timeScale = 1, onSetTimeScale, timeAnnotation, normalizationNote, presets
}: ControlsProps) => {
  const activeWarrants = warrants?.filter(w => w.status === 'active') || [];
  const nextWarrant = activeWarrants[0];

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2">
        {/* Action buttons */}
        <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
          <ControlButton
            label="Emit Signal"
            shortLabel="Emit"
            tooltip="Broadcast from the Conductor. Accrues volume in the manifold."
            onClick={onBroadcast}
          />
          <ControlButton
            label="Add Obstacle"
            shortLabel="Obstacle"
            tooltip="Place an Attenuation Boundary (acoustic), Observability Lens (light), or Invariant Mass (gravity)"
            onClick={onAddObject}
          />
          <ControlButton
            label="Drop Epitaph"
            shortLabel="Epitaph"
            tooltip="Modal annotation — Siren warning, CogPR note, or Drift advisory"
            onClick={onDropPin}
          />
          <ControlButton
            label="Reset Manifold"
            shortLabel="Reset"
            tooltip="Clear all signals, warrants, and objects. Reset the field."
            onClick={onClear}
          />
          {nextWarrant && onAcknowledgeWarrant && (
            <ControlButton
              label="Acknowledge Warrant"
              shortLabel="ACK"
              tooltip={`Acknowledge active warrant (${nextWarrant.mintingCondition}). No stake cost.`}
              onClick={() => onAcknowledgeWarrant(nextWarrant.id)}
              variant="accent"
            />
          )}
          {nextWarrant && onDismissWarrant && (
            <ControlButton
              label={`Dismiss (−${nextWarrant.stakeBond.toFixed(2)})`}
              shortLabel={`DIS −${nextWarrant.stakeBond.toFixed(1)}`}
              tooltip={`Dismiss warrant. Burns ${nextWarrant.stakeBond.toFixed(2)} stake bond as penalty.`}
              onClick={() => onDismissWarrant(nextWarrant.id)}
              variant="destructive"
            />
          )}
        </div>

        {/* Time control strip */}
        {onSetTimeScale && presets && (
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <div className="flex gap-1">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => onSetTimeScale(p)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    timeScale === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/30 text-muted-foreground border-primary/15 hover:border-primary/40'
                  }`}
                >
                  {p}x
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono max-w-[280px] truncate">
              {timeScale}x · {timeAnnotation}
            </span>
          </div>
        )}

        {/* Normalization note */}
        {normalizationNote && (
          <p className="text-[9px] text-muted-foreground/50 text-center font-mono leading-tight">
            {normalizationNote}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
};
