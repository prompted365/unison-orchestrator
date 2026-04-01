

# Alignment & Discrepancy Analysis + Annotation Plan

## Alignment: What the Visualization Gets Right

### 1. Entity Model → Node Types
The codebase correctly models the **actor subgraph** with distinct entity kinds: Mogul (autonomous agent/conductor), Ghost Chorus (spectral disposition injectors), Epitaph Extractors (durable record forges), Ecotone Gates (boundary mediators), Drift Trackers, Economy Whispers. Each has distinct 3D geometry and visual behavior — this maps cleanly to `entity_kind` + `actor_mode` from the ontology.

### 2. Communication Bands → Physics Modes
The three communication bands (acoustic/light/gravity) align with the ontology's signal emission model. Acoustic = omnidirectional pub/sub with attenuation. Light = high-speed broadcast with lensing/reflection. Gravity = constitutional field pressure. The `usePhysics.ts` muffling model (0.6x per hop through attenuation boundaries) correctly represents graduated signal degradation rather than binary permission gating.

### 3. Wavefront Mechanics → Signal Lifecycle
Wavefronts expanding from emitters, losing energy over distance, and interacting with world objects (walls attenuate, lenses focus, mirrors reflect, masses warp) is a faithful spatial analogue of the CGG signal lifecycle: emission → propagation → reception → decay.

### 4. Warrant Escalation → Volume Threshold
The story mode's warrant escalation sequence (repeated broadcasts increasing volume until warrant is minted) correctly demonstrates the canonical pattern: signal volume crosses threshold → warrant minted → requires human triage.

### 5. Terrain as Invariant Field
Invariant masses pinning the terrain and creating gravity wells is a direct spatial metaphor for the **invariant field** described in the glossary: "structured space of constitutional invariants... each invariant has a tension plate in the substrate visualization."

### 6. Epitaph Mechanics
Epitaphs appearing as burn-up animations from nodes that compress signal outcomes into durable dispositions aligns with the glossary definition: "conformation-proximity memory artifact encoding a failure mode's shape."

---

## Discrepancies: What's Missing or Misaligned

### D1. No Entity Standing / Differentiated Access
The ontology defines 7 standing levels (citizen, resident, ambassador, foreign_delegate, recognized_body, registered_artifact, guest). The visualization treats all agents identically in terms of what they can receive. There's no visual encoding of **standing** — which determines "how the system treats an entity." An ambassador and a guest look the same.

**Impact on Talos**: Talos has scoped buildings and infrastructure. Standing determines who can enter which ring/scope. The visualization needs standing-based visual differentiation.

### D2. No Actor Mode Distinction
The ontology defines 5 actor modes (none, invoked, delegated, autonomous, collective). The visualization only distinguishes `orchestrator` vs `agent`. A delegated ephemeral worker looks identical to an autonomous citizen. Mogul is correctly labeled autonomous, but skills (invoked) and offices (none) aren't represented.

### D3. Agent Inbox Not Modeled
Agent inboxes are a major communication surface — lateral agent-to-agent work-item routing with a full state machine (arrived → seen → claimed → in_progress → completed → archived). The visualization only shows orchestrator-to-agent broadcast. There's no lateral communication, no inbox queue visualization, no attention-debt signaling.

**Alignment note**: Inboxes are "public service, auditable by anybody" as you mentioned — this means they could be visualized as open mailbox geometry at each node, with visible queue depth.

### D4. Astragals Not Modeled
The high-assurance transport layer (WAL-backed, HMAC-verified, per-sender monotonic sequence) is completely absent. Connection lines between nodes show signal strength but don't differentiate between casual broadcast reception and Astragals point-to-point guaranteed delivery.

**Visual opportunity**: Astragals connections should look fundamentally different from broadcast reception — thick, direct, sealed tubes vs. diffuse wavefront contact.

### D5. No Lineage / Edge Visualization
The ontology defines 13 actor edges (SPAWNED, DELEGATED_BY, ACTED_FOR, HAS_ROLE, etc.) and 4 artifact edges. The visualization only shows orchestrator-to-agent connection lines. There's no edge-type differentiation — a SPAWNED relationship looks identical to a RELAYED_TO or DELEGATED_BY.

### D6. Governance Lattice Absent
Rung hierarchy (site < domain < estate < federation < global) isn't spatially encoded. Talos has concentric rings for scope — the current flat terrain doesn't express this. Objects and agents exist at the same "level" regardless of jurisdiction.

### D7. Coordinate System Not Documented for Talos Integration
The visualization uses a 2D pixel coordinate system (800×560) mapped to 3D world space via `SCALE=0.02` centered at `(400, 280)`. This mapping is implicit and undocumented. Talos engineers need explicit coordinate contracts to place estate-level visualizations within the city topology.

### D8. Object Types Don't Map to Canonical Vocabulary
- `wall` → "Attenuation Boundary" (correct label, but `type: 'wall'` in code)
- `lens` → "Observability Lens" (correct)
- `mirror` → "Specular Surface" (correct)
- `mass` → "Invariant Mass" (correct label, but the ontology calls these "invariant field" tension plates)

The internal type names should use canonical vocabulary for Talos legibility.

### D9. No Tic / Governance Time
The simulation uses wall-clock time exclusively. The canonical system uses **tics** (governance epoch boundaries). Talos will need tic-awareness for inbox TTL, signal lifecycle, and CogPR maturity.

### D10. CogPR / Artifact Subgraph Absent
Governance objects (CogPRs, signals, mandates, rules, policies) have no visualization. These are the artifact-class entities that "influence decisions." The story mode mentions them narratively but doesn't render them as entities in the scene.

---

## Annotation Plan

Add structured comments throughout the codebase for two audiences:

### Civil Engineer Comments (`// [CE]`)
Focus: physics integrity, governance constraints, scope boundaries, signal propagation correctness, coordinate contracts.

### Videographer Comments (`// [VG]`)
Focus: visual encoding, human legibility, "truth without tooltips" readiness, spatial pattern recognition, scale/proportion notes for Talos integration.

### Files to Annotate

| File | Annotation Focus |
|------|-----------------|
| `src/types/index.ts` | [CE] Map each type to canonical ontology. Note missing fields (standing, actor_mode, entity_class). Note coordinate contract (px space, SCALE factor). [VG] Note which visual properties encode which semantic axes. |
| `src/components/Canvas3D.tsx` | [CE] Document terrain physics (noise octaves, mass anchoring, signal pressure). Document coordinate transform. Note governance scope gap (no rung rings). [VG] Document visual encoding per entity type. Note scale ratios for Talos building integration. Document lighting rig for consistency. |
| `src/hooks/usePhysics.ts` | [CE] Map physics profiles to canonical band semantics. Document attenuation model vs. ontology's standing-based access. Note: no Astragals channel modeled. Document echo/reflection/refraction mechanics. |
| `src/hooks/useSimulation.ts` | [CE] Document wavefront lifecycle vs. canonical signal lifecycle. Note wall-clock vs. tic time gap. Document energy decay model. |
| `src/hooks/useStoryMode.ts` | [VG] Document STORY_LAYOUT coordinate rationale. Document camera positions and framing intent per act. [CE] Document deterministic layout overrides and their canonical justification. |
| `src/components/UbiquityApp.tsx` | [CE] Document agent initialization, object placement, and their canonical entity mappings. [VG] Document UI surface inventory and interaction model. |
| `src/hooks/useOrchestrator.ts` | [CE] Document orchestrator state fields and their canonical governance equivalents. |
| `src/hooks/useSignalEngine.ts` | [CE] Document signal types (BEACON, LESSON, TENSION) vs. canonical signal taxonomy. |

### Comment Format

```typescript
// ═══ [CE] CIVIL ENGINEER ═══════════════════════════════════════
// Canonical: {ontology term} — {brief mapping}
// Gap: {what's missing for Talos}
// Constraint: {physics/governance invariant this code upholds}
// ════════════════════════════════════════════════════════════════

// ═══ [VG] VIDEOGRAPHER ═════════════════════════════════════════
// Encodes: {what semantic axis this visual represents}
// Scale: {size ratios, distance units}
// Legibility: {how a human reads this without tooltips}
// Talos: {integration note for city-scale rendering}
// ════════════════════════════════════════════════════════════════
```

### Discrepancy Summary Comments
At the top of `src/types/index.ts`, add a block documenting all 10 discrepancies as a migration checklist for the Talos integration team.

### Implementation: ~8 files annotated, no behavioral changes, no new features. Pure documentation pass.

