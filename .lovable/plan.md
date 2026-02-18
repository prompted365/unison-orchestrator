

# Omnidirectional Wavefronts, Time Control, and Narrative Coherence

This plan combines the previously approved physics changes (spherical wavefronts + time scale) with the narrative corrections you've described: renaming "Permission Gates" to reflect the actual governance model, and contextualizing operationTorque as a live working system.

## 1. Rename Objects to Match the Governance Model

"Permission Gate" implies a binary access control. The actual model is a **hearing threshold boundary** -- a surface where muffling_per_hop attenuates signal, frequency filters apply, and the pub/sub matrix determines who hears what. Objects should be renamed throughout:

| Current Name | New Name | Rationale |
|---|---|---|
| Permission Gate (wall) | Attenuation Boundary | Models muffling_per_hop across container edges. Doesn't block -- attenuates. |
| Observability Lens | Observability Lens | Already accurate -- focuses attention, refracts signal topology. |
| Mirror | Specular Surface | Already accurate -- reflects light-band signals at computed angles. |
| Invariant Mass | Invariant Mass | Already accurate -- warps phase timing via gravitational metaphor. |

**Files affected:** `Canvas3D.tsx` (Object3D labels, tooltips), `ModeExplanation.tsx` (descriptions), `Controls.tsx` (tooltip text), `UbiquityApp.tsx` (tooltip text for "Add Obstacle" reworded)

### Attenuation Boundary Behavior Change
Currently walls hard-occlude (binary block). Update `usePhysics.ts` so `isOccluded` returns an **attenuation factor** (0.0-1.0) instead of boolean, based on how many boundaries the signal crosses. This models muffling_per_hop: each boundary crossing reduces effective volume by a configurable factor (e.g., 0.6x per hop), rather than blocking entirely.

## 2. Narrative Contextualization

### Header and Identity
Update the header tagline from just "Constitution of Attention" to include a subtle operational identity:

- Primary: **"Constitution of Attention"**
- Secondary (small, muted): **"opTorq Estate -- Ubiquity OS"**

This grounds the visualization as a live system viewport, not a demo.

### ModeExplanation.tsx Rewrite
Replace the current descriptions with language that reflects the real governance mechanics:

- **Acoustic / Siren Channel**: "Signal propagation through container boundaries. **Attenuation boundaries** reduce effective volume by muffling_per_hop per crossing. Unacknowledged beacons escalate via warrant until addressed by the recipient or their upstream governance logic. Band: PRIMITIVE (0 dB)."
- **Light / CogPR Channel**: "Broad signal propagation. **Observability lenses** focus attention topology; **specular surfaces** reflect beams at computed angles. CogPR lifecycle: propose, review, merge/reject via /grapple. Cross-scope attenuation weakens but never blocks. Band: COGNITIVE (-6 dB)."
- **Gravity / Warrant Channel**: "Global phase-warping signals. **Invariant masses** shear timing via demurrage. Warrants mint on volume_threshold, harmonic_triad, or circuit_breaker. Dismissal requires stake bond. Protects serious inquiry; guards excessive influence sans trust. Band: PRIMITIVE (0 dB) -- bypasses muffling."

### Conductor Label
Change "Conductor (Mogul)" tooltip to: **"Mogul -- Estate Conductor"** to match the operationTorque naming.

## 3. Spherical (Omnidirectional) Wavefronts

Currently all wavefronts render as flat torus rings on the XZ plane. Sound, light, and gravity all propagate omnidirectionally -- expanding spherical shells in 3D.

### Canvas3D.tsx -- Wavefront3D Rewrite

- **Acoustic**: Replace `torusGeometry` with `sphereGeometry`. Wireframe material (visible pressure shell). Orange shifting to amber as energy decays. The sphere expands in all directions from source. Echoes render as dimmer wireframe spheres with green tint.
- **Light**: `sphereGeometry` with solid but very transparent material (opacity 0.06-0.12), bright cyan, thin shell effect (two nested spheres, inner slightly smaller). Fades fast.
- **Gravity**: `sphereGeometry` with purple material and vertex displacement (sine ripple on the surface via `onBeforeCompile` or manual vertex manipulation in `useFrame`), creating a visually undulating 3D spacetime disturbance.
- **Beams**: Keep as directional cylinders -- mirror reflections are correctly non-spherical.

### Position Update
Currently wavefronts sit at y=0.05-0.1 (ground level). Spherical wavefronts should center at the emitter's y position (0.15 for agents, 0.3 for conductor) so the sphere expands outward from the node in all directions.

## 4. Time Scale System

### New Hook: `src/hooks/useTimeScale.ts`

```text
State:
  timeScale: number (multiplier, default 1.0)
  setTimeScale: (scale: number) => void

Presets: [0.01, 0.1, 0.25, 1, 4]

Mode-aware labels:
  Acoustic 0.1x: "Slow motion -- watch pressure fronts propagate"
  Light 0.1x: "Slow motion -- light normalized for observation"  
  Gravity 0.25x: "Quarter speed -- observe spacetime distortion"

Normalization note (always visible):
  "All velocities pedagogically normalized. 
   Acoustic: ~6x10^8 slowdown from 343 m/s
   Light: ~10^-7 c | Gravity: ~10^-6 c"

Resets to 1x on mode change.
```

### useSimulation.ts Integration
- Accept `timeScaleRef: React.MutableRefObject<number>` parameter
- In `tick`: `const scaledDt = dt * timeScaleRef.current`
- Use `scaledDt` for all radius expansion, beam translation, energy decay

### Controls.tsx -- Time Control Strip
Add a compact row below the action buttons:

```text
[0.01x] [0.1x] [0.25x] [1x] [4x]    "1x | Acoustic: ~6x10^8 slowdown"
```

- Small toggle pills for speed presets
- Active preset highlighted
- Mode-specific annotation updates automatically
- The annotation is the key UX element -- it explains WHY the speeds are what they are

## 5. Attenuation Model (usePhysics.ts)

Replace binary `isOccluded` with graduated attenuation:

```text
computeAttenuation(source, target, objects):
  walls = objects.filter(wall)
  crossings = count how many wall bounding boxes the 
              source->target line intersects
  return Math.pow(MUFFLING_PER_HOP, crossings)
  // MUFFLING_PER_HOP = 0.6 (each boundary crossing 
  // reduces signal to 60%)
```

- `calculateSignal` uses this attenuation factor instead of the binary `blocked ? 0.15 : 1` occlusion
- This means signals pass through attenuation boundaries at reduced volume, not blocked -- matching the real governance model where muffling_per_hop attenuates across container boundaries

## 6. UbiquityApp.tsx Wiring

- Import and instantiate `useTimeScale(mode)`
- Create `timeScaleRef` and pass to `useSimulation`
- Pass `timeScale`, `setTimeScale`, and labels to `Controls`
- Update "Add Obstacle" button label and tooltip to use new naming

## File Change Summary

| File | Changes |
|---|---|
| `src/hooks/useTimeScale.ts` | **New.** Time scale state, presets, mode-aware labels and normalization annotations |
| `src/hooks/useSimulation.ts` | Accept timeScaleRef, multiply dt by time scale |
| `src/hooks/usePhysics.ts` | Replace binary isOccluded with graduated computeAttenuation; rename wall references |
| `src/components/Canvas3D.tsx` | Spherical wavefront geometry for all modes; rename "Permission Gate" to "Attenuation Boundary"; update Conductor label; center wavefronts at emitter height |
| `src/components/Controls.tsx` | Add TimeControl strip with speed presets and normalization annotation; update obstacle tooltip |
| `src/components/ModeExplanation.tsx` | Rewrite descriptions for governance accuracy |
| `src/components/UbiquityApp.tsx` | Wire useTimeScale; update header with "opTorq Estate" identity; update object labels |
| `src/types/index.ts` | No structural changes needed |

