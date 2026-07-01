/* Backup: export a point-in-time snapshot of all Firestore data as a JSON
   file. Firestore is now the source of truth (durable, synced across
   devices), so this is a disaster-recovery / personal-archive tool for the
   coach, not the primary way to move data around. Coach-only, since a full
   cross-player export doesn't fit a client's narrower read access anyway. */

const Backup = (() => {
  async function exportData() {
    const data = {};
    for (const store of STORES) {
      const rows = await DB.getAll(store);
      if (store === 'films') {
        for (const film of rows) {
          film.notes = await DB.getAll(`films/${film.id}/notes`);
        }
      }
      data[store] = rows;
    }
    data.exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaching-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function openPanel() {
    App.openModal(`
      <h3>Backup</h3>
      <p style="color:var(--text-dim);font-size:13.5px;">Downloads a snapshot of every player, session, drill, and film for your own records. Your live data is already stored durably in the cloud — this is just a personal archive, e.g. before making a big change.</p>
      <div class="modal-actions" style="justify-content:flex-start;">
        <button class="btn" id="exportBtn">Export Backup</button>
      </div>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#exportBtn').addEventListener('click', async () => {
      await exportData();
      App.toast('Backup downloaded');
    });
  }

  return { openPanel };
})();
