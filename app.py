import json
import time
import sys
from yt_dlp import YoutubeDL

# ---------- LOAD FROM links.json ----------
with open("links.json", "r", encoding="utf-8") as f:
    data_json = json.load(f)
    playlists = data_json.get("playlists", [])

# ---------- YT-DLP OPTIONS ----------
ydl_opts = {
    'quiet': False,
    'no_warnings': False,
    'extract_flat': False,
    'ignoreerrors': True,
    'no_color': True,
}

# ---------- EXTRACT FUNCTION ----------
def extract_video_details(entry):
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
        "thumbnail": entry.get("thumbnail") or f"https://img.youtube.com/vi/{entry.get('id')}/hqdefault.jpg",
        "index": entry.get("playlist_index"),
        "duration_seconds": entry.get("duration"),
        "view_count": entry.get("view_count"),
        "like_count": entry.get("like_count"),
        "upload_date": entry.get("upload_date"),
        "uploader": entry.get("uploader"),
        "uploader_id": entry.get("uploader_id"),
        "channel": entry.get("channel"),
        "channel_id": entry.get("channel_id"),
        "channel_url": entry.get("channel_url"),
        "description": entry.get("description"),
        "tags": entry.get("tags"),
        "categories": entry.get("categories"),
        "age_limit": entry.get("age_limit"),
        "webpage_url": entry.get("webpage_url"),
        "availability": entry.get("availability"),
        "live_status": entry.get("live_status"),
        "release_date": entry.get("release_date"),
        "modified_date": entry.get("modified_date"),
        "comment_count": entry.get("comment_count"),
        "average_rating": entry.get("average_rating"),
        "playlist_count": entry.get("playlist_count"),
        "track": entry.get("track"),
        "artist": entry.get("artist"),
        "album": entry.get("album"),
    }

# ---------- PROGRESS BAR ----------
def progress_bar(current, total, prefix="", length=30):
    percent = current / total if total else 0
    filled = int(length * percent)
    bar = "█" * filled + "-" * (length - filled)
    sys.stdout.write(f"\r{prefix} |{bar}| {current}/{total} ({percent*100:.1f}%)")
    sys.stdout.flush()

data = []
total_playlists = len(playlists)

# ---------- PROCESS ----------
with YoutubeDL(ydl_opts) as ydl:
    for p_idx, playlist_url in enumerate(playlists, start=1):
        print(f"\n\n🔍 Playlist {p_idx}/{total_playlists}")
        print(f"URL: {playlist_url}")

        try:
            playlist_info = ydl.extract_info(playlist_url, download=False)
        except Exception as e:
            print(f"❌ Failed: {e}")
            continue

        playlist_title = playlist_info.get("title", "Unknown Title")
        print(f"📁 {playlist_title}")

        videos = []
        entries = playlist_info.get("entries", [])
        total_videos = len(entries)

        for idx, entry in enumerate(entries, start=1):
            # ---------- UPDATE PROGRESS ----------
            progress_bar(idx, total_videos, prefix="Processing")

            if entry is None:
                continue

            video_data = extract_video_details(entry)

            if not video_data["index"]:
                video_data["index"] = idx

            videos.append(video_data)

            # keep your delay
            time.sleep(0.2)

        print()  # newline after progress bar

        data.append({
            "title": playlist_title,
            "url": playlist_url,
            "videos": videos
        })

# ---------- SAVE ----------
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n✅ Done! Metadata saved to data.json")