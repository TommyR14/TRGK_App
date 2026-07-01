/* About Me tab: player profiles. Coach sees and manages everyone; a client
   sees and edits only their own profile (created during onboarding). */

const About = (() => {
  let cache = [];
  let editingId = null;

  async function render(container) {
    const isCoach = Auth.isCoach();
    cache = isCoach
      ? await DB.getAll('players')
      : await DB.getAllByIndex('players', 'ownerUid', Auth.currentUser().uid);
    cache.sort((a, b) => a.name.localeCompare(b.name));

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">About Me</h2>
          <p class="section-sub">${isCoach ? 'Player profiles for everyone you coach.' : 'Your player profile.'}</p>
        </div>
        ${isCoach ? `<button class="btn" id="addPlayerBtn"><svg><use href="#icon-plus"/></svg> Add Player</button>` : ''}
      </div>
      ${cache.length ? `<div class="player-grid">${cache.map((p) => cardHtml(p, isCoach)).join('')}</div>`
                     : `<div class="empty-state">No player profiles yet.</div>`}
    `;

    if (isCoach) container.querySelector('#addPlayerBtn').addEventListener('click', () => openForm());
    container.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => openForm(btn.dataset.edit)));
    container.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => remove(btn.dataset.del)));
  }

  function cardHtml(p, isCoach) {
    return `
      <div class="card player-card">
        <h4>${App.escapeHtml(p.name)}</h4>
        <div class="row"><span>Year of Birth</span><span>${App.escapeHtml(p.birthYear)}</span></div>
        <div class="row"><span>Town</span><span>${App.escapeHtml(p.town)}</span></div>
        <div class="row"><span>Club Team</span><span>${App.escapeHtml(p.clubTeam)}</span></div>
        <div class="row"><span>High School Team</span><span>${App.escapeHtml(p.hsTeam)}</span></div>
        <div class="card-actions">
          <button class="btn secondary small" data-edit="${p.id}">Edit</button>
          ${isCoach ? `<button class="btn danger small" data-del="${p.id}">Delete</button>` : ''}
        </div>
      </div>
    `;
  }

  async function openForm(id) {
    editingId = id || null;
    let p = id ? cache.find((x) => x.id === id) : null;
    if (id && !p) p = await DB.get('players', id); // cache may be cold if opened from Admin
    App.openModal(`
      <h3>${p ? 'Edit Player' : 'Add Player'}</h3>
      <form id="playerForm">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" required value="${p ? App.escapeHtml(p.name) : ''}" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Year of Birth</label>
            <input type="number" name="birthYear" min="1950" max="2100" required value="${p ? App.escapeHtml(p.birthYear) : ''}" />
          </div>
          <div class="field">
            <label>Town</label>
            <input type="text" name="town" value="${p ? App.escapeHtml(p.town) : ''}" />
          </div>
        </div>
        <div class="field">
          <label>Club Team</label>
          <input type="text" name="clubTeam" value="${p ? App.escapeHtml(p.clubTeam) : ''}" />
        </div>
        <div class="field">
          <label>High School Team</label>
          <input type="text" name="hsTeam" value="${p ? App.escapeHtml(p.hsTeam) : ''}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn">Save</button>
        </div>
      </form>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#playerForm').addEventListener('submit', onSubmit);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const record = {
      name: fd.get('name').trim(),
      birthYear: fd.get('birthYear'),
      town: fd.get('town').trim(),
      clubTeam: fd.get('clubTeam').trim(),
      hsTeam: fd.get('hsTeam').trim(),
    };
    if (editingId) {
      const existing = cache.find((x) => x.id === editingId);
      record.id = editingId;
      record.ownerUid = existing ? existing.ownerUid || null : null;
      await DB.put('players', record);
      App.toast('Player updated');
    } else {
      record.ownerUid = null;
      await DB.add('players', record);
      App.toast('Player added');
    }
    App.closeModal();
    render(document.getElementById('view-about'));
  }

  async function remove(id) {
    if (!confirm('Delete this player profile?')) return;
    await DB.delete('players', id);
    App.toast('Player deleted');
    render(document.getElementById('view-about'));
  }

  return { render, editPlayer: openForm };
})();
