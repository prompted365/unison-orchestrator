// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// This module defines the physics model for all three CGG signal bands.
// Canonical mapping:
//   acoustic → PRIMITIVE band: omnidirectional, inverse-square + absorption, echoes off walls
//   light    → COGNITIVE band: high-speed, no echoes, lensing/reflection via optics objects
//   gravity  → PRIMITIVE (field): near-lossless, Schwarzschild-inspired time dilation near masses
//
// COORDINATE CONTRACT:
//   PX_PER_METER = 60 → 1 meter = 60 pixels in 2D space
//   SCALE = 0.02 in Canvas3D → 1 pixel = 0.02 world units → 1 meter = 1.2 world units
//   Velocities are in px/s (scaled for visibility, NOT physical):
//     acoustic: 200 px/s ≈ 3.3 m/s (real: 343 m/s)
//     light:    4000 px/s ≈ 66 m/s  (real: 3×10⁸ m/s)
//     gravity:  800 px/s ≈ 13 m/s   (real: 3×10⁸ m/s)
//   Normalization rationale: slowed so humans can observe propagation patterns.
//
// ATTENUATION MODEL (acoustic):
//   muffling_per_hop = 0.6 (canonical CGG spec)
//   Each wall crossing multiplies signal by 0.6. NOT binary block.
//   This is the "graduated degradation, not permission" principle.
//
// Gap D4: No Astragals channel — all propagation is broadcast/omni.
//   Astragals would be point-to-point with guaranteed delivery, no attenuation.
// Gap D1: No standing-based reception filtering — all agents hear equally
//   if within range. Standing should gate effective_volume threshold.
// ════════════════════════════════════════════════════════════════
import { useMemo } from "react";
import { CommunicationMode, Node, WorldObject } from "../types";

const PX_PER_METER = 60;

// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// These velocities control how fast wavefront spheres expand in the 3D scene.
// Acoustic: ~4s to cross full scene — viewer can watch pressure fronts arrive at agents
// Light: ~0.2s — fast flash, barely trackable, communicates "instant" reach
// Gravity: ~1s — heavy ripple, visually distinct from both acoustic and light
// Alpha: absorption coefficient. Higher = faster energy decay over distance.
//   acoustic α=0.012: noticeable dimming at half-scene distance
//   light α=0.0002: nearly lossless across the estate
//   gravity α=0: truly lossless — the field carries the signal perfectly
// ════════════════════════════════════════════════════════════════
const PHYSICS_PROFILES = {
  acoustic: { velocity: 200, alpha: 0.012, echoes: true },
  light:    { velocity: 4000, alpha: 0.0002, echoes: false },
  gravity:  { velocity: 800, alpha: 0, echoes: false }
};

export const usePhysics = (mode: CommunicationMode) => {
  const profile = PHYSICS_PROFILES[mode];

  const physics = useMemo(() => ({
    profile,

    getDistance: (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy) / PX_PER_METER;
    },

    getPixelDistance: (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    // ═══ [CE] Graduated attenuation: muffling_per_hop model ═══
    // Canonical CGG spec: effective_volume = signal_volume - (distance × muffling_per_hop)
    // Here modeled as multiplicative: signal *= 0.6^crossings (equivalent for energy)
    // Gravity bypasses ALL muffling — constitutional signals cannot be attenuated.
    // Walls only — lenses, mirrors, masses do NOT attenuate.
    // ═══ [VG] Each wall crossing visually dims the wavefront opacity by ~40% ═══
    computeAttenuation: (a: { x: number; y: number }, b: { x: number; y: number }, objects: WorldObject[]): number => {
      if (mode === 'gravity') return 1; // [CE] gravity bypasses muffling — constitutional invariant
      const MUFFLING_PER_HOP = 0.6; // [CE] canonical CGG value
      const walls = objects.filter(obj => obj.type === 'wall');
      let crossings = 0;
      for (const wall of walls) {
        if (lineIntersectsRect(a.x, a.y, b.x, b.y, wall.x, wall.y, wall.width, wall.height)) {
          crossings++;
        }
      }
      return Math.pow(MUFFLING_PER_HOP, crossings);
    },

    // Inverse-square + absorption + attenuation factor
    calculateSignal: (distanceMeters: number, attenuationFactor: number) => {
      if (distanceMeters < 0.5) return 1 * attenuationFactor;
      
      if (mode === 'acoustic') {
        const inverseSquare = 1 / (1 + distanceMeters * distanceMeters);
        const absorption = Math.exp(-profile.alpha * distanceMeters);
        return Math.min(1, Math.max(0, inverseSquare * absorption * attenuationFactor * 8));
      } else if (mode === 'light') {
        const inverseSquare = 1 / (1 + distanceMeters * distanceMeters * 0.3);
        const absorption = Math.exp(-profile.alpha * distanceMeters);
        return Math.min(1, Math.max(0, inverseSquare * absorption * attenuationFactor * 4));
      } else {
        return 1;
      }
    },

    // Legacy compat — now returns attenuation factor (0-1) not boolean
    isOccluded: (a: { x: number; y: number }, b: { x: number; y: number }, objects: WorldObject[]) => {
      if (mode !== 'acoustic') return false;
      const walls = objects.filter(obj => obj.type === 'wall');
      return walls.some(wall =>
        lineIntersectsRect(a.x, a.y, b.x, b.y, wall.x, wall.y, wall.width, wall.height)
      );
    },

    // ═══ [CE] Echo mechanics — specular reflection for acoustic band ═══
    // Canonical: walls produce echo wavefronts (reduced energy) when the primary
    // wavefront's radius reaches the wall distance. Mirror-source approximation.
    // Only acoustic mode produces echoes — this is a physical property of sound.
    // ═══ [VG] Echo wavefronts render as dimmer wireframe spheres (opacity * 0.45) ═══
    computeEchoSources: (sourceX: number, sourceY: number, objects: WorldObject[]): Array<{ x: number; y: number; energy: number; objectId: string }> => {
      if (mode !== 'acoustic') return [];
      return objects
        .filter(obj => obj.type === 'wall')
        .map(wall => {
          const cx = wall.x + wall.width / 2;
          const cy = wall.y + wall.height / 2;
          const dx = cx - sourceX;
          const dy = cy - sourceY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return {
            x: cx + dx * 0.1,
            y: cy + dy * 0.1,
            energy: 0.35 / (1 + dist / 200),
            objectId: wall.id
          };
        });
    },

    // Lens focus: returns multiplier and focal point
    computeLensFocus: (wavefrontX: number, wavefrontY: number, wavefrontRadius: number, objects: WorldObject[]): Array<{ x: number; y: number; focusFactor: number; objectId: string }> => {
      if (mode !== 'light') return [];
      return objects
        .filter(obj => obj.type === 'lens')
        .filter(lens => {
          const cx = lens.x + lens.width / 2;
          const cy = lens.y + lens.height / 2;
          const dist = Math.sqrt((cx - wavefrontX) ** 2 + (cy - wavefrontY) ** 2);
          return Math.abs(dist - wavefrontRadius) < 15;
        })
        .map(lens => ({
          x: lens.x + lens.width / 2,
          y: lens.y + lens.height / 2,
          focusFactor: 1.6,
          objectId: lens.id
        }));
    },

    // Mirror reflection: proper specular reflection using surface normal
    computeMirrorReflections: (wavefrontX: number, wavefrontY: number, wavefrontRadius: number, objects: WorldObject[]): Array<{ x: number; y: number; angle: number; energy: number; objectId: string }> => {
      if (mode !== 'light') return [];
      return objects
        .filter(obj => obj.type === 'mirror')
        .filter(mirror => {
          const cx = mirror.x + mirror.width / 2;
          const cy = mirror.y + mirror.height / 2;
          const dist = Math.sqrt((cx - wavefrontX) ** 2 + (cy - wavefrontY) ** 2);
          return Math.abs(dist - wavefrontRadius) < 15;
        })
        .map(mirror => {
          const cx = mirror.x + mirror.width / 2;
          const cy = mirror.y + mirror.height / 2;

          // Surface normal from surfaceAngle or inferred from aspect ratio
          const surfAngle = mirror.surfaceAngle ?? (mirror.width > mirror.height ? 0 : Math.PI / 2);
          // Normal is perpendicular to surface
          const nx = Math.cos(surfAngle + Math.PI / 2);
          const ny = Math.sin(surfAngle + Math.PI / 2);

          // Incident direction (from wavefront source toward mirror center)
          const dx = cx - wavefrontX;
          const dy = cy - wavefrontY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ix = dx / len;
          const iy = dy / len;

          // Specular reflection: r = i - 2(i·n)n
          const dot = ix * nx + iy * ny;
          const rx = ix - 2 * dot * nx;
          const ry = iy - 2 * dot * ny;
          const reflAngle = Math.atan2(ry, rx);

          return {
            x: cx,
            y: cy,
            angle: reflAngle,
            energy: 0.85, // mirrors are highly efficient
            objectId: mirror.id
          };
        });
    },

    // Schwarzschild-inspired time dilation near masses
    computeTimeDilation: (x: number, y: number, objects: WorldObject[]): number => {
      if (mode !== 'gravity') return 1;
      const masses = objects.filter(obj => obj.type === 'mass');
      let dilation = 1;
      for (const mass of masses) {
        const cx = mass.x + mass.width / 2;
        const cy = mass.y + mass.height / 2;
        const rs = (mass.width + mass.height) * 0.15; // Schwarzschild radius proportional to size
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        dilation *= 1 / (1 + rs / (2 * Math.max(dist, 10)));
      }
      return dilation;
    },

    // Phase skew for gravity mode agents
    getPhaseSkew: (agent: { x: number; y: number }, objects: WorldObject[]) => {
      if (mode !== 'gravity') return 0;
      const masses = objects.filter(obj => obj.type === 'mass');
      return masses.reduce((skew, mass) => {
        const cx = mass.x + mass.width / 2;
        const cy = mass.y + mass.height / 2;
        const dx = agent.x - cx;
        const dy = agent.y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return skew + 8 / (1 + distance / 90);
      }, 0.12 * 10);
    }
  }), [mode, profile]);

  return physics;
};

// Utility: line-rectangle intersection
function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  return (
    lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
    lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx, ry)
  );
}

function lineIntersectsLine(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
