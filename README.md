# Coaching Hub

A private coaching business app — drills library, scheduling, player
profiles, and film review — built as a plain HTML/CSS/JS site with **no
server and no hosting cost**. All data (schedule, drills, player profiles,
film video, and notes) is stored locally in your browser's IndexedDB.

## Running it

**Simplest — just open it:**
Double-click `index.html` and it opens in your browser. Everything works
except installing it as an offline app (browsers block that for `file://`
pages).

**To install it as an app (offline, icon on your home screen/desktop):**
Serve the folder over `http://localhost` with any free static server, e.g.:

```bash
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080` in Chrome/Edge and use the browser's
"Install app" option (or "Add to Home Screen" on mobile). No account,
no cloud, no monthly fee — the server only needs to run while you're
using it on that device.

## Data & backup

Everything is stored only in the browser you're using, on the device
you're using it on (there's no shared server, so a phone and a laptop
won't automatically see the same data). Use the **Backup** button in the
top-right of the nav bar to export a single JSON file you can save
anywhere (or import back in) — this also lets you move data to another
device or protect against accidentally clearing browser data.

## Tabs

- **Home** — launch pad to the four sections below.
- **Individual Drills** — soccer skills grouped Foundation → Intermediate
  → Advanced, each with a description and an optional video (paste a
  YouTube/Vimeo link or upload a file).
- **Scheduling** — a weekly calendar in 1-hour slots. Tap an open slot to
  book it (choosing Individual / Small Group / Large Group) or block it;
  tap a filled slot to view or cancel it.
- **About Me** — player roster: name, year of birth, town, club team, and
  high school team.
- **Film** — upload game/practice video, then add timestamped notes while
  reviewing; click a note to jump straight to that moment.
