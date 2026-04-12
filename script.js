// ─── State ────────────────────────────────────────────────────────────────────
let state = {};
let allData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'dur-asc';
let modalVideoKey = null;
let modalVideoId = null;

// ─── Storage: localStorage ────────────────────────────────────────────────────
const LS_KEY = 'studyos_v1';
function lsSave(data) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { } }
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }

// ─── Storage: IndexedDB ───────────────────────────────────────────────────────
const IDB_NAME = 'StudyOS';
const IDB_STORE = 'state';
let idb = null;

function openIDB() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
      req.onsuccess = e => { idb = e.target.result; resolve(idb); };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

function idbSave(data) {
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(JSON.stringify(data), 'main');
  } catch (e) { }
}

function idbLoad() {
  return new Promise(resolve => {
    if (!idb) return resolve(null);
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('main');
      req.onsuccess = e => {
        try { resolve(e.target.result ? JSON.parse(e.target.result) : null); }
        catch { resolve(null); }
      };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

function requestPersistence() {
  if (navigator.storage?.persist) {
    navigator.storage.persist().then(g =>
      console.info(`[StudyOS] Persistent storage ${g ? 'granted' : 'denied'}`)
    );
  }
}

function saveState() { lsSave(state); idbSave(state); }

async function loadBestState() {
  const fromLS = lsLoad();
  const fromIDB = await idbLoad();
  const lsCount = fromLS ? Object.keys(fromLS).length : -1;
  const idbCount = fromIDB ? Object.keys(fromIDB).length : -1;
  if (lsCount === 0 && idbCount === 0) return {};
  if (idbCount > lsCount) { lsSave(fromIDB); return fromIDB; }
  if (lsCount > idbCount) { idbSave(fromLS); return fromLS; }
  return fromLS || fromIDB || {};
}

function getVS(key) { return state[key] || {}; }
function setVS(key, patch) { state[key] = { ...getVS(key), ...patch }; saveState(); }

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatDuration(sec) {
  if (sec == null || isNaN(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function formatDurationLong(sec) {
  if (sec == null || isNaN(sec) || sec <= 0) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
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
  modalVideoId = videoId;
  document.getElementById('youtubePlayer').src =
    `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalYtBtn').href = `https://www.youtube.com/watch?v=${videoId}`;
  const vs = getVS(key);
  document.getElementById('modalStudyBtn').textContent = vs.studying ? 'In Progress' : 'Mark In Progress';
  document.getElementById('modalDoneBtn').textContent = vs.done ? 'Completed' : 'Mark Complete';
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  modal.onclick = e => { if (e.target === modal) closeModal(); };
  if (!vs.studying) {
    setVS(key, { studying: true });
    document.getElementById('modalStudyBtn').textContent = 'In Progress';
    toast('Marked as in progress');
    updateGlobalStats();
    renderAll();
  }
}

function closeModal() {
  document.getElementById('youtubePlayer').src = '';
  document.getElementById('modal').classList.remove('open');
  modalVideoKey = null;
  modalVideoId = null;
}

document.getElementById('modalCloseBtn').onclick = closeModal;

document.getElementById('modalStudyBtn').onclick = () => {
  if (!modalVideoKey) return;
  const studying = !getVS(modalVideoKey).studying;
  setVS(modalVideoKey, { studying });
  document.getElementById('modalStudyBtn').textContent = studying ? 'In Progress' : 'Mark In Progress';
  toast(studying ? 'Marked as in progress' : 'Removed from in progress');
  updateGlobalStats(); renderAll();
};

document.getElementById('modalDoneBtn').onclick = () => {
  if (!modalVideoKey) return;
  const done = !getVS(modalVideoKey).done;
  setVS(modalVideoKey, { done });
  document.getElementById('modalDoneBtn').textContent = done ? 'Completed' : 'Mark Complete';
  toast(done ? 'Marked complete' : 'Marked incomplete');
  updateGlobalStats(); renderAll();
};

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (!modalVideoKey) return;
  if (e.key === 's' || e.key === 'S') document.getElementById('modalStudyBtn').click();
  if (e.key === 'd' || e.key === 'D') document.getElementById('modalDoneBtn').click();
});

// ─── Global stats ─────────────────────────────────────────────────────────────
function updateGlobalStats() {
  let total = 0, studying = 0, done = 0;
  allData.forEach(pl => pl.videos.forEach(v => {
    const key = `${pl.title}_${v.index}`;
    total++;
    if (getVS(key).studying) studying++;
    if (getVS(key).done) done++;
  }));
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statStudying').textContent = studying;
  document.getElementById('statDone').textContent = done;
  document.getElementById('statPct').textContent =
    total ? Math.round(done / total * 100) + '%' : '0%';
}

// ─── Sort ─────────────────────────────────────────────────────────────────────
function plTotalDur(pl) {
  return pl.videos.reduce((s, v) => s + (v.duration_seconds || 0), 0);
}

function sortPlaylists(data) {
  const copy = [...data]; // never mutate original
  switch (currentSort) {
    case 'dur-asc': return copy.sort((a, b) => plTotalDur(a) - plTotalDur(b));
    case 'dur-desc': return copy.sort((a, b) => plTotalDur(b) - plTotalDur(a));
    case 'alpha': return copy.sort((a, b) => a.title.localeCompare(b.title));
    default: return copy; // 'original' — preserve load order
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function makeKey(plTitle, vIndex) { return `${plTitle}_${vIndex}`; }

function videoMatchesFilter(key) {
  const vs = getVS(key);
  if (currentFilter === 'studying') return vs.studying;
  if (currentFilter === 'done') return vs.done;
  if (currentFilter === 'undone') return !vs.done;
  return true;
}

function videoMatchesSearch(title) {
  return !currentSearch || title.toLowerCase().includes(currentSearch.toLowerCase());
}

function renderAll() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  let anyVisible = false;

  const sorted = sortPlaylists(allData); // playlist order only; video order untouched

  sorted.forEach(playlist => {
    // Videos stay in their original index order — we only filter, never re-sort them
    const filteredVideos = playlist.videos.filter(v => {
      const key = makeKey(playlist.title, v.index);
      return videoMatchesFilter(key) && videoMatchesSearch(v.title);
    });
    if (filteredVideos.length === 0) return;
    anyVisible = true;

    const totalSeconds = playlist.videos.reduce((s, v) => s + (v.duration_seconds || 0), 0);
    const doneDuration = playlist.videos.filter(v => getVS(makeKey(playlist.title, v.index)).done).reduce((s, v) => s + (v.duration_seconds || 0), 0);
    const pct = totalSeconds ? Math.round(doneDuration / totalSeconds * 100) : 0;
    const remaining = totalSeconds - doneDuration;
    const hasAnyDuration = playlist.videos.some(v => v.duration_seconds > 0);
    const totalDurStr = hasAnyDuration ? formatDurationLong(totalSeconds) : null;
    const remainingDurStr = hasAnyDuration ? formatDurationLong(remaining) : null;

    const metaParts = [
      `${playlist.videos.length} videos`,
      totalDurStr,
    ].filter(Boolean);

    const section = document.createElement('div');
    section.className = 'playlist-section';
    section.innerHTML = `
<div class="playlist-header">
  <a 
    href="${playlist.url}" 
    target="_blank" 
    rel="noopener noreferrer"
    class="playlist-title"
  >
    ${escapeHtml(playlist.title)}
  </a>

  <div class="playlist-meta">
    ${metaParts.map(p => `<span>${p}</span>`).join('')}
  </div>
</div>
      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-labels">
          <span>${pct}% complete</span>
          <span>${remainingDurStr || 'no duration data'} remaining</span>
        </div>
      </div>
      <div class="cards-scroll"></div>
    `;

    const scroll = section.querySelector('.cards-scroll');

    filteredVideos.forEach(video => {
      const key = makeKey(playlist.title, video.index);
      const vs = getVS(key);
      const dur = formatDuration(video.duration_seconds);
      const thumbnail = video.thumbnail || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;

      const card = document.createElement('div');
      card.className = [
        'card',
        vs.studying ? 'is-studying' : '',
        vs.done ? 'is-done' : '',
        vs.notes ? 'has-note' : '',
      ].filter(Boolean).join(' ');

      card.innerHTML = `
        <div class="thumb-wrap">
          <img src="${thumbnail}" alt="" loading="lazy">
          <div class="play-overlay">
            <div class="play-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
          <div class="done-badge">Completed</div>
          <div class="studying-badge">In Progress</div>
          ${dur ? `<div class="duration-badge">${dur}</div>` : ''}
        </div>
<div class="card-body">

  <!-- Row 1: index + title merged -->
  <div class="card-title-row">
    <span class="card-index">${video.index}</span>
    <span class="card-title">${escapeHtml(video.title)}</span>
  </div>

  ${dur ? `<div class="card-duration">${dur}</div>` : ''}

  <!-- Row 2 -->
  <div class="card-actions">
    <button class="btn-study" ${vs.done ? 'disabled' : ''}>${vs.studying ? 'In Progress' : 'Mark In Progress'}</button>

    <a class="btn-yt" href="https://www.youtube.com/watch?v=${video.id}"
       target="_blank" rel="noopener" title="Open in YouTube">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.8 15.5V8.5l6.2 3.5-6.2 3.5z"/>
      </svg>
      YouTube
    </a>
  </div>

  <!-- Row 3 (final row: checkbox + notes button aligned) -->
  <div class="card-bottom-row">
    <label class="done-wrap">
      <input type="checkbox" ${vs.done ? 'checked' : ''}>
      <span>Complete</span>
    </label>

    <button class="btn-notes ${vs.notes ? 'has-note' : ''}">
      ${vs.notes ? 'View Notes' : 'Add Notes'}
    </button>
  </div>

  <textarea class="notes-area" placeholder="Add notes…" maxlength="400">
    ${escapeHtml(vs.notes || '')}
  </textarea>

</div>
      `;

      // Open modal on card click (not on interactive children)
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-study, .btn-yt, .done-wrap, .notes-area, .btn-notes')) return;
        openModal(video.id, video.title, key);
      });

      card.querySelector('.btn-study').addEventListener('click', e => {
        e.stopPropagation();
        const studying = !getVS(key).studying;
        setVS(key, { studying });
        toast(studying ? 'Marked as in progress' : 'Removed from in progress');
        updateGlobalStats(); renderAll();
      });

      card.querySelector('input[type=checkbox]').addEventListener('change', e => {
        e.stopPropagation();
        const updateObj = { done: e.target.checked };
        if (e.target.checked) {
          updateObj.studying = false;
        }
        setVS(key, updateObj);
        toast(e.target.checked ? 'Marked complete' : 'Marked incomplete');
        updateGlobalStats(); renderAll();
      });

      const notesArea = card.querySelector('.notes-area');
      const notesBtn = card.querySelector('.btn-notes');

      notesBtn.addEventListener('click', e => {
        e.stopPropagation();
        card.classList.toggle('notes-open');
        if (card.classList.contains('notes-open')) notesArea.focus();
      });

      notesArea.addEventListener('input', e => {
        e.stopPropagation();
        setVS(key, { notes: e.target.value });
        notesBtn.textContent = e.target.value ? 'View Notes' : 'Add Notes';
        notesBtn.classList.toggle('has-note', !!e.target.value);
      });

      notesArea.addEventListener('click', e => e.stopPropagation());
      scroll.appendChild(card);
    });

    app.appendChild(section);
  });

  if (!anyVisible) {
    app.innerHTML = `<div class="empty"><strong>No results.</strong>Try adjusting the filter or search.</div>`;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  await openIDB();
  requestPersistence();
  state = await loadBestState();

  const DEMO = [
    {
      title: "JavaScript Fundamentals",
      videos: [
        { index: 1, id: "hdI2bqOjy3c", title: "JavaScript Crash Course For Beginners", duration_seconds: 6297, thumbnail: "https://i.ytimg.com/vi/hdI2bqOjy3c/mqdefault.jpg" },
        { index: 2, id: "W6NZfCO5SIk", title: "JavaScript Tutorial for Beginners: Learn in 1 Hour", duration_seconds: 3600, thumbnail: "https://i.ytimg.com/vi/W6NZfCO5SIk/mqdefault.jpg" },
        { index: 3, id: "PkZNo7MFNFg", title: "Learn JavaScript – Full Course for Beginners", duration_seconds: 14040, thumbnail: "https://i.ytimg.com/vi/PkZNo7MFNFg/mqdefault.jpg" },
        { index: 4, id: "jS4aFq5-91M", title: "JavaScript Full Course (2023) – Beginner to Pro", duration_seconds: 21600, thumbnail: "https://i.ytimg.com/vi/jS4aFq5-91M/mqdefault.jpg" },
        { index: 5, id: "lI1ae4REbFM", title: "JavaScript DOM Manipulation – Full Course", duration_seconds: 5400, thumbnail: "https://i.ytimg.com/vi/lI1ae4REbFM/mqdefault.jpg" },
      ]
    },
    {
      title: "CSS & Design Systems",
      videos: [
        { index: 1, id: "1Rs2ND1ryYc", title: "CSS Tutorial – Full Course for Beginners", duration_seconds: 11520, thumbnail: "https://i.ytimg.com/vi/1Rs2ND1ryYc/mqdefault.jpg" },
        { index: 2, id: "phWxA89Dy94", title: "CSS Flexbox in 20 Minutes", duration_seconds: 1200, thumbnail: "https://i.ytimg.com/vi/phWxA89Dy94/mqdefault.jpg" },
        { index: 3, id: "9zBsdzdE4sM", title: "CSS Grid Layout Crash Course", duration_seconds: 2520, thumbnail: "https://i.ytimg.com/vi/9zBsdzdE4sM/mqdefault.jpg" },
        { index: 4, id: "D-h8L5hgW-w", title: "Tailwind CSS Tutorial", duration_seconds: 4200, thumbnail: "https://i.ytimg.com/vi/D-h8L5hgW-w/mqdefault.jpg" },
      ]
    }
  ];

  await fetch('data.json')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(data => { allData = data; })
    .catch(() => { allData = DEMO; });

  // Seed state from note files
  const NOTE_LINE_THRESHOLD = 20;
  const checks = [];
  allData.forEach(pl => pl.videos.forEach(v => {
    const key = `${pl.title}_${v.index}`;
    if (!(key in state) && v.note_file) checks.push({ key, note_file: v.note_file });
  }));

  const results = await Promise.all(checks.map(c =>
    fetch(c.note_file)
      .then(r => r.ok ? r.text() : '')
      .catch(() => '')
      .then(text => ({
        key: c.key,
        status: text.split('\n').filter(l => l.trim()).length >= NOTE_LINE_THRESHOLD
          ? 'done' : 'not_done'
      }))
  ));

  let seeded = 0;
  results.forEach(({ key, status }) => {
    if (!(key in state)) {
      state[key] = { done: status === 'done', studying: false };
      seeded++;
    }
  });
  if (seeded > 0) {
    saveState();
    console.info(`[StudyOS] Seeded ${seeded} video states from note files.`);
  }

  updateGlobalStats();
  renderAll();
}

// ─── Filter, search, sort listeners ──────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAll();
  });
});

document.getElementById('searchInput').addEventListener('input', e => {
  currentSearch = e.target.value;
  renderAll();
});

document.getElementById('sortSelect').addEventListener('change', e => {
  currentSort = e.target.value;
  renderAll();
});

boot();