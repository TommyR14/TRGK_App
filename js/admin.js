/* Admin tab (coach-only): every player in one roster, and a merged view
   per player combining their About Me profile, all their scheduled
   sessions (past and future, not just the current week), and all their
   film. */

const Admin = (() => {
  let players = [];
  let currentPlayerId = null;

  async function render(container) {
    if (currentPlayerId) return renderDetail(container);
    return renderList(container);
  }

  async function renderList(container) {
    players = await DB.getAll('players');
    players.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Admin</h2>
          <p class="section-sub">Every player, with their profile, sessions, and film in one place.</p>
        </div>
      </div>
      ${players.length ? `<div class="player-grid">${players.map(rowHtml).join('')}</div>`
                       : `<div class="empty-state">No players yet.</div>`}
    `;

    container.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => {
      currentPlayerId = el.dataset.open;
      render(document.getElementById('view-admin'));
    }));
  }

  function rowHtml(p) {
    return `
      <div class="card player-card" data-open="${p.id}" style="cursor:pointer;">
        <h4>${App.escapeHtml(p.name)}</h4>
        <div class="row"><span>Town</span><span>${App.escapeHtml(p.town)}</span></div>
        <div class="row"><span>Club Team</span><span>${App.escapeHtml(p.clubTeam)}</span></div>
        <div class="row"><span>Account</span><span>${p.ownerUid ? 'Linked' : 'Coach-added'}</span></div>
      </div>
    `;
  }

  const SESSION_LABEL = { individual: 'Individual', small: 'Small Group', large: 'Large Group' };
  const POSITION_LABEL = { forward: 'Forward', midfielder: 'Midfielder', defender: 'Defender', goalkeeper: 'Goalkeeper', other: 'Other' };

  function fmtSessionDate(dateStr, hour) {
    const d = new Date(`${dateStr}T00:00:00`);
    const period = hour < 12 ? 'AM' : 'PM';
    let hr = hour % 12;
    if (hr === 0) hr = 12;
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${hr}:00 ${period}`;
  }

  async function renderDetail(container) {
    const player = await DB.get('players', currentPlayerId);
    if (!player) { currentPlayerId = null; return renderList(container); }

    const [sessions, films] = await Promise.all([
      DB.getAllByIndex('schedule', 'playerId', currentPlayerId),
      DB.getAllByIndex('films', 'playerId', currentPlayerId),
    ]);
    sessions.sort((a, b) => (a.date + a.hour).localeCompare(b.date + b.hour));
    films.sort((a, b) => b.createdAt - a.createdAt);
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const upcoming = sessions.filter((s) => s.date >= todayKey);
    const past = sessions.filter((s) => s.date < todayKey);

    container.innerHTML = `
      <button class="back-link" id="backBtn">&larr; All Players</button>
      <h2 class="section-title">${App.escapeHtml(player.name)}</h2>

      <div class="card" style="margin-bottom:24px;">
        <div class="row"><span>Year of Birth</span><span>${App.escapeHtml(player.birthYear)}</span></div>
        <div class="row"><span>Town</span><span>${App.escapeHtml(player.town)}</span></div>
        <div class="row"><span>Club Team</span><span>${App.escapeHtml(player.clubTeam)}</span></div>
        <div class="row"><span>High School Team</span><span>${App.escapeHtml(player.hsTeam)}</span></div>
        <div class="card-actions" style="margin-top:12px;">
          <button class="btn secondary small" id="editProfileBtn">Edit Profile</button>
        </div>
      </div>

      <h3 style="margin-bottom:12px;">Sessions</h3>
      ${sessions.length ? `<div class="note-list" style="margin-bottom:24px;">
        ${upcoming.map((s) => sessionRowHtml(s, true)).join('')}
        ${past.map((s) => sessionRowHtml(s, false)).join('')}
      </div>` : `<div class="empty-state" style="margin-bottom:24px;">No sessions booked for this player.</div>`}

      <h3 style="margin-bottom:12px;">Film</h3>
      ${films.length ? `<div class="film-grid">${films.map(filmRowHtml).join('')}</div>`
                     : `<div class="empty-state">No film linked to this player.</div>`}
    `;

    container.querySelector('#backBtn').addEventListener('click', () => { currentPlayerId = null; render(container); });
    container.querySelector('#editProfileBtn').addEventListener('click', () => About.editPlayer(player.id));
    container.querySelectorAll('[data-film]').forEach((el) => el.addEventListener('click', () => Film.viewFilm(el.dataset.film)));
  }

  function sessionRowHtml(s, isUpcoming) {
    const statusLabel = s.status === 'blocked' ? 'Blocked' : (SESSION_LABEL[s.sessionType] || 'Booked');
    const positionText = s.position ? ` · ${POSITION_LABEL[s.position] || ''}` : '';
    return `
      <div class="note-row" style="cursor:default;opacity:${isUpcoming ? '1' : '.6'};">
        <span class="ts" style="min-width:170px;">${fmtSessionDate(s.date, s.hour)}</span>
        <span class="txt">${statusLabel}${positionText}${s.note ? ' — ' + App.escapeHtml(s.note) : ''}</span>
      </div>
    `;
  }

  function filmRowHtml(f) {
    return `
      <div class="card film-card" data-film="${f.id}">
        <div class="thumb"><svg><use href="#icon-film"/></svg></div>
        <h4>${App.escapeHtml(f.title)}</h4>
        <div class="meta">${new Date(f.createdAt).toLocaleDateString()}</div>
      </div>
    `;
  }

  return { render };
})();
