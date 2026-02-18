import { useRef, useEffect, useState, useCallback } from "react";

interface BootSplashProps {
  onComplete: () => void;
}

const WIRE_COUNT = 280;
const CHAOS_DURATION = 2000; // 2s of golden wireframe chaos
const TITLE_FADE_IN = 500;
const TITLE_HOLD = 800;
const TITLE_FADE_OUT = 500;
const TOTAL_TITLE = TITLE_FADE_IN + TITLE_HOLD + TITLE_FADE_OUT; // 1.8s

export const BootSplash = ({ onComplete }: BootSplashProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"chaos" | "title" | "fadeout" | "done">("chaos");
  const [titleOpacity, setTitleOpacity] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const wiresRef = useRef<
    { x1: number; y1: number; x2: number; y2: number; vx1: number; vy1: number; vx2: number; vy2: number; hue: number; alpha: number }[]
  >([]);

  // Initialize wires
  const initWires = useCallback((w: number, h: number) => {
    const wires = [];
    for (let i = 0; i < WIRE_COUNT; i++) {
      wires.push({
        x1: Math.random() * w,
        y1: Math.random() * h,
        x2: Math.random() * w,
        y2: Math.random() * h,
        vx1: (Math.random() - 0.5) * 600,
        vy1: (Math.random() - 0.5) * 600,
        vx2: (Math.random() - 0.5) * 600,
        vy2: (Math.random() - 0.5) * 600,
        hue: 35 + Math.random() * 15, // golden range
        alpha: 0.15 + Math.random() * 0.5,
      });
    }
    wiresRef.current = wires;
  }, []);

  // Chaos canvas animation
  useEffect(() => {
    if (phase !== "chaos") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    initWires(canvas.width, canvas.height);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / CHAOS_DURATION, 1);

      const w = canvas.width;
      const h = canvas.height;

      // Fade trail effect — persistent chaos that builds up
      ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + progress * 0.15})`;
      ctx.fillRect(0, 0, w, h);

      const dt = 0.016;
      const wires = wiresRef.current;

      // Speed ramps down as we approach end, lines converge toward center
      const speedMult = 1 - progress * 0.7;
      const convergence = progress * progress * 0.02;

      for (const wire of wires) {
        // Pull toward center as progress increases
        wire.vx1 += (w / 2 - wire.x1) * convergence;
        wire.vy1 += (h / 2 - wire.y1) * convergence;
        wire.vx2 += (w / 2 - wire.x2) * convergence;
        wire.vy2 += (h / 2 - wire.y2) * convergence;

        wire.x1 += wire.vx1 * dt * speedMult;
        wire.y1 += wire.vy1 * dt * speedMult;
        wire.x2 += wire.vx2 * dt * speedMult;
        wire.y2 += wire.vy2 * dt * speedMult;

        // Wrap around
        if (wire.x1 < -50) wire.x1 = w + 50;
        if (wire.x1 > w + 50) wire.x1 = -50;
        if (wire.y1 < -50) wire.y1 = h + 50;
        if (wire.y1 > h + 50) wire.y1 = -50;
        if (wire.x2 < -50) wire.x2 = w + 50;
        if (wire.x2 > w + 50) wire.x2 = -50;
        if (wire.y2 < -50) wire.y2 = h + 50;
        if (wire.y2 > h + 50) wire.y2 = -50;

        // Brightness pulses and fades as chaos settles
        const flicker = 0.7 + Math.sin(elapsed * 0.01 + wire.hue) * 0.3;
        const fadeOut = progress > 0.75 ? 1 - (progress - 0.75) / 0.25 : 1;

        ctx.beginPath();
        ctx.moveTo(wire.x1, wire.y1);
        ctx.lineTo(wire.x2, wire.y2);
        ctx.strokeStyle = `hsla(${wire.hue}, 85%, 55%, ${wire.alpha * flicker * fadeOut})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.stroke();
      }

      // Bright flash bursts in first 2 seconds
      if (progress < 0.5 && Math.random() < 0.08) {
        const bx = Math.random() * w;
        const by = Math.random() * h;
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, 80 + Math.random() * 120);
        grad.addColorStop(0, "hsla(42, 100%, 70%, 0.15)");
        grad.addColorStop(1, "hsla(42, 100%, 50%, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(bx - 200, by - 200, 400, 400);
      }

      if (progress >= 1) {
        setPhase("title");
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [phase, initWires]);

  // Title phase timing
  useEffect(() => {
    if (phase !== "title") return;

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;

      if (elapsed < TITLE_FADE_IN) {
        setTitleOpacity(elapsed / TITLE_FADE_IN);
      } else if (elapsed < TITLE_FADE_IN + TITLE_HOLD) {
        setTitleOpacity(1);
      } else if (elapsed < TOTAL_TITLE) {
        setTitleOpacity(1 - (elapsed - TITLE_FADE_IN - TITLE_HOLD) / TITLE_FADE_OUT);
      } else {
        setPhase("fadeout");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // Fadeout phase → done
  useEffect(() => {
    if (phase !== "fadeout") return;
    const timer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 600);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{
        background: "#000",
        opacity: phase === "fadeout" ? 0 : 1,
        transition: phase === "fadeout" ? "opacity 0.6s ease-out" : "none",
      }}
    >
      {/* Chaos canvas */}
      {phase === "chaos" && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
      )}

      {/* Title card */}
      {phase === "title" && (
        <div
          className="flex flex-col items-center gap-3"
          style={{ opacity: titleOpacity }}
        >
          <h1
            className="text-3xl sm:text-5xl font-bold font-mono tracking-widest"
            style={{ color: "hsl(180, 100%, 67%)" }}
          >
            Constitution of Attention
          </h1>
          <p
            className="text-sm sm:text-base font-mono tracking-wider"
            style={{ color: "hsl(0, 0%, 60%)" }}
          >
            opTorq Estate — Ubiquity OS
          </p>
        </div>
      )}
    </div>
  );
};
