// OmniSpatial - Judge Evaluation Demo Frame Synthesizer
// Provides realistic procedural camera feeds for testing without physical hardware

window.OmniSpatialDemo = (function() {
  let demoTicks = 0;

  function renderDemoFrame(ctx, width, height, scenario = "esp32") {
    demoTicks++;
    const t = demoTicks * 0.03;

    // Dark PCB Substrate
    ctx.fillStyle = "#0c1322";
    ctx.fillRect(0, 0, width, height);

    // Copper Traces
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, height * 0.5);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 50; y < height; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width * 0.4, y + 20);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Ground Plane grid vias
    ctx.fillStyle = "#334155";
    for (let x = 20; x < width; x += 80) {
      for (let y = 30; y < height; y += 80) {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (scenario === "esp32" || scenario === "step_1" || scenario === "demo_esp32") {
      // Scenario 1: IC Chip Microcontroller Socket Assembly
      // Socket U1 Outline (Static)
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.fillRect(170, 130, 140, 140);
      ctx.strokeRect(170, 130, 140, 140);

      // Socket Pins
      ctx.fillStyle = "#f59e0b";
      for (let i = 0; i < 7; i++) {
        ctx.fillRect(160, 145 + i * 16, 8, 4); // Left pins
        ctx.fillRect(312, 145 + i * 16, 8, 4); // Right pins
      }
      // Notch at top
      ctx.fillStyle = "#0c1322";
      ctx.beginPath();
      ctx.arc(240, 130, 8, 0, Math.PI);
      ctx.fill();

      // Moving Microcontroller Chip (simulates technician hand placement)
      const offsetX = Math.sin(t) * 15;
      const offsetY = Math.cos(t * 0.8) * 10;
      const chipX = 180 + offsetX;
      const chipY = 140 + offsetY;

      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.fillRect(chipX, chipY, 120, 120);
      ctx.strokeRect(chipX, chipY, 120, 120);

      // Chip text
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 11px monospace";
      ctx.fillText("ATmega328P", chipX + 22, chipY + 65);
      // Pin 1 notch on chip
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(chipX + 60, chipY + 4, 5, 0, Math.PI);
      ctx.fill();

    } else if (scenario === "capacitor" || scenario === "step_2" || scenario === "demo_cap") {
      // Scenario 2: Decoupling Capacitor Placement
      // Microcontroller seated
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.fillRect(180, 140, 120, 120);
      ctx.strokeRect(180, 140, 120, 120);

      // C1 Solder Pads
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(330, 150, 10, 20);
      ctx.fillRect(360, 150, 10, 20);

      // Capacitor moving toward pads
      const capOffsetX = Math.sin(t) * 8;
      const capOffsetY = Math.cos(t) * 6;
      ctx.fillStyle = "#10b981";
      ctx.strokeStyle = "#34d399";
      ctx.fillRect(332 + capOffsetX, 152 + capOffsetY, 36, 16);
      ctx.strokeRect(332 + capOffsetX, 152 + capOffsetY, 36, 16);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "9px monospace";
      ctx.fillText("C1", 342 + capOffsetX, 164 + capOffsetY);

    } else {
      // Scenario 3: UART Header Soldering
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 2;
      ctx.fillRect(140, 210, 160, 40);
      ctx.strokeRect(140, 210, 160, 40);

      // Header Pins
      for (let i = 0; i < 4; i++) {
        const pinX = 160 + i * 36;
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(pinX, 230, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(pinX, 230, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return {
    renderDemoFrame: renderDemoFrame
  };
})();
