import { initRouter, registerRoute } from './router.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTransactions } from './views/transactions.js';
import { renderBudget } from './views/budget.js';
import { renderDebts } from './views/debts.js';
import { renderSavings } from './views/savings.js';
import { renderAdvisor } from './views/advisor.js';

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

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  initRouter();
});
