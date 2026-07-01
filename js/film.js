/* Film tab: upload game/practice film (stored locally as a blob) and
   attach timestamped notes for film review. */

const Film = (() => {
  let films = [];
  let players = [];
  let currentFilmId = null;
  let currentObjectUrl = null;

  async function render(container) {
    if (currentFilmId) return renderDetail(container);
    return renderList(container);
  }

  async function renderList(container) {
    films = await DB.getAll('films');
    films.sort((a, b) => b.createdAt - a.createdAt);
    players = await DB.getAll('players');

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Film</h2>
          <p class="section-sub">Drop film here, then open a clip to timestamp and note key moments.</p>
        </div>
        <button class="btn" id="uploadBtn"><svg><use href="#icon-plus"/></svg> Upload Film</button>
      </div>
      ${films.length ? `<div class="film-grid">${films.map(filmCardHtml).join('')}</div>`
                     : `<div class="empty-state">No film uploaded yet.</div>`}
    `;

    container.querySelector('#uploadBtn').addEventListener('click', openUploadForm);
    container.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => {
      currentFilmId = Number(el.dataset.open);
      render(document.getElementById('view-film'));
    }));
    container.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFilm(Number(el.dataset.del));
    }));
  }

  function filmCardHtml(f) {
    const playerName = f.playerId ? (players.find((p) => p.id === f.playerId) || {}).name : null;
    return `
      <div class="card film-card" data-open="${f.id}">
        <div class="thumb"><svg><use href="#icon-film"/></svg></div>
        <h4>${App.escapeHtml(f.title)}</h4>
        <div class="meta">${playerName ? App.escapeHtml(playerName) + ' · ' : ''}${new Date(f.createdAt).toLocaleDateString()}</div>
        <div class="card-actions" style="margin-top:10px;">
          <button class="btn danger small" data-del="${f.id}">Delete</button>
        </div>
      </div>
    `;
  }

  function openUploadForm() {
    App.openModal(`
      <h3>Upload Film</h3>
      <form id="uploadForm">
        <div class="field">
          <label>Title</label>
          <input type="text" name="title" placeholder="e.g. vs. Riverdale - 1st Half" required />
        </div>
        <div class="field">
          <label>Player (optional)</label>
          <select name="playerId">
            <option value="">— none —</option>
            ${players.map((p) => `<option value="${p.id}">${App.escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Video File</label>
          <input type="file" name="videoFile" accept="video/*" required />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#uploadForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const file = fd.get('videoFile');
      if (!file || file.size === 0) return;
      const playerId = fd.get('playerId') ? Number(fd.get('playerId')) : null;
      await DB.add('films', {
        title: fd.get('title').trim(),
        playerId,
        videoBlob: file,
        createdAt: Date.now(),
      });
      App.toast('Film uploaded');
      App.closeModal();
      render(document.getElementById('view-film'));
    });
  }

  async function removeFilm(id) {
    if (!confirm('Delete this film and all its notes?')) return;
    const notes = await DB.getAllByIndex('filmNotes', 'filmId', id);
    for (const n of notes) await DB.delete('filmNotes', n.id);
    await DB.delete('films', id);
    App.toast('Film deleted');
    render(document.getElementById('view-film'));
  }

  async function renderDetail(container) {
    const film = await DB.get('films', currentFilmId);
    if (!film) { currentFilmId = null; return renderList(container); }
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = URL.createObjectURL(film.videoBlob);
    const notes = (await DB.getAllByIndex('filmNotes', 'filmId', film.id)).sort((a, b) => a.timestamp - b.timestamp);

    container.innerHTML = `
      <button class="back-link" id="backBtn">&larr; All Film</button>
      <h2 class="section-title">${App.escapeHtml(film.title)}</h2>
      <div class="film-detail">
        <video id="filmPlayer" src="${currentObjectUrl}" controls preload="metadata"></video>
        <div class="note-form">
          <button class="btn secondary small" id="useCurrentTime">Use Current Time</button>
          <input type="text" id="tsInput" placeholder="mm:ss" style="width:90px;background:#0f0f0f;border:1px solid #333;color:#fff;border-radius:9px;padding:8px 10px;" />
          <input type="text" id="noteInput" placeholder="Note about this moment..." style="flex:1;min-width:160px;background:#0f0f0f;border:1px solid #333;color:#fff;border-radius:9px;padding:8px 10px;" />
          <button class="btn small" id="addNoteBtn">Add Note</button>
        </div>
        <div class="note-list" id="noteList">
          ${notes.length ? notes.map(noteRowHtml).join('') : '<div class="empty-state">No notes yet — pause on a key moment and add one.</div>'}
        </div>
      </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', () => { currentFilmId = null; render(container); });
    const video = container.querySelector('#filmPlayer');
    container.querySelector('#useCurrentTime').addEventListener('click', () => {
      container.querySelector('#tsInput').value = formatTime(video.currentTime);
    });
    container.querySelector('#addNoteBtn').addEventListener('click', () => addNote(container, video, film.id));
    container.querySelectorAll('[data-seek]').forEach((el) => el.addEventListener('click', () => {
      video.currentTime = Number(el.dataset.seek);
      video.play();
    }));
    container.querySelectorAll('[data-note-del]').forEach((el) => el.addEventListener('click', async (e) => {
      e.stopPropagation();
      await DB.delete('filmNotes', Number(el.dataset.noteDel));
      render(container);
    }));
  }

  function noteRowHtml(n) {
    return `
      <div class="note-row" data-seek="${n.timestamp}">
        <span class="ts">${formatTime(n.timestamp)}</span>
        <span class="txt">${App.escapeHtml(n.note)}</span>
        <button class="btn danger small" data-note-del="${n.id}">Delete</button>
      </div>
    `;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function parseTime(str) {
    if (!str) return null;
    const parts = str.split(':').map((p) => Number(p.trim()));
    if (parts.some(isNaN)) return null;
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }

  async function addNote(container, video, filmId) {
    const tsRaw = container.querySelector('#tsInput').value.trim();
    const noteText = container.querySelector('#noteInput').value.trim();
    const timestamp = tsRaw ? parseTime(tsRaw) : video.currentTime;
    if (timestamp == null) { App.toast('Enter a valid time like 1:23'); return; }
    if (!noteText) { App.toast('Enter a note'); return; }
    await DB.add('filmNotes', { filmId, timestamp, note: noteText, createdAt: Date.now() });
    App.toast('Note added');
    render(container);
  }

  return { render };
})();
