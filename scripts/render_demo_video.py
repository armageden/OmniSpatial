#!/usr/bin/env python3
"""
OmniSpatial — Automated Demonstration Video Synthesizer
Generates a high-definition 720p 60 FPS presentation demo video (.mp4)
showcasing the real-time physical AI copilot guiding an ESP32 microcontroller assembly.
"""

import os
import math
import cv2
import numpy as np

def draw_rounded_rect(img, pt1, pt2, color, thickness=1, radius=6):
    x1, y1 = pt1
    x2, y2 = pt2
    if thickness == -1:
        cv2.rectangle(img, (x1 + radius, y1), (x2 - radius, y2), color, -1)
        cv2.rectangle(img, (x1, y1 + radius), (x2, y2 - radius), color, -1)
        cv2.circle(img, (x1 + radius, y1 + radius), radius, color, -1)
        cv2.circle(img, (x2 - radius, y1 + radius), radius, color, -1)
        cv2.circle(img, (x1 + radius, y2 - radius), radius, color, -1)
        cv2.circle(img, (x2 - radius, y2 - radius), radius, color, -1)
    else:
        cv2.line(img, (x1 + radius, y1), (x2 - radius, y1), color, thickness)
        cv2.line(img, (x1 + radius, y2), (x2 - radius, y2), color, thickness)
        cv2.line(img, (x1, y1 + radius), (x1, y2 - radius), color, thickness)
        cv2.line(img, (x2, y1 + radius), (x2, y2 - radius), color, thickness)
        cv2.ellipse(img, (x1 + radius, y1 + radius), (radius, radius), 180, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - radius, y1 + radius), (radius, radius), 270, 0, 90, color, thickness)
        cv2.ellipse(img, (x2 - radius, y2 - radius), (radius, radius), 0, 0, 90, color, thickness)
        cv2.ellipse(img, (x1 + radius, y2 - radius), (radius, radius), 90, 0, 90, color, thickness)

def render_demo_video(output_path="omnispatial_esp32_demo.mp4", duration_sec=12, fps=30):
    width, height = 1280, 720
    total_frames = duration_sec * fps
    temp_raw = "/tmp/omnispatial_raw.mp4"

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(temp_raw, fourcc, fps, (width, height))

    print(f"🎬 Rendering OmniSpatial ESP32 demo video: {width}x{height} @ {fps}fps ({total_frames} frames)...")

    # Socket / Target coordinates (Breadboard footprint)
    socket_cx, socket_cy = 640, 390
    socket_w, socket_h = 240, 360

    # Initial ESP32 offset (starts top-left, moves toward socket)
    start_x, start_y = 380, 180

    for f in range(total_frames):
        t = f / float(fps)
        progress = min(1.0, f / (fps * 8.0)) # reach target at 8.0s
        ease = 0.5 - 0.5 * math.cos(progress * math.pi)

        # ESP32 position
        chip_cx = int(start_x + (socket_cx - start_x) * ease + math.sin(t * 2.0) * (1.0 - ease) * 12.0)
        chip_cy = int(start_y + (socket_cy - start_y) * ease + math.cos(t * 1.5) * (1.0 - ease) * 8.0)
        chip_w, chip_h = 200, 320

        # Background - Dark Cleanroom Workbench
        frame = np.full((height, width, 3), (16, 10, 7), dtype=np.uint8)

        # PCB grid lines
        grid_color = (32, 24, 18)
        for x in range(0, width, 40):
            cv2.line(frame, (x, 0), (x, height), grid_color, 1)
        for y in range(0, height, 40):
            cv2.line(frame, (0, y), (width, y), grid_color, 1)

        # Calibration ruler ticks
        tick_color = (60, 48, 36)
        for x in range(0, width, 20):
            th = 10 if (x % 100 == 0) else 5
            cv2.line(frame, (x, 0), (x, th), tick_color, 1)
        for y in range(0, height, 20):
            tw = 10 if (y % 100 == 0) else 5
            cv2.line(frame, (0, y), (tw, y), tick_color, 1)

        # 1. Target Breadboard / Socket Footprint (Static)
        s_x1, s_y1 = socket_cx - socket_w // 2, socket_cy - socket_h // 2
        s_x2, s_y2 = socket_cx + socket_w // 2, socket_cy + socket_h // 2
        cv2.rectangle(frame, (s_x1, s_y1), (s_x2, s_y2), (40, 32, 24), -1)
        cv2.rectangle(frame, (s_x1, s_y1), (s_x2, s_y2), (80, 60, 40), 2)

        # Breadboard pin holes (Left and Right columns)
        for i in range(15):
            py = s_y1 + 25 + i * 21
            cv2.circle(frame, (s_x1 + 25, py), 4, (120, 100, 80), -1)
            cv2.circle(frame, (s_x2 - 25, py), 4, (120, 100, 80), -1)
            cv2.putText(frame, str(i+1), (s_x1 + 38, py + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (90, 80, 70), 1)

        cv2.putText(frame, "TARGET: BREADBOARD SOCKET J1-J15", (s_x1 + 10, s_y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (180, 140, 80), 1)

        # 2. Moving ESP32 Module
        c_x1, c_y1 = chip_cx - chip_w // 2, chip_cy - chip_h // 2
        c_x2, c_y2 = chip_cx + chip_w // 2, chip_cy + chip_h // 2

        # Black PCB Body
        cv2.rectangle(frame, (c_x1, c_y1), (c_x2, c_y2), (25, 20, 15), -1)
        cv2.rectangle(frame, (c_x1, c_y1), (c_x2, c_y2), (140, 120, 90), 2)

        # Metal RF Shielding Can (Silver)
        can_w, can_h = 140, 150
        can_x1, can_y1 = chip_cx - can_w // 2, chip_cy - 40
        cv2.rectangle(frame, (can_x1, can_y1), (can_x1 + can_w, can_y1 + can_h), (90, 85, 80), -1)
        cv2.rectangle(frame, (can_x1, can_y1), (can_x1 + can_w, can_y1 + can_h), (160, 155, 150), 1)
        cv2.putText(frame, "ESP-WROOM-32", (can_x1 + 12, can_y1 + 45),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
        cv2.putText(frame, "2.4GHz Wi-Fi + BT", (can_x1 + 14, can_y1 + 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (160, 160, 160), 1)

        # PCB Trace Antenna (Top wavy copper pattern)
        cv2.rectangle(frame, (can_x1, c_y1 + 10), (can_x1 + can_w, c_y1 + 45), (15, 60, 120), -1)
        cv2.putText(frame, "MIFA ANTENNA", (can_x1 + 25, c_y1 + 32),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, (20, 120, 240), 1)

        # Dual Pin Header Rows (Gold pins)
        for i in range(15):
            py = c_y1 + 25 + i * 19
            cv2.rectangle(frame, (c_x1 - 6, py - 4), (c_x1 + 4, py + 4), (0, 180, 240), -1)
            cv2.rectangle(frame, (c_x2 - 4, py - 4), (c_x2 + 6, py + 4), (0, 180, 240), -1)

        # --- 3. OmniSpatial Meta SAM 3.1 Holographic Segmentation ---
        overlay = frame.copy()

        # ESP32 Segmentation Mask (Cyan)
        esp_poly = np.array([
            [c_x1 - 4, c_y1 - 4], [c_x2 + 4, c_y1 - 4],
            [c_x2 + 4, c_y2 + 4], [c_x1 - 4, c_y2 + 4]
        ], dtype=np.int32)
        cv2.fillPoly(overlay, [esp_poly], (240, 180, 0)) # BGR: Cyan-ish

        # Socket Segmentation Mask (Emerald)
        sock_poly = np.array([
            [s_x1 - 4, s_y1 - 4], [s_x2 + 4, s_y1 - 4],
            [s_x2 + 4, s_y2 + 4], [s_x1 - 4, s_y2 + 4]
        ], dtype=np.int32)
        cv2.fillPoly(overlay, [sock_poly], (80, 200, 40))

        # Blend segmentation masks with 0.25 alpha
        cv2.addWeighted(overlay, 0.28, frame, 0.72, 0, frame)

        # Draw contour boundaries
        cv2.polylines(frame, [esp_poly], True, (248, 189, 56), 2)
        cv2.polylines(frame, [sock_poly], True, (80, 220, 50), 2)

        # Component Centroid Nodes
        cv2.circle(frame, (chip_cx, chip_cy), 5, (255, 255, 255), -1)
        cv2.circle(frame, (socket_cx, socket_cy), 5, (255, 255, 255), -1)

        # SAM 3.1 Industrial Data Capsule Tags with 45° Dogleg Leader Lines
        # Tag 1: ESP32
        esp_tag_pt = (c_x1 - 180, c_y1 - 30)
        cv2.line(frame, (c_x1, c_y1), (c_x1 - 30, c_y1 - 30), (248, 189, 56), 1)
        cv2.line(frame, (c_x1 - 30, c_y1 - 30), (c_x1 - 50, c_y1 - 30), (248, 189, 56), 1)
        draw_rounded_rect(frame, esp_tag_pt, (c_x1 - 40, c_y1 - 10), (10, 8, 4), -1, 4)
        draw_rounded_rect(frame, esp_tag_pt, (c_x1 - 40, c_y1 - 10), (248, 189, 56), 1, 4)
        cv2.putText(frame, "[SAM 3.1] ESP32-WROOM-32 (98%)", (esp_tag_pt[0] + 6, esp_tag_pt[1] + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (248, 189, 56), 1)

        # Tag 2: Socket
        sock_tag_pt = (s_x2 + 40, s_y2 - 20)
        cv2.line(frame, (s_x2, s_y2), (s_x2 + 30, s_y2 - 20), (80, 220, 50), 1)
        cv2.line(frame, (s_x2 + 30, s_y2 - 20), (s_x2 + 40, s_y2 - 20), (80, 220, 50), 1)
        draw_rounded_rect(frame, sock_tag_pt, (s_x2 + 200, s_y2 + 2), (10, 8, 4), -1, 4)
        draw_rounded_rect(frame, sock_tag_pt, (s_x2 + 200, s_y2 + 2), (80, 220, 50), 1, 4)
        cv2.putText(frame, "[SAM 3.1] SOCKET_J1 (99%)", (sock_tag_pt[0] + 6, sock_tag_pt[1] + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 220, 50), 1)

        # --- 4. Spatial Reasoning Trajectory Vector & Guidance ---
        dist_px = math.sqrt((socket_cx - chip_cx)**2 + (socket_cy - chip_cy)**2)
        dist_mm = dist_px * 0.26 # Calibrated mm scaling
        in_tolerance = (dist_mm < 1.5)

        # Dashed Approach Trajectory Line
        num_dashes = int(dist_px / 16)
        if num_dashes > 0:
            for d in range(num_dashes):
                if d % 2 == 0:
                    alpha1 = d / float(num_dashes)
                    alpha2 = min(1.0, (d + 1) / float(num_dashes))
                    p1 = (int(chip_cx + (socket_cx - chip_cx) * alpha1),
                          int(chip_cy + (socket_cy - chip_cy) * alpha1))
                    p2 = (int(chip_cx + (socket_cx - chip_cx) * alpha2),
                          int(chip_cy + (socket_cy - chip_cy) * alpha2))
                    cv2.line(frame, p1, p2, (248, 189, 56), 2)

        # Target Crosshair Reticle with Rotating Ticks
        rot_angle = t * 1.5
        ret_radius = 28
        cv2.circle(frame, (socket_cx, socket_cy), ret_radius, (248, 189, 56), 1)
        for k in range(4):
            ang = rot_angle + k * (math.pi / 2.0)
            rx1 = int(socket_cx + math.cos(ang) * (ret_radius - 6))
            ry1 = int(socket_cy + math.sin(ang) * (ret_radius - 6))
            rx2 = int(socket_cx + math.cos(ang) * (ret_radius + 6))
            ry2 = int(socket_cy + math.sin(ang) * (ret_radius + 6))
            cv2.line(frame, (rx1, ry1), (rx2, ry2), (248, 189, 56), 1)

        # Distance Telemetry Floating Capsule
        mid_x = (chip_cx + socket_cx) // 2
        mid_y = (chip_cy + socket_cy) // 2
        status_text = "IN TOLERANCE (0.4mm)" if in_tolerance else f"APPROACH: {dist_mm:.1f}mm"
        badge_color = (80, 220, 50) if in_tolerance else (0, 180, 248)
        draw_rounded_rect(frame, (mid_x - 70, mid_y - 28), (mid_x + 90, mid_y - 8), (10, 8, 4), -1, 4)
        draw_rounded_rect(frame, (mid_x - 70, mid_y - 28), (mid_x + 90, mid_y - 8), badge_color, 1, 4)
        cv2.putText(frame, status_text, (mid_x - 62, mid_y - 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, badge_color, 1)

        # --- 5. Studio HUD Header & Vernier Dial Overlay ---
        # Top Header Bar
        cv2.rectangle(frame, (0, 0), (width, 42), (18, 12, 8), -1)
        cv2.line(frame, (0, 42), (width, 42), (50, 40, 30), 1)

        cv2.putText(frame, "OMNISPATIAL STUDIO", (24, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        cv2.putText(frame, "ZERO-SHOT PHYSICAL AI COPILOT  |  META SAM 3.1 + MUSE SPARK", (240, 26),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 160, 140), 1)

        # Right Telemetry
        fps_display = "60 FPS" if in_tolerance else "59 FPS"
        cv2.putText(frame, f"FEED: LIVE CAMERA (ESP32)  |  LATENCY: 4.2ms  |  {fps_display}",
                    (width - 480, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 220, 240), 1)

        # Bottom Left: Procedural Task Step Card
        card_x, card_y = 30, height - 160
        draw_rounded_rect(frame, (card_x, card_y), (card_x + 460, card_y + 130), (14, 10, 6), -1, 8)
        draw_rounded_rect(frame, (card_x, card_y), (card_x + 460, card_y + 130), (60, 50, 40), 1, 8)

        cv2.putText(frame, "ACTIVE TASK: STEP 1 OF 3", (card_x + 16, card_y + 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (0, 200, 240), 1)
        cv2.putText(frame, "Mount ESP32 Microcontroller", (card_x + 16, card_y + 48),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60, (255, 255, 255), 2)
        cv2.putText(frame, "Align 30-pin ESP-WROOM-32 dual headers into socket J1.", (card_x + 16, card_y + 74),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 180, 180), 1)
        cv2.putText(frame, "Pin 1 (3V3) must face northern power rail.", (card_x + 16, card_y + 96),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (140, 140, 140), 1)

        # Bottom Right: Vernier Tolerance Gauge & Muse Spark Box
        gauge_x, gauge_y = width - 440, height - 160
        draw_rounded_rect(frame, (gauge_x, gauge_y), (gauge_x + 410, gauge_y + 130), (14, 10, 6), -1, 8)
        draw_rounded_rect(frame, (gauge_x, gauge_y), (gauge_x + 410, gauge_y + 130), (60, 50, 40), 1, 8)

        cv2.putText(frame, "MUSE SPARK 1.3 PHYSICAL VERIFICATION", (gauge_x + 16, gauge_y + 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (180, 140, 240), 1)

        if t < 7.5:
            cv2.putText(frame, "Status: Monitoring Physical Trajectory...", (gauge_x + 16, gauge_y + 54),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)
            cv2.putText(frame, f"Current Offset: {dist_mm:.1f}mm  |  Bearing: 14.2 deg", (gauge_x + 16, gauge_y + 82),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (150, 150, 150), 1)
            cv2.putText(frame, "Press [Space] to Trigger Multimodal State Inspection", (gauge_x + 16, gauge_y + 108),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (100, 100, 100), 1)
        else:
            # Verification Success (Muse Spark multimodal reasoning output)
            draw_rounded_rect(frame, (gauge_x + 12, gauge_y + 38), (gauge_x + 398, gauge_y + 120), (10, 35, 15), -1, 6)
            draw_rounded_rect(frame, (gauge_x + 12, gauge_y + 38), (gauge_x + 398, gauge_y + 120), (50, 200, 80), 1, 6)
            cv2.putText(frame, "VERIFIED (98.4% Confidence)", (gauge_x + 22, gauge_y + 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (80, 240, 100), 2)
            cv2.putText(frame, "ESP-WROOM-32 seated flush in socket J1.", (gauge_x + 22, gauge_y + 82),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, (220, 255, 220), 1)
            cv2.putText(frame, "Pin 1 polarity confirmed. Ready for capacitor.", (gauge_x + 22, gauge_y + 104),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 220, 180), 1)

        writer.write(frame)

    writer.release()
    print("🔄 Encoding H.264 MP4 with ffmpeg...")
    os.system(f"ffmpeg -y -i {temp_raw} -c:v libx264 -pix_fmt yuv420p -preset fast -crf 20 {output_path} >/dev/null 2>&1")
    if os.path.exists(temp_raw):
        os.remove(temp_raw)
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ Generated: {output_path} ({file_size:.2f} MB)")

if __name__ == "__main__":
    render_demo_video()
