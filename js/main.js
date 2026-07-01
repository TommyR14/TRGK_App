/* Bootstraps the app once the DOM is ready. */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('backupBtn').addEventListener('click', () => Backup.openPanel());
  await Drills.seedIfEmpty();
  App.init();
});
