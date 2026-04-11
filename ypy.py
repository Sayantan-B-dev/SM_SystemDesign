"""
This script takes multiple YouTube playlist URLs and automatically organizes their content into a structured local folder system.

For each playlist:
- A dedicated folder is created using the playlist title.
- Each video in the playlist is converted into a Markdown (.md) file.
- Files are named in playlist order (not alphabetical), with serial numbering.
- Each filename includes the video title and its duration.
- Inside each file, the script stores:
  - Video title
  - Duration
  - Direct YouTube URL

The script uses yt-dlp in flat extraction mode for fast metadata retrieval without downloading videos.
"""

import os              # for creating folders and handling file paths
import re              # for cleaning invalid characters from filenames
from yt_dlp import YoutubeDL   # library to fetch YouTube playlist/video metadata

# list of playlist URLs to process
playlists = [
    "https://www.youtube.com/playlist?list=PLBOF4WeJq7eojK4BAcCRYuJduBq7QibDh",
    "https://www.youtube.com/playlist?list=PLhgw50vUymycJPN6ZbGTpVKAJ0cL4OEH3",
    "https://www.youtube.com/playlist?list=PL5q3E8eRUieWtYLmRU3z94-vGRcwKr9tM",
    "https://www.youtube.com/playlist?list=PLf3F6FcQwgqEpnucyupbIqzxyvFOz9uDq",
    "https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW",
    "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX"
]

# removes characters not allowed in file/folder names
def clean(name):
    return re.sub(r'[\\/*?:"<>|]', "", name)

# converts duration in seconds to readable format (HH-MM-SS or MM-SS)
def format_duration(seconds):
    if seconds is None:
        return "00-00"
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:02d}-{m:02d}-{s:02d}"
    return f"{m:02d}-{s:02d}"

# yt-dlp options
ydl_opts = {
    'quiet': True,          # suppress logs
    'extract_flat': True    # fetch only playlist metadata (faster, no full video extraction)
}

# create yt-dlp instance
with YoutubeDL(ydl_opts) as ydl:
    # loop through each playlist
    for url in playlists:
        # fetch playlist info (no download)
        info = ydl.extract_info(url, download=False)

        # get and clean playlist title → used as folder name
        playlist_name = clean(info.get('title', 'playlist'))

        # create folder if it doesn't exist
        os.makedirs(playlist_name, exist_ok=True)

        # iterate through videos in playlist (preserves original order)
        for idx, entry in enumerate(info['entries'], start=1):
            # clean video title
            title = clean(entry.get('title', f"video_{idx}"))

            # format duration
            duration = format_duration(entry.get('duration'))

            # filename format: 001_title_duration.md
            filename = f"{idx:03d}_{title}_{duration}.md"

            # full file path
            filepath = os.path.join(playlist_name, filename)

            # create markdown file for each video
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(f"# {title}\n\n")                          # title as heading
                f.write(f"Duration: {duration.replace('-', ':')}\n")  # readable duration
                f.write(f"URL: {entry.get('webpage_url')}\n")         # video URL