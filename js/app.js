/* Core app shell: tab routing, modal helper, toast helper. */

const App = (() => {
  const TABS = ['home', 'drills', 'scheduling', 'about', 'film'];

  function showTab(tab) {
    if (!TABS.includes(tab)) tab = 'home';
    document.querySelectorAll('.tab-view').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    render(tab);
    window.scrollTo(0, 0);
  }

  function render(tab) {
    const el = document.getElementById('view-' + tab);
    if (tab === 'home') Home.render(el);
    if (tab === 'drills') Drills.render(el);
    if (tab === 'scheduling') Scheduling.render(el);
    if (tab === 'about') About.render(el);
    if (tab === 'film') Film.render(el);
  }

  function goTo(tab) {
    window.location.hash = tab;
  }

  function openModal(innerHTML) {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<button class="modal-close" data-close>' +
      '<svg><use href="#icon-close"/></svg></button>' + innerHTML;
    overlay.classList.add('open');
    modal.querySelector('[data-close]').addEventListener('click', closeModal);
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modal').innerHTML = '';
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function init() {
    document.getElementById('nav').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (btn) goTo(btn.dataset.tab);
    });

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'modalOverlay') closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    window.addEventListener('hashchange', () => {
      showTab(window.location.hash.replace('#', '') || 'home');
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        /* offline install just won't be available (e.g. opened via file://) */
      });
    }

    showTab(window.location.hash.replace('#', '') || 'home');
  }

  return { showTab, goTo, openModal, closeModal, toast, escapeHtml, init };
})();
