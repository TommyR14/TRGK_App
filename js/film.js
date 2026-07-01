/* Film tab: the coach links game/practice film (as a video link — YouTube,
   Vimeo, or a direct URL) to a player, and both coach and that player can
   add timestamped notes for film review. */

const Film = (() => {
  let films = [];
  let players = [];
  let currentFilmId = null;

  async function render(container) {
    if (currentFilmId) return renderDetail(container);
    return renderList(container);
  }

  async function renderList(container) {
    const isCoach = Auth.isCoach();
    films = isCoach
      ? await DB.getAll('films')
      : await DB.getAllByIndex('films', 'playerId', Auth.myPlayerId());
    films.sort((a, b) => b.createdAt - a.createdAt);
    players = isCoach ? await DB.getAll('players') : [];

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Film</h2>
          <p class="section-sub">${isCoach ? 'Drop film here, then open a clip to timestamp and note key moments.' : 'Open a clip to review it and add your own notes.'}</p>
        </div>
        ${isCoach ? `<button class="btn" id="uploadBtn"><svg><use href="#icon-plus"/></svg> Add Film</button>` : ''}
      </div>
      ${films.length ? `<div class="film-grid">${films.map((f) => filmCardHtml(f, isCoach)).join('')}</div>`
                     : `<div class="empty-state">No film ${isCoach ? 'added' : 'linked to you'} yet.</div>`}
    `;

    if (isCoach) container.querySelector('#uploadBtn').addEventListener('click', openUploadForm);
    container.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => {
      currentFilmId = el.dataset.open;
      render(document.getElementById('view-film'));
    }));
    container.querySelectorAll('[data-del]').forEach((el) => el.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFilm(el.dataset.del);
    }));
  }

  function filmCardHtml(f, isCoach) {
    const playerName = f.playerId ? (players.find((p) => p.id === f.playerId) || {}).name : null;
    return `
      <div class="card film-card" data-open="${f.id}">
        <div class="thumb"><svg><use href="#icon-film"/></svg></div>
        <h4>${App.escapeHtml(f.title)}</h4>
        <div class="meta">${playerName ? App.escapeHtml(playerName) + ' · ' : ''}${new Date(f.createdAt).toLocaleDateString()}</div>
        ${isCoach ? `
        <div class="card-actions" style="margin-top:10px;">
          <button class="btn danger small" data-del="${f.id}">Delete</button>
        </div>` : ''}
      </div>
    `;
  }

  function openUploadForm() {
    App.openModal(`
      <h3>Add Film</h3>
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
          <label>Video Link (YouTube, Vimeo, or direct URL)</label>
          <input type="url" name="videoUrl" placeholder="https://..." required />
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
      const playerId = fd.get('playerId') || null;
      await DB.add('films', {
        title: fd.get('title').trim(),
        playerId,
        videoUrl: fd.get('videoUrl').trim(),
        createdAt: Date.now(),
      });
      App.toast('Film added');
      App.closeModal();
      render(document.getElementById('view-film'));
    });
  }

  async function removeFilm(id) {
    if (!confirm('Delete this film and all its notes?')) return;
    const notes = await DB.getAll(`films/${id}/notes`);
    for (const n of notes) await DB.delete(`films/${id}/notes`, n.id);
    await DB.delete('films', id);
    App.toast('Film deleted');
    render(document.getElementById('view-film'));
  }

  function embedSrcAtTime(embedBase, seconds) {
    if (embedBase.includes('youtube.com/embed/')) {
      return `${embedBase}?start=${Math.floor(seconds)}&autoplay=1`;
    }
    if (embedBase.includes('player.vimeo.com')) {
      return `${embedBase}#t=${Math.floor(seconds)}s`;
    }
    return embedBase;
  }

  async function renderDetail(container) {
    const film = await DB.get('films', currentFilmId);
    if (!film) { currentFilmId = null; return renderList(container); }
    const embedBase = Drills.toEmbedUrl(film.videoUrl);
    const isEmbed = !!embedBase;
    const notes = (await DB.getAll(`films/${film.id}/notes`)).sort((a, b) => a.timestamp - b.timestamp);

    container.innerHTML = `
      <button class="back-link" id="backBtn">&larr; All Film</button>
      <h2 class="section-title">${App.escapeHtml(film.title)}</h2>
      <div class="film-detail">
        <div class="drill-video" style="aspect-ratio:16/9;max-height:62vh;">
          ${isEmbed
            ? `<iframe id="filmPlayer" src="${embedBase}" allowfullscreen></iframe>`
            : `<video id="filmPlayer" src="${App.escapeHtml(film.videoUrl)}" controls preload="metadata"></video>`}
        </div>
        <div class="note-form">
          ${isEmbed ? '' : `<button class="btn secondary small" id="useCurrentTime">Use Current Time</button>`}
          <input type="text" id="tsInput" placeholder="mm:ss" style="width:90px;background:#0f0f0f;border:1px solid #333;color:#fff;border-radius:9px;padding:8px 10px;" />
          <input type="text" id="noteInput" placeholder="Note about this moment..." style="flex:1;min-width:160px;background:#0f0f0f;border:1px solid #333;color:#fff;border-radius:9px;padding:8px 10px;" />
          <button class="btn small" id="addNoteBtn">Add Note</button>
        </div>
        <div class="note-list" id="noteList">
          ${notes.length ? notes.map(noteRowHtml).join('') : '<div class="empty-state">No notes yet — add one for a key moment.</div>'}
        </div>
      </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', () => { currentFilmId = null; render(container); });
    const player = container.querySelector('#filmPlayer');
    if (!isEmbed) {
      container.querySelector('#useCurrentTime').addEventListener('click', () => {
        container.querySelector('#tsInput').value = formatTime(player.currentTime);
      });
    }
    container.querySelector('#addNoteBtn').addEventListener('click', () => addNote(container, player, film.id, isEmbed, embedBase));
    container.querySelectorAll('[data-seek]').forEach((el) => el.addEventListener('click', () => {
      const seconds = Number(el.dataset.seek);
      if (isEmbed) {
        player.src = embedSrcAtTime(embedBase, seconds);
      } else {
        player.currentTime = seconds;
        player.play();
      }
    }));
    container.querySelectorAll('[data-note-del]').forEach((el) => el.addEventListener('click', async (e) => {
      e.stopPropagation();
      await DB.delete(`films/${film.id}/notes`, el.dataset.noteDel);
      render(container);
    }));
  }

  function noteRowHtml(n) {
    const mine = n.authorUid === Auth.currentUser().uid;
    const canDelete = Auth.isCoach() || mine;
    return `
      <div class="note-row" data-seek="${n.timestamp}">
        <span class="ts">${formatTime(n.timestamp)}</span>
        <span class="txt">${App.escapeHtml(n.note)}</span>
        ${canDelete ? `<button class="btn danger small" data-note-del="${n.id}">Delete</button>` : ''}
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

  async function addNote(container, player, filmId, isEmbed, embedBase) {
    const tsRaw = container.querySelector('#tsInput').value.trim();
    const noteText = container.querySelector('#noteInput').value.trim();
    const timestamp = tsRaw ? parseTime(tsRaw) : (isEmbed ? null : player.currentTime);
    if (timestamp == null) { App.toast('Enter a valid time like 1:23'); return; }
    if (!noteText) { App.toast('Enter a note'); return; }
    await DB.add(`films/${filmId}/notes`, {
      timestamp,
      note: noteText,
      authorUid: Auth.currentUser().uid,
      createdAt: Date.now(),
    });
    App.toast('Note added');
    render(container);
  }

  function viewFilm(id) {
    currentFilmId = id;
    App.goTo('film');
  }

  return { render, viewFilm };
})();
