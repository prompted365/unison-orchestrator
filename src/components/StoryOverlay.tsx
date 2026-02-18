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
  return (
    <div className="absolute inset-0 pointer-events-none z-[9999] flex flex-col justify-between">
      {/* Top bar: progress + controls */}
      <div className="flex items-center gap-2 px-4 pt-2">
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

        <span className="text-xs font-mono text-muted-foreground/70 mx-2 whitespace-nowrap">
          Act {currentAct + 1}/{totalActs}
        </span>

        <div className="flex gap-1.5 pointer-events-auto">
          <button
            onClick={onSkip}
            className="px-3 py-1 rounded-full text-xs font-mono bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-primary/10 transition-colors"
          >
            Skip ▸
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1 rounded-full text-xs font-mono bg-destructive/20 text-destructive-foreground hover:bg-destructive/40 border border-destructive/20 transition-colors"
          >
            Exit Story
          </button>
        </div>
      </div>

      {/* Bottom: narration card */}
      {narration && (
        <div className="flex justify-center pb-6 px-4">
          <div
            className="max-w-xl w-full rounded-lg border border-primary/20 px-6 py-5 font-mono"
            style={{
              background: 'hsla(240,10%,4%,0.92)',
              backdropFilter: 'blur(16px)',
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            <div className="text-sm font-bold text-primary mb-2 tracking-wider uppercase">
              {narration.title}
            </div>
            <div className="text-sm leading-relaxed text-muted-foreground/90">
              {narration.body}
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
