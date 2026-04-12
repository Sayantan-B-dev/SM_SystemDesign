import json
import time
from yt_dlp import YoutubeDL

playlists = [
    "https://www.youtube.com/playlist?list=PLBOF4WeJq7eojK4BAcCRYuJduBq7QibDh",
    "https://www.youtube.com/playlist?list=PLhgw50vUymycJPN6ZbGTpVKAJ0cL4OEH3",
    "https://www.youtube.com/playlist?list=PL5q3E8eRUieWtYLmRU3z94-vGRcwKr9tM",
    "https://www.youtube.com/playlist?list=PLf3F6FcQwgqEpnucyupbIqzxyvFOz9uDq",
    "https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW",
    "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX"
]

# Options for yt-dlp: extract full info, no download, quiet but show progress
ydl_opts = {
    'quiet': False,          # Show some output to see progress
    'no_warnings': False,
    'extract_flat': False,   # Get detailed metadata for each video
    'ignoreerrors': True,    # Skip videos that are unavailable
    'no_color': True,
}

def extract_video_details(entry):
    """Extract a rich set of fields from a video info dict."""
    return {
        "id": entry.get("id"),
        "title": entry.get("title"),
        "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
        "thumbnail": entry.get("thumbnail") or f"https://img.youtube.com/vi/{entry.get('id')}/hqdefault.jpg",
        "index": entry.get("playlist_index"),   # position in playlist
        "duration_seconds": entry.get("duration"),
        "view_count": entry.get("view_count"),
        "like_count": entry.get("like_count"),   # may be None if disabled
        "upload_date": entry.get("upload_date"), # YYYYMMDD
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
        "average_rating": entry.get("average_rating"),   # deprecated, might be None
        "playlist_count": entry.get("playlist_count"),
        "track": entry.get("track"),
        "artist": entry.get("artist"),
        "album": entry.get("album"),
    }

data = []

with YoutubeDL(ydl_opts) as ydl:
    for playlist_url in playlists:
        print(f"\n🔍 Fetching playlist: {playlist_url}")
        try:
            playlist_info = ydl.extract_info(playlist_url, download=False)
        except Exception as e:
            print(f"❌ Failed to extract playlist: {e}")
            continue

        playlist_title = playlist_info.get("title", "Unknown Title")
        print(f"📁 Playlist: {playlist_title}")

        videos = []
        entries = playlist_info.get("entries", [])

        for idx, entry in enumerate(entries, start=1):
            if entry is None:
                print(f"   ⚠️ Skipping unavailable video at position {idx}")
                continue

            # entry already contains full metadata because extract_flat=False
            video_data = extract_video_details(entry)
            # Ensure index is set correctly if missing
            if not video_data["index"]:
                video_data["index"] = idx

            videos.append(video_data)
            print(f"   ✓ {video_data['index']:3d}. {video_data['title'][:50]}")

            # Be nice to YouTube – small delay between videos
            time.sleep(0.2)

        data.append({
            "title": playlist_title,
            "url": playlist_url,
            "videos": videos
        })

# Save everything to a JSON file
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("\n✅ Done! Metadata saved to data.json")