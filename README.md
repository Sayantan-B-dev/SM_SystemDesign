# [Click here for Better UI](https://sayantan-b-dev.github.io/SystemDesign/)


| Rank | Playlist Title | Creator | Videos | Avg Length | Total Length | At 1.5x | At 2.0x |
|------|----------------|---------|--------|------------|--------------|---------|---------|
| 1 | [System Design Mock Interviews](https://www.youtube.com/playlist?list=PLf3F6FcQwgqEpnucyupbIqzxyvFOz9uDq) | IGotAnOffer: Engineering | 8 | 49m 17s | 6h 34m 22s | 4h 22m 54s | 3h 17m 11s |
| 2 | [System Design Playlist](https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX) | Gaurav Sen | 26 | 15m 49s | 6h 51m 26s | 4h 34m 17s | 3h 25m 43s |
| 3 | [System Design Interview Preparation Series](https://www.youtube.com/playlist?list=PLhgw50vUymycJPN6ZbGTpVKAJ0cL4OEH3) | codeKarle | 14 | 34m 14s | 7h 59m 26s | 5h 19m 37s | 3h 59m 43s |
| 4 | [System Design - Narendra L](https://www.youtube.com/playlist?list=PLBOF4WeJq7eojK4BAcCRYuJduBq7QibDh) | swapnilghan | 20 | 32m 48s | 10h 56m 16s | 7h 17m 30s | 5h 28m 8s |
| 5 | [System Design Walkthroughs](https://www.youtube.com/playlist?list=PL5q3E8eRUieWtYLmRU3z94-vGRcwKr9tM) | Hello Interview - SWE Interview Preparation | 17 | 57m 46s | 16h 22m 12s | 10h 54m 48s | 8h 11m 6s |
| 6 | [Low Level Design from Basics to Advanced](https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW) | Concept && Coding - by Shrayansh | 48 | 28m 45s | 23h 0m 35s | 15h 20m 23s | 11h 30m 17s |
| **TOTAL / AVG** | — | — | **133** | **32m 22s** | **71h 44m 17s** | **47h 49m 29s** | **35h 52m 8s** |




# StudyOS

A personal YouTube playlist study tracker. Scrape playlists → browse them in a local dashboard → track what you're studying and what's done. No account, no backend, no internet required after setup.

---

## What it does

- Pulls video metadata from YouTube playlists using `yt-dlp`
- Serves a local dashboard to browse, filter, search and track progress
- Saves your study state persistently across sessions (triple-redundant storage)
- Plays videos in a built-in popup player or opens them on YouTube

---

## Project structure

```
.
├── app.py        # Scrapes playlists → outputs data.json
├── data.json     # Generated video metadata (do not edit manually)
└── index.html    # The dashboard — open this in your browser
```

---

## Setup

**1. Install dependency**
```bash
pip install yt-dlp
```

**2. Add your playlists**

Open `app.py` and edit the `playlists` list:
```python
playlists = [
    "https://www.youtube.com/playlist?list=YOUR_PLAYLIST_ID",
    ...
]
```

**3. Scrape**
```bash
python app.py
```
This generates `data.json` in the same directory.

**4. Open the dashboard**

Just open `index.html` in your browser. No server needed.

> **Tip:** If thumbnails or videos don't load, serve it locally instead:
> ```bash
> python -m http.server 8080
> # then open http://localhost:8080
> ```

---

## Dashboard features

| Feature | How |
|---|---|
| Play video | Click any card |
| Open on YouTube | Click the **YT** button on a card, or **YouTube** in the player |
| Mark as studying | Click **Study** on a card, or auto-marked when you open a video |
| Mark as done | Tick the **Done** checkbox |
| Add notes | Click **+ Notes** on any card |
| Filter | All / Studying / Done / To-do buttons in the header |
| Search | Type in the search box — filters across all playlists live |
| Keyboard shortcuts | `Esc` close player · `S` toggle studying · `D` toggle done |

---

## How state is saved

Your progress (studying, done, notes) is stored in **three independent layers** automatically — no setup required:

1. **localStorage** — fast, synchronous, primary read/write
2. **IndexedDB** — separate browser database, survives most "clear cookies" actions
3. **`navigator.storage.persist()`** — requests the browser to never auto-evict this origin's storage, even under disk pressure

On load, both layers are compared and the most complete one wins. If one gets corrupted, the other rescues it. The only way to lose data is manually deleting site data from browser settings.

> Storage is **device and browser specific.** Data does not sync across devices or browsers.

---

## Updating playlists

Re-run `app.py` any time a playlist gets new videos:
```bash
python app.py
```
Refresh the dashboard. Your existing study state is unaffected — it's keyed by playlist title + video index, not by the file itself.

---

## Troubleshooting

**Blank page / no videos**
- Make sure `data.json` exists in the same folder as `index.html`
- If opening `index.html` directly as a `file://` URL, some browsers block `fetch()` — use `python -m http.server 8080` instead

**yt-dlp errors / age-restricted videos**
- Update yt-dlp: `pip install -U yt-dlp`
- Some videos may be unavailable or region-locked — they'll be skipped silently

**Thumbnails not loading**
- YouTube thumbnail URLs are public CDN links — if they 404, the video may have been deleted from YouTube

---

## Requirements

- Python 3.7+
- `yt-dlp`
- Any modern browser (Chrome, Firefox, Edge, Safari)