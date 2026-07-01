/* Bootstraps the app once the DOM is ready. Auth.init() takes over from
   here — it calls App.init() itself once a signed-in user's role (and, for
   clients, their linked player profile) has resolved. */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('backupBtn').addEventListener('click', () => Backup.openPanel());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      /* offline install just won't be available (e.g. opened via file://) */
    });
  }

  Auth.init();
});
