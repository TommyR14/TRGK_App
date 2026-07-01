/* Individual Drills tab: soccer skills library grouped by level, shared
   across everyone. The coach manages the library; clients get a read-only
   view. Videos are links (YouTube/Vimeo/direct URL) rather than uploads, so
   the library works the same on every device with no file storage needed. */

const Drills = (() => {
  const LEVELS = ['foundation', 'intermediate', 'advanced'];
  const LEVEL_LABEL = { foundation: 'Foundation', intermediate: 'Intermediate', advanced: 'Advanced' };

  const SEED = [
    // Foundation
    ['foundation', 'Inside-of-Foot Push Pass', 'The bread-and-butter pass. Lock the ankle, strike through the ball\'s midline with the inside of the foot, and follow through toward the target.'],
    ['foundation', 'First Touch / Ball Control', 'Cushion the ball on receipt by relaxing the receiving surface (foot, thigh, chest) to kill its speed and set up your next move in one motion.'],
    ['foundation', 'Dribbling with Both Feet', 'Small touches with the inside and outside of each foot while walking, then jogging, keeping the ball within a stride\'s reach at all times.'],
    ['foundation', 'Cone Dribbling (Slalom)', 'Weave through a line of cones using alternating feet, focusing on close control and head-up scanning between touches.'],
    ['foundation', 'Basic Juggling', 'Drop the ball and keep it off the ground using feet, thighs, and head. Start with two touches and let it bounce, building toward continuous juggling.'],
    ['foundation', 'Introduction to Shooting (Laces Strike)', 'Plant the non-kicking foot beside the ball, strike through the center with the shoelaces, and follow through toward the target.'],
    ['foundation', 'Basic Defensive Stance', 'Stay on the balls of the feet, knees bent, body angled to show the attacker away from goal, and shuffle rather than cross the feet.'],
    ['foundation', 'Throw-In Fundamentals', 'Both feet on the ground, ball behind the head with both hands, releasing evenly overhead to stay legal and accurate.'],
    ['foundation', 'Basic Passing Accuracy Gates', 'Set up small "gates" made of cones and practice passing the ball through them from increasing distances to build accuracy.'],
    // Intermediate
    ['intermediate', 'Inside/Outside Cut (Change of Direction)', 'Drag the ball across the body with the inside or outside of the foot to shift direction quickly and lose a marker.'],
    ['intermediate', 'Step-Over Move', 'Circle a foot around and over the top of the ball without touching it, selling the fake before pushing off in the real direction.'],
    ['intermediate', 'One-Touch Passing', 'Receive and pass in a single motion, opening the hips before the ball arrives so the touch can go straight to the next target.'],
    ['intermediate', 'Receiving on the Half-Turn', 'Check away from the ball, then receive across the body so the first touch faces you up the field instead of backward.'],
    ['intermediate', 'Driven Long Pass', 'Strike through the lower-center of the ball with the laces and a firm ankle to keep a long ball flat and driven rather than floated.'],
    ['intermediate', 'Volley Striking Technique', 'Get the body over the ball, keep the eyes down, and strike through the middle in one continuous motion as the ball is still in the air.'],
    ['intermediate', '1v1 Attacking Moves', 'Combine a change of pace with a body feint to beat a defender in a straight matchup, then accelerate away from the encounter.'],
    ['intermediate', 'Defensive Jockeying & Tackling', 'Stay compact and patient while jockeying, waiting for the attacker\'s heavy touch before committing to a block tackle.'],
    ['intermediate', 'Give-and-Go Combination Play', 'Pass to a teammate and immediately sprint into space to receive the return pass, beating a defender through movement rather than dribbling.'],
    // Advanced
    ['advanced', 'Cruyff Turn', 'Fake the pass or shot, then drag the ball behind the standing leg with the inside of the foot to spin away from pressure.'],
    ['advanced', 'Rabona Technique', 'Wrap the kicking leg behind the standing leg to strike the ball, used to bend a pass or shot around an unexpected angle.'],
    ['advanced', 'Elastico (Flip-Flap)', 'Push the ball out with the outside of the foot, then snap it back in with the inside in one rapid motion to blow past a defender.'],
    ['advanced', 'Bending Free Kicks', 'Strike the outside or inside half of the ball with pace and a wiping follow-through to generate curve around a defensive wall.'],
    ['advanced', 'Advanced Juggling Combinations', 'Chain touches across feet, thighs, chest, and head without letting the ball drop, working toward full-body control under fatigue.'],
    ['advanced', 'Reading the Game / Positional Awareness', 'Scan before every touch to track teammates, opponents, and space, making decisions before the ball arrives rather than after.'],
    ['advanced', 'Advanced 1v1 Finishing Under Pressure', 'Combine a quick change of direction with a disguised finish, shooting across the goalkeeper\'s body under a tight recovery run.'],
    ['advanced', 'Rondo Possession Drills', 'Keep the ball in a tight grid against defenders in the middle, forcing one- and two-touch decisions under real pressure.'],
  ];

  let cache = [];
  let editingId = null;

  function toEmbedUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
        return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
      }
      if (u.hostname === 'youtu.be') {
        return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
      }
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').filter(Boolean).pop();
        return `https://player.vimeo.com/video/${id}`;
      }
    } catch (e) { /* not a valid URL */ }
    return null;
  }

  function videoMarkup(videoUrl) {
    if (videoUrl) {
      const embed = toEmbedUrl(videoUrl);
      if (embed) return `<div class="drill-video"><iframe src="${embed}" allowfullscreen></iframe></div>`;
      return `<div class="drill-video"><video src="${App.escapeHtml(videoUrl)}" controls preload="metadata"></video></div>`;
    }
    return `<div class="drill-video empty">No video added yet</div>`;
  }

  async function render(container) {
    const isCoach = Auth.isCoach();
    cache = await DB.getAll('drills');
    const groups = LEVELS.map((lvl) => ({
      level: lvl,
      items: cache.filter((d) => d.level === lvl),
    }));

    container.innerHTML = `
      <div class="toolbar">
        <div>
          <h2 class="section-title">Individual Drills</h2>
          <p class="section-sub">Foundation through advanced soccer skills — scroll to browse by level.</p>
        </div>
        ${isCoach ? `<button class="btn" id="addDrillBtn"><svg><use href="#icon-plus"/></svg> Add Drill</button>` : ''}
      </div>
      ${groups.map((g) => `
        <div class="level-block">
          <div class="level-heading">
            <span class="level-badge ${g.level}">${LEVEL_LABEL[g.level]}</span>
            <h3>${LEVEL_LABEL[g.level]} Skills</h3>
          </div>
          ${g.items.length ? `<div class="drill-grid">${g.items.map((d) => cardHtml(d, isCoach)).join('')}</div>`
                            : `<div class="empty-state">No drills added at this level yet.</div>`}
        </div>
      `).join('')}
    `;

    if (isCoach) {
      container.querySelector('#addDrillBtn').addEventListener('click', () => openForm());
      container.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => openForm(btn.dataset.edit));
      });
      container.querySelectorAll('[data-del]').forEach((btn) => {
        btn.addEventListener('click', () => removeDrill(btn.dataset.del));
      });
    }
  }

  function cardHtml(d, isCoach) {
    return `
      <div class="card drill-card">
        ${videoMarkup(d.videoUrl)}
        <h4>${App.escapeHtml(d.title)}</h4>
        <p>${App.escapeHtml(d.description)}</p>
        ${isCoach ? `
        <div class="card-actions">
          <button class="btn secondary small" data-edit="${d.id}">Edit</button>
          <button class="btn danger small" data-del="${d.id}">Delete</button>
        </div>` : ''}
      </div>
    `;
  }

  function openForm(id) {
    editingId = id || null;
    const drill = id ? cache.find((d) => d.id === id) : null;
    App.openModal(`
      <h3>${drill ? 'Edit Drill' : 'Add Drill'}</h3>
      <form id="drillForm">
        <div class="field">
          <label>Skill Title</label>
          <input type="text" name="title" required value="${drill ? App.escapeHtml(drill.title) : ''}" />
        </div>
        <div class="field">
          <label>Level</label>
          <select name="level">
            ${LEVELS.map((l) => `<option value="${l}" ${drill && drill.level === l ? 'selected' : ''}>${LEVEL_LABEL[l]}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" required>${drill ? App.escapeHtml(drill.description) : ''}</textarea>
        </div>
        <div class="field">
          <label>Video Link (YouTube, Vimeo, or direct URL — optional)</label>
          <input type="url" name="videoUrl" placeholder="https://..." value="${drill && drill.videoUrl ? App.escapeHtml(drill.videoUrl) : ''}" />
        </div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn">Save Drill</button>
        </div>
      </form>
    `);
    const modal = document.getElementById('modal');
    modal.querySelector('[data-close]').addEventListener('click', App.closeModal);
    modal.querySelector('#drillForm').addEventListener('submit', onSubmit);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const record = {
      title: fd.get('title').trim(),
      level: fd.get('level'),
      description: fd.get('description').trim(),
      videoUrl: fd.get('videoUrl').trim(),
      createdAt: Date.now(),
    };

    if (editingId) {
      record.id = editingId;
      await DB.put('drills', record);
      App.toast('Drill updated');
    } else {
      await DB.add('drills', record);
      App.toast('Drill added');
    }
    App.closeModal();
    render(document.getElementById('view-drills'));
  }

  async function removeDrill(id) {
    if (!confirm('Delete this drill?')) return;
    await DB.delete('drills', id);
    App.toast('Drill deleted');
    render(document.getElementById('view-drills'));
  }

  return { render, toEmbedUrl, SEED };
})();
