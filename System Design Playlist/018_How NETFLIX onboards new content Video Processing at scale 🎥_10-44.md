## HOW NETFLIX ONBOARDS NEW CONTENT — DEFINITIONS-FIRST, EXHAUSTIVE EXPLANATION WITH ASCII DIAGRAMS

---

### 1. PLAIN-ENGLISH DEFINITIONS (Read First)

| Term | Definition in One Sentence (Zero Jargon) |
|------|------------------------------------------|
| **Content Onboarding** | The process of ingesting a raw video file (movie or TV show) into Netflix's system, encoding it into multiple formats and resolutions, and distributing it to servers worldwide for streaming. |
| **Codec** | A mathematical algorithm that compresses video data to reduce file size while trying to preserve quality — e.g., H.264, HEVC (H.265), VP9. |
| **Bitrate** | The amount of data transferred per second of video; higher bitrate = better quality but larger file size; lower bitrate = smaller file but lower quality. |
| **Resolution** | The number of pixels in a video frame (e.g., 720p, 1080p, 4K); higher resolution requires more data and processing power. |
| **Adaptive Bitrate Streaming (ABR)** | A technique where the video player automatically switches between different quality levels (bitrates/resolutions) based on the viewer's internet speed and device capability, ensuring smooth playback without buffering. |
| **Chunk (Video Segment)** | A short piece of a video file (typically 2–10 seconds) that can be processed, stored, and delivered independently, enabling parallel encoding and efficient streaming. |
| **Scene / Shot Detection** | An algorithm that analyzes video content to identify where one scene ends and another begins, allowing the system to cut chunks at scene boundaries rather than arbitrary time intervals, reducing unnatural breaks. |
| **Dense Movie** | A film that viewers tend to watch continuously and linearly from start to finish (e.g., a gripping thriller), allowing the system to proactively pre-fetch future chunks. |
| **Sparse Movie** | A film that viewers tend to skip around or watch in short bursts, where the system only delivers the exact chunks requested without aggressive pre-fetching. |
| **Encoding Pipeline** | The workflow that takes a raw video, processes it through multiple encoding stages (different codecs, resolutions, bitrates), and produces the final set of streamable files. |
| **Open Connect (Netflix CDN)** | Netflix's custom content delivery network composed of dedicated caching servers placed inside Internet Service Providers (ISPs) globally, so popular content is served locally instead of crossing continents. |
| **ISP (Internet Service Provider)** | The company that provides internet access to your home (e.g., Comcast, Verizon, Jio); Netflix places Open Connect appliances inside ISPs to reduce latency and bandwidth costs. |
| **Amazon S3** | A cheap, durable, scalable cloud storage service where Netflix stores all the encoded video files (static data that rarely changes). |

---

### 2. KEY TERMS GLOSSARY (With Analogies)

| Term | Analogy |
|------|---------|
| **Content Onboarding** | A movie production studio receiving a raw film reel and then making copies in different formats (Blu-ray, DVD, digital) for different devices. |
| **Codec** | A chef's recipe for compressing a 10kg potato into a 1kg packet of potato chips—you lose some water (data) but the taste (perceived quality) remains. |
| **Bitrate** | The speed at which water flows through a pipe; higher speed = more water per second = better quality but bigger pipe needed. |
| **Resolution** | The size of the canvas you're painting on; a bigger canvas (4K) needs more paint (data) than a small one (720p). |
| **Adaptive Bitrate** | Your TV automatically adjusting the volume based on background noise; if internet is slow, it uses lower quality; if fast, it uses high quality. |
| **Chunk** | A slice of a loaf of bread; you can toast each slice individually instead of toasting the whole loaf at once. |
| **Scene Detection** | Cutting a movie into chapters based on plot points (e.g., car chase, dialogue, fight) rather than cutting every 3 minutes arbitrarily. |
| **Dense Movie** | A gripping novel that readers can't put down—they read continuously from cover to cover. |
| **Sparse Movie** | A reference book where readers jump to different sections randomly. |
| **Open Connect** | A vending machine inside your office building that stocks your favorite drinks, so you don't have to walk to the supermarket. |
| **ISP Cache** | The vending machine itself—placed close to you, containing the most popular items. |

---

### 3. CORE CHALLENGE — THE VIDEO MATRIX (Formats × Resolutions)

When Netflix receives a raw video file (e.g., a 4K master), it cannot serve the same file to all users. Different users have:
- Different devices (phone, laptop, TV) → need different resolutions.
- Different internet speeds (2G, 4G, fiber) → need different bitrates.

**The Encoding Matrix:**
```
  For ONE video, Netflix generates:
    - Multiple codecs: H.264, HEVC, VP9, AV1
    - Multiple resolutions: 240p, 480p, 720p, 1080p, 4K, 8K
    - Multiple bitrates per resolution: low, medium, high

  Total files = Codecs × Resolutions × Bitrates
  Example: 4 codecs × 6 resolutions × 3 bitrates = 72 files per video.

  If the raw video is 100GB, encoding to 72 versions creates terabytes of data.
```

**ASCII: The Video Encoding Matrix**
```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  ONE SOURCE VIDEO (Master File – 4K, 100GB)                                   │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  ENCODING PIPELINE (Multiple codecs, resolutions, bitrates)                   │
  │                                                                                │
  │  ┌──────────────┬──────────────┬──────────────┬──────────────┬─────────────┐ │
  │  │ Resolution   │  H.264       │  HEVC        │  VP9         │  AV1        │ │
  │  ├──────────────┼──────────────┼──────────────┼──────────────┼─────────────┤ │
  │  │ 4K (2160p)   │  20 Mbps     │  15 Mbps     │  12 Mbps     │  10 Mbps    │ │
  │  │ 1080p        │  8 Mbps      │  5 Mbps      │  4 Mbps      │  3 Mbps     │ │
  │  │ 720p         │  4 Mbps      │  3 Mbps      │  2.5 Mbps    │  2 Mbps     │ │
  │  │ 480p         │  2 Mbps      │  1.5 Mbps    │  1.2 Mbps    │  1 Mbps     │ │
  │  │ 360p         │  1 Mbps      │  0.8 Mbps    │  0.6 Mbps    │  0.5 Mbps   │ │
  │  └──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘ │
  │                                                                                │
  │  Each cell represents a separate file. Total: 5 × 4 = 20 files per video.    │
  │  With multiple bitrates per resolution, total can exceed 100 files.           │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. NETFLIX'S SOLUTION — CHUNK-BASED PARALLEL ENCODING

#### a) Why Chunking?
- A single 2‑hour movie in 4K is ~100GB.
- Encoding it to 100 different versions on one machine would take days and risk failure.
- **Solution:** Split the video into small chunks (4–10 seconds), distribute chunks to many workers, and encode each chunk independently in parallel.

**ASCII: Chunking the Video**
```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  RAW VIDEO FILE (100GB)                                                       │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    │ 1. Split into chunks (scene-aware)
                                    ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Chunk 1  │  │ Chunk 2  │  │ Chunk 3  │  │ Chunk 4  │  │ Chunk 5  │  │ Chunk N  │
  │ (4 sec)  │  │ (4 sec)  │  │ (4 sec)  │  │ (4 sec)  │  │ (4 sec)  │  │ (4 sec)  │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Worker 1 │  │ Worker 2 │  │ Worker 3 │  │ Worker 4 │  │ Worker 5 │  │ Worker N │
  │ Encode   │  │ Encode   │  │ Encode   │  │ Encode   │  │ Encode   │  │ Encode   │
  │ to H.264 │  │ to HEVC  │  │ to VP9   │  │ to AV1   │  │ to H.264 │  │ to HEVC  │
  │ 1080p    │  │ 1080p    │  │ 1080p    │  │ 1080p    │  │ 720p     │  │ 720p     │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │             │             │             │             │             │
       └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  ASSEMBLY: Combine chunks per format/resolution into complete streamable files │
  │  ┌───────────────────────────────────────────────────────────────────────────┐ │
  │  │  H.264 1080p ──► Complete H.264 1080p video file                         │ │
  │  │  H.264 720p  ──► Complete H.264 720p video file                         │ │
  │  │  HEVC 1080p  ──► Complete HEVC 1080p video file                         │ │
  │  │  ... (20+ files)                                                         │ │
  │  └───────────────────────────────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

#### b) Scene‑Aware Chunking (Better User Experience)

- **Naive approach:** Split every 3 minutes. This can cut in the middle of a fast‑moving action scene, causing a buffering delay when the user hits that boundary.
- **Smart approach:** Use **shot detection** (scene boundaries). A "shot" is a continuous camera segment; a "scene" is a collection of shots.
- Chunks are aligned with scene boundaries so that when a user jumps to a point in the video, the system fetches the entire scene, resulting in seamless playback.

**ASCII: Scene vs Time-Based Chunking**
```
  Time-based (bad): Cut every 3 minutes → may split scene mid-action.
  0min───3min───6min───9min───12min
  Car chase scene    │      │
                     ▲      ▲
                 Bad cut  Bad cut

  Scene-based (good): Chunks align with scene boundaries.
  0min───4min (entire car chase)───8min (dialogue)───12min (explosion)
  Chunk 1 = complete scene 1   Chunk 2 = complete scene 2
  User jumps into scene → fetches the whole scene → seamless playback.
```

---

### 5. PREDICTIVE PRE‑FETCHING — DENSE VS SPARSE MOVIES

**Observation:**
- **Dense movies** (action, thriller): Users watch continuously from start to finish. Netflix can proactively buffer future chunks.
- **Sparse movies** (documentaries, comedy sketches): Users jump around. Pre‑fetching is wasteful; only fetch the exact requested chunks.

**Implementation:**
- Netflix's player tracks user behavior and categorises each movie as dense or sparse.
- For dense movies, the player pre‑fetches the next few chunks (e.g., 2–3 minutes ahead) to ensure smooth playback.
- For sparse movies, the player only requests the chunks the user explicitly navigates to, saving bandwidth.

**ASCII: Dense vs Sparse Pre-fetching**
```
  Dense Movie (Thriller):
  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
  │ Chunk1│ │ Chunk2│ │ Chunk3│ │ Chunk4│ │ Chunk5│
  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
      │         │         │         │         │
      └─────────┼─────────┼─────────┼─────────┘
                │         │         │
    User watches linearly → Pre‑fetch 3 chunks ahead.
    Smooth, seamless streaming.

  Sparse Movie (Comedy Sketches):
  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
  │ Chunk1│ │ Chunk2│ │ Chunk3│ │ Chunk4│ │ Chunk5│
  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
      │         │         │         │         │
      └────Jump─┘         └──Jump───┘
      │                             │
    Pre‑fetch only requested chunk. No wasted bandwidth.
```

---

### 6. STORAGE — AMAZON S3 (Static Data)

- Netflix stores all encoded video files in **Amazon S3**.
- S3 is an object store designed for static, immutable data (files are written once, read many times).
- **Why S3?** It is cheap ($0.02/GB/month), highly durable (99.999999999% durability), and globally available.
- A database (SQL/NoSQL) is **not** used because:
  - Video files are large and never updated (immutable).
  - Databases are expensive for large blobs and not designed for heavy streaming traffic.
- Instead, a **metadata database** stores pointers to S3 objects (e.g., `file_id → S3 URL`).

**ASCII: S3 Storage Architecture**
```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  ENCODED FILES (Thousands per movie)                                          │
  │  ┌───────────────────────────────────────────────────────────────────────────┐ │
  │  │  S3 Bucket: netflix-content                                              │ │
  │  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
  │  │  │  /movies/avengers/                                                  │ │ │
  │  │  │    ├── h264/1080p/                                                  │ │ │
  │  │  │    │   ├── chunk_001.mp4, chunk_002.mp4, ... (1000 chunks)        │ │ │
  │  │  │    ├── h264/720p/                                                   │ │ │
  │  │  │    │   ├── chunk_001.mp4, chunk_002.mp4, ... (1000 chunks)        │ │ │
  │  │  │    ├── hevc/4k/                                                     │ │ │
  │  │  │    │   ├── chunk_001.mp4, chunk_002.mp4, ... (1000 chunks)        │ │ │
  │  │  │    └── ... (20+ combinations)                                      │ │ │
  │  │  └─────────────────────────────────────────────────────────────────────┘ │ │
  │  └───────────────────────────────────────────────────────────────────────────┘ │
  │  Total storage: Raw 100GB → Encoded 5TB (50x expansion).                    │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 7. OPEN CONNECT — NETFLIX'S CDN (Caching at ISP Level)

#### a) The Problem: Centralized Servers are Slow
- Netflix's main data centers are in the US.
- If a user in India requests a movie, the data must travel across oceans → high latency, buffering, and high bandwidth costs.
- Netflix cannot put data centers everywhere, but it can put **caches** inside ISPs.

#### b) The Solution: Open Connect Appliances
- Netflix provides a **hardware appliance** (a rack of servers with large SSDs) to ISPs for free.
- This appliance caches the most popular content (movies, TV series) locally.
- When a user requests a movie, the ISP's DNS directs them to the local Open Connect box instead of the US data center.
- Result: 90%+ of Netflix traffic is served locally, reducing latency and bandwidth costs.

**ASCII: Open Connect Architecture**
```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  NETFLIX ORIGIN (US Data Centers)                                             │
  │  - Encoded files stored in S3.                                                │
  │  - Content distribution to Open Connect boxes worldwide.                     │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                         (Replicate popular content)
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  OPEN CONNECT APPLIANCES (Inside ISPs)                                       │
  │  ┌───────────────────────────────────────────────────────────────────────────┐ │
  │  │  ISP in India (e.g., Jio)                                                │ │
  │  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
  │  │  │  Open Connect Box (100+ TB SSD)                                    │ │ │
  │  │  │  - Caches recently viewed / popular content (Sacred Games, etc.)   │ │ │
  │  │  │  - Updated nightly with new content from US.                       │ │ │
  │  │  └─────────────────────────────────────────────────────────────────────┘ │ │
  │  └───────────────────────────────────────────────────────────────────────────┘ │
  │  ┌───────────────────────────────────────────────────────────────────────────┐ │
  │  │  ISP in UK (e.g., BT)                                                    │ │
  │  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
  │  │  │  Open Connect Box                                                   │ │ │
  │  │  │  - Caches UK‑popular content (British dramas, etc.)               │ │ │
  │  │  └─────────────────────────────────────────────────────────────────────┘ │ │
  │  └───────────────────────────────────────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │  Requests are served locally
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  USERS (India) → ISP DNS → Local Open Connect Box → Fast, low‑latency stream. │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

#### c) Content Update Strategy
- Every night (around 4 AM, when traffic is low), the US origin server pushes new content to Open Connect boxes globally.
- The boxes automatically download and cache new movies.
- Popular content is refreshed frequently; less popular content may be evicted (LRU).

**ASCII: Nightly Sync**
```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  US Origin (4 AM US time):                                                    │
  │    1. Identify new content added in the last 24 hours.                       │
  │    2. For each Open Connect box, determine if the content is popular in that │
  │       region (based on viewership).                                          │
  │    3. Push content to boxes using Netflix's proprietary protocol.            │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 8. THE COMPLETE ONBOARDING PIPELINE (Step-by-Step)

```
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 1: Content Ingest                                                        │
  │  - Studio uploads raw video file (e.g., 100GB, 4K ProRes) to Netflix.        │
  │  - Netflix performs quality checks (frame rate, audio sync, etc.).            │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 2: Video Analysis & Chunking                                            │
  │  - Analyze video to detect shots/scenes.                                      │
  │  - Split into chunks at scene boundaries (4–10 seconds each).                 │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 3: Parallel Encoding (Cloud)                                            │
  │  - Distribute chunks to thousands of workers.                                 │
  │  - Each worker encodes one chunk to multiple codecs, resolutions, bitrates.  │
  │  - Encode using high‑efficiency codecs (HEVC, VP9, AV1).                     │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 4: Assembly & Manifest Generation                                      │
  │  - Combine encoded chunks per format/resolution.                             │
  │  - Generate a manifest file (e.g., HLS/M3U8 or MPEG-DASH) that tells the    │
  │    player which chunks to request for which quality.                         │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 5: Storage in S3                                                        │
  │  - Store all encoded chunks, manifests, and metadata in Amazon S3.            │
  │  - Update metadata database: video_id → S3 URLs.                             │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 6: Content Distribution (Open Connect)                                  │
  │  - Push popular content to Open Connect boxes globally (nightly sync).        │
  │  - Regional caching based on predicted viewership.                           │
  └─────────────────────────────────┬───────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │  STEP 7: User Streaming                                                       │
  │  - User opens Netflix app.                                                    │
  │  - Player requests manifest from Netflix's metadata service.                 │
  │  - Based on user's internet speed, player requests chunks from the nearest   │
  │    Open Connect box (or origin if not cached).                               │
  │  - Player adaptively switches between quality levels in real time.           │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 9. ADAPTIVE BITRATE STREAMING (ABR) IN DETAIL

When a user streams a video, the player constantly monitors the available bandwidth and adjusts quality dynamically.

**How it works:**
- The manifest lists all available bitrates/resolutions and the URLs for each chunk.
- The player starts with a medium quality (e.g., 720p).
- If bandwidth is good, it requests higher quality chunks (1080p) for the next segments.
- If bandwidth drops, it switches to lower quality (480p) to avoid buffering.
- The switch happens seamlessly between chunks (not within a chunk).

**ASCII: ABR in Action**
```
  User's internet speed: 5 Mbps (fluctuating)

  Time 0-10s:  5 Mbps → Player requests 720p chunks (4 Mbps).
  Time 10-20s: 3 Mbps → Player switches to 480p chunks (2 Mbps).
  Time 20-30s: 8 Mbps → Player switches back to 1080p chunks (8 Mbps).

  The user experiences no buffering because the player adapts.
```

---

### 10. SCALING AND RESILIENCY — HOW NETFLIX SURVIVES HIGH LOAD

| Challenge | Netflix's Solution |
|-----------|---------------------|
| **Encoding millions of videos** | Chunk-based parallel encoding using thousands of workers. |
| **New codec releases** | Re-encode older videos using the new codec (background process); replace S3 files. |
| **Server failure during encoding** | Each chunk is processed independently; failed chunks are retried by another worker. |
| **High traffic spikes (new release)** | Open Connect boxes cache popular content; pre-fetching reduces origin load. |
| **Geographical distribution** | Open Connect boxes in >1000 ISPs serve >90% of traffic locally. |
| **Storage growth** | S3 scales infinitely; cost is managed by deleting old/unpopular content. |
| **Network congestion (ISP)** | Open Connect boxes reduce cross‑continent traffic; ISP saves bandwidth. |

---

### 11. COMPARISON — NETFLIX VS YOUTUBE VS AMAZON PRIME

| Aspect | Netflix | YouTube | Amazon Prime |
|--------|---------|---------|--------------|
| **Content source** | Professional studios (licenced). | User‑generated (uploaded by anyone). | Professional + some originals. |
| **Encoding approach** | Scene‑aware chunks, multiple codecs. | Similar; uses VP9/AV1 extensively. | Similar; but less aggressive. |
| **CDN** | Open Connect (ISP‑based). | YouTube Red (ISP‑based). | CloudFront (AWS). |
| **Adaptive Bitrate** | Yes (HEVC, H.264). | Yes (VP9). | Yes. |
| **Pre‑fetching** | Dense vs sparse detection. | Similar. | Less aggressive. |
| **Storage** | S3. | Google Cloud Storage. | S3. |
| **Content onboarding** | Complex pipeline with quality checks. | Simple upload + auto‑encoding. | Similar to Netflix. |

---

### 12. REAL-WORLD STATISTICS (Estimates)

- **Processing power:** Netflix encodes thousands of videos simultaneously using AWS EC2 spot instances.
- **Storage:** Over 100 PB of video data stored in S3.
- **Traffic:** >250 million subscribers; 90%+ of traffic is served via Open Connect.
- **Open Connect:** >1000 ISP locations globally, each storing up to 100+ TB of content.
- **Chunk size:** Typically 4–10 seconds per chunk, with ~10,000 chunks per 2‑hour movie.

---

### 13. EDGE CASES AND FAILURE SCENARIOS

| Scenario | How Netflix Handles |
|----------|---------------------|
| **Encoding worker crashes** | Task is retried by another worker in the pool. |
| **S3 regional outage** | Multiple S3 replicas across regions; failover to another region. |
| **Open Connect box fails** | User's request falls back to another nearby box or origin. |
| **User bandwidth drops suddenly** | Player switches to lower quality mid‑stream (seamless). |
| **New movie release surges traffic** | Content is pre‑cached on Open Connect boxes before release. |
| **ISP throttling Netflix** | Open Connect boxes peer directly with ISP, bypassing throttling. |
| **Corrupt chunk** | Checksum validation; corrupt chunk is re-encoded automatically. |

---

### 14. KEY TAKEAWAYS FOR SYSTEM DESIGN INTERVIEWS

- **Content onboarding is a pipeline:** Ingest → analyze → chunk → encode → assemble → store → distribute.
- **Chunking enables parallelism and scalability.**
- **Scene‑aware chunking improves user experience.**
- **Adaptive bitrate streaming (ABR) is essential for variable network conditions.**
- **Caching at the edge (Open Connect) reduces latency and bandwidth costs.**
- **S3 (or equivalent object storage) is ideal for static video files.**
- **Predictive pre‑fetching (dense vs sparse) optimises bandwidth usage.**
- **Resiliency:** Each chunk is independent; failures are isolated.

---

### 15. PLAIN-ENGLISH FINAL TAKEAWAY

1. **Netflix onboarding = turning a raw video into thousands of streamable files.** A single 100GB movie becomes 5+ TB of encoded versions.
2. **The video matrix is huge:** multiple codecs × multiple resolutions × multiple bitrates.
3. **Chunking is the key:** Split the video into small 4‑second pieces. Process each piece in parallel across thousands of workers. This makes encoding fast and resilient.
4. **Scene‑aware chunks** (not arbitrary time‑based) ensure that when you jump to a point in the video, the system fetches a complete scene – no awkward cuts.
5. **Dense vs Sparse movies:** Netflix predicts if you'll watch linearly (dense) or jump around (sparse), and adjusts pre‑fetching accordingly.
6. **All files are stored in Amazon S3** – cheap, durable, and designed for static content.
7. **Open Connect (Netflix's CDN):** Netflix places caching servers inside ISPs worldwide. 90%+ of traffic is served locally, making streaming fast and cheap.
8. **Adaptive Bitrate Streaming:** The player automatically switches between quality levels based on your internet speed, so you never see buffering.
9. **Resiliency:** If a chunk fails to encode, it's retried independently. If a server fails, the system reroutes traffic.
10. **In an interview:** When asked about video streaming, mention chunk‑based encoding, ABR, and edge caching. Show you understand the trade‑offs between quality, storage, and user experience.
