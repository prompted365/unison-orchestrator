import { Warrant } from "../types/orchestration";

interface ControlsProps {
  onBroadcast: () => void;
  onAddObject: () => void;
  onDropPin: () => void;
  onClear: () => void;
  warrants?: Warrant[];
  onAcknowledgeWarrant?: (id: string) => void;
  onDismissWarrant?: (id: string) => void;
}

export const Controls = ({
  onBroadcast, onAddObject, onDropPin, onClear,
  warrants, onAcknowledgeWarrant, onDismissWarrant
}: ControlsProps) => {
  const activeWarrants = warrants?.filter(w => w.status === 'active') || [];
  const nextWarrant = activeWarrants[0];

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      <button className="control-btn" onClick={onBroadcast}>
        Emit Signal
      </button>
      <button className="control-btn" onClick={onAddObject}>
        Add Obstacle (Gate / Lens / Mass)
      </button>
      <button className="control-btn" onClick={onDropPin}>
        Drop Epitaph
      </button>
      <button className="control-btn" onClick={onClear}>
        Reset Manifold
      </button>
      {nextWarrant && onAcknowledgeWarrant && (
        <button
          className="control-btn border-accent/50 text-accent hover:bg-accent hover:text-black"
          onClick={() => onAcknowledgeWarrant(nextWarrant.id)}
        >
          Acknowledge Warrant
        </button>
      )}
      {nextWarrant && onDismissWarrant && (
        <button
          className="control-btn border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
          onClick={() => onDismissWarrant(nextWarrant.id)}
        >
          Dismiss (−{nextWarrant.stakeBond.toFixed(2)})
        </button>
      )}
    </div>
  );
};
