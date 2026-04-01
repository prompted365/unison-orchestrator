

# Story Mode Cinematography Overhaul

## What's Good

- **The terrain is gorgeous.** Dynamic heightmap with tectonic drift looks atmospheric and grounded.
- **Gravity arc has visual weight.** The invariant masses with their purple glow and event horizons read well at a distance.
- **Light arc's lensing shot** (Act 4) is the best-framed act — the lens object is large, centered, and clearly the subject.
- **The narration card design** is clean, readable, properly z-indexed now. Controls are integrated well.
- **Progress bar** with segmented acts per band is immediately intuitive.
- **Overall mood** — the sun, warm/cool lighting, terrain — creates a compelling atmosphere.

## What's Terrible

### 1. Camera points at nothing during key moments
The fundamental problem: **broadcasts emit from the orchestrator at world (0, 0, 0), but most camera positions are looking elsewhere.** When the card says "watch the signal cross this boundary," the camera is staring at empty terrain or the backs of distant nodes.

- **Acoustic Act 3** (Attenuation): Camera targets `(-2, 0.15, -1)` to `(-3, 0.15, -2)`. The wall `gate-1` is at 2D `(100, 80)` = world `(-6, -4)`. The broadcast originates at `(0, 0)`. Neither the wall nor the wavefront are reliably in frame.
- **Acoustic Act 6** (Epitaph): Camera at `(3, 2, -2)` targeting `(2, 0.15, -2)`. The pin drops from a random agent — could be anywhere. Screenshot confirms: camera stares at off-screen blobs.
- **Acoustic Act 4** (Warrant Escalation): Six broadcasts fire but camera pulls OUT from `(0, 3, 3)` to `(2, 5, 6)` — moving away from the action as it happens.

### 2. Objects are indistinguishable without labels
- Walls, lenses, mirrors, masses all render as small geometric shapes. At camera distances of 6-12 units, they're ~15px on screen. A newcomer cannot tell which hexagon the card refers to.
- No in-scene labels or callout lines anchor narration to subjects.

### 3. Scene is too dark
- Screenshots show terrain as near-black with faint grid lines. The sun exists but the ambient fill is too low. Nodes are dim specks.

### 4. Broadcasts are generic
- Every "broadcast" action calls the same `onBroadcast()` regardless of which act is playing. The wavefront expands from `(0, 0)` every time. No way to emit from a specific node or toward a specific target for narrative framing.

### 5. Orbit shots see nothing
- Acts 5 (Acoustic), 4 (Gravity), 5 (Light) all use the orbit camera (detected by `cameraStart === cameraEnd && z < 1`). The orbit radius is 6 at height 6-8, looking down at `(0, 0.3, 0)`. At that altitude, nodes are dots. The orbit adds motion but no meaning.

### 6. No "fly-through" intimacy
- Every shot is a slow dolly or static orbit from altitude 2-12. No shots get close enough to see a node's geometry, pulse, or reaction to a signal.

## The Fix: Granular Shot-by-Shot Redesign

### Architecture Changes

**A. Add targeted broadcast action** — new action type `broadcastFrom(nodeId)` so wavefronts can originate from specific agents, not just the orchestrator. Add `emitFromNode` callback.

**B. Add 3D callout overlay system** — HTML overlay anchored to world-space positions via `project()`. A small label + line pointing at the subject of each act. Shows during the act, fades with transitions.

**C. Fix node/object positions for story** — during story mode, override random agent positions with deterministic positions so the camera can find them. Store a `STORY_LAYOUT` constant with fixed positions for key actors.

**D. Brighten the scene** — increase hemisphere light intensity, add subtle ambient fog with warm tint, increase sun intensity.

**E. Add camera `roll` and `shake` support** — for the gravity "sucked in ass-first" gag and fly-through intimacy.

---

### ACOUSTIC ARC — "The Conductor's Voice" (7 acts)

**Act 1 · The Estate** (14s)
- Camera: Start high `(0, 10, 10)`, slow descent to `(0, 5, 6)` targeting `(0, 0, 0)`
- Action: None — establishing shot. All nodes visible, terrain sweeps into view.
- Callout: Label "Mogul" on the orchestrator node at center.

**Act 2 · The Broadcast** (16s)
- Camera: Start at `(1, 2, 2)` looking at `(0, 0.3, 0)` — close to Mogul. End at `(2, 3, 4)` — pull back as wave expands.
- Action: `setAcoustic` at 0.15, `broadcast` at 0.35.
- Key: Camera is close enough to SEE the wavefront sphere emerge from Mogul and expand outward. The pull-back tracks the wavefront.
- Callout: "Acoustic beacon" label appears at wavefront edge.

**Act 3 · Attenuation, Not Permission** (18s)
- Pre-step: Use deterministic wall position. Place `gate-1` at 2D `(280, 200)` = world `(-2.4, -1.6)` so it's near the orchestrator.
- Camera: Start at `(-1, 2, -0.5)` targeting the wall position `(-2.4, 0.15, -1.6)`. End at `(-2, 1.5, -1)` — gets closer to the boundary.
- Action: `highlightBoundary` at 0.2, `broadcast` at 0.4.
- Key: Camera frames the wall AND the orchestrator so the viewer sees the wavefront approach and cross the boundary.
- Callout: "Attenuation Boundary" label on wall. "Signal weakens here →" annotation.

**Act 4 · Warrant Escalation** (20s)
- Camera: Start at `(0, 2.5, 2.5)` tight on Mogul. Stay relatively close — end at `(0.5, 3, 3.5)`.
- Action: 6 broadcasts at 0.12, 0.24, 0.36, 0.48, 0.60, 0.75 — all visible because camera stays centered on origin.
- Key: Each successive wavefront is visible expanding from center. Camera barely moves — the drama is the accumulation.
- Callout: Show "Volume: 0.2 → 0.4 → 0.6 → 0.8" counter ticking up. At 0.8 flash "WARRANT MINTED."

**Act 5 · The Harmonic Triad** (18s)
- Camera: Orbit at radius 3, height 2.5 — much closer than current r=6, h=6. Centered on `(0, 0.3, 0)`.
- Action: `emitBeacon` at 0.25, `emitLesson` at 0.45, `emitTension` at 0.65.
- Key: Lower, tighter orbit means nodes are visible and wavefronts fill the frame.
- Callout: Label each signal type as it emits: "BEACON", "LESSON", "TENSION", then "HARMONIC WARRANT" flash.

**Act 6 · The Epitaph** (16s)
- Camera: Start at deterministic epitaph extractor node position, close — `(ex, 1.5, ez)` where ex/ez come from the first `epitaph_extractor` agent. Slow dolly in to `(ex, 1, ez-0.5)`.
- Action: `dropPin` at 0.4, with pin forced to spawn at that node's position.
- Key: Camera is already looking at the node when the burn-up animation starts. Embers are in frame.
- Callout: "Epitaph Extractor" label, then "Disposition crystallized" when pin appears.

**Act 7 · The Refusal** (16s)
- Camera: Wide establishing shot `(0, 8, 10)` to `(0, 6, 8)`.
- Action: None — reflective moment. Full estate visible.
- Callout: Overlay text: "Blast radius exceeded evidence. Promotion refused."

---

### LIGHT ARC — "The Speed of Sight" (5 acts)

**Act 1 · Entering the Spectrum** (14s)
- Camera: `(0, 8, 10)` to `(1, 4, 5)`. Establishing + mode switch.
- Action: `setLight` at 0.15.

**Act 2 · Omnidirectional Flash** (16s)
- Camera: `(0.5, 2, 2)` close to Mogul, pull to `(1, 3, 4)`.
- Action: `broadcast` at 0.3.
- Key: Light shell expands fast — camera needs to be close at start to catch the flash, then pulls back to show omni-coverage.
- Callout: "4,000 px/s — every agent sees this simultaneously"

**Act 3 · Reflection and Redirection** (18s)
- Pre-step: Place `mirror-1` at 2D `(500, 250)` = world `(2, -0.6)` — close enough to orchestrator.
- Camera: Start at `(1, 2, 0)` looking at mirror position `(2, 0.15, -0.6)`. End at `(2.5, 1.5, -1)` — follows the reflected beam.
- Action: `broadcast` at 0.3, second at 0.6.
- Key: Camera frames both the mirror AND the incoming wavefront path.
- Callout: "Specular Surface" on mirror, "Reflected beam →" annotation.

**Act 4 · Lensing Focus** (16s)
- Pre-step: Place `lens-1` at 2D `(320, 230)` = world `(-1.6, -1)`.
- Camera: `(-1, 2, -0.5)` targeting lens position. End `(-2, 1.5, -1)`.
- Action: `broadcast` at 0.35.
- Callout: "Observability Lens — concentrates signal"

**Act 5 · Why We Slow Light Down** (16s)
- Camera: Orbit radius 4, height 5 — higher to show scale.
- Action: Two broadcasts at 0.3, 0.6.
- Callout: "Normalized: 4,000 px/s. Real: 3×10⁸ m/s"

---

### GRAVITY ARC — "The Weight of Consensus" (6 acts — adding the "sucked in" gag)

**Act 1 · Entering the Field** (14s)
- Same structure as other openers. `setGravity` at 0.15.

**Act 2 · The Gravity Wave** (16s)
- Camera: `(1, 2.5, 3)` to `(-0.5, 2, 2)`.
- Action: `broadcast` at 0.35.
- Callout: "800 px/s — warps the field itself"

**Act 3 · Invariant Masses** (18s)
- Pre-step: Place `invariant-1` at 2D `(320, 210)` = world `(-1.6, -1.4)`.
- Camera: `(-1, 2.5, -0.5)` targeting mass. Slow dolly to `(-1.5, 1.5, -1.5)` getting intimate with the mass object.
- Action: `broadcast` at 0.3, 0.65.
- Callout: "Invariant Point — constitutional anchor"

**Act 4 · Field Warping** (18s)
- Camera: Orbit radius 3.5, height 3.
- Action: Three broadcasts.
- Key: Terrain visibly ripples during orbit.

**Act 5 · The Pull** (14s) — NEW: comic relief
- Camera: Start at `(3, 2, 0)` facing outward (target `(5, 2, 0)`). Over the duration, camera position moves toward the nearest invariant mass while STILL looking outward — "sucked in ass-first."
- Narration: "Every mass exerts pull. Stand too close and the field bends you toward it. This is what constitutional gravity feels like — you don't choose to align. The topology chooses for you."
- Camera movement: position interpolates from `(3, 2, 0)` toward mass at `(-1.6, 1.5, -1.4)`, but target stays at `(5, 3, 1)` — looking away as you're pulled backward.

**Act 6 · The Weight of Consensus** (16s)
- Camera: Wide pullback `(0, 10, 12)` to `(0, 7, 9)`.
- Narration: Same closing text. Full estate visible with all warps.

---

### Implementation Files

| File | Changes |
|------|---------|
| `src/hooks/useStoryMode.ts` | Rewrite all act definitions with new camera positions, durations, actions; add Act 5 to gravity; add `broadcastFromNode` action type; add `callout` field to ActDef; add reverse-camera logic for "The Pull" |
| `src/components/StoryOverlay.tsx` | Add 3D-projected callout label system; render callout text anchored to world positions via a new `storyCallout` prop |
| `src/components/Canvas3D.tsx` | Add `StoryCallout3D` component using `Html` from drei for in-scene labels; increase ambient light intensity; reduce shadow darkness; add reverse-look camera handling in `StoryCameraController` |
| `src/components/UbiquityApp.tsx` | Override object positions during story mode with deterministic `STORY_LAYOUT`; add `emitFromNode` callback; wire `storyCallout` data to overlay; fix pin drop to target specific node during story |

