/* Login/signup gate + role resolution. Nothing else in the app renders
   until a signed-in user has a resolved role and (for clients) a linked
   player profile. */

const Auth = (() => {
  let mode = 'signin'; // 'signin' | 'signup'
  let role = null;     // 'coach' | 'client'
  let appStarted = false;

  function currentUser() {
    return Fire.auth.currentUser;
  }

  function isCoach() {
    return role === 'coach';
  }

  function screenEl() { return document.getElementById('authScreen'); }
  function cardEl() { return document.querySelector('.auth-card'); }

  function showAuthForm(errorMsg) {
    mode = mode === 'signup' ? mode : 'signin';
    cardEl().innerHTML = `
      <h1>Coaching Hub</h1>
      <p class="section-sub" id="authSubtitle">${mode === 'signup' ? 'Create your account.' : 'Sign in to view your drills, schedule, and film.'}</p>
      <form id="authForm">
        <div class="field">
          <label>Email</label>
          <input type="email" name="email" required autocomplete="email" />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" name="password" required autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="6" />
        </div>
        ${errorMsg ? `<div class="field"><div class="auth-error">${App.escapeHtml(errorMsg)}</div></div>` : ''}
        <button type="submit" class="btn" id="authSubmitBtn" style="width:100%;justify-content:center;">${mode === 'signup' ? 'Sign Up' : 'Sign In'}</button>
      </form>
      <button class="auth-toggle" id="authToggle">${mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button>
    `;
    screenEl().classList.add('open');
    document.getElementById('authToggle').addEventListener('click', () => {
      mode = mode === 'signup' ? 'signin' : 'signup';
      showAuthForm();
    });
    document.getElementById('authForm').addEventListener('submit', onAuthSubmit);
  }

  async function onAuthSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email').trim();
    const password = fd.get('password');
    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;
    try {
      if (mode === 'signup') {
        await Fire.auth.createUserWithEmailAndPassword(email, password);
      } else {
        await Fire.auth.signInWithEmailAndPassword(email, password);
      }
      /* onAuthStateChanged picks up from here */
    } catch (err) {
      btn.disabled = false;
      showAuthForm(friendlyAuthError(err));
    }
  }

  function friendlyAuthError(err) {
    const map = {
      'auth/email-already-in-use': 'That email already has an account — try signing in instead.',
      'auth/invalid-email': 'Enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/user-not-found': 'No account found with that email.',
      'auth/invalid-credential': 'Incorrect email or password.',
    };
    return map[err.code] || err.message || 'Something went wrong. Try again.';
  }

  function showOnboardingForm() {
    cardEl().innerHTML = `
      <h1>Welcome</h1>
      <p class="section-sub">Set up your player profile to get started. You can add more players (e.g. additional children) anytime from About Me.</p>
      <form id="onboardForm">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" required />
        </div>
        <div class="field-row">
          <div class="field">
            <label>Year of Birth</label>
            <input type="number" name="birthYear" min="1950" max="2100" required />
          </div>
          <div class="field">
            <label>Town</label>
            <input type="text" name="town" />
          </div>
        </div>
        <div class="field">
          <label>Club Team</label>
          <input type="text" name="clubTeam" />
        </div>
        <div class="field">
          <label>High School Team</label>
          <input type="text" name="hsTeam" />
        </div>
        <button type="submit" class="btn" style="width:100%;justify-content:center;">Save &amp; Continue</button>
      </form>
    `;
    document.getElementById('onboardForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await DB.add('players', {
        ownerUid: currentUser().uid,
        name: fd.get('name').trim(),
        birthYear: fd.get('birthYear'),
        town: fd.get('town').trim(),
        clubTeam: fd.get('clubTeam').trim(),
        hsTeam: fd.get('hsTeam').trim(),
      });
      enterApp();
    });
  }

  function enterApp() {
    screenEl().classList.remove('open');
    document.body.classList.toggle('role-coach', isCoach());
    if (!appStarted) {
      appStarted = true;
      App.init();
    } else {
      App.showTab(window.location.hash.replace('#', '') || 'home');
    }
  }

  async function resolveRoleAndEnter(user) {
    const userDoc = await Fire.db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      role = user.email === COACH_EMAIL ? 'coach' : 'client';
      await Fire.db.collection('users').doc(user.uid).set({
        email: user.email,
        role,
        createdAt: Date.now(),
      });
    } else {
      role = userDoc.data().role;
    }

    if (role === 'client') {
      const mine = await DB.getAllByIndex('players', 'ownerUid', user.uid);
      if (mine.length === 0) {
        showOnboardingForm();
        screenEl().classList.add('open');
        return;
      }
    }
    enterApp();
  }

  function init() {
    document.getElementById('signOutBtn').addEventListener('click', () => Fire.auth.signOut());
    Fire.auth.onAuthStateChanged((user) => {
      if (!user) {
        role = null;
        document.body.classList.remove('role-coach');
        document.getElementById('topbar').style.display = 'none';
        document.getElementById('app').style.display = 'none';
        showAuthForm();
        return;
      }
      document.getElementById('topbar').style.display = '';
      document.getElementById('app').style.display = '';
      resolveRoleAndEnter(user);
    });
  }

  return { init, currentUser, role: () => role, isCoach };
})();
