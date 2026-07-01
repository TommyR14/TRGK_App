/* One-time drill library seed. NOT loaded by index.html and NOT cached by
   the service worker — this is a manual tool, not part of the shipped app.

   Why: Drills used to auto-seed on every app boot when they lived in
   IndexedDB (one device, one copy). Now the drill library is shared in
   Firestore across every coach and client, so seeding on every boot would
   have every simultaneous first-time visitor race to insert duplicates.
   Run this exactly once instead.

   How to run it:
   1. Open the live app in your browser and sign in as the coach.
   2. Open DevTools (F12 or Cmd+Option+I) → Console tab.
   3. Copy this entire file's contents, paste into the console, press Enter.
   4. Check the Drills tab — you should see the full seeded library appear. */

(async () => {
  const existing = await DB.getAll('drills');
  if (existing.length > 0) {
    console.log(`Drills collection already has ${existing.length} item(s) — skipping seed. Delete them first if you want to reseed.`);
    return;
  }
  for (const [level, title, description] of Drills.SEED) {
    await DB.add('drills', { level, title, description, videoUrl: '', createdAt: Date.now() });
  }
  console.log(`Seeded ${Drills.SEED.length} drills into Firestore.`);
})();
