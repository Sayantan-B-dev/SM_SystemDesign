# 📝 Video Transcript Fetcher

This script fetches YouTube video transcripts and appends them to the corresponding `.md` files in your project.

## What It Does

For each `.md` file across all video directories, it:

1. **Reads** the MD file and extracts the YouTube URL
2. **Fetches** the transcript using 3 fallback methods:
   - Mobile YouTube innertube API (best for bypassing rate limits)
   - `youtube-transcript-api` Python library
   - `yt-dlp` CLI tool
3. **Appends** the transcript under a `## Transcript` section at the end of the MD file
4. **Skips** files that already have a transcript (safe to run multiple times)

### Example: Before vs After

**Before** (`001_System Design Primer.md`):
```markdown
# System Design Primer ⭐️ How to start with distributed systems

Duration: 09:22
URL: https://www.youtube.com/watch?v=SqcXvc3ZmRU
```

**After:**
```markdown
# System Design Primer ⭐️ How to start with distributed systems

Duration: 09:22
URL: https://www.youtube.com/watch?v=SqcXvc3ZmRU

---
## Transcript
 Hey everyone, today we'd be talking. I'm sorry. Is it fine if I record a video? No, no problem. Oh, thank you so much...
```

## Files Covered

The script processes all `.md` files in these directories:

| Directory | Files |
|-----------|-------|
| `System Design Playlist/` | 26 videos |
| `High Level Design from Basics to Advanced/` | ~42 videos |
| `Low Level Design from Basics to Advanced/` | ~30 videos |
| `System Design - Narendra L/` | 20 videos |
| `System Design Interview Preparation Series/` | varies |
| `System design mock interviews/` | varies |
| `System Design Walkthroughs/` | 18 videos |
| **Total** | **~177 videos** |

## Quick Start

```bash
# Run from the project directory
python fetch_transcripts.py

# Or specify the project directory
python fetch_transcripts.py "g:\code\SystemDesign"
```

## ⚠️ YouTube Rate Limiting (429 Errors)

YouTube blocks IPs that make too many transcript requests. If you see `HTTP Error 429: Too Many Requests`, you need to bypass the rate limit.

### Option 1: Browser Cookies (Recommended)

This tells YouTube "I'm a real logged-in user, not a bot."

**Step 1:** Install a cookie export extension in Chrome:
- [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) (Chrome)
- [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/) (Firefox)

**Step 2:** Go to [youtube.com](https://youtube.com) and make sure you're logged in.

**Step 3:** Click the extension icon and export cookies to a file called `cookies.txt`:
- Save it anywhere, e.g., `g:\code\SystemDesign\cookies.txt`

**Step 4:** Run the script with the cookies file:
```bash
python fetch_transcripts.py "g:\code\SystemDesign" --cookies-file cookies.txt
```

### Option 2: Proxy / VPN

If you have a VPN or SOCKS5 proxy:
```bash
python fetch_transcripts.py "g:\code\SystemDesign" --proxy socks5://127.0.0.1:1080
```

### Option 3: Wait

Rate limits typically expire after **a few hours**. Try again later.

## Command Reference

```
python fetch_transcripts.py [BASE_DIR] [OPTIONS]

Options:
    --cookies-file PATH   Netscape-format cookies.txt from your browser
    --proxy URL           HTTP/SOCKS5 proxy URL

Examples:
    python fetch_transcripts.py
    python fetch_transcripts.py "g:\code\SystemDesign"
    python fetch_transcripts.py --cookies-file cookies.txt
    python fetch_transcripts.py "g:\code\SystemDesign" --cookies-file cookies.txt
    python fetch_transcripts.py --proxy socks5://127.0.0.1:1080
```

## Requirements

Already installed in your environment:
- Python 3.10+
- `requests` (pip)
- `youtube-transcript-api` v1.2.4 (pip)
- `yt-dlp` (pip)

## How It Works Internally

```
┌─────────────────────────────────────────────┐
│  For each .md file in video directories     │
├─────────────────────────────────────────────┤
│  1. Read MD → extract YouTube URL           │
│  2. Check if transcript already exists      │
│  3. Try fetching transcript:                │
│     a. Mobile YouTube page scraping         │
│     b. youtube-transcript-api               │
│     c. yt-dlp subtitle download             │
│  4. Append transcript to MD file            │
│  5. Wait 2s, move to next file              │
└─────────────────────────────────────────────┘
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `HTTP Error 429` | Use `--cookies-file` or `--proxy` |
| `[SKIP] No YouTube URL found` | File doesn't have a YouTube URL |
| `[SKIP] Transcript already present` | File already has a transcript section |
| `[ERROR] Could not fetch transcript` | Video might be private/unavailable |
| DPAPI decryption error (cookies) | Use Firefox instead of Chrome for cookie export |
