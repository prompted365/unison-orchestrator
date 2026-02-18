

# Simulation-Grade Physics + CGG State Machines

This plan upgrades the Signal Manifold Monitor from a click-triggered CSS animation demo into a continuously running physics simulation with live signal mechanics.

## Current Limitations

- **No simulation loop** -- system only responds to clicks, then goes dormant
- **Flat attenuation** -- simple `e^(-alpha*d)` with no inverse-square law
- **Instant light** -- delay of `d / 3e8` is effectively 0ms, making light mode indistinguishable from gravity
- **No multipath** -- acoustic echoes are decorative CSS, not computed reflections
- **No signal lifecycle** -- the CGG type stubs (Signal, Warrant, HarmonicTriad) exist but are completely unwired
- **Static HUD** -- values only update on click, then freeze

## Architecture

Three new hooks power the simulation. The existing components become thin renderers.

```text
+---------------------+
|   useSimulation()   |  60fps requestAnimationFrame loop
|   (new hook)        |  Owns: wavefronts[], propagation, collisions
+----------+----------+
           |
+----------v----------+     +---------------------+
|   usePhysics()      |     | useSignalEngine()   |
|   (upgraded)        |     | (new hook)          |
|   Inverse-square    |     | Signal volume       |
|   Multipath echo    |     | Warrant minting     |
|   Lens refraction   |     | Harmonic triads     |
|   Geodesic curves   |     | Demurrage decay     |
+---------------------+     +---------------------+
           |                          |
+----------v--------------------------v----+
|            Canvas (renderer)              |
|   Wavefronts drawn per-frame              |
|   Connection lines with curvature         |
|   Live SNR halos on agents                |
+-------------------------------------------+
```

## Changes by File

### 1. New: `src/hooks/useSimulation.ts` -- Continuous Simulation Loop

A `requestAnimationFrame`-based tick loop that runs at 60fps and manages:

- **Wavefront propagation**: Each "Emit Signal" spawns a wavefront object with position, radius (expanding at mode velocity), energy (decaying via inverse-square + absorption). The loop grows radius each frame by `velocity * dt`.
- **Per-agent SNR computation**: Every frame, each agent's received signal is computed from all active wavefronts based on distance, occlusion, and mode physics. This replaces the one-shot setTimeout approach.
- **Wavefront-object collisions**: When an acoustic wavefront hits a wall, a secondary echo wavefront spawns from the reflection point. When a light wavefront hits a lens, it spawns a focused secondary. When it hits a mirror, it spawns a reflected secondary.
- **Gravity geodesic warping**: In gravity mode, wavefront expansion rate slows near masses (simulating time dilation). Agents near masses receive signals with phase delay.
- **Automatic cleanup**: Wavefronts with energy below 0.01 or radius beyond canvas bounds are pruned.

The hook exposes: `wavefronts`, `agentSignals` (live per-agent SNR map), `emitWavefront()`, `reset()`.

Time scaling: acoustic velocity (343 m/s) is scaled so a wavefront crosses the ~13m canvas in about 2.5 seconds (visible propagation). Light is ~50x faster (near-instant but not literally instant -- crosses in ~50ms so you see the flash sweep). Gravity matches light speed but with visible warping near masses.

### 2. Upgraded: `src/hooks/usePhysics.ts` -- Realistic Attenuation Model

Replace the flat exponential with a proper model per mode:

- **Acoustic**: Inverse-square law (`1/r^2`) combined with absorption coefficient (`e^(-alpha*r)`), plus a 0.3x occlusion penalty when a wall blocks line-of-sight. Echo computation: for each wall, calculate specular reflection point and return secondary source position + attenuated energy.
- **Light**: Inverse-square law with very low absorption. Lenses multiply signal by a focus factor (1.4x) when the wavefront passes through. Mirrors redirect: compute reflection angle, return new propagation direction.
- **Gravity**: No attenuation (signal strength = 1.0 everywhere), but `getPhaseSkew` returns a proper Schwarzschild-inspired time dilation factor: `dt' = dt * (1 + rs / (2 * distance))` where `rs` is proportional to mass size. This creates visible timing differences -- agents near masses receive the signal slightly later despite no energy loss.

New exported functions:
- `computeReflection(wallRect, incidentAngle)` -- returns reflection angle
- `computeRefraction(lensCenter, lensRadius, incidentPos, incidentDir)` -- returns bent direction
- `computeTimeDilation(position, masses)` -- returns local clock rate multiplier

### 3. New: `src/hooks/useSignalEngine.ts` -- CGG State Machines

Wires the `Signal`, `Warrant`, and `HarmonicTriad` types into live mechanics:

**Signal lifecycle** (continuous):
- On each simulation tick, every active signal's volume accrues: `volume += volumeRate * dt`
- Volume is capped at `maxVolume`
- Demurrage decays volume: `volume -= demurrageRate * volume * dt` (phase-dependent rate from barometer)
- TTL countdown: signal expires when `age > ttlHours` (scaled to seconds for simulation)
- Distance muffling: effective volume at an agent = `volume * SNR` (from physics)

**Warrant minting** (discrete):
- `volume_threshold`: When any signal's effective volume at any agent exceeds 0.8, mint a warrant
- `harmonic_triad`: When a BEACON + LESSON + TENSION signal are simultaneously active within a time window (~5 seconds), detect the triad and mint
- `circuit_breaker`: When `breachRisk > 0.25`, auto-mint a warrant

**Warrant lifecycle**:
- Active warrants display as pulsing overlay effects on the canvas
- Warrants have a `stakeBond` cost displayed in HUD
- Warrants auto-expire after 30 seconds (scaled TTL)

**Harmonic detection**:
- Sliding window checks for co-occurrence of BEACON (kind) + LESSON (kind) + TENSION (kind) signals
- When detected, emits a special "triad resonance" visual effect and mints a harmonic warrant

The hook exposes: `signals`, `warrants`, `triads`, `emitSignal(kind, band)`, `acknowledgeWarrant(id)`, `dismissWarrant(id, bond)`.

### 4. Updated: `src/types/index.ts` -- New Types

Add:
- `Wavefront`: `{ id, sourceX, sourceY, radius, energy, velocity, mode, isEcho, parentId, angle?, createdAt }`
- `AgentSignalState`: `{ agentId, snr, receivedAt, wavefrontId, phaseDelay }`
- Extend `Effect` type with: `'wavefront' | 'reflection' | 'refraction' | 'triad-resonance' | 'warrant-pulse'`

### 5. Updated: `src/components/Canvas.tsx` -- Wavefront Renderer

Major refactor:
- Remove the setTimeout-based broadcast logic (move to useSimulation)
- Render wavefronts as expanding SVG circles (or absolutely positioned divs) with radius and opacity driven by simulation state, not CSS animations
- Draw **connection lines** from conductor to each agent: straight lines in acoustic/light, geodesic curves (quadratic bezier bent toward masses) in gravity mode. Line opacity = current SNR.
- Agent nodes get a real-time **signal halo**: a glow ring whose size and brightness tracks their live SNR from the simulation
- Wavefront rendering: each active wavefront renders as a circle at its current radius with opacity proportional to energy. Acoustic wavefronts are orange, light wavefronts are cyan, gravity wavefronts are purple.
- Secondary wavefronts (echoes, reflections) render with dashed borders

### 6. Updated: `src/components/EffectComponent.tsx` -- New Effect Types

Add renderers for:
- `wavefront`: circle with radius/opacity from props (no CSS animation -- driven by simulation)
- `reflection`: small flash at reflection point
- `refraction`: directional glow through lens
- `triad-resonance`: triple-ring pulsing effect when harmonic triad detected
- `warrant-pulse`: persistent pulsing border overlay when warrant is active

### 7. Updated: `src/components/HUD.tsx` -- Live Telemetry

HUD now receives simulation state and updates every frame:
- **Active Wavefronts**: count of propagating wavefronts
- **Active Signals**: count from signal engine
- **Active Warrants**: count + highest priority
- **Triads Detected**: running count
- **Agent SNR Range**: min-max across all agents (live)
- **Barometer Phase**: with color-coded phase indicator (green/yellow/orange/red/purple for 0-4)
- **Demurrage Rate**: with trend arrow (increasing/decreasing)
- All values update continuously via the simulation loop

### 8. Updated: `src/components/UbiquityApp.tsx` -- Wire Everything

- Instantiate `useSimulation(mode, nodes, objects)` and `useSignalEngine(mode, orchestrator)`
- "Emit Signal" button calls `simulation.emitWavefront()` + `signalEngine.emitSignal(randomKind, modeBand)`
- Pass `simulation.wavefronts` and `simulation.agentSignals` to Canvas
- Pass `signalEngine.signals`, `signalEngine.warrants`, `signalEngine.triads` to HUD
- The continuous loop means the canvas is always alive -- wavefronts propagate, agents pulse, HUD updates

### 9. Updated: `src/index.css` -- New Visual Classes

- `.wavefront-ring`: no CSS animation (position/size driven by JS)
- `.connection-line`: SVG line with mode-colored stroke
- `.agent-halo`: radial gradient glow, size bound to SNR
- `.triad-resonance`: triple concentric rings animation
- `.warrant-overlay`: pulsing border animation
- `.phase-indicator`: colored dot for barometer phase (5 colors)

## What This Achieves

- **Acoustic mode**: You see the orange wavefront physically expand across the canvas at visible speed (~2.5s to cross). It hits a Permission Gate and spawns a dashed echo wave bouncing back. Agents light up as the wavefront reaches them -- near agents first, far agents seconds later. Occluded agents behind walls receive weaker signals (dimmer halo).

- **Light mode**: Cyan flash sweeps across almost instantly but you can see it. Lenses create focused secondary beams. Mirrors bounce rays at computed angles. No hard occlusion -- all agents receive signal, but with inverse-square falloff.

- **Gravity mode**: Purple metric ripple expands. Near Invariant Masses, the ripple visibly slows (time dilation). All agents receive full-strength signal but with timing differences -- agents near masses show a phase delay. Geodesic connection lines curve around masses.

- **CGG layer**: Signals accrue volume over time. When thresholds cross, warrants auto-mint with visual fanfare. Harmonic triads (3 signal types co-occurring) trigger resonance effects. Demurrage steadily decays idle signals. The HUD shows all of this live.

## Files Summary

| File | Status | Purpose |
|---|---|---|
| `src/hooks/useSimulation.ts` | New | 60fps wavefront propagation loop |
| `src/hooks/useSignalEngine.ts` | New | Signal/Warrant/Harmonic state machines |
| `src/hooks/usePhysics.ts` | Updated | Inverse-square, multipath, geodesics |
| `src/types/index.ts` | Updated | Wavefront, AgentSignalState types |
| `src/components/Canvas.tsx` | Updated | Render wavefronts + connection lines |
| `src/components/EffectComponent.tsx` | Updated | New effect types |
| `src/components/HUD.tsx` | Updated | Live telemetry from simulation |
| `src/components/UbiquityApp.tsx` | Updated | Wire simulation + signal engine |
| `src/index.css` | Updated | New visual classes |
| `src/types/orchestration.ts` | Unchanged | Type stubs already correct |

