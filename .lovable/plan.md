

# Cinematic Story Mode: "First Light" Guided Tour

## Overview

Add a **Story Mode** that plays a scripted cinematic sequence through the 3D scene. The camera flies between nodes while narration cards explain what's happening. The system demonstrates key CGG v3 mechanics in order: broadcast, attenuation, warrant escalation, epitaph origin, and the "refusal event" -- all choreographed with actual simulation calls so the viewer watches real wavefronts propagate, real signals attenuate, and real warrants mint.

The user triggers it from a "Story" button in the header. It can be exited at any time.

## Story Sequence (7 Acts)

```text
Act 1: "The Estate" (5s)
  Camera: High orbit overview, slow pan
  Narration: "This is opTorq Estate. Mogul, the Estate 
  Conductor, governs a manifold of agents across three 
  signal channels. Every signal obeys physics."
  Action: None -- just the ambient scene

Act 2: "The Broadcast" (6s)
  Camera: Zoom to Conductor (Mogul)
  Narration: "Mogul emits an acoustic beacon. Sound 
  propagates omnidirectionally -- a spherical pressure 
  wave expanding at ~343 m/s (normalized here to 200 px/s 
  for observation)."
  Action: Trigger handleBroadcast() in acoustic mode. 
  Camera watches the wavefront expand outward.

Act 3: "Attenuation, Not Permission" (7s)
  Camera: Pan to nearest Attenuation Boundary, then to 
  an agent behind it
  Narration: "This boundary doesn't block signals -- it 
  attenuates them. Each crossing reduces effective volume 
  by muffling_per_hop. Agent Ghost Chorus #1 hears the 
  beacon at reduced SNR. The signal arrived -- just quieter."
  Action: Highlight the boundary object (emissive pulse). 
  Show the agent's SNR updating to a 'weak' value.

Act 4: "Warrant Escalation" (8s)
  Camera: Return to Conductor, then sweep across agents
  Narration: "An unacknowledged beacon escalates. Volume 
  accrues. When it crosses the volume threshold (0.8), a 
  Warrant mints -- an obligation token requiring stake bond 
  to dismiss. As the warrant strengthens, even distant 
  agents begin to hear."
  Action: Emit multiple rapid signals to push volume past 
  threshold. Warrant mints visibly. Show agents lighting 
  up progressively as effective volume rises.

Act 5: "The Harmonic Triad" (7s)
  Camera: Orbit showing three signal types converging
  Narration: "When BEACON + LESSON + TENSION signals 
  co-exist within the triad window, a harmonic warrant 
  mints automatically. This is emergent governance -- not 
  a rule someone wrote, but a resonance the system 
  detected."
  Action: Emit the three signal kinds in sequence. Show 
  triad detection and warrant minting.

Act 6: "The Epitaph" (7s)
  Camera: Zoom to the Epitaph Extractor cluster
  Narration: "When a signal completes its lifecycle -- 
  acknowledged, acted upon, resolved -- the Epitaph 
  Extractor compresses the outcome into a durable 
  disposition. This is how the estate learns. Not by 
  storing everything, but by remembering what mattered."
  Action: Drop an epitaph pin near the cluster. Show it 
  appear and begin its TTL countdown.

Act 7: "The Refusal" (8s)
  Camera: Pull back to full estate view
  Narration: "On 2026-02-18, this system demonstrated 
  governance by refusing to promote a valid insight to 
  global scope -- because blast radius exceeded evidence. 
  Accuracy alone doesn't earn global law. Time, repetition, 
  and institutional review do. This is the Constitution of 
  Attention."
  Action: Show the full estate running, all agents 
  communicating, warrants active, the manifold alive.
```

## Technical Implementation

### New file: `src/hooks/useStoryMode.ts`

State machine managing the cinematic sequence:

- `isPlaying: boolean` -- whether story mode is active
- `currentAct: number` -- which act (0-6)
- `actProgress: number` -- 0.0-1.0 progress within current act
- `startStory() / stopStory()` -- controls
- `storyCamera: { position, target, fov }` -- computed camera state for current act progress, interpolated via cubic bezier easing
- `narration: { title, body } | null` -- current narration card text
- `storyActions: StoryAction[]` -- queue of simulation actions to fire at specific act times (e.g., "at act 2, progress 0.3, call onBroadcast()")

The hook uses `requestAnimationFrame` internally for smooth act progression. Each act has a duration in seconds.

### New file: `src/components/StoryOverlay.tsx`

Overlay UI rendered on top of the Canvas when story mode is active:

- **Narration card**: Bottom-center, semi-transparent dark card with title + body text. Fades in/out between acts. Monospace font, matches existing UI aesthetic.
- **Progress bar**: Thin line at the very top showing overall story progress (act dots).
- **Skip button**: "Skip" pill in top-right corner.
- **Exit button**: "Exit Story" in top-right.
- **Act indicator**: Small "Act 2/7" label near progress bar.

### Canvas3D.tsx Changes

- Accept new optional prop: `storyCamera: { position: [x,y,z], target: [x,y,z], fov: number } | null`
- When `storyCamera` is provided, disable OrbitControls and instead use a `StoryCameraController` component that smoothly lerps the camera to the story position/target each frame using `useFrame`
- The existing CockpitCamera is mutually exclusive with story camera

### UbiquityApp.tsx Changes

- Import and wire `useStoryMode`
- Pass story action callbacks (handleBroadcast, handleDropPin, setMode, etc.) to the hook so it can trigger simulation events at scripted times
- Add "Story" button to the header
- Pass `storyCamera` to Canvas3D
- Render `StoryOverlay` when story is playing

### Camera Keyframes (defined in useStoryMode)

Each act defines a camera path as `[startPos, startTarget]` to `[endPos, endTarget]` with easing:

| Act | Start Position | End Position | Notes |
|---|---|---|---|
| 1 | [0, 12, 14] | [3, 8, 10] | High orbit, slow drift |
| 2 | [3, 4, 4] | [0, 2, 2] | Zoom into Conductor |
| 3 | [-2, 3, 1] | [-4, 2, -1] | Pan to boundary + agent behind it |
| 4 | [0, 3, 3] | [2, 5, 6] | Sweep across agents |
| 5 | [0, 6, 0] | [0, 6, 0] | Orbit (rotate target around center) |
| 6 | [3, 2, -2] | [3, 1.5, -2] | Close-up on Epitaph cluster |
| 7 | [0, 10, 12] | [0, 8, 10] | Pull back to full view |

Camera interpolation uses `THREE.Vector3.lerp` with eased progress (cubic ease-in-out).

### Story Action Triggers

The hook maintains a queue of timed actions. When `actProgress` crosses a threshold, it fires the callback:

```text
Act 2, progress 0.3: setMode('acoustic'), then handleBroadcast()
Act 3, progress 0.2: highlight boundary object (set a storyHighlightId state)
Act 4, progress 0.1-0.8: emit 5 rapid signals (spaced across progress)
Act 5, progress 0.2/0.4/0.6: emit BEACON, LESSON, TENSION signals
Act 6, progress 0.4: handleDropPin()
Act 7, progress 0.0: no action, just ambient
```

### Highlighting (Canvas3D)

- Accept optional `storyHighlightId: string | null` prop
- When set, the matching Object3D or Node3D gets a bright emissive pulse overlay (animated ring or glow) to draw attention during narration

## File Summary

| File | Changes |
|---|---|
| `src/hooks/useStoryMode.ts` | **New.** Story state machine, camera keyframes, act definitions, narration text, action queue |
| `src/components/StoryOverlay.tsx` | **New.** Narration card, progress bar, skip/exit controls |
| `src/components/Canvas3D.tsx` | Add `storyCamera` and `storyHighlightId` props; add `StoryCameraController` component; conditionally disable OrbitControls |
| `src/components/UbiquityApp.tsx` | Wire useStoryMode; add Story button to header; pass story props to Canvas3D; render StoryOverlay |

