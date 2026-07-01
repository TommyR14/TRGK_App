/* Initializes the Firebase app and exposes short-hand handles used
   throughout the app: Fire.auth, Fire.db.

   Add ?emulator=1 to the URL while running locally (with `firebase
   emulators:start`) to point at the Firebase Local Emulator Suite instead
   of the real project — useful for testing without touching real data or
   burning quota. */

firebase.initializeApp(firebaseConfig);

const Fire = {
  auth: firebase.auth(),
  db: firebase.firestore(),
};

if (new URLSearchParams(window.location.search).get('emulator') === '1') {
  Fire.auth.useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
  Fire.db.useEmulator('127.0.0.1', 8080);
} else {
  Fire.db.enablePersistence({ synchronizeTabs: true }).catch(() => {
    /* offline persistence unavailable (private browsing, multiple tabs
       without synchronizeTabs support, etc.) — app still works online */
  });
}
