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

    <div class="debt-stats-grid animate-in stagger-2">
      <div class="glass-card stat-card debt">
        <div class="stat-icon">💳</div>
        <div class="stat-label">Total Debt</div>
        <div class="stat-value" id="debt-total">Loading...</div>
      </div>
      <div class="glass-card stat-card balance">
        <h3 style="margin-bottom: var(--space-md);">Payoff Strategy</h3>
        <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap;">
          <select class="form-select" id="payoff-method" style="flex: 1; min-width: 180px;">
            <option value="snowball">Snowball Method (Smallest Balance First)</option>
            <option value="avalanche">Avalanche Method (Highest Interest First)</option>
          </select>
          <button class="btn btn-ghost" id="btn-calc-payoff">Calculate Plan</button>
        </div>
        <div id="payoff-result" style="font-size: var(--font-sm); color: var(--text-primary); margin-top: var(--space-md);"></div>
      </div>
    </div>

    <div class="glass-card animate-in stagger-3" style="margin-top: var(--space-xl);">
      <h3 style="margin-bottom: var(--space-xl);">Your Debts</h3>
      <div id="debt-list" style="display: flex; flex-direction: column; gap: var(--space-xl);">
        <div class="empty-state">Loading debts...</div>
      </div>
    </div>
  `;

  // Append Modal HTML to body to avoid z-index / animation issues
  document.getElementById('debt-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="debt-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Add New Debt</h3>
          <button class="modal-close" id="btn-close-debt-modal">&times;</button>
        </div>
        <form id="debt-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Debt Name</label>
            <input type="text" id="debt-name" class="form-input" placeholder="e.g. Car Loan, Credit Card" required>
          </div>
          <div class="form-group">
            <label class="form-label">Current Balance (₱)</label>
            <input type="number" id="debt-balance" class="form-input" step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Interest Rate (%)</label>
              <input type="number" id="debt-interest" class="form-input" step="0.01" min="0" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">Minimum Payment (₱)</label>
              <input type="number" id="debt-minimum" class="form-input" step="0.01" min="0" placeholder="0.00" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-save-debt" style="margin-top: var(--space-md);">Save Debt</button>
        </form>
      </div>
    </div>
  `);

  // ── Load Debts ───────────────────────────────────────────────────────────────
  const loadDebts = async () => {
    try {
      const response = await api.getDebts();
      const debts = Array.isArray(response) ? response : (response.data ?? []);
      const list = document.getElementById('debt-list');
      const totalEl = document.getElementById('debt-total');
      if (!list || !totalEl) return;

      if (debts.length === 0) {
        list.innerHTML = '<div class="empty-state">No debts recorded. Great job! 🎉</div>';
        totalEl.textContent = '₱0.00';
        return;
      }

      const total = response.total_debt ?? debts.reduce((sum: number, d: any) => sum + parseFloat(d.current_balance || 0), 0);
      totalEl.textContent = '₱' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 });

      list.innerHTML = debts.map((d: any) => {
        const balance  = parseFloat(d.current_balance) || 0;
        const interest = parseFloat(d.interest_rate)   || 0;
        const minimum  = parseFloat(d.minimum_payment) || 0;
        return `
          <div style="padding: var(--space-md); border: 1px solid var(--border-light); background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-sm);">
              <div>
                <h4 style="font-size: var(--font-lg); text-transform: uppercase; letter-spacing: 1px;">${d.name}</h4>
                <div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 4px; text-transform: uppercase;">
                  Interest: <span style="color: var(--text-secondary);">${interest.toFixed(2)}%</span>
                  &nbsp;|&nbsp; Min. Payment: ₱${minimum.toFixed(2)}
                </div>
              </div>
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: var(--space-sm);">
                <div style="font-size: var(--font-xl); font-weight: 800; color: var(--text-primary); letter-spacing: -1px;">₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <button class="btn btn-ghost btn-sm btn-delete-debt" data-id="${d.id}" style="font-size: var(--font-xs); color: var(--text-muted);">🗑 Delete</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Attach delete listeners
      document.querySelectorAll('.btn-delete-debt').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          if (id && confirm('Delete this debt? This cannot be undone.')) {
            try {
              await api.deleteDebt(Number(id));
              showToast('Debt deleted', 'success');
              loadDebts();
            } catch {
              showToast('Failed to delete debt', 'error');
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
      showToast('Failed to load debts', 'error');
    }
  };

  // ── Calculate Payoff Plan ────────────────────────────────────────────────────
  document.getElementById('btn-calc-payoff')?.addEventListener('click', async () => {
    const method = (document.getElementById('payoff-method') as HTMLSelectElement).value;
    const res = document.getElementById('payoff-result');
    const calcBtn = document.getElementById('btn-calc-payoff') as HTMLButtonElement;
    if (!res) return;

    calcBtn.disabled = true;
    calcBtn.textContent = 'Calculating...';
    res.innerHTML = '<span style="color: var(--text-muted);">Calculating...</span>';

    try {
      const plan = await api.getPayoffPlan(method);
      const interest = isNaN(parseFloat(plan.total_interest)) ? '0.00' : parseFloat(plan.total_interest).toLocaleString('en-US', { minimumFractionDigits: 2 });
      res.innerHTML = `Using the <strong>${method}</strong> method, you can be debt-free in <strong>${plan.total_months ?? '?'} months</strong>. Total interest paid: <strong>₱${interest}</strong>.`;
    } catch {
      res.innerHTML = '<span style="color: var(--text-muted); text-transform: uppercase;">No active debts to calculate. Add a debt first.</span>';
    } finally {
      calcBtn.disabled = false;
      calcBtn.textContent = 'Calculate Plan';
    }
  });

  // ── Modal Logic ──────────────────────────────────────────────────────────────
  const modal = document.getElementById('debt-modal');
  const openModal  = () => { (document.getElementById('debt-form') as HTMLFormElement).reset(); modal?.classList.remove('hidden'); };
  const closeModal = () => modal?.classList.add('hidden');

  document.getElementById('btn-new-debt')?.addEventListener('click', openModal);
  document.getElementById('btn-close-debt-modal')?.addEventListener('click', closeModal);

  // Close modal on backdrop click
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Form Submit ──────────────────────────────────────────────────────────────
  document.getElementById('debt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal    = (document.getElementById('debt-name')    as HTMLInputElement).value.trim();
    const balanceVal = parseFloat((document.getElementById('debt-balance')  as HTMLInputElement).value);
    const interestVal = parseFloat((document.getElementById('debt-interest') as HTMLInputElement).value);
    const minimumVal  = parseFloat((document.getElementById('debt-minimum')  as HTMLInputElement).value);

    // Front-end validation
    if (!nameVal)                         { showToast('Please enter a debt name', 'error'); return; }
    if (isNaN(balanceVal) || balanceVal <= 0)   { showToast('Balance must be greater than ₱0', 'error'); return; }
    if (isNaN(interestVal) || interestVal < 0)  { showToast('Interest rate must be 0% or more', 'error'); return; }
    if (isNaN(minimumVal) || minimumVal < 0)    { showToast('Minimum payment must be ₱0 or more', 'error'); return; }

    const submitBtn = document.getElementById('btn-save-debt') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      await api.createDebt({
        name: nameVal,
        current_balance: balanceVal,
        total_amount: balanceVal,   // backend requires total_amount
        interest_rate: interestVal,
        minimum_payment: minimumVal,
      });
      showToast('Debt added successfully!', 'success');
      closeModal();
      loadDebts();
    } catch (err: any) {
      showToast(err.message || 'Failed to add debt. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Debt';
    }
  });

  // Load Initial Data
  loadDebts();
};
