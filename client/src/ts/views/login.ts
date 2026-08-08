import { login } from '../auth.js';

export function renderLoginScreen(onSuccess: () => void) {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="login-screen">
      <form id="login-form" class="login-card">
        <div class="logo login-logo">
          <span class="logo-icon">💰</span>
          <h1 class="logo-text">FinanceWise</h1>
        </div>
        <p class="login-subtitle">Enter your password to continue</p>
        <input
          type="password"
          id="login-password"
          class="form-input"
          placeholder="Password"
          required
          autocomplete="current-password"
          autofocus
        />
        <button type="submit" class="btn btn-primary login-submit" id="login-submit">Unlock</button>
        <p id="login-error" class="login-error" style="display:none;"></p>
      </form>
    </div>
  `;

  const form = document.getElementById('login-form') as HTMLFormElement;
  const input = document.getElementById('login-password') as HTMLInputElement;
  const btn = document.getElementById('login-submit') as HTMLButtonElement;
  const errEl = document.getElementById('login-error') as HTMLElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.style.display = 'none';
    btn.disabled = true;
    try {
      await login(input.value);
      onSuccess();
    } catch (err: any) {
      errEl.textContent = err.message || 'Login failed';
      errEl.style.display = 'block';
      input.value = '';
      input.focus();
    } finally {
      btn.disabled = false;
    }
  });
}
