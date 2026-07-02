/* Scheduling tab: weekly calendar in 1-hour increments, synced live via
   Firestore. Coach sees and manages the full calendar. Clients see the same
   grid (so they can find an open slot) but can only book/cancel their own
   sessions, and other clients' bookings show as a generic "Booked" label
   rather than revealing who booked them. */

const Scheduling = (() => {
  const START_HOUR = 7;   // 7 AM
  const END_HOUR = 21;    // last slot starts 8 PM, ends 9 PM
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SESSION_LABEL = { individual: 'Individual', small: 'Small Group', large: 'Large Group' };
  const POSITION_LABEL = { forward: 'Forward', midfielder: 'Midfielder', defender: 'Defender', goalkeeper: 'Goalkeeper', other: 'Other' };

  let weekStart = sundayOf(new Date());
  let allRows = [];
  let slotsByKey = {};
  let unsubscribe = null;
  let players = [];

  function sundayOf(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function fmtHour(h) {
    const period = h < 12 ? 'AM' : 'PM';
    let hr = h % 12;
    if (hr === 0) hr = 12;
    return `${hr}:00 ${period}`;
  }

  function weekDates() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function ensureLiveSync() {
    if (unsubscribe) return;
    unsubscribe = DB.watch('schedule', (rows) => {
      allRows = rows;
      const view = document.getElementById('view-scheduling');
      if (view && view.classList.contains('active')) renderGrid(view);
    });
  }

  function rebuildSlotsByKey() {
    slotsByKey = {};
    allRows.forEach((r) => { slotsByKey[`${r.date}_${r.hour}`] = r; });
  }

  async function render(container) {
    ensureLiveSync();
    players = Auth.isCoach()
      ? await DB.getAll('players')
      : await DB.getAllByIndex('players', 'ownerUid', Auth.currentUser().uid);
    renderGrid(container);
  }

  function renderGrid(container) {
    rebuildSlotsByKey();
    const dates = weekDates();
    const hours = [];
    for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Scheduling</h2>
          <p class="section-sub">${Auth.isCoach() ? 'Tap an open slot to book a session, or an existing slot to view/edit it.' : 'Tap an open slot to book your session.'}</p>
        </div>
      </div>
      <div class="week-nav">
        <button class="btn secondary small" id="prevWeek">&larr; Prev</button>
        <button class="btn secondary small" id="todayBtn">Today</button>
        <button class="btn secondary small" id="nextWeek">Next &rarr;</button>
        <span class="week-label">${fmtRange(dates)}</span>
      </div>
      <div class="sched-scroll">
        <div class="sched-grid">
          <div class="head-cell"></div>
          ${dates.map((d) => `
            <div class="head-cell">
              ${DAY_NAMES[d.getDay()]}<br/><span class="d">${d.getMonth() + 1}/${d.getDate()}</span>
            </div>
          `).join('')}
          ${hours.map((h) => `
            <div class="time-cell">${fmtHour(h)}</div>
            ${dates.map((d) => slotCell(d, h)).join('')}
          `).join('')}
        </div>
      </div>
    `;

    container.querySelector('#prevWeek').addEventListener('click', () => shiftWeek(-7));
    container.querySelector('#nextWeek').addEventListener('click', () => shiftWeek(7));
    container.querySelector('#todayBtn').addEventListener('click', () => { weekStart = sundayOf(new Date()); renderGrid(container); });
    container.querySelectorAll('.slot-cell').forEach((cell) => {
      cell.addEventListener('click', () => onSlotClick(cell.dataset.date, Number(cell.dataset.hour)));
    });

    function shiftWeek(days) {
      weekStart.setDate(weekStart.getDate() + days);
      renderGrid(container);
    }
  }

  function fmtRange(dates) {
    const first = dates[0], last = dates[6];
    const opts = { month: 'short', day: 'numeric' };
    return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, opts)}, ${last.getFullYear()}`;
  }

  function isMine(rec) {
    return rec.clientUid && rec.clientUid === Auth.currentUser().uid;
  }

  function isPast(dateStr, hour) {
    const slotStart = new Date(`${dateStr}T00:00:00`);
    slotStart.setHours(hour, 0, 0, 0);
    return slotStart.getTime() <= Date.now();
  }

  function slotCell(date, hour) {
    const dateStr = fmtDate(date);
    const key = `${dateStr}_${hour}`;
    const rec = slotsByKey[key];
    const status = rec ? rec.status : 'open';
    const past = isPast(dateStr, hour);
    const canSeeDetail = rec && (Auth.isCoach() || isMine(rec));
    let inner = 'Open';
    if (status === 'booked') {
      if (canSeeDetail) {
        const positionText = rec.position ? ` · ${POSITION_LABEL[rec.position] || ''}` : '';
        inner = `<div class="slot-title">${App.escapeHtml(rec.clientName || 'Booked')}</div><div class="slot-type">${SESSION_LABEL[rec.sessionType] || ''}${positionText}</div>`;
      } else {
        inner = `<div class="slot-title">Booked</div>`;
      }
    } else if (status === 'blocked') {
      inner = `<div class="slot-title">Blocked</div>`;
    } else if (past) {
      inner = '';
    }
    return `<div class="slot-cell ${status}${past ? ' past' : ''}" data-date="${dateStr}" data-hour="${hour}">${inner}</div>`;
  }

  function onSlotClick(date, hour) {
    const key = `${date}_${hour}`;
    const rec = slotsByKey[key];
    if (!rec) {
      if (isPast(date, hour)) { App.toast('That time has already passed'); return; }
      return openBookingForm(date, hour);
    }
    if (rec.status === 'booked') {
      if (Auth.isCoach() || isMine(rec)) return openDetail(rec);
      App.toast('This time is already booked');
      return;
    }
    if (rec.status === 'blocked') {
      if (Auth.isCoach()) return openBlockedDetail(rec);
      App.toast('This time is unavailable');
    }
  }

  function openBookingForm(date, hour) {
    const isCoach = Auth.isCoach();
    if (players.length === 0) {
      App.openModal(`
        <h3>Book ${fmtHour(hour)} · ${date}</h3>
        <p style="color:var(--text-dim)">Add a player under About Me first — every session needs to be linked to a player.</p>
      `);
      const modal = document.getElementById('modal');
      modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
      return;
    }
    App.openModal(`
      <h3>Book ${fmtHour(hour)} · ${date}</h3>
      <form id="bookForm">
        <div class="field">
          <label>Player</label>
          <select name="playerId" required>
            ${players.map((p) => `<option value="${p.id}">${App.escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Session Type</label>
          <select name="sessionType">
            <option value="individual">Individual</option>
            <option value="small">Small Group</option>
            <option value="large">Large Group</option>
          </select>
        </div>
        <div class="field">
          <label>Position</label>
          <select name="position">
            <option value="forward">Forward</option>
            <option value="midfielder">Midfielder</option>
            <option value="defender">Defender</option>
            <option value="goalkeeper">Goalkeeper</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div class="field">
          <label>Note</label>
          <textarea name="note" placeholder="Optional"></textarea>
        </div>
        <div class="modal-actions">
          ${isCoach ? `<button type="button" class="btn secondary" id="blockBtn">Block This Time</button>` : ''}
          <button type="submit" class="btn">Book Session</button>
        </div>
      </form>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#bookForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const player = players.find((p) => p.id === fd.get('playerId'));
      const record = {
        date, hour, status: 'booked',
        sessionType: fd.get('sessionType'),
        position: fd.get('position'),
        note: fd.get('note').trim(),
        createdAt: Date.now(),
        clientName: player ? player.name : '',
        playerId: player ? player.id : null,
        clientUid: isCoach ? (player ? player.ownerUid || null : null) : Auth.currentUser().uid,
      };
      await DB.add('schedule', record);
      App.toast('Session booked');
      App.closeModal();
    });
    if (isCoach) {
      modal.querySelector('#blockBtn').addEventListener('click', async () => {
        await DB.add('schedule', { date, hour, status: 'blocked', sessionType: '', position: '', clientName: '', note: '', playerId: null, clientUid: null, createdAt: Date.now() });
        App.toast('Time blocked');
        App.closeModal();
      });
    }
  }

  function openDetail(rec) {
    const canCancel = Auth.isCoach() || isMine(rec);
    App.openModal(`
      <h3>${fmtHour(rec.hour)} · ${rec.date}</h3>
      <div class="field"><label>Session Type</label><div>${SESSION_LABEL[rec.sessionType] || '—'}</div></div>
      <div class="field"><label>Position</label><div>${POSITION_LABEL[rec.position] || '—'}</div></div>
      <div class="field"><label>Player</label><div>${App.escapeHtml(rec.clientName) || '—'}</div></div>
      <div class="field"><label>Note</label><div>${App.escapeHtml(rec.note) || '—'}</div></div>
      ${canCancel ? `<div class="modal-actions"><button class="btn danger" id="cancelSlot">Cancel Booking</button></div>` : ''}
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    if (canCancel) {
      modal.querySelector('#cancelSlot').addEventListener('click', async () => {
        await DB.delete('schedule', rec.id);
        App.toast('Booking removed');
        App.closeModal();
      });
    }
  }

  function openBlockedDetail(rec) {
    App.openModal(`
      <h3>${fmtHour(rec.hour)} · ${rec.date}</h3>
      <p style="color:var(--text-dim)">This time is marked unavailable.</p>
      <div class="modal-actions">
        <button class="btn secondary" id="reopenSlot">Reopen This Time</button>
      </div>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#reopenSlot').addEventListener('click', async () => {
      await DB.delete('schedule', rec.id);
      App.toast('Time reopened');
      App.closeModal();
    });
  }

  return { render };
})();
