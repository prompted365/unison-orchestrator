interface ControlsProps {
  onBroadcast: () => void;
  onAddObject: () => void;
  onDropPin: () => void;
  onClear: () => void;
}

export const Controls = ({ onBroadcast, onAddObject, onDropPin, onClear }: ControlsProps) => {
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
    </div>
  );
};