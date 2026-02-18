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
  warrants, onAcknowledgeWarrant, onDismissWarrant
}: ControlsProps) => {
  const activeWarrants = warrants?.filter(w => w.status === 'active') || [];
  const nextWarrant = activeWarrants[0];

  return (
    <TooltipProvider delayDuration={300}>
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
          tooltip="Place a Permission Gate (acoustic), Observability Lens (light), or Invariant Mass (gravity)"
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
    </TooltipProvider>
  );
};
