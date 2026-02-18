

# Signal Fidelity and Canvas Overhaul

## 1. Canvas Fills Available Space

The 3D canvas has `h-[560px]` hardcoded while its parent is `flex-1`. The canvas needs to fill 100% of its container.

**File: `src/components/Canvas3D.tsx`** (line 653)
- Change `h-[560px]` to `w-full h-full` so the R3F Canvas fills the flex container

## 2. Physics Velocity Tuning

Current velocities make light and gravity indistinguishable (both 6000 px/s). Real-world ratios inform the spirit:

**File: `src/hooks/usePhysics.ts`**
- Acoustic: 200 px/s (slower, visible pressure fronts -- sound is slow, you can watch it arrive)
- Light: 4000 px/s (fast flash, near-instant but trackable)
- Gravity: 800 px/s (gravitational waves propagate at c in reality, but for UX distinguishability they need to be visually slower -- a heavy ripple through spacetime, not a flash)

## 3. Mode-Specific Wavefront Rendering in 3D

Currently `Wavefront3D` renders the same transparent sphere for all modes.

**File: `src/components/Canvas3D.tsx`** -- replace `Wavefront3D` component

- **Acoustic**: Expanding torus ring (like a sound pressure wave viewed from above) with orange color, thicker geometry, slight vertical oscillation. Echoes render as dashed/wireframe torus.
- **Light**: Flat expanding disc (ring geometry) at ground level, cyan, very thin and bright, fast-fading. For directional reflections (when `wf.angle` is set), render as a narrow beam (cylinder) extending from source in the reflection direction, bright white-cyan, long and thin.
- **Gravity**: Expanding ring that warps the grid visually -- render as a ring with vertical displacement (sine wave along radius), purple, slow and undulating. The ring subtly deforms (non-uniform scale) near mass objects to show spacetime curvature.

## 4. Mirror Object: Proper Specular Reflection

### Physics (usePhysics.ts)
- `computeMirrorReflections`: Calculate the mirror's surface normal from its width/height ratio (wide = horizontal surface, tall = vertical surface). Compute proper specular reflection angle: `reflAngle = incidentAngle - 2 * dot(incident, normal) * normal`. Store the mirror's surface angle on the WorldObject type.

### 3D Rendering (Canvas3D.tsx -- Object3D)
- Mirror: Flat plane geometry with high metalness (0.95), low roughness (0.05), environment map reflection. Slight blue-white tint. Visible surface normal indicator (thin line).

### Wavefront Behavior
- When a light wavefront hits a mirror, spawn a **directional beam** wavefront (using the `angle` property) -- rendered as a bright narrow cylinder/line extending from the mirror surface in the reflected direction, not an expanding sphere.

## 5. Object Material Fidelity

**File: `src/components/Canvas3D.tsx`** -- `Object3D` component

- **Permission Gate (wall)**: Box geometry with concrete-like appearance. Dark grey, rough (roughness 0.9), no metalness. Slight emissive glow on edges to show it's an active gate, not dead matter. Add thin wireframe overlay in mode color.
- **Observability Lens**: Torus geometry (already present) but add a transparent disc inside the torus (glass effect). Low opacity (0.15), high metalness, cyan tint. When light passes through, the lens should visually brighten (emissive pulse on wavefront contact).
- **Mirror**: Flat angled plane. High metalness (0.95), near-zero roughness. Reflective silver-white surface. Add a subtle reflection line showing the surface normal direction.
- **Invariant Mass**: Sphere with deep purple-black core and visible gravity well -- concentric ring markers on the floor around it showing the Schwarzschild-proportional influence radius. Add animated distortion rings that pulse outward slowly. Increase the existing gravity well ring to multiple concentric rings with decreasing opacity.

## 6. Gravity Mode Visual Distinction

The gravity mode needs to feel heavy and warped, not just "purple acoustic."

- **Wavefronts**: Render as elliptical rings (not circles) that stretch/compress based on proximity to mass objects. Use `computeTimeDilation` to distort the ring shape in the 3D renderer.
- **Connection lines**: Already curved via bezier toward masses -- increase the visual weight and add a subtle animated dash pattern that slows near masses (simulating time dilation on the line itself).
- **Mass gravity wells**: Add 3-4 concentric floor rings at Schwarzschild-proportional radii. Innermost ring bright purple, outer rings fading. Add slow rotation animation to the rings.
- **Grid distortion**: Near mass objects, programmatically displace grid vertices downward (like a rubber sheet model) to show spacetime curvature. This is the signature visual for gravity mode.

## 7. Acoustic Mode Enhancements

- **Wavefronts**: Torus rings with visible thickness (pressure wave). Color shifts from bright orange at high energy to dull amber as energy decays.
- **Echo wavefronts**: Dashed/wireframe torus, dimmer, with slight greenish tint to distinguish from primary.
- **Wall interaction**: When a wavefront contacts a Permission Gate, show a brief flash/absorption effect at the contact point. The occluded portion of the wavefront should visibly attenuate (partial ring, not full circle behind walls).

## 8. Light Mode Beam Behavior

- **Primary emission**: Fast-expanding thin ring from Conductor
- **Mirror reflection**: Directional beam (narrow cylinder geometry, bright white-cyan, ~0.02 radius, extends 8-10 world units in the reflected direction). This beam persists for ~1.5 seconds then fades. It should be the brightest element on screen when it fires.
- **Lens refraction**: When wavefront passes through lens, spawn a focused convergent wavefront with higher energy and smaller radius -- the existing behavior, but visually render the focused wavefront as a brighter, tighter ring.

## Technical File Summary

| File | Changes |
|---|---|
| `src/components/Canvas3D.tsx` | Canvas container `h-full`; rewrite `Wavefront3D` for mode-specific geometry (torus/ring/beam); rewrite `Object3D` materials (mirror reflective, wall rough, lens glass, mass gravity well rings); add `BeamWavefront3D` for directional light reflections; add `GravityWellRings` sub-component for mass floor markers |
| `src/hooks/usePhysics.ts` | Tune velocities (200/4000/800); fix mirror reflection angle calculation to use surface normal |
| `src/types/index.ts` | Add optional `surfaceAngle` to `WorldObject` for mirror orientation; add `isBeam` flag to `Wavefront` for directional rendering |
| `src/hooks/useSimulation.ts` | Mark mirror-spawned wavefronts with `isBeam: true`; set beam wavefronts to not expand radially but translate along angle |
| `src/components/UbiquityApp.tsx` | Add `surfaceAngle` to mirror objects in `getInitialObjects` |

