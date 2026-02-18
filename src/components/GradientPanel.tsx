import { Slider } from "./ui/slider";
import {
  GradientLevers,
  PRESETS,
  ABSTRACTION_LABELS,
  DIMENSIONALITY_LABELS,
  ORGANIC_LABELS,
  TENSION_LABELS,
} from "../hooks/useGradientConfig";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent
} from "./ui/collapsible";

interface GradientPanelProps {
  levers: GradientLevers;
  labels: Record<keyof GradientLevers, string>;
  onSetLever: (key: keyof GradientLevers, value: number) => void;
  onApplyPreset: (name: string) => void;
}

const LeverSlider = ({
  label, shortLabel, value, onChange, keywords
}: {
  label: string; shortLabel: string; value: number;
  onChange: (v: number) => void; keywords: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px]">
      <span className="text-muted-foreground font-mono">{shortLabel}</span>
      <span className="text-primary font-mono">{value.toFixed(1)} · {keywords}</span>
    </div>
    <Slider
      value={[value * 100]}
      onValueChange={([v]) => onChange(v / 100)}
      min={0}
      max={100}
      step={1}
      className="w-full"
    />
  </div>
);

export const GradientPanel = ({ levers, labels, onSetLever, onApplyPreset }: GradientPanelProps) => {
  return (
    <div className="fixed bottom-4 left-4 z-30 rounded-xl border border-primary/30 p-3 backdrop-blur-md w-64"
      style={{ background: 'hsl(240 10% 3.9% / 0.95)', boxShadow: '0 0 20px hsl(180 100% 67% / 0.15)' }}
    >
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-bold text-primary/80 hover:text-primary transition-colors cursor-pointer pb-2">
          <span>🎛️ Gradient Config</span>
          <span className="text-[10px] text-muted-foreground">▾</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          <LeverSlider
            label="Abstraction" shortLabel="ABS"
            value={levers.abstraction} onChange={v => onSetLever('abstraction', v)}
            keywords={labels.abstraction}
          />
          <LeverSlider
            label="Dimensionality" shortLabel="DIM"
            value={levers.dimensionality} onChange={v => onSetLever('dimensionality', v)}
            keywords={labels.dimensionality}
          />
          <LeverSlider
            label="Organic" shortLabel="ORG"
            value={levers.organic} onChange={v => onSetLever('organic', v)}
            keywords={labels.organic}
          />
          <LeverSlider
            label="Tension" shortLabel="TEN"
            value={levers.tension} onChange={v => onSetLever('tension', v)}
            keywords={labels.tension}
          />

          <div className="flex gap-1.5 pt-1">
            {Object.keys(PRESETS).map(name => (
              <button
                key={name}
                onClick={() => onApplyPreset(name)}
                className="flex-1 text-[9px] font-mono py-1 rounded border border-primary/20 text-primary/70 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
