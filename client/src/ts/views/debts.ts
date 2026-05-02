import { api } from '../api.js';
import { showToast } from '../main.js';

export const renderDebts = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Debt Payoff Tracker</h2>
        <p class="page-subtitle">Visualize your journey to becoming debt-free.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-debt">
        + Add Debt
      </button>
    </div>

    <div class="stats-grid animate-in stagger-2" id="debt-summary">
      <div class="glass-card stat-card debt">
        <div class="stat-icon">💳</div>
        <div class="stat-label">Total Debt</div>
        <div class="stat-value" id="debt-total">Loading...</div>
      </div>
      <div class="glass-card stat-card balance" style="grid-column: span 2;">
        <h3 style="margin-bottom: var(--space-md);">Payoff Strategy</h3>
        <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md);">
          <select class="form-select" id="payoff-method">
            <option value="snowball">Snowball Method (Smallest Balance First)</option>
            <option value="avalanche">Avalanche Method (Highest Interest First)</option>
          </select>
          <button class="btn btn-ghost" id="btn-calc-payoff">Calculate Plan</button>
        </div>
        <div id="payoff-result" style="font-size: var(--font-sm); color: var(--text-primary); margin-top: var(--space-md);"></div>
      </div>
    </div>

    <div class="charts-grid animate-in stagger-3">
      <div class="glass-card" style="grid-column: span 2;">
        <h3 style="margin-bottom: var(--space-xl);">Your Debts</h3>
        <div id="debt-list" style="display: flex; flex-direction: column; gap: var(--space-xl);">
          <div class="empty-state">Loading debts...</div>
        </div>
      </div>
    </div>
  `;

  const loadDebts = async () => {
    try {
      const debts = await api.getDebts();
      const list = document.getElementById('debt-list');
      const totalEl = document.getElementById('debt-total');
      
      if (!list || !totalEl) return;

      if (debts.length === 0) {
        list.innerHTML = '<div class="empty-state">No debts recorded. Great job!</div>';
        totalEl.textContent = '$0.00';
        return;
      }

      const total = debts.reduce((sum: number, d: any) => sum + parseFloat(d.balance), 0);
      totalEl.textContent = '$' + total.toLocaleString('en-US', {minimumFractionDigits: 2});

      list.innerHTML = debts.map((d: any) => {
        return `
          <div style="padding: var(--space-md); border: 1px solid var(--border-light); background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md);">
              <div>
                <h4 style="font-size: var(--font-lg); text-transform: uppercase; letter-spacing: 1px;">${d.name}</h4>
                <div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 4px; text-transform: uppercase;">
                  Interest: <span style="color: var(--text-secondary);">${parseFloat(d.interest_rate).toFixed(2)}%</span> | Minimum: $${parseFloat(d.minimum_payment).toFixed(2)}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-xl); font-weight: 800; color: var(--text-primary); letter-spacing: -1px;">$${parseFloat(d.balance).toLocaleString()}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
      showToast('Failed to load debts', 'error');
    }
  };

  document.getElementById('btn-calc-payoff')?.addEventListener('click', async () => {
    const method = (document.getElementById('payoff-method') as HTMLSelectElement).value;
    const res = document.getElementById('payoff-result');
    if (!res) return;
    
    res.innerHTML = 'Calculating...';
    try {
      const plan = await api.getPayoffPlan(method);
      res.innerHTML = `Using the <strong>${method}</strong> method, you can be debt-free in <strong>${plan.monthsToPayoff || '?'} months</strong>. Total interest paid: <strong>$${parseFloat(plan.totalInterest).toLocaleString()}</strong>.`;
    } catch (err) {
      res.innerHTML = '<span style="color: var(--text-muted); text-transform: uppercase;">Failed to calculate payoff plan.</span>';
    }
  });

  // Load Initial Data
  loadDebts();
};
