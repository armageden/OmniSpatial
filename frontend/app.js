// OmniSpatial Frontend Client Engine — Dual-Loop Real-Time Streaming
(function() {
  const video = document.getElementById("webcamVideo");
  const canvas = document.getElementById("overlayCanvas");
  const ctx = canvas.getContext("2d");
  const cameraPlaceholder = document.getElementById("cameraPlaceholder");
  const fpsCounter = document.getElementById("fpsCounter");
  const streamLatencyBadge = document.getElementById("streamLatencyBadge");
  const connectionStatus = document.getElementById("connectionStatus");
  const segmentsLegend = document.getElementById("segmentsLegend");
  const verificationBox = document.getElementById("verificationBox");
  const verificationStatus = document.getElementById("verificationStatus");
  const verificationFeedback = document.getElementById("verificationFeedback");
  const stepBadge = document.getElementById("stepBadge");
  const stepTitle = document.getElementById("stepTitle");
  const stepDesc = document.getElementById("stepDescription");
  const stepCounterIndicator = document.getElementById("stepCounterIndicator");
  const inputSourceSelect = document.getElementById("inputSourceSelect");
  const feedModeLabel = document.getElementById("feedModeLabel");
  const verifyBtn = document.getElementById("verifyBtn");
  const verifyBtnIcon = document.getElementById("verifyBtnIcon");
  const prevStepBtn = document.getElementById("prevStepBtn");
  const nextStepBtn = document.getElementById("nextStepBtn");
  const resetWorkflowBtn = document.getElementById("resetWorkflowBtn");
  const ghostToggleBtn = document.getElementById("ghostToggleBtn");
  const ghostToggleText = document.getElementById("ghostToggleText");
  const alignGhostBtn = document.getElementById("alignGhostBtn");
  const targetBlueprintImg = document.getElementById("targetBlueprintImg");
  const customPromptInput = document.getElementById("customPromptInput");
  const clearPromptBtn = document.getElementById("clearPromptBtn");
  const presetBtns = document.querySelectorAll(".preset-btn");

  // Configuration (overridable via window.OMNISPATIAL_API_BASE)
  const API_BASE = (window.OMNISPATIAL_API_BASE || "http://localhost:8000").replace(/\/$/, "");
  const WS_BASE = API_BASE.replace(/^http/, "ws");
  const SEGMENT_COLORS = ["#00C6FF", "#00D26A", "#A78BFA", "#F59E0B", "#F472B6", "#38BDF8"];

  // State Management
  let isStreaming = true;
  let isAwaitingResponse = false;
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let lastFrameSendTime = performance.now();
  let ws = null;
  let streamInterval = null;
  let clientFrameId = 0;
  let currentStepNumber = 1;
  let activeFeedMode = "demo_esp32";
  let ghostOverlayActive = false;
  let currentTargetImageElement = null;
  let audioContext = null;
  let currentCustomPrompt = "";
  let reconnectDelay = 2000;
  // Offscreen canvas for frame capture & downsampling
  const captureCanvas = document.createElement("canvas");
  const captureCtx = captureCanvas.getContext("2d");

  // Default initial segments
  let currentSegments = [
    {
      id: "comp_1",
      label: "microcontroller_chip",
      confidence: 0.96,
      color: "#00C6FF",
      bbox: { x_min: 180, y_min: 140, x_max: 300, y_max: 260 },
      polygon: [
        { x: 195, y: 140 }, { x: 285, y: 140 },
        { x: 300, y: 155 }, { x: 300, y: 245 },
        { x: 285, y: 260 }, { x: 195, y: 260 },
        { x: 180, y: 245 }, { x: 180, y: 155 }
      ],
      centroid: { x: 240, y: 200 }
    },
    {
      id: "comp_2",
      label: "socket_u1",
      confidence: 0.94,
      color: "#00D26A",
      bbox: { x_min: 170, y_min: 130, x_max: 310, y_max: 270 },
      polygon: [
        { x: 170, y: 130 }, { x: 310, y: 130 },
        { x: 310, y: 270 }, { x: 170, y: 270 }
      ],
      centroid: { x: 240, y: 200 }
    }
  ];

  let spatialRelations = {};
  let lastVerificationData = null;

  // Web Audio API Chime Synthesizer
  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
  }

  function playSuccessChime() {
    try {
      initAudio();
      if (!audioContext) return;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
      notes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioContext.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.15, audioContext.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(audioContext.currentTime + idx * 0.08);
        osc.stop(audioContext.currentTime + idx * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn("Audio chime playback blocked or not supported:", e);
    }
  }

  function playWarningTone() {
    try {
      initAudio();
      if (!audioContext) return;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, audioContext.currentTime);
      gain.gain.setValueAtTime(0.2, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio warning blocked:", e);
    }
  }

  // Load Synthesized Perspective Target from API
  async function loadTargetBlueprint(stepNum) {
    try {
      const resp = await fetch(`${API_BASE}/api/steps/${stepNum}/target-image`);
      if (resp.ok) {
        const data = await resp.json();
        targetBlueprintImg.src = data.image_data_url;
        const img = new Image();
        img.onload = () => { currentTargetImageElement = img; };
        img.src = data.image_data_url;
      }
    } catch (err) {
      console.warn("Could not load target blueprint from API:", err);
    }
  }

  // Camera Management
  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });
      video.srcObject = stream;
      video.classList.remove("hidden");
      cameraPlaceholder.classList.add("hidden");
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
    } catch (err) {
      console.warn("Camera access denied or unavailable, reverting to Demo Mode:", err);
      inputSourceSelect.value = "demo_esp32";
      switchFeedMode("demo_esp32");
    }
  }

  function stopCamera() {
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    video.classList.add("hidden");
  }

  function switchFeedMode(mode) {
    activeFeedMode = mode;
    if (mode === "camera") {
      feedModeLabel.textContent = "LIVE CAMERA FEED";
      setupCamera();
    } else {
      stopCamera();
      canvas.width = 640;
      canvas.height = 400;
      if (mode === "demo_esp32") feedModeLabel.textContent = "DEMO FEED: ESP32 IC";
      else if (mode === "demo_cap") feedModeLabel.textContent = "DEMO FEED: CERAMIC CAP";
      else feedModeLabel.textContent = "DEMO FEED: UART HEADER";
    }
  }

  // Frame Transmission with Strict Client Backpressure
  function sendFrame(triggerVerify = false) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isStreaming) return;
    if (isAwaitingResponse && !triggerVerify) return; // Drop frame if backend is busy

    clientFrameId++;
    lastFrameSendTime = performance.now();
    isAwaitingResponse = true;

    const targetW = 640;
    const targetH = 360;
    captureCanvas.width = targetW;
    captureCanvas.height = targetH;

    if (activeFeedMode === "camera" && video.srcObject && video.readyState >= 2) {
      captureCtx.drawImage(video, 0, 0, targetW, targetH);
    } else {
      // Downsample current canvas
      captureCtx.drawImage(canvas, 0, 0, targetW, targetH);
    }

    const base64Data = captureCanvas.toDataURL("image/jpeg", 0.65);
    const payload = {
      frame_id: clientFrameId,
      timestamp: Date.now() / 1000,
      image_base64: base64Data,
      width: canvas.width,
      height: canvas.height,
      normalize: false,
      smooth: true,
      active_step: currentStepNumber,
      trigger_verify: triggerVerify,
      allow_fallback: (activeFeedMode !== "camera" && !currentCustomPrompt),
      custom_prompt: currentCustomPrompt || null
    };
    ws.send(JSON.stringify(payload));
  }

  function triggerVerification() {
    initAudio();
    verifyBtn.classList.add("ring-2", "ring-cyan-400", "scale-95");
    verifyBtnIcon.textContent = "⏳";
    verificationBox.className = "p-4 rounded-xl bg-blue-950/60 border border-blue-500/40 transition-all duration-300";
    verificationStatus.className = "text-xs font-bold text-cyan-300 flex items-center gap-1 font-mono";
    verificationStatus.textContent = "Analyzing with Muse Spark...";
    sendFrame(true);
    setTimeout(() => {
      verifyBtn.classList.remove("ring-2", "ring-cyan-400", "scale-95");
      verifyBtnIcon.textContent = "🔍";
    }, 1200);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function updateLegend(segments) {
    if (!segmentsLegend) return;
    let html = '<span class="text-slate-400 font-medium text-[11px]">Active SAM 3.1 Targets:</span>';
    segments.forEach(seg => {
      const pct = Math.round((seg.confidence || 0.95) * 100);
      const isRle = seg.attributes && seg.attributes.has_rle_mask;
      const rleBadge = isRle ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">RLE CONTOUR</span>' : '';
      const safeColor = escapeHtml(seg.color || "#94A3B8");
      const safeLabel = escapeHtml(seg.label || "");
      html += `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${safeColor}"></span>
          <span class="text-slate-300 font-mono text-[11px]">${safeLabel} (${pct}%)</span>
          ${rleBadge}
        </div>
      `;
    });
    segmentsLegend.innerHTML = html;
  }

  function handleVerificationUpdate(verif) {
    lastVerificationData = verif;
    const conf = Math.round((verif.confidence || 0.95) * 100);
    if (verif.is_verified) {
      verificationBox.className = "p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 transition-all duration-300";
      verificationStatus.className = "text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono";
      verificationStatus.textContent = `✓ Verified (${conf}%)`;
      playSuccessChime();
    } else {
      verificationBox.className = "p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 transition-all duration-300";
      verificationStatus.className = "text-xs font-bold text-rose-400 flex items-center gap-1 font-mono";
      verificationStatus.textContent = `⚠ Misaligned (${conf}%)`;
      playWarningTone();
    }
    if (verif.feedback) {
      verificationFeedback.textContent = verif.feedback;
    }
  }

  function updateStepUI(activeStep) {
    if (!activeStep) return;
    currentStepNumber = activeStep.step_number;
    stepBadge.textContent = `Step ${activeStep.step_number} of 3`;
    stepCounterIndicator.textContent = `${activeStep.step_number}/3`;
    stepTitle.textContent = activeStep.title;
    stepDesc.textContent = activeStep.description;
    loadTargetBlueprint(activeStep.step_number);
  }

  // WebSocket Ingestion & Action Handling
  function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(`${WS_BASE}/ws/stream`);

      ws.onopen = () => {
        console.log("OmniSpatial dual-loop WebSocket connected");
        reconnectDelay = 2000;
        connectionStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Stream Active';
        connectionStatus.className = "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        if (!streamInterval) {
          streamInterval = setInterval(() => sendFrame(false), 200); // 5 FPS capture stream
        }
      };

      ws.onmessage = (event) => {
        isAwaitingResponse = false;
        const latencyMs = Math.round(performance.now() - lastFrameSendTime);
        streamLatencyBadge.textContent = `Latency: ~${latencyMs}ms`;

        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          console.warn("Invalid WebSocket payload:", e);
          return;
        }
        if (!data || typeof data !== "object") return;

        if (data.type === "error") {
          console.warn("Server error:", data.message);
          return;
        }

        if (data.type === "step_updated" && data.active_step) {
          updateStepUI(data.active_step);
          return;
        }

        if (data.type === "verification_result" && data.verification) {
          handleVerificationUpdate(data.verification);
          if (data.active_step) updateStepUI(data.active_step);
          return;
        }

        // Fast Frame Analysis
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          currentSegments = data.segments.map((s, idx) => ({
            ...s,
            color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
          }));
          updateLegend(currentSegments);
        } else if (activeFeedMode === "camera") {
          currentSegments = [];
          updateLegend([]);
        }

        if (data.spatial_relations) {
          spatialRelations = data.spatial_relations;
        }

        if (data.active_step) {
          if (data.active_step.step_number !== currentStepNumber) {
            updateStepUI(data.active_step);
          }
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket connection error:", err);
      };

      ws.onclose = () => {
        isAwaitingResponse = false;
        console.log(`WebSocket closed, retrying in ${reconnectDelay}ms...`);
        connectionStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500"></span> Connecting...';
        connectionStatus.className = "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20";
        if (streamInterval) {
          clearInterval(streamInterval);
          streamInterval = null;
        }
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        setTimeout(connectWebSocket, delay);
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }
  }

  // Helper: Draw Rounded Rectangle on Canvas
  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Render Loop
  function renderLoop(now) {
    frameCount++;
    if (now - lastFpsTime >= 1000) {
      fpsCounter.textContent = `FPS: ${frameCount}`;
      frameCount = 0;
      lastFpsTime = now;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background Source (Camera or Procedural Demo PCB)
    if (activeFeedMode !== "camera" && window.OmniSpatialDemo) {
      window.OmniSpatialDemo.renderDemoFrame(ctx, canvas.width, canvas.height, activeFeedMode);
    }

    // 2. Holographic Ghost Blueprint Overlay
    if (ghostOverlayActive && currentTargetImageElement) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(currentTargetImageElement, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // 3. Draw AR Spatial Vectors & Directional Guidance
    Object.keys(spatialRelations).forEach(key => {
      const rel = spatialRelations[key];
      const [idA, idB] = key.split(":");
      const segA = currentSegments.find(s => s.id === idA);
      const segB = currentSegments.find(s => s.id === idB);
      if (segA && segB && segA.centroid && segB.centroid) {
        const isAnomaly = lastVerificationData && (!lastVerificationData.is_verified || (lastVerificationData.detected_anomalies && lastVerificationData.detected_anomalies.length > 0));
        const isAligned = rel.distance_px < 25;
        const pulse = Math.sin(now * 0.006) * 0.2 + 0.8;

        // Animated Trajectory Vector from Component to Target
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -now * 0.025; // Smooth flowing particle trajectory
        ctx.moveTo(segA.centroid.x, segA.centroid.y);
        ctx.lineTo(segB.centroid.x, segB.centroid.y);
        ctx.strokeStyle = isAnomaly ? `rgba(255, 59, 48, ${0.9 * pulse})` : isAligned ? `rgba(0, 210, 106, ${0.95 * pulse})` : `rgba(0, 198, 255, ${0.9 * pulse})`;
        ctx.lineWidth = isAligned ? 2.5 : 2.0;
        ctx.stroke();
        ctx.setLineDash([]);

        // Directional Arrowhead
        const angle = Math.atan2(segB.centroid.y - segA.centroid.y, segB.centroid.x - segA.centroid.x);
        const headLen = 11;
        ctx.fillStyle = isAnomaly ? "#FF3B30" : isAligned ? "#00D26A" : "#00C6FF";
        ctx.beginPath();
        ctx.moveTo(segB.centroid.x, segB.centroid.y);
        ctx.lineTo(segB.centroid.x - headLen * Math.cos(angle - Math.PI / 6), segB.centroid.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(segB.centroid.x - headLen * Math.cos(angle + Math.PI / 6), segB.centroid.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        // Target Socket Reticle & Horizon Crosshairs
        ctx.strokeStyle = isAnomaly ? "#FF3B30" : isAligned ? "#00D26A" : "#00C6FF";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(segB.centroid.x, segB.centroid.y, isAligned ? 22 * pulse : 18, 0, Math.PI * 2);
        ctx.stroke();
        if (isAligned) {
          ctx.beginPath();
          ctx.moveTo(segB.centroid.x - 28, segB.centroid.y);
          ctx.lineTo(segB.centroid.x + 28, segB.centroid.y);
          ctx.moveTo(segB.centroid.x, segB.centroid.y - 28);
          ctx.lineTo(segB.centroid.x, segB.centroid.y + 28);
          ctx.stroke();
        }

        // Distance & Alignment Pill Badge
        const midX = (segA.centroid.x + segB.centroid.x) / 2.0;
        const midY = (segA.centroid.y + segB.centroid.y) / 2.0;
        const badgeText = isAligned ? "🎯 TARGET ALIGNED (±1mm)" : isAnomaly ? `⚠ REALIGN (${rel.distance_px}px)` : `MOVE ↗ ${rel.distance_px}px`;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const badgeW = ctx.measureText(badgeText).width + 18;
        const badgeH = 22;

        drawRoundedRect(ctx, midX - badgeW / 2, midY - 11, badgeW, badgeH, 11);
        ctx.fillStyle = "rgba(8, 13, 26, 0.92)";
        ctx.fill();
        ctx.strokeStyle = isAnomaly ? "#FF3B30" : isAligned ? "#00D26A" : "#00C6FF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isAnomaly ? "#FFA39E" : isAligned ? "#73F5AA" : "#80E1FF";
        ctx.fillText(badgeText, midX - badgeW / 2 + 9, midY + 4);
        ctx.restore();
      }
    });

    // 4. Draw SAM 3.1 Smoothed Polygons & Centroids
    currentSegments.forEach(seg => {
      ctx.fillStyle = seg.color + "22"; // Translucent fill
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 2.5;

      if (seg.polygon && seg.polygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(seg.polygon[0].x, seg.polygon[0].y);
        for (let i = 1; i < seg.polygon.length; i++) {
          ctx.lineTo(seg.polygon[i].x, seg.polygon[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Centroid Dot
      if (seg.centroid) {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(seg.centroid.x, seg.centroid.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tag Label (Meta Horizon Style Rounded Tag)
      const isRleMask = seg.attributes && seg.attributes.has_rle_mask;
      const tagText = isRleMask ? `[SAM 3.1 RLE] ${seg.label}` : `[SAM 3.1] ${seg.label}`;
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      const textWidth = ctx.measureText(tagText).width;
      const tagW = textWidth + 14;
      const tagH = 19;
      const tagX = seg.bbox.x_min;
      const tagY = seg.bbox.y_min - 23;

      drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 6);
      ctx.fillStyle = "rgba(8, 13, 26, 0.90)";
      ctx.fill();
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = seg.color;
      ctx.fillText(tagText, tagX + 7, tagY + 13);
    });

    requestAnimationFrame(renderLoop);
  }

  // Event Listeners
  inputSourceSelect.addEventListener("change", (e) => {
    switchFeedMode(e.target.value);
  });

  verifyBtn.addEventListener("click", () => {
    triggerVerification();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT") {
      e.preventDefault();
      triggerVerification();
    }
  });

  prevStepBtn.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "prev_step" }));
    }
  });

  nextStepBtn.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "next_step" }));
    }
  });

  resetWorkflowBtn.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "reset_workflow" }));
    }
  });

  function toggleGhost() {
    ghostOverlayActive = !ghostOverlayActive;
    ghostToggleText.textContent = `Ghost Blueprint: ${ghostOverlayActive ? "ON" : "OFF"}`;
    if (ghostOverlayActive) {
      ghostToggleBtn.classList.add("bg-purple-600/30", "border-purple-400", "text-purple-200", "shadow-[0_0_12px_rgba(168,85,247,0.3)]");
    } else {
      ghostToggleBtn.classList.remove("bg-purple-600/30", "border-purple-400", "text-purple-200", "shadow-[0_0_12px_rgba(168,85,247,0.3)]");
    }
  }

  ghostToggleBtn.addEventListener("click", toggleGhost);
  alignGhostBtn.addEventListener("click", toggleGhost);

  // Custom Open-Vocabulary Concept Prompt Handlers
  if (customPromptInput) {
    customPromptInput.addEventListener("input", (e) => {
      currentCustomPrompt = e.target.value.trim();
      sendFrame(false);
    });
  }

  if (clearPromptBtn) {
    clearPromptBtn.addEventListener("click", () => {
      if (customPromptInput) customPromptInput.value = "";
      currentCustomPrompt = "";
      sendFrame(false);
    });
  }

  if (presetBtns) {
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt") || "";
        if (customPromptInput) customPromptInput.value = prompt;
        currentCustomPrompt = prompt;
        sendFrame(false);
      });
    });
  }

  // Initialize
  canvas.width = 640;
  canvas.height = 400;
  switchFeedMode("demo_esp32");
  loadTargetBlueprint(1);
  connectWebSocket();
  requestAnimationFrame(renderLoop);

})();
