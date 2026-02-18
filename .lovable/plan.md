

# Surface Continuous Siren Emissions + Warrant Volume Amplification

## Overview

Two changes: (1) make continuous agent emissions visible with per-agent emission pulses and siren-specific visuals, and (2) wire warrants into the signal tick so active warrants amplify volume per tick.

## Changes

### 1. `src/hooks/useSignalEngine.ts` -- Warrant Volume Boost per Tick

In the 10Hz signal tick loop (line ~37-48), after computing base volume accrual, check for active warrants whose `sourceSignalIds` include the current signal. Each matching active warrant adds a volume boost per tick:

```
// After vol += volumeRate * dt:
const matchingWarrants = warrantsRef.current.filter(
  w => w.status === 'active' && w.sourceSignalIds.includes(sig.id)
);
const warrantBoost = matchingWarrants.reduce((sum, w) => sum + w.priority * 0.03, 0);
vol += warrantBoost * dt;
```

This creates a feedback loop: signal crosses threshold, mints warrant, warrant boosts volume further, which can trigger escalation. Demurrage still decays, creating tension between warrant amplification and decay.

Add a `warrantsRef` to avoid stale closure issues in the tick interval.

Also increase `volumeRate` range for TENSION signals specifically (0.04-0.08 instead of 0.02-0.04) so sirens escalate faster.

### 2. `src/components/UbiquityApp.tsx` -- Surface Agent Emissions Visually

Update the auto-emit interval to:
- Track which agents just emitted by storing their IDs
- Create visual effects at emitting agent positions (small pulse effect)
- In acoustic mode, specifically emit TENSION kind signals (sirens) more frequently (60% chance of TENSION vs random)
- Pass emitting agent IDs to Canvas3D so nodes can show emission flash

Add `emittingAgentIds` state (string array, cleared after 800ms) and pass to Canvas3D.

### 3. `src/components/Canvas3D.tsx` -- Emission Flash on Nodes

Add `emittingAgentIds` prop. When a node's ID is in this list:
- Show a brief emission ring expanding outward from the node (a second ring mesh that scales up and fades)
- In acoustic mode, tint the emission ring orange/red for siren visual
- Add a small point light flash at the emitting node position

Update the `Node3D` component to accept `isEmitting` boolean and render the flash mesh.

### 4. `src/components/HUD.tsx` -- Show Warrant Amplification

Add a row showing warrant amplification factor -- the total volume boost being applied by active warrants. Format: "Warrant Amp: +0.06/tick" or similar. This surfaces the feedback loop to the user.

## File Summary

| File | Change |
|---|---|
| `src/hooks/useSignalEngine.ts` | Warrant boost in tick loop, TENSION bias for acoustic |
| `src/components/UbiquityApp.tsx` | Track emitting agents, pass IDs to Canvas3D |
| `src/components/Canvas3D.tsx` | Emission flash ring on emitting nodes |
| `src/components/HUD.tsx` | Show warrant amplification metric |

