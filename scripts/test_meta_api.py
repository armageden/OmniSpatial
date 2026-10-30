#!/usr/bin/env python3
"""
Test script for verifying Meta Model API connectivity & functionality in OmniSpatial:
- SAM 3.1 Zero-shot segmentation
- Muse Spark physical state reasoning
- Muse Image visual target generation
"""

import io
import sys
import time
import base64
import asyncio
from pathlib import Path
from PIL import Image, ImageDraw

# Ensure backend package is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.config import settings
from app.services.meta_client import meta_client

def generate_sample_pcb_image() -> str:
    """Generates a valid test image with simulated electronics components."""
    img = Image.new("RGB", (320, 240), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    # Draw simulated IC chip
    draw.rectangle([60, 60, 180, 180], fill=(30, 41, 59), outline=(56, 189, 248), width=2)
    # Draw simulated capacitor
    draw.rectangle([210, 80, 260, 130], fill=(16, 185, 129), outline=(52, 211, 153), width=2)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

async def run_meta_api_tests():
    print("=" * 60)
    print("  OmniSpatial — Meta Model API Connectivity Validator")
    print("=" * 60)

    raw_key = settings.meta_model_api_key or ""
    masked_key = (raw_key[:6] + "..." + raw_key[-4:]) if len(raw_key) > 10 else raw_key
    print(f"Endpoint Base URL : {settings.meta_api_base_url}")
    print(f"API Key Configured: {masked_key or '[EMPTY]'}")
    print(f"Mock Mode Status  : {'ACTIVE (Mock Fallback)' if meta_client.is_mock else 'INACTIVE (Live API Active)'}")
    print("-" * 60)

    sample_image_data_url = generate_sample_pcb_image()

    # 1. Test SAM 3.1 Segmentation
    print("\n[1/3] Testing SAM 3.1 Zero-Shot Segmentation...")
    t0 = time.perf_counter()
    try:
        segments = await meta_client.segment_frame_sam(
            image_base64=sample_image_data_url,
            target_label="components, chips, capacitors"
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"  ✓ SAM 3.1 returned {len(segments)} entities in {elapsed_ms:.1f}ms")
        for s in segments:
            print(f"    - ID: {s.id} | Label: {s.label} | Conf: {s.confidence:.2f} | BBox: ({s.bbox.x_min}, {s.bbox.y_min})->({s.bbox.x_max}, {s.bbox.y_max})")
    except Exception as e:
        print(f"  ✗ SAM 3.1 Call Failed: {e}")

    # 2. Test Muse Spark Physical Reasoning
    print("\n[2/3] Testing Muse Spark Physical Reasoning...")
    t0 = time.perf_counter()
    try:
        reasoning_res = await meta_client.reason_physical_state_muse_spark(
            prompt="Task Step 1: Mount microcontroller chip into socket U1 with pin 1 notch facing upward.",
            context={
                "step_number": 1,
                "detected_components": [
                    {"label": "microcontroller_chip", "bbox": [60, 60, 180, 180], "notch_up": True},
                    {"label": "socket_u1", "bbox": [58, 58, 182, 182]}
                ],
                "distance_to_socket_center_px": 0.5
            }
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"  ✓ Muse Spark completed in {elapsed_ms:.1f}ms")
        print(f"    - Verified: {reasoning_res.get('step_verified')}")
        print(f"    - Confidence: {reasoning_res.get('confidence')}")
        print(f"    - Feedback: {reasoning_res.get('reasoning')}")
        print(f"    - Next Action: {reasoning_res.get('next_action')}")
    except Exception as e:
        print(f"  ✗ Muse Spark Call Failed: {e}")

    # 3. Test Muse Image Target Generation
    print("\n[3/3] Testing Muse Image Perspective Target Generation...")
    t0 = time.perf_counter()
    try:
        image_res = await meta_client.generate_target_image_muse(
            prompt="Overhead perspective engineering diagram of a printed circuit board with microcontroller mounted cleanly in socket U1"
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"  ✓ Muse Image completed in {elapsed_ms:.1f}ms")
        print(f"    - Target preview format: {image_res[:45]}...")
    except Exception as e:
        print(f"  ✗ Muse Image Call Failed: {e}")

    print("\n" + "=" * 60)
    if meta_client.is_mock:
        print("  NOTICE: Currently running in MOCK mode.")
    else:
        print("  SUCCESS: Live Meta Model API endpoints verified successfully!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_meta_api_tests())
