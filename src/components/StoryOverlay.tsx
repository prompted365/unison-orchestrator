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
      {/* Top bar — progress */}
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5 sm:pt-4">
        <div
          className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase pointer-events-none shrink-0"
          style={{ background: color, color: '#000', opacity: 0.9 }}
        >
          {bandLabel[activeBand]}
        </div>

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

      {/* Bottom — cinematic subtitle bar */}
      {narration && (
        <div
          className="w-full pointer-events-auto"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, transparent 100%)',
            animation: 'subtitleFadeIn 0.4s ease-out',
          }}
        >
          <div className="max-w-4xl mx-auto px-5 pt-6 pb-6 sm:px-8 sm:pb-8">
            {/* Title line with controls */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  {arcTitle}
                </span>
                <span
                  className="text-sm sm:text-base font-bold tracking-wide"
                  style={{ color, textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
                >
                  {narration.title}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={onSkip}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold hover:bg-white/15 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  title="Skip"
                >
                  →
                </button>
                <button
                  onClick={onExit}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold hover:bg-white/15 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                  title="Exit Story"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body text — subtitle style */}
            <div
              className="text-sm sm:text-[15px] leading-6 sm:leading-7 font-medium line-clamp-3"
              style={{
                color: 'rgba(255,255,255,0.88)',
                textShadow: '0 1px 6px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.4)',
              }}
            >
              {narration.body}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes subtitleFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
