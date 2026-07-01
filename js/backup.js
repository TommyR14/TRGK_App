/* Backup: export/import all local data as a single JSON file.
   Since everything lives only in this browser's IndexedDB, this is the
   only way to move data between devices or protect against clearing
   browser data. */

const Backup = (() => {
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(dataUrl) {
    return fetch(dataUrl).then((r) => r.blob());
  }

  async function exportData() {
    const data = {};
    for (const store of STORES) {
      const rows = await DB.getAll(store);
      for (const row of rows) {
        for (const key of Object.keys(row)) {
          if (row[key] instanceof Blob) {
            row[key] = { __blob: true, mime: row[key].type, data: await blobToBase64(row[key]) };
          }
        }
      }
      data[store] = rows;
    }
    data.exportedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coaching-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importData(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    for (const store of STORES) {
      if (!Array.isArray(data[store])) continue;
      await DB.clear(store);
      for (const row of data[store]) {
        for (const key of Object.keys(row)) {
          if (row[key] && row[key].__blob) {
            row[key] = await base64ToBlob(row[key].data);
          }
        }
        await DB.put(store, row);
      }
    }
  }

  function openPanel() {
    App.openModal(`
      <h3>Backup &amp; Restore</h3>
      <p style="color:var(--text-dim);font-size:13.5px;">All your data is stored only in this browser. Export a backup file regularly, especially before clearing browser data or switching devices.</p>
      <div class="modal-actions" style="justify-content:flex-start;">
        <button class="btn" id="exportBtn">Export Backup</button>
        <button class="btn secondary" id="importTrigger">Import Backup</button>
        <input type="file" id="importInput" accept="application/json" style="display:none;" />
      </div>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#exportBtn').addEventListener('click', async () => {
      await exportData();
      App.toast('Backup downloaded');
    });
    const input = modal.querySelector('#importInput');
    modal.querySelector('#importTrigger').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (!confirm('This will replace all current data with the contents of this backup. Continue?')) return;
      await importData(file);
      App.toast('Backup restored');
      App.closeModal();
      App.showTab(window.location.hash.replace('#', '') || 'home');
    });
  }

  return { openPanel };
})();
