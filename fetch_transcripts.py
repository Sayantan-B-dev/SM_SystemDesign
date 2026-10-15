#!/usr/bin/env python3
"""
Fetch YouTube video transcripts and append them to their corresponding MD files.

Usage:
    python fetch_transcripts.py [base_directory] [options]

Options:
    --cookies-file PATH     Path to a Netscape-format cookies.txt file from your browser
    --proxy URL             HTTP/SOCKS5 proxy URL (e.g. socks5://127.0.0.1:1080)
    --dry-run               Show which files will be processed without fetching transcripts
    --skip-existing         Skip files that already have transcripts (default: True)

Examples:
    python fetch_transcripts.py
    python fetch_transcripts.py "g:\\code\\SystemDesign"
    python fetch_transcripts.py --cookies-file cookies.txt
    python fetch_transcripts.py --proxy socks5://127.0.0.1:1080
    python fetch_transcripts.py --dry-run
    python fetch_transcripts.py "g:\\code\\SystemDesign" --cookies-file cookies.txt --dry-run

BYPASSING YOUTUBE RATE LIMITS (429 errors):
    YouTube blocks transcript requests from IPs that make too many requests.
    To work around this, you have several options:

    1. COOKIES FILE (recommended):
       - Install a browser extension like "Get cookies.txt LOCALLY" or "EditThisCookie"
       - Go to youtube.com while logged in
       - Export cookies to a Netscape-format cookies.txt file
       - Run: python fetch_transcripts.py --cookies-file cookies.txt

    2. PROXY:
       - Use a residential proxy or VPN with SOCKS5 support
       - Run: python fetch_transcripts.py --proxy socks5://127.0.0.1:1080

    3. WAIT:
       - Rate limits typically expire after a few hours
       - Try again later without any flags
"""

import glob
import html
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from http.cookiejar import MozillaCookieJar

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig

# Fix Windows console encoding for emoji in filenames
os.environ.setdefault("PYTHONIOENCODING", "utf-8")
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Directories that contain video MD files
VIDEO_DIRS = [
    "System Design Playlist",
    "High Level Design from Basics to Advanced",
    "Low Level Design from Basics to Advanced",
    "System Design - Narendra L",
    "System Design Interview Preparation Series",
    "System design mock interviews",
    "System Design Walkthroughs",
]

# Regex to extract YouTube URL from MD files
URL_PATTERN = re.compile(r"URL:\s*(https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+)")
TRANSCRIPT_MARKER = "---\n## Transcript\n"

MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
)
DESKTOP_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)


def extract_video_id(url: str) -> str | None:
    """Extract the YouTube video ID from a URL."""
    match = re.search(r"v=([\w-]+)", url)
    return match.group(1) if match else None


def build_session(cookies_file: str | None = None, proxy_url: str | None = None) -> requests.Session:
    """Build a requests session with optional cookies and proxy."""
    session = requests.Session()
    session.headers.update({
        "User-Agent": DESKTOP_UA,
        "Accept-Language": "en-US,en;q=0.9",
    })

    if cookies_file and os.path.isfile(cookies_file):
        jar = MozillaCookieJar(cookies_file)
        jar.load(ignore_discard=True, ignore_expires=True)
        session.cookies = jar
        print(f"Loaded cookies from: {cookies_file}")

    if proxy_url:
        session.proxies = {"http": proxy_url, "https": proxy_url}
        print(f"Using proxy: {proxy_url}")

    return session


def fetch_transcript_innertube(video_id: str, session: requests.Session) -> str | None:
    """Fetch transcript by scraping the mobile YouTube page for caption tracks."""
    try:
        video_url = f"https://m.youtube.com/watch?v={video_id}"
        resp = session.get(video_url, timeout=20)
        if resp.status_code != 200:
            return None

        # Find the captions JSON block
        match = re.search(
            r'"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"',
            resp.text,
        )
        if not match:
            return None

        captions_json = json.loads(match.group(1))
        tracks = captions_json.get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])

        # Prefer English
        en_track = None
        for t in tracks:
            if t.get("languageCode", "").startswith("en"):
                en_track = t
                break
        if not en_track and tracks:
            en_track = tracks[0]

        if not en_track:
            return None

        caption_url = en_track["baseUrl"]
        if caption_url.startswith("/"):
            caption_url = "https://www.youtube.com" + caption_url

        cap_resp = session.get(caption_url, timeout=15)
        if cap_resp.status_code != 200:
            return None

        texts = re.findall(r"<text[^>]*>(.*?)</text>", cap_resp.text, re.DOTALL)
        cleaned = [html.unescape(t).replace("\n", " ").strip() for t in texts if t.strip()]
        return " ".join(cleaned) if cleaned else None

    except Exception:
        return None


def fetch_transcript_ytdlp(video_url: str, tmp_dir: str) -> str | None:
    """Fetch transcript using yt-dlp."""
    try:
        cmd = [
            "yt-dlp",
            "--write-auto-sub",
            "--write-sub",
            "--sub-lang", "en,en-orig",
            "--skip-download",
            "--sub-format", "vtt",
            "-o", os.path.join(tmp_dir, "%(id)s.%(ext)s"),
            video_url,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            return None

        vtt_files = glob.glob(os.path.join(tmp_dir, "*.vtt"))
        if not vtt_files:
            return None

        vtt_file = vtt_files[0]
        for f in vtt_files:
            if "en-orig" in f:
                vtt_file = f
                break

        with open(vtt_file, "r", encoding="utf-8") as f:
            content = f.read()

        for f in vtt_files:
            os.remove(f)

        return parse_vtt(content)
    except Exception:
        return None


def parse_vtt(vtt_content: str) -> str:
    """Parse VTT subtitle content and return clean text."""
    lines = []
    seen = set()

    for line in vtt_content.splitlines():
        line = line.strip()
        if (
            not line
            or line.startswith("WEBVTT")
            or line.startswith("Kind:")
            or line.startswith("Language:")
            or line.startswith("NOTE")
            or "-->" in line
            or re.match(r"^\d+$", line)
            or line.startswith("align:")
            or line.startswith("position:")
        ):
            continue

        clean = re.sub(r"<[^>]+>", "", line)
        clean = re.sub(r"\{[^}]+\}", "", clean)
        clean = clean.strip()

        if clean and clean not in seen:
            seen.add(clean)
            lines.append(clean)

    return " ".join(lines)


def fetch_transcript_api(video_id: str, session: requests.Session) -> str | None:
    """Fetch transcript using youtube-transcript-api."""
    try:
        ytt = YouTubeTranscriptApi(http_client=session)
        transcript = ytt.fetch(video_id, languages=["en"])
        return " ".join(entry.text for entry in transcript.snippets)
    except Exception:
        return None


def fetch_transcript(video_url: str, video_id: str, session: requests.Session, tmp_dir: str) -> str | None:
    """Fetch transcript using multiple methods with fallback."""
    # Method 1: Mobile YouTube innertube (usually bypasses rate limits)
    print(f"  [innertube] Fetching transcript for {video_id}...")
    transcript = fetch_transcript_innertube(video_id, session)
    if transcript:
        return transcript

    # Method 2: youtube-transcript-api
    print(f"  [api] Trying youtube-transcript-api...")
    transcript = fetch_transcript_api(video_id, session)
    if transcript:
        return transcript

    # Method 3: yt-dlp
    print(f"  [yt-dlp] Trying yt-dlp...")
    transcript = fetch_transcript_ytdlp(video_url, tmp_dir)
    if transcript:
        return transcript

    return None


def has_transcript(content: str) -> bool:
    """Check if the MD file already contains a transcript section."""
    return TRANSCRIPT_MARKER in content


def process_md_file(filepath: str, session: requests.Session, tmp_dir: str) -> bool:
    """
    Process a single MD file: extract URL, fetch transcript, append if missing.
    Returns True if a transcript was added.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if has_transcript(content):
        print(f"  [SKIP] Transcript already present")
        return False

    url_match = URL_PATTERN.search(content)
    if not url_match:
        print(f"  [SKIP] No YouTube URL found")
        return False

    url = url_match.group(1)
    video_id = extract_video_id(url)
    if not video_id:
        print(f"  [SKIP] Could not extract video ID from {url}")
        return False

    transcript = fetch_transcript(url, video_id, session, tmp_dir)
    if not transcript:
        print(f"  [ERROR] Could not fetch transcript")
        return False

    transcript_section = f"\n{TRANSCRIPT_MARKER}{transcript}\n"
    with open(filepath, "a", encoding="utf-8") as f:
        f.write(transcript_section)

    print(f"  [OK] Transcript appended ({len(transcript)} chars)")
    return True


def parse_args():
    """Parse command line arguments."""
    base_dir = os.getcwd()
    cookies_file = None
    proxy_url = None
    dry_run = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--cookies-file" and i + 1 < len(args):
            cookies_file = args[i + 1]
            i += 2
        elif args[i] == "--proxy" and i + 1 < len(args):
            proxy_url = args[i + 1]
            i += 2
        elif args[i] == "--dry-run":
            dry_run = True
            i += 1
        elif not args[i].startswith("--"):
            base_dir = args[i]
            i += 1
        else:
            i += 1

    return base_dir, cookies_file, proxy_url, dry_run


def main():
    base_dir, cookies_file, proxy_url, dry_run = parse_args()

    if not os.path.isdir(base_dir):
        print(f"Error: Directory not found: {base_dir}")
        sys.exit(1)

    if dry_run:
        print("DRY RUN MODE - No transcripts will be fetched\n")

    session = None if dry_run else build_session(cookies_file, proxy_url)

    total_added = 0
    total_skipped = 0
    total_errors = 0
    total_files = 0
    total_with_url = 0
    total_already_done = 0

    with tempfile.TemporaryDirectory() as tmp_dir:
        for dir_name in VIDEO_DIRS:
            dir_path = os.path.join(base_dir, dir_name)
            if not os.path.isdir(dir_path):
                continue

            md_files = sorted([f for f in os.listdir(dir_path) if f.endswith(".md")])
            if not md_files:
                continue

            print(f"\n{'='*60}")
            print(f"{dir_name} ({len(md_files)} files)")
            print(f"{'='*60}")

            for md_file in md_files:
                filepath = os.path.join(dir_path, md_file)
                total_files += 1

                # Quick check for URL and existing transcript
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                has_url = bool(URL_PATTERN.search(content))
                has_transcript_section = has_transcript(content)

                if has_url:
                    total_with_url += 1
                if has_transcript_section:
                    total_already_done += 1

                if dry_run:
                    status = ""
                    if not has_url:
                        status = "[NO URL]"
                    elif has_transcript_section:
                        status = "[DONE]"
                    else:
                        status = "[TODO]"
                    print(f"  {status} {md_file}")
                    continue

                print(f"\n  -> {md_file}")
                try:
                    result = process_md_file(filepath, session, tmp_dir)
                    if result:
                        total_added += 1
                    else:
                        total_skipped += 1
                except Exception as e:
                    print(f"  [ERROR] {e}")
                    total_errors += 1

                # Delay between requests to avoid rate limiting
                time.sleep(2.0)

    print(f"\n{'='*60}")
    if dry_run:
        total_need = total_with_url - total_already_done
        print(f"SUMMARY:")
        print(f"  Total .md files:        {total_files}")
        print(f"  With YouTube URL:       {total_with_url}")
        print(f"  Already have transcript: {total_already_done}")
        print(f"  Need transcript:        {total_need}")
        print(f"\nRun without --dry-run to fetch the {total_need} missing transcripts.")
    else:
        print(f"DONE: {total_added} transcripts added, {total_skipped} skipped, {total_errors} errors")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
