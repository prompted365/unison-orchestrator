import { useState, useCallback, useMemo, useEffect } from "react";
import { CommunicationMode } from "../types";

const PRESETS = [0.01, 0.1, 0.25, 1, 4] as const;

const MODE_ANNOTATIONS: Record<CommunicationMode, Record<number, string>> = {
  acoustic: {
    0.01: 'Near-frozen — frame-by-frame pressure analysis',
    0.1: 'Slow motion — watch pressure fronts propagate',
    0.25: 'Quarter speed — observe boundary attenuation',
    1: 'Real-time (normalized)',
    4: 'Fast forward — rapid propagation survey',
  },
  light: {
    0.01: 'Frame-by-frame — track individual photon shells',
    0.1: 'Slow motion — light normalized for observation',
    0.25: 'Quarter speed — watch lens refraction',
    1: 'Real-time (normalized)',
    4: 'Fast forward — rapid topology scan',
  },
  gravity: {
    0.01: 'Near-frozen — inspect spacetime distortion',
    0.1: 'Slow motion — observe phase warping',
    0.25: 'Quarter speed — watch demurrage effects',
    1: 'Real-time (normalized)',
    4: 'Fast forward — accelerated warrant propagation',
  },
};

const NORMALIZATION_NOTE = 'All velocities pedagogically normalized. Acoustic: ~6×10⁸ slowdown from 343 m/s · Light: ~10⁻⁷ c · Gravity: ~10⁻⁶ c';

export const useTimeScale = (mode: CommunicationMode) => {
  const [timeScale, setTimeScale] = useState(1);

  // Reset to 1x on mode change
  useEffect(() => {
    setTimeScale(1);
  }, [mode]);

  const annotation = useMemo(() => {
    const closest = PRESETS.reduce((prev, curr) =>
      Math.abs(curr - timeScale) < Math.abs(prev - timeScale) ? curr : prev
    );
    return MODE_ANNOTATIONS[mode][closest] || '';
  }, [mode, timeScale]);

  return {
    timeScale,
    setTimeScale: useCallback((s: number) => setTimeScale(s), []),
    presets: PRESETS,
    annotation,
    normalizationNote: NORMALIZATION_NOTE,
  };
};
