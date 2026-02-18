import { Slider } from "./ui/slider";
import {
  GradientLevers,
  PRESETS,
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

const PRESET_DESCRIPTIONS: Record<string, string> = {
  Engineer: 'Blueprint schematic',
  Operator: 'Live ops heatmap',
  Physics: 'Acoustic substrate',
};

const LeverSlider = ({
  shortLabel, value, onChange, keywords
}: {
  shortLabel: string; value: number;
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
    <div className="p-3 w-full space-y-3">
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-bold text-primary/80 hover:text-primary transition-colors cursor-pointer pb-2">
          <span>Perception Levers</span>
          <span className="text-[10px] text-muted-foreground">▾</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3">
          <LeverSlider
            shortLabel="ABS"
            value={levers.abstraction} onChange={v => onSetLever('abstraction', v)}
            keywords={labels.abstraction}
          />
          <LeverSlider
            shortLabel="DIM"
            value={levers.dimensionality} onChange={v => onSetLever('dimensionality', v)}
            keywords={labels.dimensionality}
          />
          <LeverSlider
            shortLabel="ORG"
            value={levers.organic} onChange={v => onSetLever('organic', v)}
            keywords={labels.organic}
          />
          <LeverSlider
            shortLabel="TEN"
            value={levers.tension} onChange={v => onSetLever('tension', v)}
            keywords={labels.tension}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="border-t border-primary/10 pt-2">
        <span className="text-[10px] text-muted-foreground font-mono block mb-2">Presets</span>
        <div className="flex flex-col gap-1.5">
          {Object.keys(PRESETS).map(name => (
            <button
              key={name}
              onClick={() => onApplyPreset(name)}
              className="flex items-center justify-between text-[10px] font-mono py-1.5 px-2 rounded border border-primary/20 text-primary/70 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <span className="font-bold">{name}</span>
              <span className="text-muted-foreground">{PRESET_DESCRIPTIONS[name]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
