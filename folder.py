"""
This script:
- Reads playlist URLs from links.json
- Creates folders per playlist
- Creates ordered Markdown files
- Skips existing files
- Shows real-time progress in terminal
"""

import os
import re
import json
import sys
from yt_dlp import YoutubeDL

# ---------- LOAD PLAYLISTS ----------
with open("links.json", "r", encoding="utf-8") as f:
    data = json.load(f)
    playlists = data.get("playlists", [])

# ---------- CLEAN ----------
def clean(name):
    return re.sub(r'[\\/*?:"<>|]', "", name)

# ---------- FORMAT DURATION ----------
def format_duration(seconds):
    if seconds is None:
        return "00-00"
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:02d}-{m:02d}-{s:02d}"
    return f"{m:02d}-{s:02d}"

# ---------- PROGRESS BAR ----------
def progress_bar(current, total, prefix="", length=30):
    percent = current / total if total else 0
    filled = int(length * percent)
    bar = "█" * filled + "-" * (length - filled)
    sys.stdout.write(f"\r{prefix} |{bar}| {current}/{total} ({percent*100:.1f}%)")
    sys.stdout.flush()

# ---------- YT-DLP OPTIONS ----------
ydl_opts = {
    'quiet': True,
    'extract_flat': True
}

# ---------- PROCESS ----------
with YoutubeDL(ydl_opts) as ydl:
    total_playlists = len(playlists)

    for p_idx, url in enumerate(playlists, start=1):
        try:
            info = ydl.extract_info(url, download=False)

            playlist_name = clean(info.get('title', f'playlist_{p_idx}'))
            os.makedirs(playlist_name, exist_ok=True)

            entries = info.get('entries', [])
            total_videos = len(entries)

            print(f"\n\n📁 Playlist {p_idx}/{total_playlists}: {playlist_name}")
            
            for v_idx, entry in enumerate(entries, start=1):
                title = clean(entry.get('title', f"video_{v_idx}"))
                duration = format_duration(entry.get('duration'))

                filename = f"{v_idx:03d}_{title}_{duration}.md"
                filepath = os.path.join(playlist_name, filename)

                # ---------- PROGRESS UPDATE ----------
                progress_bar(v_idx, total_videos, prefix="Processing")

                # ---------- SKIP EXISTING ----------
                if os.path.exists(filepath):
                    continue

                # ---------- SAFE URL ----------
                video_id = entry.get("id")
                video_url = entry.get("webpage_url") or (
                    f"https://www.youtube.com/watch?v={video_id}" if video_id else "N/A"
                )

                # ---------- WRITE ----------
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(f"# {title}\n\n")
                    f.write(f"Duration: {duration.replace('-', ':')}\n")
                    f.write(f"URL: {video_url}\n")

            print()  # move to next line after progress bar

        except Exception as e:
            print(f"\n❌ Error processing playlist {url}")
            print(e)

print("\n✅ Done.")