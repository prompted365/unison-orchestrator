

# Manifold Dashboard + Gradient Aesthetic System

## Overview

Two major upgrades merged into one implementation:

1. **ManifoldDashboard** -- Replace the flat HUD with a Constitution-of-Attention-aware panel surfacing all required metrics from the CGG v3 docs (band budgets, breach flags, warrant docket, economic bridge, harmonic triads, resonance/dissonance).

2. **Gradient Configuration Levers** -- Four sliders (ABSTRACTION, DIMENSIONALITY, ORGANIC, TENSION) that dynamically alter the 3D scene's visual style in real-time: materials, colors, fog density, wireframe vs volumetric, bioluminescent vs schematic. The underlying signal physics remain invariant.

---

## Part 1: ManifoldDashboard (Constitution-Aware HUD)

### 1A. New Types (`src/types/orchestration.ts`)

Add the following interfaces:

- `BreachFlags` -- `{ frozen: boolean; reserve_breach: boolean; rate_band_breach: boolean; mint_halted: boolean }`
- `EconomicBridgeState` -- `{ locked_stake: number; penalty_accrued: number; disbursement_safe: boolean; demurrage_tier: string }`
- `PhaseTier` type -- `'SimOnly' | 'PaperTrading' | 'ShadowLive' | 'LiveRestricted' | 'LiveFull'`
- Add `subsystem?: string` field to `Signal` interface

### 1B. Signal Engine Enhancements (`src/hooks/useSignalEngine.ts`)

- Derive `BreachFlags` from `barometerPhase`:
  - Phase 0: all false
  - Phase 1: rate_band_breach
  - Phase 2: + reserve_breach
  - Phase 3: + mint_halted
  - Phase 4: + frozen
- Expose signal census: counts by Kind (BEACON/LESSON/OPPORTUNITY/TENSION) and by Band (PRIMITIVE/COGNITIVE/SOCIAL/PRESTIGE)
- Expose warrant lifecycle breakdown (active/acknowledged/dismissed/expired counts)
- Track resonance (same subsystem + same band + rising volume) and dissonance (different subsystem + opposing kind)
- Expose `loudestSignal` (kind + volume + subsystem)
- Band budget enforcement: auto-decay PRESTIGE signals, apply -6dB/-12dB multipliers to COGNITIVE/SOCIAL

### 1C. Orchestrator Enhancements (`src/hooks/useOrchestrator.ts`)

- Add `phaseTier` to state (derived from barometerPhase: 0=SimOnly, 1=PaperTrading, 2=ShadowLive, 3=LiveRestricted, 4=LiveFull)
- Add `breachFlags` to state
- Add `economicBridge` to state: locked_stake (sum of active warrant stakeBonds), penalty_accrued, disbursement_safe

### 1D. ManifoldDashboard Component (`src/components/ManifoldDashboard.tsx`)

Replaces `HUD.tsx`. Collapsible sections using Radix Collapsible:

**Section A: Constitution Header**
- Barometer Phase with named tier (SimOnly...LiveFull) and colored dot
- Breach Flags as 4 discrete boolean indicators (colored red when true, dim when false)
- Demurrage rate with tier label

**Section B: Signal Census**
- Grid of BEACON/LESSON/OPPORTUNITY/TENSION counts
- Band budget bars: PRIMITIVE (0dB) / COGNITIVE (-6dB) / SOCIAL (-12dB) / PRESTIGE (muted) with fill proportional to count
- Loudest signal callout (kind + volume)
- Warrant amplification rate

**Section C: Warrant Docket**
- Status breakdown: Active / Acknowledged / Dismissed / Expired
- Each active warrant rendered as a mini-card: minting condition icon, priority bar, stake bond
- Acknowledge/Dismiss buttons per warrant (dismiss shows stake cost)

**Section D: Harmonic Triads**
- List of detected triads showing the 3 contributing signal kinds with gold accent
- Count of total triads detected

**Section E: Economic Bridge**
- Demurrage tier + rate
- Locked stake total
- Penalty accrued
- Disbursement guard status (SAFE in green / UNSAFE in red)

**Section F: Agent Hearing Map**
- Per-agent effective volume: `volume - (hops * muffling_per_hop)` where hops defaults to 5 units
- SNR range (existing)

### 1E. Controls Update (`src/components/Controls.tsx`)

- When warrants are active, show "Acknowledge Warrant" and "Dismiss Warrant" buttons
- Dismiss button shows stake cost (stakeBond value)

### 1F. Canvas3D Updates (`src/components/Canvas3D.tsx`)

- Active warrants render as pulsing geometric markers (octahedron wireframe) at source signal location
- Circuit breaker warrants flash the floor grid red briefly
- Cockpit mode hover on nodes shows effective volume (with muffling applied)

---

## Part 2: Gradient Configuration Levers

### 2A. Lever State (`src/hooks/useGradientConfig.ts`)

New hook managing four 0.0-1.0 sliders:

```text
ABSTRACTION:    0.0 (schematic/wireframe) -- 1.0 (cymatic/ethereal)
DIMENSIONALITY: 0.0 (flat/isometric)      -- 1.0 (volumetric/deep space)
ORGANIC:        0.0 (silicon/metal)        -- 1.0 (bioluminescent/neural)
TENSION:        0.0 (smooth/equilibrium)   -- 1.0 (jagged/interference)
```

Returns derived visual parameters:
- `fogDensity`: 0 at low DIM, up to 0.08 at high
- `fogColor`: dark blue at low ORGANIC, deep violet at high
- `nodeGeometry`: 'sphere' at low ABS, 'icosahedron' at mid, 'points' at high
- `materialType`: 'standard' at low ORG, 'phong+emissive' at mid, 'shader' at high
- `wireframeRatio`: proportion of meshes rendered as wireframe (higher ABS = more wireframe for non-warrants)
- `chromaticAberration`: 0 at low TENSION, up to 0.3 at high (applied as color offset on wavefronts)
- `wavefrontStyle`: 'smooth-sphere' at low TEN, 'ripple-interference' at mid, 'shockwave-spike' at high
- `colorPalette`: shifts from cyan/slate at low ORG to amber/bioluminescent at high
- `starField`: density and style shift with DIM (sparse dots at low, nebula-like at high)
- `connectionStyle`: clean lines at low ABS, bezier curves at mid, particle streams at high

### 2B. Gradient Panel UI (`src/components/GradientPanel.tsx`)

A collapsible panel (bottom-left, mirroring the HUD on top-right) with 4 labeled Radix Sliders:

- Each slider has a label and a keyword readout showing the current visual mode:
  - ABS 0.2 = "Schematic" / ABS 0.7 = "Heat Map" / ABS 0.95 = "Cymatic"
  - DIM 0.1 = "Isometric" / DIM 0.6 = "Depth Field" / DIM 0.9 = "Volumetric"
  - ORG 0.0 = "Silicon" / ORG 0.5 = "Ferrofluid" / ORG 0.9 = "Mycelium"
  - TEN 0.0 = "Equilibrium" / TEN 0.5 = "Interference" / TEN 0.9 = "Critical Mass"
- Three preset buttons: "Engineer" (0.1/0.2/0.0/0.0), "Operator" (0.5/0.6/0.4/0.5), "Physics" (0.9/1.0/0.8/1.0)

### 2C. Canvas3D Visual Integration (`src/components/Canvas3D.tsx`)

Accept `gradientConfig` prop and apply derived parameters:

**Fog**: Add `<fog>` element to scene, density and color driven by DIM and ORG.

**Floor**: At low ABS, clean grid. At mid ABS, heat-map colored grid cells. At high ABS, no grid -- replaced with particle field.

**Nodes**: At low ORG, polished metallic material. At mid, translucent resin with subsurface glow. At high, bioluminescent point clouds with neural-dendrite connection lines.

**Wavefronts**: At low TENSION, smooth expanding spheres. At mid, overlapping ripple interference (multiple overlapping rings). At high, jagged spike geometry with chromatic color shift.

**Warrants**: Always rendered as hard-edged crystallized geometry (per the spec: "Crystallized, hard-edged geometric artifacts forming at the intersection of conflicting waves"). Not affected by ORGANIC slider -- they represent the invariant economic layer.

**Stars/Background**: At low DIM, minimal starfield. At high DIM, dense nebula with volumetric fog and ray-like streaks.

**Connection Lines**: At low ABS, straight lines. At mid, bezier curves (existing gravity mode style). At high, particle streams flowing along the path.

---

## File Summary

| File | Change |
|---|---|
| `src/types/orchestration.ts` | Add BreachFlags, EconomicBridgeState, PhaseTier, subsystem field |
| `src/hooks/useSignalEngine.ts` | Breach flags, band census, resonance/dissonance, warrant lifecycle, loudest signal, band budget enforcement |
| `src/hooks/useOrchestrator.ts` | PhaseTier, breachFlags, economicBridge in state |
| `src/hooks/useGradientConfig.ts` | New hook: 4 levers + derived visual params |
| `src/components/ManifoldDashboard.tsx` | New component: 6-section collapsible dashboard replacing HUD |
| `src/components/GradientPanel.tsx` | New component: 4 sliders + 3 presets for visual style |
| `src/components/Controls.tsx` | Add warrant acknowledge/dismiss buttons |
| `src/components/Canvas3D.tsx` | Warrant 3D markers, circuit breaker flash, gradient-driven materials/fog/geometry |
| `src/components/UbiquityApp.tsx` | Wire new state, replace HUD with ManifoldDashboard, add GradientPanel |
| `src/index.css` | Add gradient panel styles |

---

## Why This Works

The Gemini gradient system and the ManifoldDashboard are complementary, not competing:

- The **ManifoldDashboard** surfaces the *message* (signal pressure, warrant state, economic bridge, breach flags) -- the Constitution of Attention.
- The **Gradient Levers** alter the *metaphor* (schematic vs dashboard vs living organism) -- letting users see the same invariant physics through different visual lenses.
- Warrants are explicitly excluded from the ORGANIC slider because they represent crystallized economic artifacts -- they must always appear hard-edged and geometric regardless of aesthetic mode.

The three presets map directly to the doc's iterations: Engineer's View (blueprint), Operator's View (live ops dashboard), Physics View (acoustic substrate visualization).

