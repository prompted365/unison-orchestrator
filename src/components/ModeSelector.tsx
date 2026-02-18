import { CommunicationMode } from "../types";

interface ModeSelectorProps {
  mode: CommunicationMode;
  onModeChange: (mode: CommunicationMode) => void;
}

export const ModeSelector = ({ mode, onModeChange }: ModeSelectorProps) => {
  const modes = [
    { id: 'acoustic' as const, label: 'Acoustic · Siren', className: 'acoustic' },
    { id: 'light' as const, label: 'Light · CogPR', className: 'light' },
    { id: 'gravity' as const, label: 'Gravity · Warrant', className: 'gravity' }
  ];

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {modes.map(({ id, label, className }) => (
        <button
          key={id}
          className={`mode-btn ${className} ${mode === id ? 'active' : ''}`}
          onClick={() => onModeChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};