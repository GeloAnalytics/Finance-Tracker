import { login, register } from '../auth.js';

export function renderLoginScreen(onSuccess: () => void, initialTab: 'login' | 'register' = 'login') {
  const app = document.getElementById('app');
  if (!app) return;

  const loginDisplay = initialTab === 'login' ? 'display: flex;' : 'display: none;';
  const registerDisplay = initialTab === 'register' ? 'display: flex;' : 'display: none;';

  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card glass-card">
        <div class="logo login-logo">
          <span class="logo-icon">💰</span>
          <h1 class="logo-text">FinanceWise</h1>
        </div>

        <div class="auth-tabs">
          <button id="tab-login" class="auth-tab ${initialTab === 'login' ? 'active' : ''}">Log In</button>
          <button id="tab-register" class="auth-tab ${initialTab === 'register' ? 'active' : ''}">Create Account</button>
        </div>

        <!-- Login Form -->
        <form id="login-form" class="auth-form" style="${loginDisplay}">
          <p class="login-subtitle" id="login-subtitle">Welcome back! Sign in to access your financial dashboard.</p>

          <div class="form-group" id="identifier-group">
            <label class="form-label" for="login-identifier">Username or Email</label>
            <input
              type="text"
              id="login-identifier"
              class="form-input"
              placeholder="e.g. alex or alex@example.com"
              autocomplete="username"
              autofocus
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              class="form-input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="btn btn-primary login-submit" id="login-submit">Log In →</button>
          <p id="login-error" class="login-error" style="display:none;"></p>

          <p style="text-align:center; margin-top: var(--space-sm); font-size: var(--font-sm); color: var(--text-muted);">
            Have an older password-only account?
            <a href="#" id="toggle-owner-login" style="color: var(--accent-primary); text-decoration: none;">Use owner login</a>
          </p>
        </form>

        <!-- Register Form -->
        <form id="register-form" class="auth-form" style="${registerDisplay}">
          <p class="login-subtitle">Create your personal account to track finances privately.</p>

          <div class="form-group">
            <label class="form-label" for="register-username">Username</label>
            <input
              type="text"
              id="register-username"
              class="form-input"
              placeholder="e.g. alex"
              required
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="register-email">Email Address</label>
            <input
              type="email"
              id="register-email"
              class="form-input"
              placeholder="alex@example.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="register-password">Password (min 6 characters)</label>
            <input
              type="password"
              id="register-password"
              class="form-input"
              placeholder="••••••••"
              required
              minlength="6"
              autocomplete="new-password"
            />
          </div>

          <button type="submit" class="btn btn-primary login-submit" id="register-submit">Create Account →</button>
          <p id="register-error" class="login-error" style="display:none;"></p>
        </form>

        <div class="auth-footer">
          <button id="btn-back-landing" class="btn btn-ghost btn-sm">← Back to Home</button>
        </div>
      </div>
    </div>
  `;

  const tabLogin = document.getElementById('tab-login') as HTMLButtonElement;
  const tabRegister = document.getElementById('tab-register') as HTMLButtonElement;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const registerForm = document.getElementById('register-form') as HTMLFormElement;
  const backLandingBtn = document.getElementById('btn-back-landing') as HTMLButtonElement;

  const showTab = (tab: 'login' | 'register') => {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      (document.getElementById('login-identifier') as HTMLInputElement)?.focus();
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.style.display = 'flex';
      loginForm.style.display = 'none';
      (document.getElementById('register-username') as HTMLInputElement)?.focus();
    }
  };

  tabLogin?.addEventListener('click', () => showTab('login'));
  tabRegister?.addEventListener('click', () => showTab('register'));
  backLandingBtn?.addEventListener('click', () => window.location.reload());

  // ── Owner login toggle (password-only mode) ────────────────────────────────
  let ownerMode = false;
  const toggleLink = document.getElementById('toggle-owner-login') as HTMLAnchorElement;
  const identifierGroup = document.getElementById('identifier-group') as HTMLElement;
  const identifierInput = document.getElementById('login-identifier') as HTMLInputElement;
  const loginSubtitle = document.getElementById('login-subtitle') as HTMLElement;

  toggleLink?.addEventListener('click', (e) => {
    e.preventDefault();
    ownerMode = !ownerMode;
    if (ownerMode) {
      identifierGroup.style.display = 'none';
      identifierInput.value = '';
      loginSubtitle.textContent = 'Enter your owner password to sign in.';
      toggleLink.textContent = 'Use normal login';
    } else {
      identifierGroup.style.display = 'block';
      loginSubtitle.textContent = 'Welcome back! Sign in to access your financial dashboard.';
      toggleLink.textContent = 'Use owner login';
    }
  });

  // ── Login submission ───────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;
    const submitBtn = document.getElementById('login-submit') as HTMLButtonElement;
    const errorEl = document.getElementById('login-error') as HTMLElement;

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in…';

    try {
      // In owner mode, pass empty string as identifier — the server fallback handles it
      const identifier = ownerMode ? '' : identifierInput.value;
      await login(identifier, passwordInput.value);
      onSuccess();
    } catch (err: any) {
      errorEl.textContent = err.message || 'Login failed';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In →';
    }
  });

  // ── Register submission ────────────────────────────────────────────────────
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('register-username') as HTMLInputElement;
    const emailInput = document.getElementById('register-email') as HTMLInputElement;
    const passwordInput = document.getElementById('register-password') as HTMLInputElement;
    const submitBtn = document.getElementById('register-submit') as HTMLButtonElement;
    const errorEl = document.getElementById('register-error') as HTMLElement;

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      await register(usernameInput.value, emailInput.value, passwordInput.value);
      onSuccess();
    } catch (err: any) {
      errorEl.textContent = err.message || 'Registration failed';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account →';
    }
  });
}
