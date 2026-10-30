# OmniSpatial: System Architecture & Technical Specifications

> 📖 **Diátaxis Architecture References:** See [01-architecture/00-overview.md](./01-architecture/00-overview.md) for modular architectural specs.

## 1. High-Level Concept
OmniSpatial brings Meta's multimodal foundation models (SAM 3.1, Muse Spark, Muse Image) to live physical environments. It provides zero-shot spatial perception and augmented reality guidance for manual assembly, lab workflows, and repair.

```mermaid
flowchart TD
    subgraph EdgeDevice["User Hardware (Browser / Tablet / Phone)"]
        Cam[Overhead / Egocentric Camera Feed] --> Canvas[Downsampling & Frame Sampler]
        Canvas --> WS_Client[WebSocket Client: 2-5 FPS]
        HUD[Canvas Renderer: Masks & Spatial Overlays] <-- State[Sync State & Audio Feedback]
    end

    subgraph CloudEngine["Inference Backbone (FastAPI / Modal Serverless)"]
        WS_Client --> Router[Frame Buffer & Stream Router]
        Router --> SAM_Node[SAM 3.1 Mask Generator]
        SAM_Node --> Spatial_Analyzer[Polygon & Topology Geometry]
        Spatial_Analyzer --> Muse_Spark[Muse Spark Physical Reasoning Engine]
        Muse_Spark --> Muse_Image[Muse Image Target Synthesizer]
        Muse_Spark --> Result_Aggregator[Guidance & Verification Dispatcher]
        Result_Aggregator --> State
    end

    subgraph MetaModels["Meta Model API"]
        SAM_Node -.-> SAM_API["SAM 3.1 API"]
        Muse_Spark -.-> Spark_API["Muse Spark Pro API"]
        Muse_Image -.-> Image_API["Muse Image API"]
    end
```

## 2. Key Modules
1. **SAM 3.1 Ingestion Service**: Extracts high-precision polygon boundaries for each component in view.
2. **Spatial Topology Engine**: Computes pairwise distances, centers of mass, and orientation angles between parts.
3. **Muse Spark Reasoning Layer**: Checks current visual state against structured assembly milestones, detecting misaligned components or reversed polarity.
4. **Muse Image Synthesis**: Renders photorealistic visual targets showing the expected end state from the user's specific camera viewpoint.

## 3. Detailed Documentation
- [System Topology](./01-architecture/system-topology.md)
- [Streaming Pipeline](./01-architecture/streaming-pipeline.md)
- [Core Services](./02-services/00-overview.md)
- [Interfaces & Protocols](./03-interfaces/00-overview.md)
