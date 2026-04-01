import { StoryNarration, StoryBand } from "../hooks/useStoryMode";

interface StoryOverlayProps {
  currentAct: number;
  totalActs: number;
  actProgress: number;
  narration: StoryNarration | null;
  activeBand: StoryBand;
  arcTitle: string;
  onSkip: () => void;
  onExit: () => void;
}

const bandColor: Record<StoryBand, string> = {
  acoustic: 'hsl(var(--primary))',
  light: 'hsl(45, 90%, 55%)',
  gravity: 'hsl(270, 60%, 60%)',
};

const bandLabel: Record<StoryBand, string> = {
  acoustic: '🔊 Acoustic',
  light: '💡 Light',
  gravity: '🌀 Gravity',
};

export const StoryOverlay = ({
  currentAct, totalActs, actProgress, narration, activeBand, arcTitle, onSkip, onExit,
}: StoryOverlayProps) => {
  const color = bandColor[activeBand];

  return (
    <div className="absolute inset-0 pointer-events-none z-[2147483000] flex flex-col justify-between">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5 sm:pt-4">
        {/* Band badge */}
        <div
          className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase pointer-events-none shrink-0"
          style={{ background: color, color: '#000', opacity: 0.9 }}
        >
          {bandLabel[activeBand]}
        </div>

        {/* Progress segments */}
        <div className="flex items-center gap-1 flex-1">
          {Array.from({ length: totalActs }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted/20">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: i < currentAct ? '100%' : i === currentAct ? `${actProgress * 100}%` : '0%',
                  background: color,
                  opacity: 0.8,
                }}
              />
            </div>
          ))}
        </div>

        <span className="text-xs sm:text-sm font-medium text-muted-foreground/90 mx-2 whitespace-nowrap tracking-wide font-mono">
          {currentAct + 1}/{totalActs}
        </span>
      </div>

      {/* Bottom: narration card with integrated controls */}
      {narration && (
        <div className="flex justify-center pb-6 sm:pb-8 px-4 sm:px-6">
          <div
            className="pointer-events-auto max-w-3xl w-full rounded-2xl border bg-background/95 px-5 py-4 sm:px-7 sm:py-5 shadow-2xl backdrop-blur-xl"
            style={{
              animation: 'fadeInUp 0.5s ease-out',
              borderColor: color + '40',
              boxShadow: `0 20px 60px hsl(var(--background) / 0.65), 0 0 0 1px ${color}20`,
            }}
          >
            {/* Arc title + band */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] sm:text-xs font-mono text-muted-foreground/70 tracking-wider uppercase">
                {arcTitle}
              </div>
            </div>

            {/* Act title */}
            <div
              className="text-sm sm:text-base font-bold mb-1.5 tracking-wide"
              style={{ color }}
            >
              {narration.title}
            </div>

            {/* Body */}
            <div className="text-sm sm:text-[15px] leading-6 sm:leading-7 text-foreground/90 font-medium text-balance mb-4">
              {narration.body}
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between pt-2 border-t border-muted/15">
              <div className="text-[10px] text-muted-foreground/50 font-mono">
                ESC to exit · → to skip
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onSkip}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-muted/20 text-foreground/80 hover:bg-muted/40 border border-muted/20 transition-colors"
                >
                  Skip →
                </button>
                <button
                  onClick={onExit}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-muted/20 text-foreground/80 hover:bg-muted/40 border border-muted/20 transition-colors"
                >
                  Exit Story
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
