import { useState, useMemo, useCallback } from "react";

export interface GradientLevers {
  abstraction: number;
  dimensionality: number;
  organic: number;
  tension: number;
}

export interface DerivedVisuals {
  fogDensity: number;
  fogColor: string;
  nodeGeometry: 'sphere' | 'icosahedron' | 'points';
  materialType: 'standard' | 'phong' | 'shader';
  wireframeRatio: number;
  chromaticAberration: number;
  wavefrontStyle: 'smooth-sphere' | 'ripple-interference' | 'shockwave-spike';
  colorPalette: { primary: string; secondary: string; accent: string };
  starDensity: number;
  connectionStyle: 'straight' | 'bezier' | 'particles';
}

const getLabel = (value: number, labels: [string, string, string]): string => {
  if (value < 0.35) return labels[0];
  if (value < 0.7) return labels[1];
  return labels[2];
};

export const ABSTRACTION_LABELS: [string, string, string] = ['Schematic', 'Heat Map', 'Cymatic'];
export const DIMENSIONALITY_LABELS: [string, string, string] = ['Isometric', 'Depth Field', 'Volumetric'];
export const ORGANIC_LABELS: [string, string, string] = ['Silicon', 'Ferrofluid', 'Mycelium'];
export const TENSION_LABELS: [string, string, string] = ['Equilibrium', 'Interference', 'Critical Mass'];

export const PRESETS: Record<string, GradientLevers> = {
  Engineer: { abstraction: 0.1, dimensionality: 0.2, organic: 0.0, tension: 0.0 },
  Operator: { abstraction: 0.5, dimensionality: 0.6, organic: 0.4, tension: 0.5 },
  Physics: { abstraction: 0.9, dimensionality: 1.0, organic: 0.8, tension: 1.0 },
};

export const useGradientConfig = () => {
  const [levers, setLevers] = useState<GradientLevers>(PRESETS.Operator);

  const setLever = useCallback((key: keyof GradientLevers, value: number) => {
    setLevers(prev => ({ ...prev, [key]: Math.max(0, Math.min(1, value)) }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    const preset = PRESETS[name];
    if (preset) setLevers(preset);
  }, []);

  const labels = useMemo(() => ({
    abstraction: getLabel(levers.abstraction, ABSTRACTION_LABELS),
    dimensionality: getLabel(levers.dimensionality, DIMENSIONALITY_LABELS),
    organic: getLabel(levers.organic, ORGANIC_LABELS),
    tension: getLabel(levers.tension, TENSION_LABELS),
  }), [levers]);

  const visuals: DerivedVisuals = useMemo(() => {
    const { abstraction: abs, dimensionality: dim, organic: org, tension: ten } = levers;

    return {
      fogDensity: dim * 0.08,
      fogColor: org < 0.5
        ? `hsl(220, 40%, ${5 + dim * 8}%)`
        : `hsl(${270 + org * 20}, ${50 + org * 30}%, ${5 + dim * 8}%)`,
      nodeGeometry: abs < 0.35 ? 'sphere' : abs < 0.7 ? 'icosahedron' : 'points',
      materialType: org < 0.35 ? 'standard' : org < 0.7 ? 'phong' : 'shader',
      wireframeRatio: abs * 0.8,
      chromaticAberration: ten * 0.3,
      wavefrontStyle: ten < 0.35 ? 'smooth-sphere' : ten < 0.7 ? 'ripple-interference' : 'shockwave-spike',
      colorPalette: org < 0.5
        ? { primary: 'hsl(180, 100%, 67%)', secondary: 'hsl(210, 30%, 50%)', accent: 'hsl(200, 80%, 60%)' }
        : { primary: 'hsl(35, 100%, 55%)', secondary: 'hsl(20, 80%, 45%)', accent: 'hsl(45, 100%, 50%)' },
      starDensity: 500 + dim * 4500,
      connectionStyle: abs < 0.35 ? 'straight' : abs < 0.7 ? 'bezier' : 'particles',
    };
  }, [levers]);

  return { levers, setLever, applyPreset, labels, visuals };
};
