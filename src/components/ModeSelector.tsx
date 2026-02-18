import { CommunicationMode } from "../types";

interface ModeSelectorProps {
  mode: CommunicationMode;
  onModeChange: (mode: CommunicationMode) => void;
}

export const ModeSelector = ({ mode, onModeChange }: ModeSelectorProps) => {
  const modes = [
    { id: 'acoustic' as const, label: 'Acoustic', className: 'acoustic' },
    { id: 'light' as const, label: 'Light', className: 'light' },
    { id: 'gravity' as const, label: 'Gravity', className: 'gravity' }
  ];

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center">
      {modes.map(({ id, label, className }) => (
        <button
          key={id}
          className={`mode-pill ${className} ${mode === id ? 'active' : ''}`}
          onClick={() => onModeChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
