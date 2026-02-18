

# CGG Semantic Relabeling -- Complete Pass

## What's Already Done
- Title: "Signal Manifold Monitor"
- Subtitle references Sirens, CogPR, Warrants, Epitaphs
- Mode selector labels: Acoustic/Siren, Light/CogPR, Gravity/Warrant
- Epitaph pin content uses correct CGG titles (Siren warning, CogPR reflection note, Warrant drift advisory)
- Button labels: Emit Signal, Add Obstacle, Drop Epitaph, Reset Manifold

## What Still Uses Generic/Old Terms

### 1. Node Tooltips (NodeComponent.tsx)
**Current:** `Conductor` / `Actor` with generic capabilities like `compute, storage, network`
**Target:** Map to CGG actor names. The Conductor node should display as **"Conductor (Mogul)"** and agent nodes should show their cluster identity -- e.g., "Ghost Chorus", "Ecotone Gate", "Drift Tracker", "Economy Whisper", "Epitaph Extractor" -- matching the extension pipeline from the substrate inventory (`_45`, `_52`, `_55`, `_60`, `_65`).

### 2. Capabilities / Subsystems (UbiquityApp.tsx)
**Current:** `['compute', 'storage', 'network', 'security', 'analytics']`
**Target:** `['ghost_chorus', 'economy_whisper', 'drift_tracker', 'ecotone_gate', 'epitaph_extractor']` -- these are the actual CGG subsystem names from the wiring plan.

### 3. Task Names (useOrchestrator.ts)
**Current:** Generic names like "Data Processing", "Network Sync", "Security Check"
**Target:** Signal operations: "Siren Tick", "Warrant Triage", "CogPR Review", "Harmonic Scan", "Drift Measurement" -- matching `/siren tick`, `/grapple`, and triad detection from the skill updates.

### 4. HUD Labels (HUD.tsx)
**Current:** Generic physics labels (v, TTL, px/m, Rmax, Latency, Risk, Congestion)
**Target:** CGG-specific labels per mode:
- **All modes:** "Channel", "Propagation", "Muffling/hop", "Band Budget"
- **Acoustic:** Show `muffling_per_hop: 5`, band: PRIMITIVE (0 dB)
- **Light:** Show `cross-scope attenuation`, band: COGNITIVE (-6 dB)
- **Gravity:** Show `phase_warp_factor`, band: PRIMITIVE (bypass muffling)
- Replace "Latency/Risk/Congestion" with "Field Latency", "Breach Risk", "Signal Congestion"

### 5. Object Tooltips (ObjectComponent.tsx)
**Current:** `Permission Gate`, `Invariant Mass`, `Observability Lens`, `Mirror`
**These are already correct** from the previous pass. No changes needed.

### 6. ModeExplanation Descriptions (ModeExplanation.tsx)
**Current:** Already uses muffling/cross-scope/phase-warping language.
**Enrich with:** Specific CGG references:
- Acoustic: mention `muffling_per_hop = 5`, Siren escalation lifecycle (ACTIVE -> ACKNOWLEDGED -> DISMISSED), breach_flags as auto-siren triggers
- Light: mention CogPR lifecycle (propose -> review -> merge/reject via `/grapple`), cross-scope attenuation model, COGNITIVE band at -6 dB
- Gravity: mention Warrant minting conditions (volume_threshold, harmonic_triad, circuit_breaker), stake bond for dismissal, demurrage as volume decay

### 7. Orchestrator State Labels (types/index.ts + useOrchestrator.ts)
**Current:** `OrchestratorState.field` has generic `latency`, `risk`, `congestion`
**Target:** Add CGG-specific fields: `barometer_phase` (0-4), `demurrage_rate`, `breach_flags`, `active_signals_count`

### 8. Dead Types File (types/orchestration.ts)
**Current:** Contains completely generic/unused types (Agent, Task, SwarmState, CommunicationProtocol, etc.) that don't align with CGG at all.
**Target:** Either remove entirely or replace with CGG-aligned type stubs (Signal, Warrant, HarmonicTriad) as groundwork for the state machine phase.

## Files Changed (8 files)

| File | Change Summary |
|---|---|
| `src/components/NodeComponent.tsx` | Tooltip shows CGG actor names instead of generic "Conductor/Actor" |
| `src/components/UbiquityApp.tsx` | Capabilities array uses CGG subsystem names; cluster comments label actor roles |
| `src/hooks/useOrchestrator.ts` | Task names become signal operations; state fields add barometer_phase and demurrage_rate |
| `src/components/HUD.tsx` | Labels become CGG-specific (Band, Muffling/hop, Barometer Phase, Demurrage Rate, Breach Risk, Signal Congestion); values contextualized per mode |
| `src/components/ModeExplanation.tsx` | Descriptions enriched with specific CGG mechanics (muffling_per_hop, CogPR lifecycle, warrant minting conditions, stake bonds) |
| `src/types/index.ts` | OrchestratorState.field gains `barometerPhase` and `demurrageRate` fields |
| `src/types/orchestration.ts` | Replace generic types with CGG-aligned stubs (Signal, Warrant, HarmonicTriad) for future state machine work |
| `src/components/ObjectComponent.tsx` | No changes needed (already correct) |

## Technical Details

### Node-to-Actor Mapping
Each cluster in `initializeScene` gets a CGG identity:

```text
Cluster 0 (cx:310, cy:210, n:3) -> "Ghost Chorus"     (_45)
Cluster 1 (cx:500, cy:230, n:3) -> "Economy Whisper"   (_52)
Cluster 2 (cx:360, cy:370, n:3) -> "Ecotone Gate"      (_60)
Cluster 3 (cx:470, cy:360, n:2) -> "Drift Tracker"     (_55)
Cluster 4 (cx:270, cy:300, n:2) -> "Epitaph Extractor" (_65)
```

Agents get an `actorGroup` field on the Node type so tooltips can display "Ghost Chorus #2 [ghost_chorus, ecotone_gate]" instead of "Actor: compute, storage".

### HUD Band Budget Display
Add a small section showing the active mode's band budget from the CGG spec:

```text
Acoustic -> PRIMITIVE (0 dB) | Always audible
Light    -> COGNITIVE (-6 dB) | Moderate propagation
Gravity  -> PRIMITIVE (0 dB) | Bypasses muffling
```

### New OrchestratorState Fields

```text
field: {
  latency -> fieldLatency
  risk -> breachRisk  
  congestion -> signalCongestion
  barometerPhase: 0-4 (maps to TransitionPhase)
  demurrageRate: 0.0001-0.0003 (per cycle, phase-dependent)
}
```

### CGG Type Stubs (orchestration.ts replacement)
Lightweight interfaces matching the signal schema from `00-SIGNAL-MANIFOLD-ARCHITECTURE.md`:

- `Signal`: id, kind (BEACON/LESSON/OPPORTUNITY/TENSION), band (PRIMITIVE/COGNITIVE/SOCIAL/PRESTIGE), volume, volumeRate, maxVolume, ttlHours, hearingTargets, escalation
- `Warrant`: id, sourceSignalIds, mintingCondition, band, priority, scope, status (active/acknowledged/dismissed/expired), payload
- `HarmonicTriad`: primitiveId, cognitiveId, tensionId, detectedAt, warrantId

These are not wired yet -- they're the type foundation for the state machine phase that follows.

