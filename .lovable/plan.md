

# Story Overlay → Cinematic Subtitle Bar

## Problem
The current narration card is a large rounded box (`max-w-3xl`, padded, with title + body + controls) that covers ~30-40% of the viewport, blocking the 3D scene it's narrating.

## Solution
Replace the bottom card with a **thin cinematic subtitle bar** pinned to the bottom of the screen — like movie subtitles with a dark gradient scrim.

### Layout

```text
┌─────────────────────────────────────────────────┐
│ [🔊 Acoustic] ▓▓▓▓▓▓░░░░░░░░░░░░░░  2/6       │  ← top progress (keep as-is)
│                                                 │
│              3D SCENE FULLY VISIBLE             │
│                                                 │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│░░░░░░░░░░░░░░░ gradient scrim ░░░░░░░░░░░░░░░░░│
│ The Conductor's Voice                    [→][✕] │  ← title + icon buttons
│ Watch how acoustic wavefronts propagate from    │  ← body text, 2 lines max
│ the conductor node outward through the lattice. │
└─────────────────────────────────────────────────┘
```

### Design Details

- **Scrim**: Bottom gradient from `transparent` → `black/70`, ~120px tall. No solid card, no border, no box shadow.
- **Text**: White with text-shadow for legibility over any terrain. Title in bold (band color), body in white/90. Max 2-3 lines.
- **Controls**: Small icon-only buttons (→ skip, ✕ exit) floated to the right of the title line. No "ESC to exit" text — keep it minimal.
- **Animation**: Text fades in with a subtle `fadeIn` (no translateY bounce).
- **Arc label**: Tiny mono text above the title, same line as band badge context.

### File Changes

| File | Change |
|------|--------|
| `src/components/StoryOverlay.tsx` | Replace the bottom card with a full-width subtitle bar using a gradient scrim background. Collapse title/body/controls into 2-3 tight lines. Icon-only skip/exit buttons. |

