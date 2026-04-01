

# Tame Auto-Emit on Page Load

## Problem
The `autoEmitRef` interval (lines 111-136 in `UbiquityApp.tsx`) starts immediately on mount, emitting 1-2 wavefronts every 2-4 seconds with no startup delay. On page load this chains with the initial render, terrain generation, and 3D setup — bogging down performance during the critical first seconds.

## Solution
Add a **startup grace period** and **rate limiting** so the "world has been alive" ambiance is present but controlled:

1. **Delay first auto-emit by 5 seconds** after mount — let the scene fully settle before any background emissions begin.

2. **Reduce emission count to exactly 1** per interval (remove the `1 + Math.floor(Math.random() * 2)` which can emit 2 at once).

3. **Increase interval to 4-6 seconds** (currently 2-4s) — halves the wavefront generation rate.

4. **Cap active wavefronts** — skip auto-emit if there are already more than 8 active wavefronts in the simulation. This prevents pile-up when the user is also manually emitting.

5. **Pause during story mode** — if a story arc is running, let the story control emissions exclusively.

## File Changes

| File | Change |
|------|--------|
| `src/components/UbiquityApp.tsx` | Add 5s `setTimeout` wrapper before starting interval. Reduce count to 1. Increase interval to `4000 + Math.random() * 2000`. Add `wavefronts.length < 8` guard. Add `storyActive` guard to skip auto-emit during story. |

## Technical Detail
```typescript
// Controlled ambient emissions
useEffect(() => {
  const startupDelay = setTimeout(() => {
    autoEmitRef.current = setInterval(() => {
      // Skip if too many active wavefronts or story is running
      if (simulation.wavefronts.length >= 8) return;
      if (storyMode.isActive) return;
      
      const agents = nodesRef.current.filter(n => n.type === 'agent');
      if (agents.length === 0) return;
      const agent = agents[Math.floor(Math.random() * agents.length)];
      simulation.emitWavefront(agent.x, agent.y);
      signalEngine.emitSignal();
      setEmittingAgentIds([agent.id]);
      setTimeout(() => setEmittingAgentIds([]), 800);
    }, 4000 + Math.random() * 2000);
  }, 5000);

  return () => {
    clearTimeout(startupDelay);
    if (autoEmitRef.current) clearInterval(autoEmitRef.current);
  };
}, [simulation, signalEngine]);
```

