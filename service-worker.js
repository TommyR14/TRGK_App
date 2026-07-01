/* Caches the app shell so Coaching Hub keeps working offline once installed.
   All user data (schedule, drills, film, profiles) lives in Firestore, not
   here — this only caches the static files needed to boot the app UI.
   Firebase/Firestore/Auth requests are cross-origin, so the fetch handler's
   same-origin guard below already leaves them alone.

   Every same-origin fetch uses { cache: 'no-store' } to bypass the browser's
   own HTTP cache entirely (not just this service worker's Cache Storage) —
   without that, a network-first strategy can still silently serve a stale
   file if the browser/CDN's HTTP cache headers say it's still "fresh",
   which is what caused updates to sometimes need a manual cache-clear to
   show up right after a deploy. */

const CACHE_NAME = 'coaching-hub-v4';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/firebase-config.js',
  './js/firebase-init.js',
  './js/db.js',
  './js/app.js',
  './js/home.js',
  './js/drills.js',
  './js/scheduling.js',
  './js/about.js',
  './js/film.js',
  './js/admin.js',
  './js/backup.js',
  './js/auth.js',
  './js/main.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      SHELL_FILES.map((url) => fetch(url, { cache: 'no-store' }).then((res) => cache.put(url, res)))
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
