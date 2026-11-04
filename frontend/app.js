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
  const generateTaskBtn = document.getElementById("generateTaskBtn");
  const promptFeedbackSpinner = document.getElementById("promptFeedbackSpinner");
  const presetBtns = document.querySelectorAll(".preset-btn");

  // Configuration (overridable via window.OMNISPATIAL_API_BASE)
  const defaultHost = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname : "localhost";
  const defaultBase = `http://${defaultHost}:8000`;
  const API_BASE = (window.OMNISPATIAL_API_BASE || defaultBase).replace(/\/$/, "");
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
  let activeFeedMode = "demo_phone";
  let ghostOverlayActive = false;
  let currentTargetImageElement = null;
  let audioContext = null;
  let currentCustomPrompt = "";
  let reconnectDelay = 2000;
  let emptyFrameCount = 0;
  let totalStepsCount = 3;
  let responseWatchdogTimeout = null;
  let isDraggingComponent = false;
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

  // Pre-rendered perspective engineering targets for instant zero-flicker HUD rendering
  const DEFAULT_BLUEPRINT_SVGS = {
    1: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 400' width='640' height='400'><g stroke='%2338bdf8' stroke-opacity='0.25' stroke-width='1.5' stroke-dasharray='4,4'><line x1='170' y1='0' x2='170' y2='400'/><line x1='310' y1='0' x2='310' y2='400'/><line x1='0' y1='130' x2='640' y2='130'/><line x1='0' y1='270' x2='640' y2='270'/></g><rect x='170' y='130' width='140' height='140' rx='6' fill='none' stroke='%2338bdf8' stroke-width='2.5' stroke-dasharray='6,3'/><text x='175' y='118' fill='%2338bdf8' font-family='monospace' font-size='14' font-weight='bold'>TARGET: U1 SOCKET</text><circle cx='240' cy='130' r='9' fill='none' stroke='%2338bdf8' stroke-width='2'/><path d='M 235 116 L 240 106 L 245 116 Z' fill='%2338bdf8'/><text x='254' y='114' fill='%2338bdf8' font-family='monospace' font-size='12' font-weight='bold'>PIN 1 (UP)</text><rect x='180' y='140' width='120' height='120' rx='4' fill='rgba(56,189,248,0.15)' stroke='%2338bdf8' stroke-width='2'/><text x='240' y='206' fill='%23f8fafc' font-family='sans-serif' font-size='15' font-weight='bold' text-anchor='middle'>ATmega328P</text><circle cx='240' cy='200' r='24' fill='none' stroke='%2338bdf8' stroke-width='1.5' stroke-opacity='0.8'/><line x1='240' y1='165' x2='240' y2='235' stroke='%2338bdf8' stroke-width='1.5' stroke-opacity='0.7'/><line x1='205' y1='200' x2='275' y2='200' stroke='%2338bdf8' stroke-width='1.5' stroke-opacity='0.7'/><text x='20' y='385' fill='%2394a3b8' font-family='monospace' font-size='12' font-weight='bold'>MUSE IMAGE 1.0 TARGET BLUEPRINT [STEP 1]</text></svg>`,
    2: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 400' width='640' height='400'><rect x='330' y='146' width='44' height='28' rx='4' fill='rgba(16,185,129,0.18)' stroke='%2310b981' stroke-width='2.5' stroke-dasharray='5,3'/><rect x='330' y='150' width='10' height='20' fill='%2310b981' fill-opacity='0.5'/><rect x='360' y='150' width='10' height='20' fill='%2310b981' fill-opacity='0.5'/><text x='315' y='132' fill='%2310b981' font-family='monospace' font-size='14' font-weight='bold'>TARGET: C1 (100nF)</text><circle cx='352' cy='160' r='16' fill='none' stroke='%2310b981' stroke-width='1.5' stroke-dasharray='3,2'/><text x='20' y='385' fill='%2394a3b8' font-family='monospace' font-size='12' font-weight='bold'>MUSE IMAGE 1.0 TARGET BLUEPRINT [STEP 2]</text></svg>`,
    3: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 400' width='640' height='400'><rect x='136' y='206' width='168' height='48' rx='6' fill='rgba(139,92,246,0.18)' stroke='%23a78bfa' stroke-width='2.5' stroke-dasharray='5,3'/><circle cx='160' cy='230' r='7' fill='%23f59e0b' fill-opacity='0.7'/><text x='150' y='250' fill='%23cbd5e1' font-family='monospace' font-size='10' font-weight='bold'>VCC</text><circle cx='196' cy='230' r='7' fill='%23f59e0b' fill-opacity='0.7'/><text x='186' y='250' fill='%23cbd5e1' font-family='monospace' font-size='10' font-weight='bold'>GND</text><circle cx='232' cy='230' r='7' fill='%23f59e0b' fill-opacity='0.7'/><text x='224' y='250' fill='%23cbd5e1' font-family='monospace' font-size='10' font-weight='bold'>TX</text><circle cx='268' cy='230' r='7' fill='%23f59e0b' fill-opacity='0.7'/><text x='260' y='250' fill='%23cbd5e1' font-family='monospace' font-size='10' font-weight='bold'>RX</text><text x='136' y='190' fill='%23a78bfa' font-family='monospace' font-size='14' font-weight='bold'>TARGET: J1 4-PIN UART (NO BRIDGES)</text><text x='20' y='385' fill='%2394a3b8' font-family='monospace' font-size='12' font-weight='bold'>MUSE IMAGE 1.0 TARGET BLUEPRINT [STEP 3]</text></svg>`
  };

  let spatialRelations = {
    "comp_1:comp_2": {
      distance_px: 0.0,
      dx: 0.0,
      dy: 0.0,
      iou: 0.72,
      is_overlapping: true,
      relative_bearing_deg: 0.0,
      labels: ["microcontroller_chip", "socket_u1"]
    }
  };
  let lastVerificationData = null;

  // Web Audio API Chime Synthesizer
  function initAudio() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
  }

  const unlockAudio = () => {
    initAudio();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

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

  // Load Synthesized Perspective Target from API with Instant Fallback
  async function loadTargetBlueprint(stepNum, stepTitleText = "", stepDescText = "") {
    // 1. Immediately apply pre-rendered target blueprint so image is never broken or blank
    const fallbackSvg = DEFAULT_BLUEPRINT_SVGS[stepNum] || DEFAULT_BLUEPRINT_SVGS[1];
    if (targetBlueprintImg) {
      targetBlueprintImg.src = fallbackSvg;
    }
    const initialImg = new Image();
    initialImg.onload = () => { currentTargetImageElement = initialImg; };
    initialImg.src = fallbackSvg;

    // 2. Query live/custom blueprint from API
    try {
      let url = `${API_BASE}/api/steps/${stepNum}/target-image`;
      if (stepTitleText) {
        const p = encodeURIComponent(`Perspective engineering diagram: ${stepTitleText}. ${stepDescText}`);
        url += `?prompt=${p}`;
      }
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.image_data_url) {
          if (targetBlueprintImg) targetBlueprintImg.src = data.image_data_url;
          const img = new Image();
          img.onload = () => { currentTargetImageElement = img; };
          img.src = data.image_data_url;
        }
      }
    } catch (err) {
      console.warn("Using offline blueprint fallback:", err);
    }
  }

  // Camera & Video Management
  async function setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: "environment" }
        }
      });
      video.srcObject = stream;
      video.removeAttribute("src");
      video.classList.remove("hidden");
      cameraPlaceholder.classList.add("hidden");
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
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
    if (video.src) {
      video.pause();
      URL.revokeObjectURL(video.src);
      video.removeAttribute("src");
    }
    video.classList.add("hidden");
  }

  function switchFeedMode(mode, syncStep = true) {
    activeFeedMode = mode;
    if (inputSourceSelect && inputSourceSelect.value !== mode) {
      inputSourceSelect.value = mode;
    }
    if (mode === "camera") {
      feedModeLabel.textContent = "LIVE CAMERA FEED";
      setupCamera();
    } else if (mode === "video_file") {
      feedModeLabel.textContent = "VIDEO FILE: SELECTING...";
      const videoFileInput = document.getElementById("videoFileInput");
      if (videoFileInput) {
        videoFileInput.value = "";
        videoFileInput.click();
      }
    } else if (mode === "demo_phone") {
      stopCamera();
      video.srcObject = null;
      video.src = "esp32_phone_video.mp4";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        video.play().catch(err => console.warn("Video play error:", err));
      };
      video.classList.remove("hidden");
      cameraPlaceholder.classList.add("hidden");
      feedModeLabel.textContent = "REAL VIDEO: PHONE ESP/NODEMCU";
      if (syncStep && ws && ws.readyState === WebSocket.OPEN && currentStepNumber !== 1) {
        ws.send(JSON.stringify({ action: "set_step", step_number: 1 }));
      }
    } else {
      stopCamera();
      canvas.width = 640;
      canvas.height = 400;
      let targetStep = 1;
      if (mode === "demo_esp32") {
        feedModeLabel.textContent = "DEMO FEED: ESP32 IC";
        targetStep = 1;
      } else if (mode === "demo_cap") {
        feedModeLabel.textContent = "DEMO FEED: CERAMIC CAP";
        targetStep = 2;
      } else {
        feedModeLabel.textContent = "DEMO FEED: UART HEADER";
        targetStep = 3;
      }
      if (syncStep && ws && ws.readyState === WebSocket.OPEN && currentStepNumber !== targetStep) {
        ws.send(JSON.stringify({ action: "set_step", step_number: targetStep }));
      }
    }
  }

  // Frame Transmission with Strict Client Backpressure
  function sendFrame(triggerVerify = false) {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isStreaming) return;
    if (isAwaitingResponse && !triggerVerify) return; // Drop frame if backend is busy

    clientFrameId++;
    lastFrameSendTime = performance.now();
    isAwaitingResponse = true;
    if (responseWatchdogTimeout) clearTimeout(responseWatchdogTimeout);
    responseWatchdogTimeout = setTimeout(() => { isAwaitingResponse = false; }, 4000);

    const targetW = 640;
    const targetH = Math.round(640 * (canvas.height / canvas.width)) || 360;

    captureCanvas.width = targetW;
    captureCanvas.height = targetH;
    if ((activeFeedMode === "camera" || activeFeedMode === "video_file" || activeFeedMode === "demo_phone") && (video.srcObject || video.src) && video.readyState >= 2) {
      captureCtx.drawImage(video, 0, 0, targetW, targetH);
    } else if (window.OmniSpatialDemo) {
      window.OmniSpatialDemo.renderDemoFrame(captureCtx, targetW, targetH, activeFeedMode);
    }

    const base64Data = captureCanvas.toDataURL("image/jpeg", 0.65);
    const payload = {
      frame_id: clientFrameId,
      timestamp: Date.now() / 1000,
      image_base64: base64Data,
      width: targetW,
      height: targetH,
      normalize: false,
      smooth: true,
      active_step: currentStepNumber,
      trigger_verify: triggerVerify,
      allow_fallback: (activeFeedMode !== "camera" && activeFeedMode !== "video_file" && !currentCustomPrompt),
      custom_prompt: currentCustomPrompt || null,
      feed_mode: activeFeedMode
    };
    ws.send(JSON.stringify(payload));
  }

  function triggerVerification() {
    initAudio();
    verifyBtn.classList.add("ring-2", "ring-cyan-400", "scale-95");
    if (verifyBtnIcon) verifyBtnIcon.className = "w-2 h-2 rounded-full bg-amber-400 animate-ping";
    const aiWaveform = document.getElementById("aiWaveform");
    if (aiWaveform) aiWaveform.classList.add("active");
    verificationBox.className = "p-4 rounded-xl bg-blue-950/60 border border-blue-500/40 transition-all duration-300";
    verificationStatus.className = "text-xs font-bold text-cyan-300 flex items-center gap-1 font-mono";
    verificationStatus.textContent = "Analyzing with Muse Spark...";
    sendFrame(true);
    setTimeout(() => {
      verifyBtn.classList.remove("ring-2", "ring-cyan-400", "scale-95");
      if (verifyBtnIcon) verifyBtnIcon.className = "w-2 h-2 rounded-full bg-cyan-300 animate-pulse";
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
      const isRealRle = Boolean(seg.attributes && seg.attributes.source === "meta_sam_3.1" && seg.attributes.has_rle_mask);
      const isDemo = Boolean(seg.attributes && seg.attributes.source === "offline_demo");
      const rleBadge = isRealRle
        ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-semibold">SAM 3.1 RLE</span>'
        : (isDemo ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-mono font-semibold">DEMO TRACKER</span>' : '');
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
    const aiWaveform = document.getElementById("aiWaveform");
    if (aiWaveform) aiWaveform.classList.remove("active");
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
    stepBadge.textContent = `Step ${activeStep.step_number} of ${totalStepsCount}`;
    stepCounterIndicator.textContent = `${activeStep.step_number}/${totalStepsCount}`;
    stepTitle.textContent = activeStep.title;
    stepDesc.textContent = activeStep.description;
    loadTargetBlueprint(activeStep.step_number, activeStep.title, activeStep.description);

    // Sync Connected Pipeline Stepper (01 IC CHIP ── 02 CAPACITOR ── 03 UART)
    const stepperNodes = document.querySelectorAll("#pipelineStepper .stepper-node");
    const stepperLines = document.querySelectorAll("#pipelineStepper .stepper-line");
    stepperNodes.forEach((node) => {
      const stepVal = parseInt(node.getAttribute("data-step"), 10);
      node.classList.remove("active", "verified");
      const dot = node.querySelector("span");
      if (stepVal < currentStepNumber) {
        node.classList.add("verified");
        if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400";
      } else if (stepVal === currentStepNumber) {
        node.classList.add("active");
        if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse";
      } else {
        if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-slate-500";
      }
    });
    stepperLines.forEach((line, idx) => {
      if (idx + 1 < currentStepNumber) {
        line.classList.add("verified");
      } else {
        line.classList.remove("verified");
      }
    });

    // Auto-sync demo feed to active step if not using live camera or phone video
    if (activeFeedMode !== "camera" && activeFeedMode !== "video_file" && activeFeedMode !== "demo_phone") {
      const modeMap = { 1: "demo_esp32", 2: "demo_cap", 3: "demo_header" };
      const expectedMode = modeMap[activeStep.step_number] || "demo_esp32";
      if (activeFeedMode !== expectedMode) {
        switchFeedMode(expectedMode, false);
      }
    }
  }

  // WebSocket Ingestion & Action Handling
  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    try {
      ws = new WebSocket(`${WS_BASE}/ws/stream`);

      ws.onopen = () => {
        console.log("OmniSpatial dual-loop WebSocket connected");
        reconnectDelay = 2000;
        connectionStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Stream Active';
        connectionStatus.className = "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        if (currentStepNumber !== 1) {
          ws.send(JSON.stringify({ action: "set_step", step_number: currentStepNumber }));
        }
        if (!streamInterval) {
          streamInterval = setInterval(() => sendFrame(false), 200); // 5 FPS capture stream
        }
      };

      ws.onmessage = (event) => {
        if (responseWatchdogTimeout) clearTimeout(responseWatchdogTimeout);
        isAwaitingResponse = false;
        if (promptFeedbackSpinner) promptFeedbackSpinner.classList.add("hidden");
        const latencyMs = Math.round(performance.now() - lastFrameSendTime);
        streamLatencyBadge.textContent = `Latency: ~${latencyMs}ms`;
        if (latencyMs < 250) {
          streamLatencyBadge.className = "font-mono text-emerald-400 font-semibold";
        } else if (latencyMs <= 500) {
          streamLatencyBadge.className = "font-mono text-amber-400 font-semibold";
        } else {
          streamLatencyBadge.className = "font-mono text-rose-400 font-semibold";
        }

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

        if (data.type === "step_updated") {
          if (Array.isArray(data.steps)) totalStepsCount = data.steps.length;
          if (data.active_step) updateStepUI(data.active_step);
          return;
        }

        if (data.type === "verification_result" && data.verification) {
          handleVerificationUpdate(data.verification);
          if (data.active_step) updateStepUI(data.active_step);
          return;
        }

        // Fast Frame Analysis
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          const frameW = data.frame_width || 640;
          const frameH = data.frame_height || 360;
          const scaleX = (frameW > 0) ? canvas.width / frameW : 1.0;
          const scaleY = (frameH > 0) ? canvas.height / frameH : 1.0;

          emptyFrameCount = 0;
          currentSegments = data.segments.map((s, idx) => {
            const isNorm = Boolean(s.is_normalized);
            const sx = isNorm ? canvas.width : scaleX;
            const sy = isNorm ? canvas.height : scaleY;

            const scaledPolygon = Array.isArray(s.polygon)
              ? s.polygon.map(pt => ({ x: Math.round(pt.x * sx * 10) / 10, y: Math.round(pt.y * sy * 10) / 10 }))
              : [];

            const scaledCentroid = s.centroid
              ? { x: Math.round(s.centroid.x * sx * 10) / 10, y: Math.round(s.centroid.y * sy * 10) / 10 }
              : null;

            const scaledBbox = s.bbox
              ? {
                  x_min: Math.round(s.bbox.x_min * sx * 10) / 10,
                  y_min: Math.round(s.bbox.y_min * sy * 10) / 10,
                  x_max: Math.round(s.bbox.x_max * sx * 10) / 10,
                  y_max: Math.round(s.bbox.y_max * sy * 10) / 10
                }
              : s.bbox;

            return {
              ...s,
              polygon: scaledPolygon,
              centroid: scaledCentroid,
              bbox: scaledBbox,
              color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length]
            };
          });
          updateLegend(currentSegments);
        } else {
          emptyFrameCount = (emptyFrameCount || 0) + 1;
          if (emptyFrameCount >= 3) {
            currentSegments = [];
            if (activeFeedMode === "camera") {
              if (segmentsLegend) {
                segmentsLegend.innerHTML = '<span class="text-cyan-400 font-mono text-[11px] animate-pulse">Scanning live feed for target components... Align within reticle</span>';
              }
            } else {
              updateLegend([]);
            }
          }
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
        if (responseWatchdogTimeout) clearTimeout(responseWatchdogTimeout);
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

    // 1. Draw Background Source (Camera, Video File, or Procedural Demo PCB)
    if (activeFeedMode !== "camera" && activeFeedMode !== "video_file" && activeFeedMode !== "demo_phone" && window.OmniSpatialDemo) {
      window.OmniSpatialDemo.renderDemoFrame(ctx, canvas.width, canvas.height, activeFeedMode);
    }

    // 2. Holographic Ghost Blueprint Overlay (Transparent HUD Projection across Canvas)
    if (ghostOverlayActive && currentTargetImageElement) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(currentTargetImageElement, 0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#A78BFA";
      ctx.lineWidth = 1.0;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 2.2 Central acquisition reticle when scanning in live camera or video mode
    if ((activeFeedMode === "camera" || activeFeedMode === "video_file" || activeFeedMode === "demo_phone") && currentSegments.length === 0) {
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(cx - 90, cy - 75, 180, 150);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TARGET ACQUISITION ZONE", cx, cy + 92);
      ctx.restore();
    }

    // 2.5 Calibrated Optical Bench Ruler Ticks (Cleanroom Inspection Station)
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.lineWidth = 1.0;

    // Top horizontal ruler
    for (let x = 0; x <= canvas.width; x += 10) {
      const isMajor = (x % 100 === 0);
      const isMid = (x % 50 === 0);
      const tickH = isMajor ? 9 : (isMid ? 5 : 3);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, tickH);
      ctx.stroke();
      if (isMajor && x > 0 && x < canvas.width - 25) {
        ctx.fillText(`${x}`, x + 3, 10);
      }
    }

    // Left vertical ruler
    for (let y = 0; y <= canvas.height; y += 10) {
      const isMajor = (y % 100 === 0);
      const isMid = (y % 50 === 0);
      const tickW = isMajor ? 9 : (isMid ? 5 : 3);
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(tickW, y + 0.5);
      ctx.stroke();
      if (isMajor && y > 0 && y < canvas.height - 10) {
        ctx.fillText(`${y}`, 3, y - 2);
      }
    }
    ctx.restore();

    // 3. Draw SAM 3.1 Smoothed Polygons & Centroids
    const placedTags = [];
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

      // Tag Label & 45° Dogleg Leader Line (Industrial Cleanroom AR Standard)
      const isRealRle = Boolean(seg.attributes && seg.attributes.source === "meta_sam_3.1" && seg.attributes.has_rle_mask);
      const isDemo = Boolean(seg.attributes && seg.attributes.source === "offline_demo");
      const tagText = isRealRle ? `[SAM 3.1 RLE] ${seg.label}` : (isDemo ? `[DEMO TRACKER] ${seg.label}` : `[SAM 3.1] ${seg.label}`);
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      const textWidth = ctx.measureText(tagText).width;
      const tagW = textWidth + 14;
      const tagH = 19;
      const isTarget = Boolean(seg.attributes && (seg.attributes.target_pad || seg.attributes.polarity_aligned)) || seg.label.includes("socket") || seg.label.includes("target");
      
      const anchorX = isTarget ? Math.min(canvas.width - 10, seg.bbox.x_max) : Math.max(10, seg.bbox.x_min);
      const anchorY = isTarget ? Math.min(canvas.height - 10, seg.bbox.y_max) : Math.max(10, seg.bbox.y_min);
      
      let tagX = isTarget ? Math.min(canvas.width - tagW - 10, anchorX + 22) : Math.max(10, anchorX - tagW - 22);
      let tagY = isTarget ? Math.min(canvas.height - tagH - 10, anchorY + 18) : Math.max(16, anchorY - 26);

      // Prevent overlapping with previously placed tags
      for (const prev of placedTags) {
        if (Math.abs(prev.y - tagY) < tagH + 4 && Math.abs(prev.x - tagX) < tagW) {
          tagY = isTarget ? (prev.y + tagH + 5) : (prev.y - tagH - 5);
        }
      }
      tagX = Math.max(10, Math.min(canvas.width - tagW - 10, tagX));
      tagY = Math.max(16, Math.min(canvas.height - tagH - 10, tagY));
      placedTags.push({ x: tagX, y: tagY, w: tagW, h: tagH });

      // Anchor Reticle Node at Component Edge
      ctx.save();
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.arc(anchorX, anchorY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 45° Angled Leader Line (Dogleg Tether)
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY);
      const doglegX = tagX > anchorX ? anchorX + 10 : anchorX - 10;
      const doglegY = tagY > anchorY ? anchorY + 10 : anchorY - 10;
      ctx.lineTo(doglegX, doglegY);
      const tagConnectX = tagX > anchorX ? tagX : tagX + tagW;
      ctx.lineTo(tagConnectX, tagY + tagH / 2);
      ctx.stroke();
      ctx.restore();

      // Floating Data Capsule Tag
      drawRoundedRect(ctx, tagX, tagY, tagW, tagH, 6);
      ctx.fillStyle = "rgba(8, 13, 26, 0.92)";
      ctx.fill();
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = seg.color;
      ctx.fillText(tagText, tagX + 7, tagY + 13);
    });

    // 4. Draw AR Spatial Vectors, Directional Guidance & Alignment Badges (Top HUD Layer)
    Object.keys(spatialRelations).forEach(key => {
      const rel = spatialRelations[key];
      const [idA, idB] = key.split(":");
      const segA = currentSegments.find(s => s.id === idA);
      const segB = currentSegments.find(s => s.id === idB);
      if (segA && segB && segA.centroid && segB.centroid) {
        const currentDistPx = Math.round(Math.hypot(segB.centroid.x - segA.centroid.x, segB.centroid.y - segA.centroid.y));
        const isAnomaly = lastVerificationData && (!lastVerificationData.is_verified || (lastVerificationData.detected_anomalies && lastVerificationData.detected_anomalies.length > 0));
        const isAligned = currentDistPx < 25;
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

        // Vernier Arc Millimeter Tolerance Radial Gauge
        const bx = segB.centroid.x;
        const by = segB.centroid.y;
        const vernierRadius = isAligned ? 26 * pulse : 24;

        ctx.save();
        // Outer Vernier Calibrated Ring
        ctx.strokeStyle = isAnomaly ? "rgba(255, 59, 48, 0.45)" : isAligned ? "rgba(0, 210, 106, 0.55)" : "rgba(0, 198, 255, 0.35)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(bx, by, vernierRadius + 6, -Math.PI * 0.75, Math.PI * 0.75);
        ctx.stroke();

        // Vernier Arc Calibration Ticks
        for (let a = -Math.PI * 0.75; a <= Math.PI * 0.75; a += Math.PI / 8) {
          const tickLen = (Math.abs(a) < 0.1 || Math.abs(a - Math.PI * 0.75) < 0.1 || Math.abs(a + Math.PI * 0.75) < 0.1) ? 5 : 3;
          const x1 = bx + (vernierRadius + 6) * Math.cos(a);
          const y1 = by + (vernierRadius + 6) * Math.sin(a);
          const x2 = bx + (vernierRadius + 6 + tickLen) * Math.cos(a);
          const y2 = by + (vernierRadius + 6 + tickLen) * Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Target Socket Reticle Center & Horizon Crosshairs
        ctx.strokeStyle = isAnomaly ? "#FF3B30" : isAligned ? "#00D26A" : "#00C6FF";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, isAligned ? 20 * pulse : 16, 0, Math.PI * 2);
        ctx.stroke();

        // Calibrated Graticule Crosshairs
        const crosshairLen = isAligned ? 30 : 22;
        ctx.beginPath();
        ctx.moveTo(bx - crosshairLen, by);
        ctx.lineTo(bx + crosshairLen, by);
        ctx.moveTo(bx, by - crosshairLen);
        ctx.lineTo(bx, by + crosshairLen);
        ctx.stroke();

        // Dynamic Alignment Bearing Needle (pointing along approach vector)
        if (!isAligned) {
          const needleLen = vernierRadius + 8;
          ctx.strokeStyle = isAnomaly ? "#FF3B30" : "#00C6FF";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(bx + (vernierRadius - 2) * Math.cos(angle + Math.PI), by + (vernierRadius - 2) * Math.sin(angle + Math.PI));
          ctx.lineTo(bx + needleLen * Math.cos(angle + Math.PI), by + needleLen * Math.sin(angle + Math.PI));
          ctx.stroke();
        }
        ctx.restore();

        // Distance & Alignment Pill Badge
        const midX = (segA.centroid.x + segB.centroid.x) / 2.0;
        const midY = (segA.centroid.y + segB.centroid.y) / 2.0;
        const distMm = (currentDistPx * 0.08).toFixed(1);
        const badgeText = isAligned ? "TOLERANCE LOCKED ±0.5mm" : isAnomaly ? `REALIGN: ${distMm}mm (${currentDistPx}px)` : `ALIGNING: ${distMm}mm (↗ ${currentDistPx}px)`;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const badgeW = ctx.measureText(badgeText).width + 24;
        const badgeH = 22;

        drawRoundedRect(ctx, midX - badgeW / 2, midY - 11, badgeW, badgeH, 11);
        ctx.fillStyle = "rgba(8, 13, 26, 0.95)";
        ctx.fill();
        ctx.strokeStyle = isAnomaly ? "#FF3B30" : isAligned ? "#00D26A" : "#00C6FF";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isAnomaly ? "#FFA39E" : isAligned ? "#73F5AA" : "#80E1FF";
        ctx.fillText(badgeText, midX - badgeW / 2 + 12, midY + 4);
        ctx.restore();
      }
    });

    requestAnimationFrame(renderLoop);
  }

  // Canvas Mouse Dragging for Demo Components
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener("mousedown", (e) => {
    if (activeFeedMode !== "camera" && window.OmniSpatialDemo) {
      isDraggingComponent = true;
      canvas.style.cursor = "grabbing";
      const pos = getCanvasCoords(e);
      window.OmniSpatialDemo.setDragPosition(pos.x, pos.y);
      sendFrame(false);
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDraggingComponent && activeFeedMode !== "camera" && window.OmniSpatialDemo) {
      const pos = getCanvasCoords(e);
      window.OmniSpatialDemo.setDragPosition(pos.x, pos.y);
    }
  });

  const stopDragging = () => {
    if (isDraggingComponent) {
      isDraggingComponent = false;
      canvas.style.cursor = "crosshair";
      if (window.OmniSpatialDemo) {
        window.OmniSpatialDemo.clearDragPosition();
      }
      sendFrame(false);
    }
  };

  canvas.addEventListener("mouseup", stopDragging);
  canvas.addEventListener("mouseleave", stopDragging);

  // Prevent button clicks from trapping keyboard focus (ensures Spacebar always verifies)
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => btn.blur());
  });

  // Event Listeners
  inputSourceSelect.addEventListener("change", (e) => {
    switchFeedMode(e.target.value);
  });

  const videoFileInput = document.getElementById("videoFileInput");
  if (videoFileInput) {
    videoFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        switchFeedMode("demo_esp32");
        return;
      }
      stopCamera();
      const fileUrl = URL.createObjectURL(file);
      video.srcObject = null;
      video.src = fileUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        video.play().catch(err => console.warn("Video play error:", err));
      };
      video.classList.remove("hidden");
      cameraPlaceholder.classList.add("hidden");
      feedModeLabel.textContent = `VIDEO: ${file.name.slice(0, 24).toUpperCase()}`;
    });
  }

  // In-Browser MediaRecorder for Instant Demo Video Export
  const recordDemoBtn = document.getElementById("recordDemoBtn");
  const recordDot = document.getElementById("recordDot");
  const recordBtnText = document.getElementById("recordBtnText");
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordTimer = null;
  let recordSeconds = 0;

  if (recordDemoBtn) {
    recordDemoBtn.addEventListener("click", () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
      }

      if (typeof canvas.captureStream !== "function") {
        alert("Canvas recording is not supported in this browser.");
        return;
      }

      const stream = canvas.captureStream(30);
      recordedChunks = [];
      try {
        const mimeType = (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9"))
          ? "video/webm;codecs=vp9"
          : (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/mp4") ? "video/mp4" : "video/webm");
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch (err) {
        console.error("Failed to initialize MediaRecorder:", err);
        return;
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (recordTimer) clearInterval(recordTimer);
        recordTimer = null;
        if (recordDot) recordDot.className = "w-1.5 h-1.5 rounded-full bg-rose-500";
        if (recordBtnText) recordBtnText.textContent = "Record Demo";
        recordDemoBtn.classList.remove("bg-rose-600/30", "border-rose-400");

        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "video/webm" });
          const ext = (mediaRecorder.mimeType && mediaRecorder.mimeType.includes("mp4")) ? "mp4" : "webm";
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `omnispatial_demo_${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
      };

      mediaRecorder.start(100);
      recordSeconds = 0;
      if (recordDot) recordDot.className = "w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping";
      recordDemoBtn.classList.add("bg-rose-600/30", "border-rose-400");
      if (recordBtnText) recordBtnText.textContent = "Stop (00:00)";
      recordTimer = setInterval(() => {
        recordSeconds++;
        const mm = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
        const ss = String(recordSeconds % 60).padStart(2, "0");
        if (recordBtnText) recordBtnText.textContent = `Stop (${mm}:${ss})`;
      }, 1000);
    });
  }

  verifyBtn.addEventListener("click", () => {
    triggerVerification();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "SELECT" && e.target.tagName !== "TEXTAREA") {
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

  // Pipeline Stepper Node Click Navigation
  document.querySelectorAll("#pipelineStepper .stepper-node").forEach(node => {
    node.addEventListener("click", () => {
      const targetStep = parseInt(node.getAttribute("data-step"), 10);
      if (targetStep && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "set_step", step_number: targetStep }));
      }
    });
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
      if (promptFeedbackSpinner && currentCustomPrompt) promptFeedbackSpinner.classList.remove("hidden");
      sendFrame(false);
    });
  }

  if (clearPromptBtn) {
    clearPromptBtn.addEventListener("click", () => {
      if (customPromptInput) customPromptInput.value = "";
      currentCustomPrompt = "";
      if (promptFeedbackSpinner) promptFeedbackSpinner.classList.add("hidden");
      sendFrame(false);
    });
  }

  if (generateTaskBtn) {
    generateTaskBtn.addEventListener("click", () => {
      const goal = (customPromptInput && customPromptInput.value.trim()) || "Assemble custom hardware";
      if (promptFeedbackSpinner) promptFeedbackSpinner.classList.remove("hidden");
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "set_workflow", task_goal: goal }));
      }
    });
  }

  if (presetBtns) {
    presetBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const prompt = btn.getAttribute("data-prompt") || "";
        if (customPromptInput) customPromptInput.value = prompt;
        currentCustomPrompt = prompt;
        if (promptFeedbackSpinner && prompt) promptFeedbackSpinner.classList.remove("hidden");
        sendFrame(false);
      });
    });
  }

  // Initialize
  canvas.width = 640;
  canvas.height = 400;
  canvas.style.cursor = "crosshair";

  const urlParams = new URLSearchParams(window.location.search);
  const initialStep = Math.max(1, Math.min(3, parseInt(urlParams.get("step") || "1", 10)));
  const initialFeed = urlParams.get("feed") || (inputSourceSelect && inputSourceSelect.value ? inputSourceSelect.value : "demo_phone");
  
  if (urlParams.get("ghost") === "1" || urlParams.get("ghost") === "true") {
    ghostOverlayActive = true;
    if (ghostToggleText) ghostToggleText.textContent = "Ghost Blueprint: ON";
    if (ghostToggleBtn) ghostToggleBtn.classList.add("bg-purple-600/30", "border-purple-400", "text-purple-200", "shadow-[0_0_12px_rgba(168,85,247,0.3)]");
  }

  const stepMeta = {
    1: { step_number: 1, title: "Mount Main IC Chip", description: "Place the microcontroller into socket U1, ensuring pin 1 notch faces upwards." },
    2: { step_number: 2, title: "Position Decoupling Capacitor C1", description: "Insert 100nF ceramic capacitor into pads C1 next to VCC rail." },
    3: { step_number: 3, title: "Solder Header Pins", description: "Solder 4-pin UART communication header cleanly across pads J1." }
  };

  switchFeedMode(initialFeed, false);
  updateStepUI(stepMeta[initialStep]);
  connectWebSocket();
  requestAnimationFrame(renderLoop);

})();
