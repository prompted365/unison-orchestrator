import { useMemo } from "react";
import { CommunicationMode, Node, WorldObject } from "../types";

const PX_PER_METER = 60;

// Scaled velocities (px/s) so wavefronts are visible
const PHYSICS_PROFILES = {
  acoustic: { velocity: 200, alpha: 0.012, echoes: true },   // ~4s to cross 800px — watch pressure fronts arrive
  light:    { velocity: 4000, alpha: 0.0002, echoes: false }, // ~200ms to cross — fast flash, trackable
  gravity:  { velocity: 800, alpha: 0, echoes: false }        // ~1s to cross — heavy ripple, visually distinct
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

    // Graduated attenuation: muffling_per_hop model
    computeAttenuation: (a: { x: number; y: number }, b: { x: number; y: number }, objects: WorldObject[]): number => {
      if (mode === 'gravity') return 1; // gravity bypasses muffling
      const MUFFLING_PER_HOP = 0.6;
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

    // Compute specular reflection point off a wall for echo wavefronts
    computeEchoSources: (sourceX: number, sourceY: number, objects: WorldObject[]): Array<{ x: number; y: number; energy: number; objectId: string }> => {
      if (mode !== 'acoustic') return [];
      return objects
        .filter(obj => obj.type === 'wall')
        .map(wall => {
          const cx = wall.x + wall.width / 2;
          const cy = wall.y + wall.height / 2;
          // Mirror source across wall center
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
