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
        Send Broadcast
      </button>
      <button className="control-btn" onClick={onAddObject}>
        Add Object (Wall / Lens / Mass)
      </button>
      <button className="control-btn" onClick={onDropPin}>
        Drop Modal Pin
      </button>
      <button className="control-btn" onClick={onClear}>
        Clear
      </button>
    </div>
  );
};