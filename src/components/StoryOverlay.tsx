import { StoryNarration } from "../hooks/useStoryMode";

interface StoryOverlayProps {
  currentAct: number;
  totalActs: number;
  actProgress: number;
  narration: StoryNarration | null;
  onSkip: () => void;
  onExit: () => void;
}

export const StoryOverlay = ({
  currentAct, totalActs, actProgress, narration, onSkip, onExit,
}: StoryOverlayProps) => {
  const overallProgress = (currentAct + actProgress) / totalActs;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between">
      {/* Top bar: progress + controls */}
      <div className="flex items-center gap-2 px-4 pt-2">
        {/* Progress dots */}
        <div className="flex items-center gap-1 flex-1">
          {Array.from({ length: totalActs }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'hsla(0,0%,100%,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: i < currentAct ? '100%' : i === currentAct ? `${actProgress * 100}%` : '0%',
                  background: 'hsla(180,100%,67%,0.7)',
                }}
              />
            </div>
          ))}
        </div>

        {/* Act indicator */}
        <span className="text-[10px] font-mono text-muted-foreground/70 mx-2 whitespace-nowrap">
          Act {currentAct + 1}/{totalActs}
        </span>

        {/* Controls */}
        <div className="flex gap-1.5 pointer-events-auto">
          <button
            onClick={onSkip}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-primary/10 transition-colors"
          >
            Skip ▸
          </button>
          <button
            onClick={onExit}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-destructive/20 text-destructive-foreground hover:bg-destructive/40 border border-destructive/20 transition-colors"
          >
            Exit Story
          </button>
        </div>
      </div>

      {/* Bottom: narration card */}
      {narration && (
        <div className="flex justify-center pb-6 px-4">
          <div
            className="max-w-lg w-full rounded-lg border border-primary/20 px-5 py-4 font-mono"
            style={{
              background: 'hsla(240,10%,4%,0.88)',
              backdropFilter: 'blur(12px)',
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            <div className="text-xs font-bold text-primary mb-1.5 tracking-wider uppercase">
              {narration.title}
            </div>
            <div className="text-[11px] leading-relaxed text-muted-foreground/90">
              {narration.body}
            </div>
          </div>
        </div>
      )}

      {/* Cinematic letterbox bars */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
