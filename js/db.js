/* Local-only persistence layer using IndexedDB.
   Everything lives in the browser on this device — no server, no hosting cost. */

const DB_NAME = 'coachHubDB';
const DB_VERSION = 1;
let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('players')) {
        db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('drills')) {
        const s = db.createObjectStore('drills', { keyPath: 'id', autoIncrement: true });
        s.createIndex('level', 'level', { unique: false });
      }
      if (!db.objectStoreNames.contains('schedule')) {
        const s = db.createObjectStore('schedule', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('films')) {
        db.createObjectStore('films', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('filmNotes')) {
        const s = db.createObjectStore('filmNotes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('filmId', 'filmId', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

function runTx(storeName, mode, work) {
  return openDatabase().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    Promise.resolve(work(store)).then((r) => { result = r; }).catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const DB = {
  add(store, value) {
    return runTx(store, 'readwrite', (s) => reqToPromise(s.add(value)));
  },
  put(store, value) {
    return runTx(store, 'readwrite', (s) => reqToPromise(s.put(value)));
  },
  get(store, id) {
    return runTx(store, 'readonly', (s) => reqToPromise(s.get(id)));
  },
  getAll(store) {
    return runTx(store, 'readonly', (s) => reqToPromise(s.getAll()));
  },
  getAllByIndex(store, indexName, value) {
    return runTx(store, 'readonly', (s) => reqToPromise(s.index(indexName).getAll(value)));
  },
  delete(store, id) {
    return runTx(store, 'readwrite', (s) => reqToPromise(s.delete(id)));
  },
  clear(store) {
    return runTx(store, 'readwrite', (s) => reqToPromise(s.clear()));
  },
};

const STORES = ['players', 'drills', 'schedule', 'films', 'filmNotes'];
