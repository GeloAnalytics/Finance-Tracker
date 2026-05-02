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

  // Append Modal HTML
  const modalHTML = `
    <div class="modal-overlay hidden" id="debt-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Add New Debt</h3>
          <button class="modal-close" id="btn-close-debt-modal">×</button>
        </div>
        <form id="debt-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Debt Name (e.g. Car Loan)</label>
            <input type="text" id="debt-name" class="form-input" required>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₱)</label>
            <input type="number" id="debt-balance" class="form-input" step="0.01" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Interest Rate (%)</label>
              <input type="number" id="debt-interest" class="form-input" step="0.01" required>
            </div>
            <div class="form-group">
              <label class="form-label">Minimum Payment (₱)</label>
              <input type="number" id="debt-minimum" class="form-input" step="0.01" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top: var(--space-md);">Save Debt</button>
        </form>
      </div>
    </div>
  `;
  container.insertAdjacentHTML('beforeend', modalHTML);

  const loadDebts = async () => {
    try {
      const response = await api.getDebts();
      // Server returns { data: [...], total_debt, count }
      const debts = Array.isArray(response) ? response : (response.data ?? []);
      const list = document.getElementById('debt-list');
      const totalEl = document.getElementById('debt-total');
      
      if (!list || !totalEl) return;

      if (debts.length === 0) {
        list.innerHTML = '<div class="empty-state">No debts recorded. Great job!</div>';
        totalEl.textContent = '₱0.00';
        return;
      }

      // Use server-computed total_debt if available, else sum current_balance
      const total = response.total_debt ?? debts.reduce((sum: number, d: any) => sum + parseFloat(d.current_balance), 0);
      totalEl.textContent = '₱' + total.toLocaleString('en-US', {minimumFractionDigits: 2});

      list.innerHTML = debts.map((d: any) => {
        return `
          <div style="padding: var(--space-md); border: 1px solid var(--border-light); background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md);">
              <div>
                <h4 style="font-size: var(--font-lg); text-transform: uppercase; letter-spacing: 1px;">${d.name}</h4>
                <div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 4px; text-transform: uppercase;">
                  Interest: <span style="color: var(--text-secondary);">${parseFloat(d.interest_rate).toFixed(2)}%</span> | Minimum: ₱${parseFloat(d.minimum_payment).toFixed(2)}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-xl); font-weight: 800; color: var(--text-primary); letter-spacing: -1px;">₱${parseFloat(d.current_balance).toLocaleString()}</div>
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
      // Server returns { total_months, total_interest, total_paid, order, monthly_schedule }
      res.innerHTML = `Using the <strong>${method}</strong> method, you can be debt-free in <strong>${plan.total_months ?? '?'} months</strong>. Total interest paid: <strong>₱${parseFloat(plan.total_interest).toLocaleString()}</strong>.`;
    } catch (err) {
      res.innerHTML = '<span style="color: var(--text-muted); text-transform: uppercase;">Failed to calculate payoff plan.</span>';
    }
  });

  // Modal Logic
  const modal = document.getElementById('debt-modal');
  document.getElementById('btn-new-debt')?.addEventListener('click', () => {
    (document.getElementById('debt-form') as HTMLFormElement).reset();
    modal?.classList.remove('hidden');
  });

  document.getElementById('btn-close-debt-modal')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  document.getElementById('debt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: (document.getElementById('debt-name') as HTMLInputElement).value,
      current_balance: parseFloat((document.getElementById('debt-balance') as HTMLInputElement).value),
      interest_rate: parseFloat((document.getElementById('debt-interest') as HTMLInputElement).value),
      minimum_payment: parseFloat((document.getElementById('debt-minimum') as HTMLInputElement).value)
    };

    try {
      await api.createDebt(data);
      showToast('Debt added successfully', 'success');
      modal?.classList.add('hidden');
      loadDebts();
    } catch (err) {
      showToast('Failed to add debt', 'error');
    }
  });

  // Load Initial Data
  loadDebts();
};
