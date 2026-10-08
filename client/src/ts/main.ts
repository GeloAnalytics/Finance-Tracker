import { initRouter, registerRoute } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderBudget } from './views/budget.js';
import { renderDebts } from './views/debts.js';
import { renderSavings } from './views/savings.js';
import { renderAdvisor } from './views/advisor.js';
import { renderBills } from './views/bills.js';
import { renderLoginScreen } from './views/login.js';
import { renderLandingScreen } from './views/landing.js';
import { checkSession, logout, User } from './auth.js';
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

  const icons: Record<string, string> = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.innerHTML = `<span style="font-weight:800; flex-shrink:0;">${icons[type]}</span><span>${message}</span>`;

  container.appendChild(toast);

  // Dismiss after 4 seconds (longer for error)
  const delay = type === 'error' ? 5000 : 3500;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, delay);
};

// Register Routes
registerRoute('dashboard', renderDashboard);
registerRoute('transactions', renderTransactions);
registerRoute('budget', renderBudget);
registerRoute('debts', renderDebts);
registerRoute('savings', renderSavings);
registerRoute('advisor', renderAdvisor);
registerRoute('bills', renderBills);

const setupLogout = (demo: boolean, user?: User) => {
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

  const userBadge = document.getElementById('sidebar-user-badge');
  if (userBadge) {
    if (demo) {
      userBadge.innerHTML = '👤 <strong>Demo Mode</strong>';
    } else if (user) {
      userBadge.innerHTML = `👤 <strong>${user.username}</strong><br/><span style="font-size: 0.75rem; color: var(--text-muted);">${user.email}</span>`;
    }
  }
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

  const startApp = (demo: boolean, user?: User) => {
    if (app) app.innerHTML = appShellHTML;
    setupMobileMenu();
    setupLogout(demo, user);
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
      onLogin: (tab) => renderLoginScreen((user) => {
        startApp(false, user);
      }, tab),
    });
  };

  if (isDemoMode()) {
    startApp(true);
    return;
  }

  const session = await checkSession();
  if (session.authenticated) {
    startApp(false, session.user);
  } else {
    showLanding();
  }
});
