import { api } from '../api.js';
import { showToast } from '../main.js';

export const renderBudget = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Budget Management</h2>
        <p class="page-subtitle">Master the 50/30/20 rule and track your monthly spending limits.</p>
      </div>
    </div>

    <div class="stats-grid animate-in stagger-2" id="budget-summary">
      <div class="glass-card stat-card income">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Projected Income</div>
        <div class="stat-value" id="budget-income">Loading...</div>
      </div>
      <div class="glass-card stat-card balance" style="grid-column: span 2;">
        <h3 style="margin-bottom: var(--space-md);">50/30/20 Breakdown</h3>
        <div class="progress-bar" style="height: 16px; display: flex; background: transparent;">
          <div id="bar-needs" style="width: 50%; background: #ffffff; transition: width 0.5s ease;"></div>
          <div id="bar-wants" style="width: 30%; background: #888888; transition: width 0.5s ease;"></div>
          <div id="bar-savings" style="width: 20%; background: #444444; transition: width 0.5s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: var(--space-sm); font-size: var(--font-sm);">
          <span style="color: #ffffff; font-weight: 600;">Needs (50%)</span>
          <span style="color: #888888; font-weight: 600;">Wants (30%)</span>
          <span style="color: #444444; font-weight: 600;">Savings (20%)</span>
        </div>
      </div>
    </div>

    <div class="glass-card animate-in stagger-3">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xl);">
        <h3>Category Limits</h3>
        <button class="btn btn-primary btn-sm" id="btn-suggest-budget">AI Suggest Budget</button>
      </div>

      <div id="budget-list" style="display: flex; flex-direction: column; gap: var(--space-lg);">
        <div class="empty-state">Loading budgets...</div>
      </div>
    </div>
  `;

  const loadBudgets = async () => {
    try {
      const data = await api.getBudgets();
      const list = document.getElementById('budget-list');
      if (!list) return;

      // Update income stat from dashboard if possible
      const incomeEl = document.getElementById('budget-income');
      if (incomeEl) {
        try {
          const summary = await api.getDashboard();
          incomeEl.textContent = '$' + parseFloat(summary.monthly_income).toLocaleString('en-US', { minimumFractionDigits: 2 });
        } catch {
          incomeEl.textContent = 'N/A';
        }
      }

      // Server returns { data: [...], groups, total_budget, month, year }
      if (!data.data || data.data.length === 0) {
        list.innerHTML = '<div class="empty-state">No budgets set. Use "AI Suggest Budget" to get started!</div>';
        return;
      }

      list.innerHTML = data.data.map((b: any) => {
        const percent = Math.min(100, (b.spent / b.amount) * 100);
        const overLimit = percent >= 100;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--space-xs);">
              <span style="font-weight: 600;">${b.category_name}</span>
              <span style="color: var(--text-muted);">$${parseFloat(b.spent).toFixed(2)} / $${parseFloat(b.amount).toFixed(2)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${overLimit ? 'over' : ''}" style="width: ${percent}%"></div>
            </div>
            ${overLimit ? '<div style="color: var(--text-secondary); font-size: var(--font-xs); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Over budget!</div>' : ''}
          </div>
        `;
      }).join('');

    } catch (err) {
      console.error(err);
    }
  };

  document.getElementById('btn-suggest-budget')?.addEventListener('click', async () => {
    try {
      // Get actual monthly income from dashboard instead of hardcoded value
      let income = 5000;
      try {
        const summary = await api.getDashboard();
        income = parseFloat(summary.monthly_income) || 5000;
      } catch { /* use fallback */ }
      await api.suggestBudgets(income);
      showToast(`Budget suggested based on $${income.toLocaleString()} monthly income (50/30/20 rule)`, 'success');
      loadBudgets();
    } catch (err) {
      showToast('Failed to generate suggestions', 'error');
    }
  });

  loadBudgets();
};
