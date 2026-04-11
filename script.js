
  // ─── State ───────────────────────────────────────────────────────────────────
  let state = {};
  let allData = [];
  let currentFilter = 'all';
  let currentSearch = '';
  let modalVideoKey = null;
  let modalVideoId  = null;

  // ─── Storage Layer 1: localStorage ───────────────────────────────────────────
  const LS_KEY = 'studyos_v1';

  function lsSave(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch(e) {}
  }
  function lsLoad() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
  }

  // ─── Storage Layer 2: IndexedDB ──────────────────────────────────────────────
  // More persistent than localStorage — survives "Clear cookies" in many browsers,
  // and Chrome won't evict it if navigator.storage.persist() is granted.
  const IDB_NAME = 'StudyOS';
  const IDB_STORE = 'state';
  let idb = null;

  function openIDB() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
          e.target.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = (e) => { idb = e.target.result; resolve(idb); };
        req.onerror   = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  function idbSave(data) {
    if (!idb) return;
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(JSON.stringify(data), 'main');
    } catch(e) {}
  }

  function idbLoad() {
    return new Promise((resolve) => {
      if (!idb) return resolve(null);
      try {
        const tx  = idb.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get('main');
        req.onsuccess = (e) => {
          try { resolve(e.target.result ? JSON.parse(e.target.result) : null); }
          catch { resolve(null); }
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  // ─── Storage Layer 3: navigator.storage.persist() ────────────────────────────
  // Asks the browser to mark this origin as "persistent" — meaning it will NEVER
  // auto-evict storage even under disk pressure. Chrome grants this silently for
  // sites added to homescreen or used frequently. One-time request, remembered forever.
  function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) console.info('[StudyOS] Persistent storage granted ✓');
        else         console.info('[StudyOS] Persistent storage not granted (data still saved)');
      });
    }
  }

  // ─── Unified save: writes to ALL layers ──────────────────────────────────────
  function saveState() {
    lsSave(state);
    idbSave(state);
  }

  // ─── Unified load: tries each layer, picks the most recent / non-null ─────────
  async function loadBestState() {
    const fromLS  = lsLoad();
    const fromIDB = await idbLoad();

    // Merge: prefer whichever has more keys (most complete data)
    const lsCount  = fromLS  ? Object.keys(fromLS).length  : -1;
    const idbCount = fromIDB ? Object.keys(fromIDB).length : -1;

    if (lsCount === 0 && idbCount === 0) return {};
    if (idbCount > lsCount) {
      // IDB has more data — sync it back to localStorage too
      lsSave(fromIDB);
      return fromIDB;
    }
    if (lsCount > idbCount) {
      // localStorage has more data — sync to IDB
      idbSave(fromLS);
      return fromLS;
    }
    return fromLS || fromIDB || {};
  }

  function getVS(key) { return state[key] || {}; }
  function setVS(key, patch) {
    state[key] = { ...getVS(key), ...patch };
    saveState();
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  // ─── Modal ────────────────────────────────────────────────────────────────────
  function openModal(videoId, title, key) {
    modalVideoKey = key;
    modalVideoId  = videoId;

    document.getElementById('youtubePlayer').src =
      `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalYtBtn').href =
      `https://www.youtube.com/watch?v=${videoId}`;

    const vs = getVS(key);
    document.getElementById('modalStudyBtn').textContent =
      vs.studying ? '✓ Studying' : 'Mark Studying';
    document.getElementById('modalDoneBtn').textContent =
      vs.done ? '✓ Done' : 'Mark Done';

    document.getElementById('modal').classList.add('open');
    document.getElementById('modal').onclick = (e) => {
      if (e.target === document.getElementById('modal')) closeModal();
    };

    // Auto-mark as studying on open
    if (!vs.studying) {
      setVS(key, { studying: true });
      document.getElementById('modalStudyBtn').textContent = '✓ Studying';
      toast('Marked as studying');
      updateGlobalStats();
      renderAll();
    }
  }

  function closeModal() {
    document.getElementById('youtubePlayer').src = '';
    document.getElementById('modal').classList.remove('open');
    modalVideoKey = null;
    modalVideoId  = null;
  }

  document.getElementById('modalCloseBtn').onclick = closeModal;
  document.getElementById('modalStudyBtn').onclick = () => {
    if (!modalVideoKey) return;
    const vs = getVS(modalVideoKey);
    setVS(modalVideoKey, { studying: !vs.studying });
    document.getElementById('modalStudyBtn').textContent =
      getVS(modalVideoKey).studying ? '✓ Studying' : 'Mark Studying';
    toast(getVS(modalVideoKey).studying ? 'Marked studying' : 'Removed from studying');
    updateGlobalStats();
    renderAll();
  };
  document.getElementById('modalDoneBtn').onclick = () => {
    if (!modalVideoKey) return;
    const vs = getVS(modalVideoKey);
    setVS(modalVideoKey, { done: !vs.done });
    document.getElementById('modalDoneBtn').textContent =
      getVS(modalVideoKey).done ? '✓ Done' : 'Mark Done';
    toast(getVS(modalVideoKey).done ? 'Marked done ✓' : 'Unmarked done');
    updateGlobalStats();
    renderAll();
  };

  // ─── Keyboard ─────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (!modalVideoKey) return;
    if (e.key === 's' || e.key === 'S') {
      document.getElementById('modalStudyBtn').click();
    }
    if (e.key === 'd' || e.key === 'D') {
      document.getElementById('modalDoneBtn').click();
    }
  });

  // ─── Stats ────────────────────────────────────────────────────────────────────
  function updateGlobalStats() {
    let total = 0, studying = 0, done = 0;
    allData.forEach(pl => {
      pl.videos.forEach(v => {
        const key = `${pl.title}_${v.index}`;
        total++;
        if (getVS(key).studying) studying++;
        if (getVS(key).done) done++;
      });
    });
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statStudying').textContent = studying;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statPct').textContent =
      total ? Math.round(done / total * 100) + '%' : '0%';
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  function makeKey(plTitle, vIndex) { return `${plTitle}_${vIndex}`; }

  function videoMatchesFilter(key) {
    const vs = getVS(key);
    if (currentFilter === 'studying') return vs.studying;
    if (currentFilter === 'done')     return vs.done;
    if (currentFilter === 'undone')   return !vs.done;
    return true;
  }

  function videoMatchesSearch(title) {
    if (!currentSearch) return true;
    return title.toLowerCase().includes(currentSearch.toLowerCase());
  }

  function renderAll() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    let anyVisible = false;

    allData.forEach(playlist => {
      const filteredVideos = playlist.videos.filter(v => {
        const key = makeKey(playlist.title, v.index);
        return videoMatchesFilter(key) && videoMatchesSearch(v.title);
      });
      if (filteredVideos.length === 0) return;
      anyVisible = true;

      // playlist progress
      const totalInPl = playlist.videos.length;
      const doneInPl  = playlist.videos.filter(v =>
        getVS(makeKey(playlist.title, v.index)).done
      ).length;
      const pct = totalInPl ? Math.round(doneInPl / totalInPl * 100) : 0;

      const section = document.createElement('div');
      section.className = 'playlist-section';
      section.innerHTML = `
        <div class="playlist-header">
          <div class="playlist-title">${playlist.title}</div>
          <div class="playlist-meta">
            <span>${totalInPl} videos</span>
            <span>${doneInPl} done</span>
          </div>
        </div>
        <div class="progress-wrap">
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="progress-labels"><span>${pct}% complete</span><span>${totalInPl - doneInPl} remaining</span></div>
        </div>
        <div class="cards-scroll"></div>
      `;

      const scroll = section.querySelector('.cards-scroll');

      filteredVideos.forEach(video => {
        const key = makeKey(playlist.title, video.index);
        const vs  = getVS(key);

        const card = document.createElement('div');
        card.className = [
          'card',
          vs.studying ? 'is-studying' : '',
          vs.done     ? 'is-done'     : '',
          vs.notes    ? 'has-note'    : '',
        ].filter(Boolean).join(' ');

        card.innerHTML = `
          <div class="thumb-wrap">
            <img src="${video.thumbnail}" alt="" loading="lazy">
            <div class="play-overlay">
              <div class="play-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
            </div>
            <div class="done-badge">DONE</div>
            <div class="studying-badge">STUDYING</div>
          </div>
          <div class="card-body">
            <div class="card-index">#${video.index}</div>
            <div class="card-title">${video.title}</div>
            <div class="card-actions">
              <button class="btn-study">${vs.studying ? '● Studying' : 'Study'}</button>
              <a class="btn-yt" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener" title="Open in YouTube">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/></svg>
                YT
              </a>
              <label class="done-wrap">
                <input type="checkbox" ${vs.done ? 'checked' : ''}> Done
              </label>
            </div>
            <textarea class="notes-area" placeholder="Add notes…" maxlength="400">${vs.notes || ''}</textarea>
            <button class="btn-notes ${vs.notes ? 'has-note' : ''}">${vs.notes ? '📝 Notes' : '+ Notes'}</button>
          </div>
        `;

        // Card click → open modal
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-study') ||
              e.target.closest('.btn-yt') ||
              e.target.closest('.done-wrap') ||
              e.target.closest('.notes-area') ||
              e.target.closest('.btn-notes')) return;
          openModal(video.id, video.title, key);
        });

        // Study toggle
        card.querySelector('.btn-study').addEventListener('click', (e) => {
          e.stopPropagation();
          const cur = getVS(key).studying;
          setVS(key, { studying: !cur });
          toast(!cur ? 'Marked studying' : 'Removed from studying');
          updateGlobalStats();
          renderAll();
        });

        // Done checkbox
        card.querySelector('input[type=checkbox]').addEventListener('change', (e) => {
          e.stopPropagation();
          setVS(key, { done: e.target.checked });
          toast(e.target.checked ? 'Marked done ✓' : 'Unmarked');
          updateGlobalStats();
          renderAll();
        });

        // Notes toggle
        card.querySelector('.btn-notes').addEventListener('click', (e) => {
          e.stopPropagation();
          card.classList.toggle('notes-open');
          if (card.classList.contains('notes-open')) {
            card.querySelector('.notes-area').focus();
          }
        });

        // Notes save
        card.querySelector('.notes-area').addEventListener('input', (e) => {
          e.stopPropagation();
          setVS(key, { notes: e.target.value });
          const btn = card.querySelector('.btn-notes');
          btn.textContent = e.target.value ? '📝 Notes' : '+ Notes';
          btn.classList.toggle('has-note', !!e.target.value);
        });
        card.querySelector('.notes-area').addEventListener('click', e => e.stopPropagation());

        scroll.appendChild(card);
      });

      app.appendChild(section);
    });

    if (!anyVisible) {
      app.innerHTML = `<div class="empty"><b>Nothing here.</b>Try a different filter or search.</div>`;
    }
  }

  // ─── Filter buttons ───────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAll();
    });
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderAll();
  });

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
  // Open IndexedDB, request persistence, load best available state, then render
  async function boot() {
    await openIDB();
    requestPersistence();
    state = await loadBestState();

  // Demo data in case data.json isn't available
  const DEMO = [
    {
      title: "JavaScript Fundamentals",
      videos: [
        { index: 1, id: "hdI2bqOjy3c", title: "JavaScript Crash Course For Beginners", thumbnail: "https://i.ytimg.com/vi/hdI2bqOjy3c/mqdefault.jpg" },
        { index: 2, id: "W6NZfCO5SIk", title: "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour", thumbnail: "https://i.ytimg.com/vi/W6NZfCO5SIk/mqdefault.jpg" },
        { index: 3, id: "PkZNo7MFNFg", title: "Learn JavaScript - Full Course for Beginners", thumbnail: "https://i.ytimg.com/vi/PkZNo7MFNFg/mqdefault.jpg" },
        { index: 4, id: "jS4aFq5-91M", title: "JavaScript Full Course (2023) - Beginner to Pro", thumbnail: "https://i.ytimg.com/vi/jS4aFq5-91M/mqdefault.jpg" },
        { index: 5, id: "lI1ae4REbFM", title: "JavaScript DOM Manipulation – Full Course for Beginners", thumbnail: "https://i.ytimg.com/vi/lI1ae4REbFM/mqdefault.jpg" },
      ]
    },
    {
      title: "CSS & Design Systems",
      videos: [
        { index: 1, id: "1Rs2ND1ryYc", title: "CSS Tutorial – Full Course for Beginners", thumbnail: "https://i.ytimg.com/vi/1Rs2ND1ryYc/mqdefault.jpg" },
        { index: 2, id: "phWxA89Dy94", title: "CSS Flexbox in 20 Minutes", thumbnail: "https://i.ytimg.com/vi/phWxA89Dy94/mqdefault.jpg" },
        { index: 3, id: "9zBsdzdE4sM", title: "CSS Grid Layout Crash Course", thumbnail: "https://i.ytimg.com/vi/9zBsdzdE4sM/mqdefault.jpg" },
        { index: 4, id: "D-h8L5hgW-w", title: "Tailwind CSS Tutorial", thumbnail: "https://i.ytimg.com/vi/D-h8L5hgW-w/mqdefault.jpg" },
      ]
    }
  ];

    await fetch("data.json")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => { allData = data; })
      .catch(() => { allData = DEMO; });

    // ── Seed done/not-done by fetching each note_file and counting lines ───────
    // Threshold: >= 20 non-empty lines → done.  < 20 → explicitly not done.
    // Only runs for keys the user has NEVER manually touched (absent from state).
    // All fetches run in parallel — no waterfall.
    const NOTE_LINE_THRESHOLD = 20;

    async function checkNoteFile(noteFilePath) {
      // Returns: 'done' | 'not_done' | 'skip' (no file path)
      if (!noteFilePath) return 'skip';
      try {
        const r = await fetch(noteFilePath);
        if (!r.ok) return 'skip';
        const text = await r.text();
        // Count non-empty lines (ignore blank lines and lines with only whitespace)
        const meaningfulLines = text.split('\n').filter(l => l.trim().length > 0);
        return meaningfulLines.length >= NOTE_LINE_THRESHOLD ? 'done' : 'not_done';
      } catch {
        return 'skip';  // fetch failed (file missing, CORS, etc.) — leave state untouched
      }
    }

    // Build list of videos whose state key is untouched
    const checks = [];
    allData.forEach(pl => {
      pl.videos.forEach(v => {
        const key = `${pl.title}_${v.index}`;
        if (!(key in state)) {
          // User has never touched this — safe to seed
          checks.push({ key, note_file: v.note_file });
        }
      });
    });

    // Run all fetches in parallel
    const results = await Promise.all(
      checks.map(c => checkNoteFile(c.note_file).then(status => ({ key: c.key, status })))
    );

    let seeded = 0;
    results.forEach(({ key, status }) => {
      if (status === 'skip') return;           // no file — leave state untouched
      state[key] = {
        done:     status === 'done',
        studying: false,
      };
      seeded++;
    });

    if (seeded > 0) {
      saveState();
      console.info(`[StudyOS] Seeded ${seeded} video states from note files (threshold: ${NOTE_LINE_THRESHOLD} lines).`);
    }

    updateGlobalStats();
    renderAll();
  }

  boot();
