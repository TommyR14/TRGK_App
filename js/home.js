const Home = (() => {
  function render(container) {
    container.innerHTML = `
      <div class="home-hero">
        <h1>Welcome Back, Coach</h1>
        <p>Everything for your training business lives right here on this device — no account, no monthly hosting bill.</p>
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
          <div class="tile-desc">Your calendar plus open 1-hour training slots to book.</div>
        </div>
        <div class="home-tile" data-tab="about">
          <svg><use href="#icon-about"/></svg>
          <div class="tile-label">About Me</div>
          <div class="tile-desc">Player profiles — name, birth year, town, club &amp; school teams.</div>
        </div>
        <div class="home-tile" data-tab="film">
          <svg><use href="#icon-film"/></svg>
          <div class="tile-label">Film</div>
          <div class="tile-desc">Upload game film and add timestamped notes for review.</div>
        </div>
      </div>
    `;
    container.querySelectorAll('.home-tile').forEach((tile) => {
      tile.addEventListener('click', () => App.goTo(tile.dataset.tab));
    });
  }
  return { render };
})();
