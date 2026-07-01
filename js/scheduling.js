/* Scheduling tab: coach's weekly calendar in 1-hour increments.
   Each slot is Open (bookable), Booked (with a session-type preference),
   or Blocked (coach unavailable). All data is local to this device. */

const Scheduling = (() => {
  const START_HOUR = 7;   // 7 AM
  const END_HOUR = 21;    // last slot starts 8 PM, ends 9 PM
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const SESSION_LABEL = { individual: 'Individual', small: 'Small Group', large: 'Large Group' };

  let weekStart = mondayOf(new Date());
  let slotsByKey = {};

  function mondayOf(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
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

  async function loadWeekSlots() {
    slotsByKey = {};
    const dates = weekDates();
    for (const d of dates) {
      const rows = await DB.getAllByIndex('schedule', 'date', fmtDate(d));
      rows.forEach((r) => { slotsByKey[`${r.date}_${r.hour}`] = r; });
    }
  }

  async function render(container) {
    await loadWeekSlots();
    const dates = weekDates();
    const hours = [];
    for (let h = START_HOUR; h < END_HOUR; h++) hours.push(h);
    const todayStr = fmtDate(new Date());

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Scheduling</h2>
          <p class="section-sub">Tap an open slot to book a session, or an existing slot to view/edit it.</p>
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
            <div class="head-cell${fmtDate(d) === todayStr ? '' : ''}">
              ${DAY_NAMES[(d.getDay() + 6) % 7]}<br/><span class="d">${d.getMonth() + 1}/${d.getDate()}</span>
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
    container.querySelector('#todayBtn').addEventListener('click', () => { weekStart = mondayOf(new Date()); render(container); });
    container.querySelectorAll('.slot-cell').forEach((cell) => {
      cell.addEventListener('click', () => onSlotClick(cell.dataset.date, Number(cell.dataset.hour)));
    });

    function shiftWeek(days) {
      weekStart.setDate(weekStart.getDate() + days);
      render(container);
    }
  }

  function fmtRange(dates) {
    const first = dates[0], last = dates[6];
    const opts = { month: 'short', day: 'numeric' };
    return `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, opts)}, ${last.getFullYear()}`;
  }

  function slotCell(date, hour) {
    const key = `${fmtDate(date)}_${hour}`;
    const rec = slotsByKey[key];
    const status = rec ? rec.status : 'open';
    let inner = 'Open';
    if (status === 'booked') {
      inner = `<div class="slot-title">${App.escapeHtml(rec.clientName || 'Booked')}</div><div class="slot-type">${SESSION_LABEL[rec.sessionType] || ''}</div>`;
    } else if (status === 'blocked') {
      inner = `<div class="slot-title">Blocked</div>`;
    }
    return `<div class="slot-cell ${status}" data-date="${fmtDate(date)}" data-hour="${hour}">${inner}</div>`;
  }

  function onSlotClick(date, hour) {
    const key = `${date}_${hour}`;
    const rec = slotsByKey[key];
    if (!rec) openBookingForm(date, hour);
    else if (rec.status === 'booked') openDetail(rec);
    else if (rec.status === 'blocked') openBlockedDetail(rec);
  }

  function openBookingForm(date, hour) {
    App.openModal(`
      <h3>Book ${fmtHour(hour)} · ${date}</h3>
      <form id="bookForm">
        <div class="field">
          <label>Session Type</label>
          <select name="sessionType">
            <option value="individual">Individual</option>
            <option value="small">Small Group</option>
            <option value="large">Large Group</option>
          </select>
        </div>
        <div class="field">
          <label>Client / Player Name</label>
          <input type="text" name="clientName" placeholder="Optional" />
        </div>
        <div class="field">
          <label>Note</label>
          <textarea name="note" placeholder="Optional"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="blockBtn">Block This Time</button>
          <button type="submit" class="btn">Book Session</button>
        </div>
      </form>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#bookForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await DB.add('schedule', {
        date, hour, status: 'booked',
        sessionType: fd.get('sessionType'),
        clientName: fd.get('clientName').trim(),
        note: fd.get('note').trim(),
        createdAt: Date.now(),
      });
      App.toast('Session booked');
      App.closeModal();
      render(document.getElementById('view-scheduling'));
    });
    modal.querySelector('#blockBtn').addEventListener('click', async () => {
      await DB.add('schedule', { date, hour, status: 'blocked', sessionType: '', clientName: '', note: '', createdAt: Date.now() });
      App.toast('Time blocked');
      App.closeModal();
      render(document.getElementById('view-scheduling'));
    });
  }

  function openDetail(rec) {
    App.openModal(`
      <h3>${fmtHour(rec.hour)} · ${rec.date}</h3>
      <div class="field"><label>Session Type</label><div>${SESSION_LABEL[rec.sessionType] || '—'}</div></div>
      <div class="field"><label>Client / Player</label><div>${App.escapeHtml(rec.clientName) || '—'}</div></div>
      <div class="field"><label>Note</label><div>${App.escapeHtml(rec.note) || '—'}</div></div>
      <div class="modal-actions">
        <button class="btn danger" id="cancelSlot">Cancel Booking</button>
      </div>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#cancelSlot').addEventListener('click', async () => {
      await DB.delete('schedule', rec.id);
      App.toast('Booking removed');
      App.closeModal();
      render(document.getElementById('view-scheduling'));
    });
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
      render(document.getElementById('view-scheduling'));
    });
  }

  return { render };
})();
