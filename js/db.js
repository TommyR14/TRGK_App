/* Firestore-backed persistence layer. Keeps the same DB.* method names the
   rest of the app already used with IndexedDB, so call sites barely
   changed — the one real difference is that IDs are now Firestore's
   auto-generated strings instead of IndexedDB autoincrement integers.
   `store` can be a plain collection name ('players') or a Firestore
   subcollection path ('films/abc123/notes') — both work with
   Fire.db.collection() as-is. */

function collRef(store) {
  return Fire.db.collection(store);
}

function snapshotToRows(snap) {
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

const DB = {
  async add(store, value) {
    const ref = await collRef(store).add(value);
    return ref.id;
  },
  async put(store, value) {
    const { id, ...data } = value;
    if (id) {
      await collRef(store).doc(id).set(data);
      return id;
    }
    const ref = await collRef(store).add(data);
    return ref.id;
  },
  async get(store, id) {
    const doc = await collRef(store).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : undefined;
  },
  async getAll(store) {
    const snap = await collRef(store).get();
    return snapshotToRows(snap);
  },
  async getAllByIndex(store, field, value) {
    const snap = await collRef(store).where(field, '==', value).get();
    return snapshotToRows(snap);
  },
  async delete(store, id) {
    await collRef(store).doc(id).delete();
  },
  async clear(store) {
    const snap = await collRef(store).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  },
  /* Live query. DB.watch('schedule', cb) watches the whole collection;
     DB.watch('schedule', 'date', '2026-07-01', cb) filters by field.
     Returns an unsubscribe function — callers must invoke it before
     re-subscribing (e.g. on re-render) to avoid piling up listeners. */
  watch(store, ...args) {
    const callback = args.pop();
    let query = collRef(store);
    if (args.length === 2) {
      const [field, value] = args;
      query = query.where(field, '==', value);
    }
    return query.onSnapshot((snap) => callback(snapshotToRows(snap)));
  },
};

const STORES = ['players', 'drills', 'schedule', 'films'];
