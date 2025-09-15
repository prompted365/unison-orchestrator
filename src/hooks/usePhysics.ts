import { useMemo } from "react";
import { CommunicationMode, Node, WorldObject } from "../types";

const PX_PER_METER = 60;
const TTL = 0.25;

const PHYSICS_PROFILES = {
  acoustic: { velocity: 343, alpha: 0.005, echoes: true },
  light: { velocity: 3e8, alpha: 1e-4, echoes: false },
  gravity: { velocity: 3e8, alpha: 0, echoes: false }
};

export const usePhysics = (mode: CommunicationMode) => {
  const profile = PHYSICS_PROFILES[mode];

  const physics = useMemo(() => ({
    getDistance: (a: Node, b: Node) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      return pixelDistance / PX_PER_METER; // Convert to meters
    },

    getDelay: (distanceMeters: number) => {
      return (distanceMeters / profile.velocity) * 1000; // Convert to milliseconds
    },

    calculateSignal: (distanceMeters: number, blocked: boolean) => {
      if (mode === 'acoustic') {
        const baseSignal = Math.exp(-profile.alpha * distanceMeters);
        return Math.min(1, Math.max(0, baseSignal * (blocked ? 0.3 : 1)));
      } else if (mode === 'light') {
        // Light doesn't get hard blocked, just attenuated
        return Math.min(1, Math.max(0, Math.exp(-profile.alpha * distanceMeters)));
      } else {
        // Gravity waves aren't blocked
        return 1;
      }
    },

    isOccluded: (a: Node, b: Node, objects: WorldObject[]) => {
      if (mode !== 'acoustic') return false;
      
      const walls = objects.filter(obj => obj.type === 'wall');
      return walls.some(wall => {
        return lineIntersectsRect(
          a.x, a.y, b.x, b.y,
          wall.x, wall.y, wall.width, wall.height
        );
      });
    },

    getPhaseSkew: (agent: Node, objects: WorldObject[]) => {
      if (mode !== 'gravity') return 0;
      
      const masses = objects.filter(obj => obj.type === 'mass');
      return masses.reduce((skew, mass) => {
        const centerX = mass.x + mass.width / 2;
        const centerY = mass.y + mass.height / 2;
        const dx = agent.x - centerX;
        const dy = agent.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return skew + 8 / (1 + distance / 90);
      }, 0.12 * 10); // Base latency factor
    }
  }), [mode, profile]);

  return physics;
};

// Utility function for line-rectangle intersection
function lineIntersectsRect(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  // Check if line intersects any of the four rectangle edges
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