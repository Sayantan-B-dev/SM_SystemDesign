import json
from yt_dlp import YoutubeDL

playlists = [
    "https://www.youtube.com/playlist?list=PLBOF4WeJq7eojK4BAcCRYuJduBq7QibDh",
    "https://www.youtube.com/playlist?list=PLhgw50vUymycJPN6ZbGTpVKAJ0cL4OEH3",
    "https://www.youtube.com/playlist?list=PL5q3E8eRUieWtYLmRU3z94-vGRcwKr9tM",
    "https://www.youtube.com/playlist?list=PLf3F6FcQwgqEpnucyupbIqzxyvFOz9uDq",
    "https://www.youtube.com/playlist?list=PL6W8uoQQ2c61X_9e6Net0WdYZidm7zooW",
    "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX"
]

ydl_opts = {
    'quiet': True,
    'extract_flat': True
}

data = []

with YoutubeDL(ydl_opts) as ydl:
    for url in playlists:
        info = ydl.extract_info(url, download=False)

        playlist = {
            "title": info.get("title"),
            "videos": []
        }

        for idx, entry in enumerate(info["entries"], start=1):
            vid = entry.get("id")
            playlist["videos"].append({
                "id": vid,
                "title": entry.get("title"),
                "url": f"https://www.youtube.com/watch?v={vid}",
                "thumbnail": f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
                "index": idx
            })

        data.append(playlist)

with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)