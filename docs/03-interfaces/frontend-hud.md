**Back:** [00-overview](./00-overview.md)

# Frontend AR HUD (`frontend/`)

## File Locations
- Structure: `frontend/index.html`
- Styles: `frontend/styles.css`
- Client Logic: `frontend/app.js`
- Demo Frame Synthesizer: `frontend/demo_clips.js`

## Key Capabilities

### 1. Video Capture & Streaming Lifecycle
- Managed via `setupCamera()` and `stopCamera()` in `frontend/app.js`.
- Accesses user camera using `navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })`.
- Handles camera permission denials gracefully by falling back to the built-in procedural demo simulation mode (`demo_clips.js`).
- **Aspect-Ratio Preserving Downsampling:** Capture frames match the camera aspect ratio (`targetW = 640`, `targetH = Math.round(640 * (canvas.height / canvas.width)) || 360`) and scale segment overlay coordinates accurately onto display resolutions.
- **Client-Side Backpressure:** Guarded by `isAwaitingResponse` flag. New frames are dropped if the server is processing a prior frame, permanently preventing buffer queue buildup and keeping latency strictly sub-250ms.

### 2. Canvas Mask Overlay Engine
- Function: `renderLoop(now)` scheduled via `requestAnimationFrame`.
- Calculates real-time rendering frames per second (`fpsCounter`).
- Transparently overlays polygon masks from SAM 3.1 directly over the video feed.
- **Calibrated Optical Bench Ruler Ticks:** Calibrated cleanroom inspection graticule ticks along the top (`x = 0..640`) and left (`y = 0..400`) canvas edges with numerical millimeter distance markers every 100px.
- **Holographic Ghost Blueprint Projection:** When toggled on, projects a 55% alpha perspective target blueprint synthesized by Muse Image (transparent SVG) across the canvas viewport so technicians can match physical parts into the holographic blueprint.
- **Interactive Component Dragging & Wide Oscillations:**
  - In demo mode (`demo_clips.js`), components sweep across a 70px dynamic oscillation range, oscillating between misaligned (>60px, red directional vector) and aligned (<25px, green reticle).
  - Judges can click and drag components across the canvas (`mousedown`, `mousemove`, `mouseup`) with live crosshair-to-grabbing cursor transitions, testing millimeter tolerances in real time.
- **Vernier Arc Millimeter Tolerance Radial Gauge:**
  - Outer 270° radial dial around the target socket with calibrated tick graticule and dynamic approach bearing needle.
  - When aligned within tolerance (`<25px`), locks into a glowing green radial reticle with `TOLERANCE LOCKED ±0.5mm` badge; during approach, displays dynamic physical millimeter offset (`ALIGNING: ${distMm}mm`).
- **45° Angled Leader Lines & Anchor Reticle Nodes:**
  - Component tags are tethered via 45° dogleg leader lines originating from anchor reticle nodes at component bounding edges, eliminating occlusion over component pins and solder joints.
  - Dynamic collision avoidance ensures placed tags never overlap or clip outside canvas boundaries.
- **Spatial Layering Hierarchy:** Rendered in strict order:
  1. Background video or synthetic PCB canvas substrate (`#0c1322`).
  2. Holographic ghost blueprint overlay (when enabled).
  3. Calibrated optical bench ruler ticks.
  4. SAM 3.1 polygon masks and mass centroid markers.
  5. 45° angled leader lines and anchor reticle nodes.
  6. Vernier arc radial gauge, trajectory vectors, and alignment status badges.

### 3. Meta Horizon OS & Meta AI Design System
- **Monolithic 2-Pane Studio Architecture:** Full-viewport studio layout replacing fragmented floating cards. The left pane provides an edge-to-edge optical stage with dark obsidian background (`#0B0E14`) and hairline dividers (`rgba(255, 255, 255, 0.08)`), while the right pane consolidates Assembly Milestones, Muse Spark Reasoning, Target Blueprints, and SAM 3.1 Prompting into a continuous vertical Inspector (`#111622`).
- **Typography:** Display & UI headings powered by `Plus Jakarta Sans`; dense telemetry and metrics powered by `JetBrains Mono`.
- **Connected Pipeline Stepper:** Central navigation bar (`#pipelineStepper`) displaying the 3-step assembly procedure (`01 IC CHIP ─── 02 CAPACITOR ─── 03 UART`). Verified nodes display emerald indicators with connected track lines, active nodes glow with cyan rings, and direct clicks dispatch `{ action: "set_step", step_number: N }`.
- **Floating Spatial Ornament Toolbar:** Anchored along the bottom center of the active spatial viewport (`.spatial-ornament`, `bottom: 16px`), adhering to visionOS and Meta Horizon OS spatial computing interface standards. Capsule pill geometry (`border-radius: 9999px`) with 28px backdrop blur, subtle 1px border radiance, and spatial drop shadow. Houses `Verify Step [Space]`, step counter pill, holographic ghost blueprint toggle, and workflow reset.
- **Multimodal Reasoning Waveform Pulse:** 5-bar animated audio-visual spectrum pulse (`#aiWaveform`) inside the Muse Spark reasoning box indicating live reasoning analysis.
- **Instant Blueprint Hydration:** Target perspective blueprints hydrate synchronously using `DEFAULT_BLUEPRINT_SVGS` fallbacks, eliminating layout shift and broken image icons prior to async network resolution.
- **Color Palette & Restraint:**
  - Official Meta brand blue (`#0866FF`), dark obsidian canvas (`#0B0E14`), and charcoal inspector surface (`#111622`).
  - Subtle hairline borders (`rgba(255, 255, 255, 0.08)`) replacing heavy glowing neon outlines.
  - Authentic Meta Ribbon Infinity SVG logo glyph with clean branding.
  - Horizon OS spatial viewport frame with corner targeting brackets (`.hud-corner-tl`, `.hud-corner-tr`, etc.) scoped directly around the active video canvas.
  - Monochrome preset chips and milestone indicators with clean status indicators.
  - **Dynamic Latency Badge:** Color-coded telemetry badge (`<250ms` emerald, `250–500ms` amber, `>500ms` rose).
  - **Prompt Loading Feedback:** Pulsing `Detecting...` spinner indicator while SAM 3.1 and Muse Spark process open-vocabulary prompts.

### 4. Audio Guidance & Controls
- **Audio Chimes:** Uses the Web Audio API to play a harmonic major triad chime on successful verification (`playSuccessChime`) and a low warning tone on misalignment (`playWarningTone`), automatically resumed and unlocked on the user's first pointerdown or keydown gesture.
- **Interactive Controls:**
  - `[🔍 Verify Step (Space)]`: Dispatches an asynchronous non-blocking reasoning request to Muse Spark. Buttons automatically blur on click to ensure keyboard focus remains on the window for instant Spacebar verification.
  - `[Pipeline Stepper Nodes]`: Direct navigation between assembly milestones (`01 IC CHIP`, `02 CAPACITOR`, `03 UART`).
  - `[◀ Prev]` / `[Next ▶]`: Manual step navigation with bi-directional synchronization to the demo feed scenario.
  - `[↺ Reset]`: Resets full procedure to Step 1.
  - `[👻 Ghost Blueprint]`: Toggles holographic projection overlay.
  - `[Feed Selector]`: Switches between live camera and simulated judge evaluation scenarios (`ESP32 IC`, `Decoupling Cap`, `UART Header`), bidirectionally synced with active workflow steps.
  - `[Feed Selector]`: Switches between live camera and simulated judge evaluation scenarios (`ESP32 IC`, `Decoupling Cap`, `UART Header`), bidirectionally synced with active workflow steps.

## Cross-References
- Streaming protocol: [websocket-protocol.md](./websocket-protocol.md).
- System overview: [docs/01-architecture/system-topology.md](../01-architecture/system-topology.md).
