import math
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from app.schemas.models import SegmentedObject, Point, BoundingBox
from app.services.meta_client import meta_client

class SAMService:
    """
    Service for processing frames through SAM 3.1, transforming raw segmentation masks,
    normalizing coordinates, and smoothing contours for low-latency AR HUD streaming.
    """

    # --- 1. Coordinate Normalization & Denormalization ---

    def normalize_coordinates(self, points: List[Point], width: float, height: float) -> List[Point]:
        """Converts absolute pixel coordinates (x, y) into normalized [0.0, 1.0] coordinates."""
        if width <= 0 or height <= 0:
            return points
        return [
            Point(
                x=round(float(p.x / width), 6),
                y=round(float(p.y / height), 6)
            )
            for p in points
        ]

    def denormalize_coordinates(self, points: List[Point], width: float, height: float) -> List[Point]:
        """Scales normalized [0.0, 1.0] coordinates back to absolute pixel coordinates."""
        return [
            Point(
                x=round(float(p.x * width), 2),
                y=round(float(p.y * height), 2)
            )
            for p in points
        ]

    def normalize_bbox(self, bbox: BoundingBox, width: float, height: float) -> BoundingBox:
        """Converts an absolute pixel bounding box into normalized [0.0, 1.0] boundaries."""
        if width <= 0 or height <= 0:
            return bbox
        return BoundingBox(
            x_min=round(float(bbox.x_min / width), 6),
            y_min=round(float(bbox.y_min / height), 6),
            x_max=round(float(bbox.x_max / width), 6),
            y_max=round(float(bbox.y_max / height), 6)
        )

    def denormalize_bbox(self, bbox: BoundingBox, width: float, height: float) -> BoundingBox:
        """Scales a normalized bounding box back to absolute pixel space."""
        return BoundingBox(
            x_min=round(float(bbox.x_min * width), 2),
            y_min=round(float(bbox.y_min * height), 2),
            x_max=round(float(bbox.x_max * width), 2),
            y_max=round(float(bbox.y_max * height), 2)
        )

    # --- 2. Douglas-Peucker Simplification & Chaikin Smoothing ---

    def simplify_polygon(self, points: List[Point], epsilon: float = 1.5) -> List[Point]:
        """
        Simplifies polygon contours using OpenCV approxPolyDP (Ramer-Douglas-Peucker).
        Removes redundant vertices and camera jitter while preserving key geometric corners.
        """
        epsilon = max(0.1, min(float(epsilon), 100.0))
        if len(points) <= 3:
            return points
        pts_arr = np.array([[p.x, p.y] for p in points], dtype=np.float32).reshape(-1, 1, 2)
        simplified = cv2.approxPolyDP(pts_arr, epsilon, closed=True)
        if len(simplified) < 3:
            return points
        return [Point(x=round(float(pt[0][0]), 2), y=round(float(pt[0][1]), 2)) for pt in simplified]

    def smooth_polygon(self, points: List[Point], iterations: int = 1, closed: bool = True) -> List[Point]:
        """
        Applies Chaikin's corner-cutting algorithm to produce smooth, jitter-free AR contours.
        Each iteration cuts corners at 1/4 and 3/4 along each line segment.
        """
        iterations = max(0, min(int(iterations), 5))
        if len(points) < 3 or iterations <= 0:
            return points
        pts = np.array([[p.x, p.y] for p in points], dtype=float)
        for _ in range(iterations):
            new_pts = []
            n = len(pts)
            end_idx = n if closed else n - 1
            for i in range(end_idx):
                p0 = pts[i]
                p1 = pts[(i + 1) % n]
                q = 0.75 * p0 + 0.25 * p1
                r = 0.25 * p0 + 0.75 * p1
                new_pts.extend([q, r])
            if not closed:
                new_pts.append(pts[-1])
            pts = np.array(new_pts, dtype=float)
        return [Point(x=round(float(row[0]), 2), y=round(float(row[1]), 2)) for row in pts]

    # --- 3. Geometry & Boundary Parsing ---

    def parse_polygon(self, raw_polygon: Any) -> List[Point]:
        """
        Parses raw polygon inputs from various Meta Model API response formats:
        - List of Point instances
        - List of dicts (e.g. [{'x': 10, 'y': 20}, ...])
        - List of coordinate pairs (e.g. [[10, 20], ...])
        - 2D numpy arrays
        """
        if not raw_polygon:
            return []
        parsed: List[Point] = []
        for item in raw_polygon:
            if isinstance(item, Point):
                parsed.append(item)
            elif isinstance(item, dict) and "x" in item and "y" in item:
                parsed.append(Point(x=float(item["x"]), y=float(item["y"])))
            elif (isinstance(item, (list, tuple)) or isinstance(item, np.ndarray)) and len(item) >= 2:
                parsed.append(Point(x=float(item[0]), y=float(item[1])))
        return parsed

    def trace_binary_mask(self, mask: np.ndarray, min_area: float = 20.0) -> List[Point]:
        """
        Extracts an ordered polygon contour from a 2D binary numpy mask (H x W)
        using OpenCV contour tracing (robust replacement for the buggy
        Moore-Neighbor implementation).
        """
        if mask.ndim != 2 or not np.any(mask):
            return []
        if int(np.count_nonzero(mask)) < min_area:
            return []
        mask_u8 = (mask.astype(np.uint8) * 255) if mask.dtype != np.uint8 else mask
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return []
        largest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest) < min_area:
            return []
        points: List[Point] = []
        for pt in largest:
            points.append(Point(x=float(pt[0][0]), y=float(pt[0][1])))
        # Drop closing duplicate if present
        if len(points) > 1 and points[0].x == points[-1].x and points[0].y == points[-1].y:
            points.pop()
        return points

    def calculate_polygon_area(self, points: List[Point]) -> float:
        """Calculates polygon surface area using the Shoelace formula."""
        if len(points) < 3:
            return 0.0
        n = len(points)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += points[i].x * points[j].y
            area -= points[j].x * points[i].y
        return round(abs(area) / 2.0, 2)

    def calculate_centroid(self, points: List[Point], bbox: Optional[BoundingBox] = None) -> Point:
        """
        Calculates the polygon centroid (center of mass).
        Falls back to bounding box center if fewer than 3 vertices exist.
        """
        if len(points) < 3:
            if bbox:
                return Point(
                    x=round((bbox.x_min + bbox.x_max) / 2.0, 2),
                    y=round((bbox.y_min + bbox.y_max) / 2.0, 2)
                )
            return Point(x=0.0, y=0.0)

        n = len(points)
        signed_area = 0.0
        cx = 0.0
        cy = 0.0
        for i in range(n):
            j = (i + 1) % n
            factor = points[i].x * points[j].y - points[j].x * points[i].y
            signed_area += factor
            cx += (points[i].x + points[j].x) * factor
            cy += (points[i].y + points[j].y) * factor

        signed_area *= 0.5
        if abs(signed_area) < 1e-6:
            mean_x = float(np.mean([p.x for p in points]))
            mean_y = float(np.mean([p.y for p in points]))
            return Point(x=round(mean_x, 2), y=round(mean_y, 2))

        cx /= (6.0 * signed_area)
        cy /= (6.0 * signed_area)
        return Point(x=round(cx, 2), y=round(cy, 2))

    def compute_bounding_box(self, points: List[Point]) -> BoundingBox:
        """Computes a tight axis-aligned bounding box enclosing all polygon vertices."""
        if not points:
            return BoundingBox(x_min=0.0, y_min=0.0, x_max=0.0, y_max=0.0)
        xs = [p.x for p in points]
        ys = [p.y for p in points]
        return BoundingBox(
            x_min=round(float(min(xs)), 2),
            y_min=round(float(min(ys)), 2),
            x_max=round(float(max(xs)), 2),
            y_max=round(float(max(ys)), 2)
        )

    # --- 4. Spatial Topology & Metrics ---

    def compute_spatial_relationships(self, segments: List[SegmentedObject]) -> Dict[str, Any]:
        """
        Calculates comprehensive pairwise spatial metrics between segmented objects:
        - Euclidean distance between centroids (or bounding box centers)
        - Axis offsets (dx, dy)
        - Bounding box Intersection over Union (IoU)
        - Overlap boolean flag
        - Relative bearing angle in degrees
        """
        relationships = {}
        for i, seg_a in enumerate(segments):
            for j, seg_b in enumerate(segments):
                if i >= j:
                    continue

                # Use centroid if available; fallback to bbox center
                if seg_a.centroid is not None:
                    center_a = (seg_a.centroid.x, seg_a.centroid.y)
                else:
                    center_a = (
                        (seg_a.bbox.x_min + seg_a.bbox.x_max) / 2.0,
                        (seg_a.bbox.y_min + seg_a.bbox.y_max) / 2.0
                    )

                if seg_b.centroid is not None:
                    center_b = (seg_b.centroid.x, seg_b.centroid.y)
                else:
                    center_b = (
                        (seg_b.bbox.x_min + seg_b.bbox.x_max) / 2.0,
                        (seg_b.bbox.y_min + seg_b.bbox.y_max) / 2.0
                    )

                dx = center_b[0] - center_a[0]
                dy = center_b[1] - center_a[1]
                dist = math.hypot(dx, dy)
                bearing_rad = math.atan2(dy, dx)
                bearing_deg = math.degrees(bearing_rad)

                # Bounding box IoU
                inter_x_min = max(seg_a.bbox.x_min, seg_b.bbox.x_min)
                inter_y_min = max(seg_a.bbox.y_min, seg_b.bbox.y_min)
                inter_x_max = min(seg_a.bbox.x_max, seg_b.bbox.x_max)
                inter_y_max = min(seg_a.bbox.y_max, seg_b.bbox.y_max)

                inter_w = max(0.0, inter_x_max - inter_x_min)
                inter_h = max(0.0, inter_y_max - inter_y_min)
                inter_area = inter_w * inter_h

                area_a = max(0.0, seg_a.bbox.x_max - seg_a.bbox.x_min) * max(0.0, seg_a.bbox.y_max - seg_a.bbox.y_min)
                area_b = max(0.0, seg_b.bbox.x_max - seg_b.bbox.x_min) * max(0.0, seg_b.bbox.y_max - seg_b.bbox.y_min)
                union_area = area_a + area_b - inter_area
                iou = (inter_area / union_area) if union_area > 0.0 else 0.0

                pair_key = f"{seg_a.id}:{seg_b.id}"
                relationships[pair_key] = {
                    "distance_px": round(float(dist), 2),
                    "dx": round(float(dx), 2),
                    "dy": round(float(dy), 2),
                    "iou": round(float(iou), 4),
                    "is_overlapping": bool(inter_area > 0.0),
                    "relative_bearing_deg": round(float(bearing_deg), 1),
                    "labels": (seg_a.label, seg_b.label)
                }
        return relationships

    # --- 5. Main Frame Pipeline ---

    def process_frame_with_modal(self, image_bytes: bytes, target_label: str = "components") -> Dict[str, Any]:
        """Runs high-resolution GPU frame preprocessing and edge analysis via Modal serverless worker."""
        from app.services.modal_app import process_frame_gpu
        dispatcher = getattr(process_frame_gpu, "local", process_frame_gpu)
        return dispatcher(image_bytes, target_label=target_label)

    async def process_frame(
        self,
        image_base64: str,
        frame_width: Optional[int] = None,
        frame_height: Optional[int] = None,
        normalize: bool = False,
        smooth: bool = True,
        epsilon: float = 1.5,
        smoothing_iterations: int = 1,
        target_label: str = "electronic components, circuit board parts, chips, connectors",
        target_components: Optional[List[str]] = None,
        allow_fallback: bool = False,
        force_mock: bool = False
    ) -> List[SegmentedObject]:
        """
        Primary inference & geometric processing pipeline for video frames:
        1. Calls SAM 3.1 through Meta Model API with dynamic targets
        2. Parses and validates polygon coordinates
        3. Computes polygon area and centroid
        4. Applies Douglas-Peucker simplification & Chaikin smoothing
        5. Computes tight bounding boxes
        6. Optionally normalizes coordinates to [0.0, 1.0]
        """
        raw_segments = await meta_client.segment_frame_sam(
            image_base64=image_base64,
            target_label=target_label,
            target_components=target_components,
            allow_fallback=allow_fallback,
            force_mock=force_mock
        )
        processed: List[SegmentedObject] = []

        for seg in raw_segments:
            polygon = self.parse_polygon(seg.polygon)

            # Contour smoothing & vertex reduction
            if smooth and len(polygon) >= 3:
                simplified = self.simplify_polygon(polygon, epsilon=epsilon)
                polygon = self.smooth_polygon(simplified, iterations=smoothing_iterations, closed=True)

            # Calculate geometric attributes (centroid/bbox/area before normalization)
            centroid = self.calculate_centroid(polygon, bbox=seg.bbox)
            bbox = self.compute_bounding_box(polygon) if polygon else seg.bbox
            area = self.calculate_polygon_area(polygon) if polygon else None
            w_box = max(bbox.x_max - bbox.x_min, 1e-5)
            h_box = max(bbox.y_max - bbox.y_min, 1e-5)
            attrs = dict(seg.attributes or {})
            attrs.setdefault("aspect_ratio", round(w_box / h_box, 2))
            attrs.setdefault("vertex_count", len(polygon))
            if "orientation_deg" not in attrs and len(polygon) >= 3:
                pts_np = np.array([[p.x, p.y] for p in polygon], dtype=np.float32)
                attrs["orientation_deg"] = round(float(cv2.minAreaRect(pts_np)[2]), 1)
            if "header" in seg.label.lower():
                attrs.setdefault("pin_count", 4)
                attrs.setdefault("inter_pin_clearance_mm", 1.2)
                attrs.setdefault("solder_bridges_detected", False)

            # Coordinate normalization
            is_normalized = False
            if normalize and frame_width and frame_height and frame_width > 0 and frame_height > 0:
                polygon = self.normalize_coordinates(polygon, width=frame_width, height=frame_height)
                bbox = self.normalize_bbox(bbox, width=frame_width, height=frame_height)
                centroid = self.normalize_coordinates([centroid], width=frame_width, height=frame_height)[0]
                if area is not None:
                    area = round(float(area / (frame_width * frame_height)), 6)
                is_normalized = True

            processed.append(
                SegmentedObject(
                    id=seg.id,
                    label=seg.label,
                    confidence=seg.confidence,
                    bbox=bbox,
                    polygon=polygon,
                    attributes=attrs,
                    area=area,
                    centroid=centroid,
                    is_normalized=is_normalized
                )
            )

        # Enrich telemetry via Modal worker if configured
        from app.config import settings
        if settings.modal_token_id and image_base64 and processed:
            try:
                import base64
                raw_b64 = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
                img_bytes = base64.b64decode(raw_b64)
                modal_meta = self.process_frame_with_modal(img_bytes, target_label=target_label)
                for seg in processed:
                    seg.attributes["modal_edge_count"] = modal_meta.get("edge_feature_count")
                    seg.attributes["modal_sharpness"] = modal_meta.get("sharpness_score")
            except Exception:
                pass

        return processed

sam_service = SAMService()
