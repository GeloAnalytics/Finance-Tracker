import { initRouter, registerRoute } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderBudget } from './views/budget.js';
import { renderDebts } from './views/debts.js';
import { renderSavings } from './views/savings.js';
import { renderAdvisor } from './views/advisor.js';
import { renderLoginScreen } from './views/login.js';
import { renderLandingScreen } from './views/landing.js';
import { checkSession, logout } from './auth.js';
import { initCalculator } from './calculator.js';
import { isDemoMode, enterDemoMode, exitDemoMode } from './demo/demo-state.js';

// Setup Mobile Menu Toggle
const setupMobileMenu = () => {
  const menuToggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
};

// Global Toast utility
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// Register Routes
registerRoute('dashboard', renderDashboard);
registerRoute('transactions', renderTransactions);
registerRoute('budget', renderBudget);
registerRoute('debts', renderDebts);
registerRoute('savings', renderSavings);
registerRoute('advisor', renderAdvisor);

const setupLogout = (demo: boolean) => {
  const btn = document.getElementById('btn-logout');
  if (btn) btn.textContent = demo ? 'Exit Demo' : 'Log out';
  btn?.addEventListener('click', async () => {
    if (demo) {
      exitDemoMode();
    } else {
      await logout();
    }
    window.location.reload();
  });
};

// Injects a persistent "you're in the demo" banner into the app shell. Placed
// inside #main-content (not #page-container), so it survives route changes —
// the router only ever rewrites #page-container's innerHTML.
const injectDemoBanner = () => {
  const mainContent = document.getElementById('main-content');
  if (!mainContent || document.getElementById('demo-banner')) return;
  mainContent.insertAdjacentHTML('afterbegin', `
    <div id="demo-banner" class="demo-banner">
      <span>🎭 <strong>Demo Mode</strong> — sample data only, nothing here is saved to a real account.</span>
      <button id="btn-exit-demo-banner" class="btn btn-ghost btn-sm">Exit Demo</button>
    </div>
  `);
  document.getElementById('btn-exit-demo-banner')?.addEventListener('click', () => {
    exitDemoMode();
    window.location.reload();
  });
};

// Initialize Application — gated behind an authenticated session (or demo mode)
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  const appShellHTML = app?.innerHTML || '';

  const startApp = (demo: boolean) => {
    if (app) app.innerHTML = appShellHTML;
    setupMobileMenu();
    setupLogout(demo);
    initCalculator();
    initRouter();
    if (demo) injectDemoBanner();
  };

  const showLanding = () => {
    renderLandingScreen({
      onTryDemo: () => {
        enterDemoMode();
        startApp(true);
      },
      onLogin: () => renderLoginScreen(() => startApp(false)),
    });
  };

  if (isDemoMode()) {
    startApp(true);
    return;
  }

  const authenticated = await checkSession();
  if (authenticated) {
    startApp(false);
  } else {
    showLanding();
  }
});
