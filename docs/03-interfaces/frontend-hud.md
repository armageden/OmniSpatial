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
- **Holographic Ghost Blueprint Projection:** When toggled on, projects a 35% alpha perspective target blueprint synthesized by Muse Image onto the canvas so technicians can match physical parts into the holographic blueprint.
- **Meta Horizon Spatial Reticles & Directional Vectors:**
  - Dynamic trajectory vectors with animated flowing dash particles (`ctx.lineDashOffset = -now * 0.025`).
  - Meta Horizon circular radar target crosshair (`#00D26A` on alignment, `#FF3B30` on anomaly, `#00C6FF` during transit).
  - Rounded pill distance badge rendered with `drawRoundedRect` showing millimeter alignment status (`🎯 TARGET ALIGNED (±1mm)` vs `MOVE ↗ ${dist}px`).
- Polygon rendering characteristics:
  - Fill style: `seg.color + "22"` (semi-transparent glowing fill).
  - Stroke: 2.5px solid boundary line.
  - Centroid marker: Small solid dot indicating center of mass.
  - Spatial relationship lines: Dashed vectors with distance pill tags between related parts.
  - Tag labels: Rounded pill badges with monospace font `[SAM 3.1] ${label}` displayed above each component's top-left bounding coordinate.

### 3. Meta Horizon OS & Meta AI Design System
- **Typography:** Display & UI headings powered by `Plus Jakarta Sans`; dense telemetry and metrics powered by `JetBrains Mono`.
- **Color Palette & Glassmorphism:**
  - Official Meta brand blue (`#0866FF`), electric cyan (`#00C6FF`), and Horizon dark obsidian canvas (`#050811`).
  - Vitreous glass panels (`.meta-glass-panel`) with 24px backdrop blur, subtle 1px border radiance, and inset shine.
  - Authentic Meta Ribbon Infinity SVG logo glyph with linear gradient branding.
  - Horizon OS spatial viewport frame with corner targeting brackets (`.hud-corner-tl`, `.hud-corner-tr`, etc.).

### 4. Audio Guidance & Controls
- **Audio Chimes:** Uses the Web Audio API to play a harmonic major triad chime on successful verification (`playSuccessChime`) and a low warning tone on misalignment (`playWarningTone`).
- **Interactive Controls:**
  - `[🔍 Verify Step (Space)]`: Dispatches an asynchronous non-blocking reasoning request to Muse Spark.
  - `[◀ Prev]` / `[Next ▶]`: Manual step navigation.
  - `[↺ Reset]`: Resets full procedure to Step 1.
  - `[👻 Ghost Blueprint]`: Toggles holographic projection overlay.
  - `[Feed Selector]`: Switches between live camera and simulated judge evaluation scenarios (`ESP32 IC`, `Decoupling Cap`, `UART Header`).

## Cross-References
- Streaming protocol: [websocket-protocol.md](./websocket-protocol.md).
- System overview: [docs/01-architecture/system-topology.md](../01-architecture/system-topology.md).
