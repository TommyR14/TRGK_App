const Home = (() => {
  function render(container) {
    const isCoach = Auth.isCoach();
    container.innerHTML = `
      <div class="home-hero">
        <h1>${isCoach ? 'Welcome Back, Coach' : 'Welcome'}</h1>
        <p>${isCoach ? 'Everything for your training business, synced across all your devices.' : 'Your drills, schedule, and film — all in one place.'}</p>
      </div>
      <div class="home-grid">
        <div class="home-tile" data-tab="drills">
          <svg><use href="#icon-drills"/></svg>
          <div class="tile-label">Individual Drills</div>
          <div class="tile-desc">Foundation, intermediate &amp; advanced soccer skills with video and notes.</div>
        </div>
        <div class="home-tile" data-tab="scheduling">
          <svg><use href="#icon-schedule"/></svg>
          <div class="tile-label">Scheduling</div>
          <div class="tile-desc">${isCoach ? 'Your calendar plus open 1-hour training slots to book.' : 'Book an open 1-hour training slot.'}</div>
        </div>
        <div class="home-tile" data-tab="about">
          <svg><use href="#icon-about"/></svg>
          <div class="tile-label">About Me</div>
          <div class="tile-desc">${isCoach ? 'Player profiles — name, birth year, town, club & school teams.' : 'Your profile — name, birth year, town, club & school teams.'}</div>
        </div>
        <div class="home-tile" data-tab="film">
          <svg><use href="#icon-film"/></svg>
          <div class="tile-label">Film</div>
          <div class="tile-desc">${isCoach ? 'Add game film and add timestamped notes for review.' : 'Review your film and add your own notes.'}</div>
        </div>
        ${isCoach ? `
        <div class="home-tile" data-tab="admin">
          <svg><use href="#icon-admin"/></svg>
          <div class="tile-label">Admin</div>
          <div class="tile-desc">Every player's profile, sessions, and film in one merged view.</div>
        </div>` : ''}
      </div>
    `;
    container.querySelectorAll('.home-tile').forEach((tile) => {
      tile.addEventListener('click', () => App.goTo(tile.dataset.tab));
    });
  }
  return { render };
})();
