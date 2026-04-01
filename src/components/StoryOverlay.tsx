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
    <div className="absolute inset-0 pointer-events-none z-[2147483000] flex flex-col justify-between">
      {/* Top bar: progress + controls */}
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5 sm:pt-4">
        <div className="flex items-center gap-1 flex-1">
          {Array.from({ length: totalActs }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted/20">
              <div
                className="h-full rounded-full transition-all duration-300 bg-primary/80"
                style={{
                  width: i < currentAct ? '100%' : i === currentAct ? `${actProgress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <span className="text-xs sm:text-sm font-medium text-muted-foreground/90 mx-2 whitespace-nowrap tracking-wide">
          Act {currentAct + 1}/{totalActs}
        </span>

        <div className="flex gap-2 pointer-events-auto">
          <button
            onClick={onSkip}
            className="px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium bg-background/90 text-foreground hover:bg-muted border border-primary/20 transition-colors backdrop-blur-md"
          >
            Skip ▸
          </button>
          <button
            onClick={onExit}
            className="px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium bg-background/90 text-foreground hover:bg-muted border border-primary/20 transition-colors backdrop-blur-md"
          >
            Exit Story
          </button>
        </div>
      </div>

      {/* Bottom: narration card */}
      {narration && (
        <div className="flex justify-center pb-8 px-4 sm:px-6">
          <div
            className="pointer-events-auto max-w-3xl w-full rounded-2xl border border-primary/25 bg-background/95 px-6 py-5 sm:px-8 sm:py-6 shadow-2xl backdrop-blur-xl"
            style={{
              animation: 'fadeInUp 0.6s ease-out',
              boxShadow: '0 20px 60px hsl(var(--background) / 0.65), 0 0 0 1px hsl(var(--primary) / 0.12)',
            }}
          >
            <div className="text-sm sm:text-base font-semibold text-primary mb-2 tracking-[0.18em] uppercase">
              {narration.title}
            </div>
            <div className="text-base sm:text-lg leading-7 sm:leading-8 text-foreground/92 font-medium text-balance">
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
