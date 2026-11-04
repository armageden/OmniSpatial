#!/usr/bin/env node
/**
 * OmniSpatial — Automated Full Application Screen Recorder
 * Uses Chromium via puppeteer-core to drive the real web application at 1920x1080,
 * operating every major feature (steps, ghost overlay, verification, phone video feed, custom goals)
 * and piping frames into ffmpeg to render the final presentation demo video.
 */

const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_VIDEO = path.resolve(__dirname, '../omnispatial_final_presentation.mp4');
const FPS = 15; // 15 fps gives ultra-smooth recording while keeping render time fast

async function recordAppDemo() {
  console.log('🚀 Launching Chromium to record real OmniSpatial Web Studio...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  // Spawn ffmpeg to read raw image pipe
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    '-crf', '20',
    OUTPUT_VIDEO
  ]);

  ffmpeg.stderr.on('data', () => {}); // silence ffmpeg logs

  async function captureFrames(durationSec, actionDescription) {
    console.log(`📹 [Recording]: ${actionDescription} (${durationSec}s)`);
    const frameCount = Math.round(durationSec * FPS);
    for (let i = 0; i < frameCount; i++) {
      const buffer = await page.screenshot({ type: 'jpeg', quality: 85 });
      ffmpeg.stdin.write(buffer);
      await new Promise(r => setTimeout(r, Math.round(1000 / FPS)));
    }
  }

  try {
    // ── SCENE 1: Initial Viewport & Real-Time Tracking in Demo Mode (Step 1: IC Chip) ──
    await page.evaluate(() => {
      const sel = document.getElementById('inputSourceSelect');
      if (sel) {
        sel.value = 'demo_esp32';
        sel.dispatchEvent(new Event('change'));
      }
    });
    await captureFrames(6.0, 'Feature 1: Real-Time HUD Tracking & Vernier Tolerance Dial (Step 1)');

    // ── SCENE 2: Toggle Holographic Ghost Blueprint Overlay ──
    await page.evaluate(() => {
      const btn = document.getElementById('ghostToggleBtn');
      if (btn) btn.click();
    });
    await captureFrames(5.0, 'Feature 2: Perspective Ghost Blueprint Projected onto Live HUD');

    // ── SCENE 3: Trigger Physical Verification with Muse Spark 1.3 ──
    await page.evaluate(() => {
      const vBtn = document.getElementById('verifyBtn');
      if (vBtn) vBtn.click();
    });
    await captureFrames(5.0, 'Feature 3: Meta Muse Spark 1.3 Physical State Verification [Space]');

    // ── SCENE 4: Navigate Pipeline Stepper (Step 2: Capacitor & Step 3: UART Header) ──
    await page.evaluate(() => {
      const nextBtn = document.getElementById('nextStepBtn');
      if (nextBtn) nextBtn.click();
    });
    await captureFrames(4.0, 'Feature 4: Procedural Step Progression (Step 2: Ceramic Capacitor)');

    await page.evaluate(() => {
      const nextBtn = document.getElementById('nextStepBtn');
      if (nextBtn) nextBtn.click();
    });
    await captureFrames(4.0, 'Feature 5: Procedural Step Progression (Step 3: UART Header)');

    // ── SCENE 5: Switch Feed to Real Phone Video of the Physical Hardware ──
    await page.evaluate(() => {
      const sel = document.getElementById('inputSourceSelect');
      if (sel) {
        sel.value = 'demo_phone';
        sel.dispatchEvent(new Event('change'));
      }
    });
    await captureFrames(8.0, 'Feature 6: Live Phone Video Ingestion with Meta SAM 3.1 & Hardware Anomaly Reasoning');

    // ── SCENE 6: Custom Assembly Goal Generation ──
    await page.evaluate(() => {
      const promptInput = document.getElementById('customPromptInput');
      if (promptInput) {
        promptInput.value = 'Assemble custom drone flight controller';
      }
    });
    await captureFrames(4.0, 'Feature 7: Dynamic Custom Workflow Generator via Muse Spark');

  } catch (err) {
    console.error('Error during recording:', err);
  } finally {
    ffmpeg.stdin.end();
    await new Promise((resolve) => {
      ffmpeg.on('close', resolve);
    });
    await browser.close();
    console.log(`✅ Recording complete! Saved full application video to: ${OUTPUT_VIDEO}`);
  }
}

recordAppDemo();
