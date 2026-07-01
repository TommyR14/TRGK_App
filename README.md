# Coaching Hub

A private coaching business app — drills library, scheduling, player
profiles, and film review — built as a plain HTML/CSS/JS site (no build
step, no framework) hosted for free on GitHub Pages. Data lives in
[Firebase](https://firebase.google.com) (Authentication + Firestore) on the
free Spark tier, so it stays $0/month with no credit card required — video
is handled as a link (YouTube/Vimeo/direct URL) rather than a file upload,
specifically to avoid needing paid file storage.

## One-time setup (you only need to do this once)

1. Create a free project at https://console.firebase.google.com (no credit
   card needed).
2. In the project: **Authentication** → Sign-in method → enable
   **Email/Password**.
3. **Firestore Database** → Create database (production mode, any region).
4. **Project settings** → General → "Your apps" → add a **Web app** → copy
   the config object it gives you into `js/firebase-config.js` (replace the
   `REPLACE_ME` placeholders). Also set the `COACH_EMAIL` constant in that
   same file to your own login email — that's the account the app treats as
   the coach/admin.
5. **Firestore Database** → Rules → paste in the contents of
   `firestore.rules` (in this repo) → Publish.
6. Open the live site and sign up once using the same email you set as
   `COACH_EMAIL` — that becomes your coach account, with access to the
   Admin tab.
7. Run the one-time drill-library seed: open `js/migrate-drills.js` for
   instructions, or manually add a few drills via the Drills tab's "Add
   Drill" button.

Clients just visit the same URL and sign up with their own email — they
automatically get a client account scoped to their own profile.

## Running it locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Opening `index.html` directly via
`file://` mostly works too, but browsers block service worker registration
— and therefore offline/installable-app support — for `file://` pages.)

## Installing as a desktop or phone app

Once the site is live (GitHub Pages or `localhost`):
- **Desktop (Chrome/Edge)**: click the install icon in the address bar →
  Install.
- **iPhone (Safari)**: Share → Add to Home Screen.
- **Android (Chrome)**: menu → Install app.

## Roles

- **Coach** (the `COACH_EMAIL` account): full access — manages the Drills
  library, sees and manages every player's profile and the full calendar,
  and has the **Admin** tab, which merges any player's profile + all their
  sessions (past and future) + all their film in one view.
- **Client**: sees only their own About Me profile and film, can book/cancel
  their own calendar slots (shown live on the coach's calendar), can add
  their own timestamped film notes, and sees the Drills library read-only.
  Other clients' bookings show as a generic "Booked" label — never another
  client's name or details.

## Backup

The **Backup** button (coach only) downloads a JSON snapshot of everything
in Firestore, purely as a personal archive — Firestore itself is the durable
source of truth, this isn't required for normal use.

## Tabs

- **Home** — launch pad to the sections below.
- **Individual Drills** — soccer skills grouped Foundation → Intermediate →
  Advanced, each with a description and an optional video link.
- **Scheduling** — a weekly calendar in 1-hour slots, synced live. Tap an
  open slot to book it (Individual / Small Group / Large Group + position);
  coach can also block times or book on behalf of a walk-in.
- **About Me** — player profile: name, year of birth, town, club team, and
  high school team.
- **Film** — linked video per player, with timestamped review notes both
  coach and player can add.
- **Admin** (coach only) — every player, with their profile, sessions, and
  film merged into one view.
