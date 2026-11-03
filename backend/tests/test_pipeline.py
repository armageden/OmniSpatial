import unittest
import numpy as np
import cv2
import json
from unittest.mock import patch, AsyncMock, MagicMock
from pycocotools import mask as mask_utils
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.models import Point, BoundingBox, SegmentedObject
from app.services.sam_service import sam_service
from app.services.reasoning_engine import reasoning_engine
from app.services.meta_client import meta_client

class TestOmniSpatialPipeline(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        reasoning_engine.reset_workflow()

    # --- 1. Coordinate Normalization Tests ---

    def test_coordinate_normalization_roundtrip(self):
        raw_points = [Point(x=100.0, y=200.0), Point(x=300.0, y=400.0)]
        normalized = sam_service.normalize_coordinates(raw_points, width=1000.0, height=800.0)
        self.assertEqual(normalized[0].x, 0.1)
        self.assertEqual(normalized[0].y, 0.25)
        self.assertEqual(normalized[1].x, 0.3)
        self.assertEqual(normalized[1].y, 0.5)

        denormalized = sam_service.denormalize_coordinates(normalized, width=1000.0, height=800.0)
        self.assertEqual(denormalized[0].x, 100.0)
        self.assertEqual(denormalized[0].y, 200.0)

    def test_bbox_normalization(self):
        bbox = BoundingBox(x_min=100.0, y_min=150.0, x_max=500.0, y_max=600.0)
        norm_bbox = sam_service.normalize_bbox(bbox, width=1000.0, height=1000.0)
        self.assertEqual(norm_bbox.x_min, 0.1)
        self.assertEqual(norm_bbox.y_min, 0.15)
        self.assertEqual(norm_bbox.x_max, 0.5)
        self.assertEqual(norm_bbox.y_max, 0.6)

    # --- 2. Geometry & Smoothing Tests ---

    def test_polygon_simplification_and_smoothing(self):
        # A rectangle with redundant colinear midpoints
        square = [
            Point(x=0.0, y=0.0), Point(x=50.0, y=0.0), Point(x=100.0, y=0.0),
            Point(x=100.0, y=50.0), Point(x=100.0, y=100.0),
            Point(x=0.0, y=100.0)
        ]
        simplified = sam_service.simplify_polygon(square, epsilon=2.0)
        # Redundant colinear points should be stripped
        self.assertLess(len(simplified), len(square))

        smoothed = sam_service.smooth_polygon(simplified, iterations=1, closed=True)
        self.assertGreater(len(smoothed), len(simplified))

    def test_shoelace_area_and_centroid(self):
        square = [
            Point(x=0.0, y=0.0), Point(x=10.0, y=0.0),
            Point(x=10.0, y=10.0), Point(x=0.0, y=10.0)
        ]
        area = sam_service.calculate_polygon_area(square)
        self.assertEqual(area, 100.0)

        centroid = sam_service.calculate_centroid(square)
        self.assertAlmostEqual(centroid.x, 5.0, places=1)
        self.assertAlmostEqual(centroid.y, 5.0, places=1)

    # --- 3. Spatial Topology Metrics ---

    def test_spatial_relationships_calculation(self):
        seg_a = SegmentedObject(
            id="part_a",
            label="chip",
            confidence=0.95,
            bbox=BoundingBox(x_min=0.0, y_min=0.0, x_max=10.0, y_max=10.0),
            centroid=Point(x=5.0, y=5.0)
        )
        seg_b = SegmentedObject(
            id="part_b",
            label="socket",
            confidence=0.92,
            bbox=BoundingBox(x_min=5.0, y_min=5.0, x_max=15.0, y_max=15.0),
            centroid=Point(x=10.0, y=10.0)
        )
        rels = sam_service.compute_spatial_relationships([seg_a, seg_b])
        key = "part_a:part_b"
        self.assertIn(key, rels)
        self.assertAlmostEqual(rels[key]["distance_px"], 7.07, places=1)
        self.assertTrue(rels[key]["is_overlapping"])
        self.assertGreater(rels[key]["iou"], 0.0)

    # --- 4. Reasoning Engine State Machine ---

    def test_state_machine_transitions(self):
        self.assertEqual(reasoning_engine.get_active_step().step_number, 1)

        step_2 = reasoning_engine.advance_step()
        self.assertEqual(step_2.step_number, 2)
        self.assertEqual(step_2.status, "in_progress")
        self.assertEqual(reasoning_engine.steps[0].status, "verified")

        step_prev = reasoning_engine.previous_step()
        self.assertEqual(step_prev.step_number, 1)

        reset_step = reasoning_engine.reset_workflow()
        self.assertEqual(reset_step.step_number, 1)
        self.assertEqual(reasoning_engine.steps[1].status, "pending")

    # --- 5. FastAPI Endpoints ---

    def test_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")

    def test_steps_api_endpoints(self):
        res = self.client.get("/api/steps")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data["steps"]), 3)
        self.assertEqual(data["active_step"]["step_number"], 1)

        # Test Target Image Endpoint
        img_res = self.client.get("/api/steps/1/target-image")
        self.assertEqual(img_res.status_code, 200)
        img_data = img_res.json()
        self.assertIn("data:image/", img_data["image_data_url"])
        self.assertEqual(img_data["step_number"], 1)

        # Second call must report is_cached = True
        img_res_cached = self.client.get("/api/steps/1/target-image")
        self.assertEqual(img_res_cached.status_code, 200)
        self.assertTrue(img_res_cached.json()["is_cached"])

        # Test Step Actions
        next_res = self.client.post("/api/steps/next")
        self.assertEqual(next_res.status_code, 200)
        self.assertEqual(next_res.json()["active_step"]["step_number"], 2)

        reset_res = self.client.post("/api/steps/reset")
        self.assertEqual(reset_res.status_code, 200)
        self.assertEqual(reset_res.json()["active_step"]["step_number"], 1)

        # Test /api/action endpoint
        action_res = self.client.post("/api/action", json={"action": "set_step", "step_number": 3})
        self.assertEqual(action_res.status_code, 200)
        self.assertEqual(action_res.json()["active_step"]["step_number"], 3)

    # --- 6. Custom Prompt Payload Tests ---

    def test_custom_prompt_payload_ingestion(self):
        from app.schemas.models import FrameAnalysisPayload
        payload = FrameAnalysisPayload(
            frame_id=10,
            timestamp=1729500000.0,
            image_base64="data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            custom_prompt="coffee mug, pen, notebook"
        )
        self.assertEqual(payload.custom_prompt, "coffee mug, pen, notebook")
        self.assertEqual(payload.frame_id, 10)

    # --- 7. SAM 3.1 RLE Mask & Contour Tests ---

    def test_sam_rle_mask_decoding(self):
        # Create a 40x40 synthetic binary circle mask
        mask_raw = np.zeros((40, 40), dtype=np.uint8)
        cv2.circle(mask_raw, (20, 20), 12, 1, -1)
        rle = mask_utils.encode(np.asfortranarray(mask_raw))
        counts_str = rle["counts"].decode("utf-8")
        mask_str = f"40,40,{counts_str}"

        bbox = BoundingBox(x_min=100.0, y_min=200.0, x_max=140.0, y_max=240.0)
        points = meta_client.decode_rle_mask(mask_str, bbox)

        self.assertGreater(len(points), 4)
        # All points should be shifted by bbox origin (x >= 100, y >= 200)
        for pt in points:
            self.assertGreaterEqual(pt.x, 100.0)
            self.assertLessEqual(pt.x, 140.0)
            self.assertGreaterEqual(pt.y, 200.0)
            self.assertLessEqual(pt.y, 240.0)

    def test_fallback_octagon_polygon(self):
        bbox = BoundingBox(x_min=50.0, y_min=60.0, x_max=150.0, y_max=160.0)
        oct_points = meta_client._fallback_octagon_polygon(bbox)
        self.assertEqual(len(oct_points), 8)
        for pt in oct_points:
            self.assertGreaterEqual(pt.x, 50.0)
            self.assertLessEqual(pt.x, 150.0)
            self.assertGreaterEqual(pt.y, 60.0)
            self.assertLessEqual(pt.y, 160.0)

    def test_rle_mask_production_path_decodes_real_contour(self):
        # Build a real compressed RLE mask for a 40x40 circle
        mask_raw = np.zeros((40, 40), dtype=np.uint8)
        cv2.circle(mask_raw, (20, 20), 12, 1, -1)
        rle = mask_utils.encode(np.asfortranarray(mask_raw))
        counts_str = rle["counts"].decode("utf-8")

        # SAM 3.1 style response text: box with w/h plus mask with x/y/data
        sam_text = (
            f"<|box;x1=10.0;y1=20.0;x2=50.0;y2=60.0;w=40;h=40|>"
            f"<|mask;x=10.0;y=20.0;data={counts_str}|>"
        )
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.raise_for_status = MagicMock()
        fake_response.json.return_value = {
            "output": [{"content": [{"text": sam_text}]}]
        }

        async def run():
            with patch("httpx.AsyncClient") as mock_client_cls:
                mock_client = MagicMock()
                mock_client.__aenter__ = AsyncMock(return_value=mock_client)
                mock_client.__aexit__ = AsyncMock(return_value=None)
                mock_client.post = AsyncMock(return_value=fake_response)
                mock_client_cls.return_value = mock_client

                # Force live mode
                original = meta_client.is_mock
                meta_client.is_mock = False
                try:
                    segs = await meta_client.segment_frame_sam(
                        image_base64="data:image/jpeg;base64,AAAA",
                        target_label="components",
                        target_components=["chip"],
                        allow_fallback=True,
                    )
                finally:
                    meta_client.is_mock = original
            return segs

        import asyncio
        segs = asyncio.run(run())
        self.assertEqual(len(segs), 1)
        self.assertTrue(segs[0].attributes.get("has_rle_mask"))
        # Polygon should be a real contour, not the 8-point octagon fallback
        self.assertNotEqual(len(segs[0].polygon), 8)

    def test_decode_rle_mask_offset_params(self):
        mask_raw = np.zeros((40, 40), dtype=np.uint8)
        cv2.circle(mask_raw, (20, 20), 12, 1, -1)
        rle = mask_utils.encode(np.asfortranarray(mask_raw))
        counts_str = rle["counts"].decode("utf-8")
        mask_str = f"40,40,{counts_str}"
        bbox = BoundingBox(x_min=100.0, y_min=200.0, x_max=140.0, y_max=240.0)
        points = meta_client.decode_rle_mask(mask_str, bbox, offset_x=5.0, offset_y=7.0)
        self.assertGreater(len(points), 4)
        for pt in points:
            self.assertGreaterEqual(pt.x, 5.0)
            self.assertLessEqual(pt.x, 45.0)

    def test_trace_binary_mask_circle(self):
        mask = np.zeros((40, 40), dtype=np.uint8)
        cv2.circle(mask, (20, 20), 12, 1, -1)
        pts = sam_service.trace_binary_mask(mask)
        self.assertGreater(len(pts), 10)

    def test_smoothing_bounds(self):
        square = [Point(x=0.0, y=0.0), Point(x=10.0, y=0.0), Point(x=10.0, y=10.0), Point(x=0.0, y=10.0)]
        # extreme values clamped, should not crash
        out = sam_service.smooth_polygon(square, iterations=100, closed=True)
        self.assertLessEqual(len(out), len(square) * (2 ** 5))
        simplified = sam_service.simplify_polygon(square, epsilon=1e9)
        self.assertGreaterEqual(len(simplified), 3)

    def test_websocket_smoke(self):
        from starlette.testclient import TestClient as STC
        client = TestClient(app)
        with client.websocket_connect("/ws/stream") as ws:
            ws.send_text(json.dumps({"action": "next_step"}))
            msg = ws.receive_json()
            self.assertEqual(msg["type"], "step_updated")
            ws.send_text(json.dumps({"action": "set_step", "step_number": "bad"}))
            err = ws.receive_json()
            self.assertEqual(err["type"], "error")
            ws.send_text(json.dumps({"image_base64": "AAAA", "frame_id": 1}))
            resp = ws.receive_json()
            self.assertIn(resp["type"], ("frame_analysis", "error"))

    def test_modal_frame_processing_function(self):
        from app.services.modal_app import process_frame_gpu
        # Generate a 64x64 test image bytes
        test_img = np.zeros((64, 64, 3), dtype=np.uint8)
        cv2.rectangle(test_img, (10, 10), (50, 50), (255, 255, 255), -1)
        _, encoded = cv2.imencode(".jpg", test_img)
        img_bytes = encoded.tobytes()

        # In local testing, call the underlying function
        res = process_frame_gpu.local(img_bytes, target_label="test_rect")
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["frame_width"], 64)
        self.assertEqual(res["frame_height"], 64)
        self.assertGreater(res["edge_feature_count"], 0)

if __name__ == "__main__":
    unittest.main()
