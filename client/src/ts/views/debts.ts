import { api } from '../api.js';
import { showToast } from '../main.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { Debt } from '../types.js';

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
        <h3 style="margin-bottom: var(--space-md); font-size: var(--font-base); text-transform: uppercase; letter-spacing: 1px;">Payoff Strategy</h3>
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
      <div id="debt-list" style="display: flex; flex-direction: column; gap: var(--space-md);">
        <div class="empty-state">Loading debts...</div>
      </div>
    </div>
  `;

  // Append Modal HTML to body
  document.getElementById('debt-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="debt-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="debt-modal-title">Add New Debt</h3>
          <button class="modal-close" id="btn-close-debt-modal">&times;</button>
        </div>
        <form id="debt-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label" for="debt-name">Debt Name</label>
            <input type="text" id="debt-name" class="form-input" placeholder="e.g. Car Loan, Credit Card" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="debt-balance">Current Balance (₱)</label>
            <input type="number" id="debt-balance" class="form-input" step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="debt-interest">Interest Rate (%)</label>
              <input type="number" id="debt-interest" class="form-input" step="0.01" min="0" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="debt-minimum">Minimum Payment (₱)</label>
              <input type="number" id="debt-minimum" class="form-input" step="0.01" min="0" placeholder="0.00" required>
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: var(--space-md); margin-top: var(--space-md);">
            <button type="button" class="btn btn-ghost" id="btn-cancel-debt-modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-debt">Save Debt</button>
          </div>
        </form>
      </div>
    </div>
  `);

  let debtsCache: Debt[] = [];
  let editingDebtId: number | null = null;

  // ── Load Debts ───────────────────────────────────────────────────────────────
  const loadDebts = async () => {
    try {
      const response = await api.getDebts();
      debtsCache = response.data ?? [];
      const list = document.getElementById('debt-list');
      const totalEl = document.getElementById('debt-total');
      if (!list || !totalEl) return;

      if (debtsCache.length === 0) {
        list.innerHTML = '<div class="empty-state">No debts recorded. Great job! 🎉</div>';
        totalEl.textContent = '₱0.00';
        return;
      }

      const total = response.total_debt ?? debtsCache.reduce((sum: number, d: Debt) => sum + (d.current_balance || 0), 0);
      totalEl.textContent = '₱' + Number(total).toLocaleString('en-US', { minimumFractionDigits: 2 });

      list.innerHTML = debtsCache.map((d: Debt) => {
        const balance  = d.current_balance || 0;
        const interest = d.interest_rate   || 0;
        const minimum  = d.minimum_payment || 0;
        return `
          <div class="glass-card" style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); flex-wrap: wrap;">
            <div>
              <h4 style="font-size: var(--font-lg); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(d.name)}</h4>
              <div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 4px;">
                Interest: <span style="color: var(--expense-color, #ef4444); font-weight: 600;">${interest.toFixed(2)}%</span>
                &nbsp;|&nbsp; Min. Payment: ₱${minimum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-lg);">
              <div style="text-align: right;">
                <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase;">Balance</div>
                <div style="font-size: var(--font-xl); font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px;">₱${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="display: flex; gap: var(--space-xs);">
                <button class="btn btn-icon btn-ghost btn-edit-debt" data-id="${d.id}" title="Edit debt">✏️</button>
                <button class="btn btn-icon btn-ghost btn-delete-debt" data-id="${d.id}" title="Delete debt" style="color: var(--expense-color, #ef4444);">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Attach edit listeners
      document.querySelectorAll('.btn-edit-debt').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).dataset.id);
          const debt = debtsCache.find(d => d.id === id);
          if (debt) openModal(debt);
        });
      });

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
      const interest = isNaN(plan.total_interest) ? '0.00' : plan.total_interest.toLocaleString('en-US', { minimumFractionDigits: 2 });
      res.innerHTML = `Using the <strong>${escapeHtml(method)}</strong> method, you can be debt-free in <strong>${escapeHtml(plan.total_months ?? '?')} months</strong>. Total interest paid: <strong>₱${interest}</strong>.`;
    } catch {
      res.innerHTML = '<span style="color: var(--text-muted); text-transform: uppercase;">No active debts to calculate. Add a debt first.</span>';
    } finally {
      calcBtn.disabled = false;
      calcBtn.textContent = 'Calculate Plan';
    }
  });

  // ── Modal Logic ──────────────────────────────────────────────────────────────
  const modal = document.getElementById('debt-modal');
  const modalTitle = document.getElementById('debt-modal-title');
  const saveBtn = document.getElementById('btn-save-debt');

  const openModal = (debt?: Debt) => {
    editingDebtId = debt?.id ?? null;
    if (modalTitle) modalTitle.textContent = debt ? 'Edit Debt' : 'Add New Debt';
    if (saveBtn) saveBtn.textContent = debt ? 'Update Debt' : 'Save Debt';

    const nameInput = document.getElementById('debt-name') as HTMLInputElement;
    const balanceInput = document.getElementById('debt-balance') as HTMLInputElement;
    const interestInput = document.getElementById('debt-interest') as HTMLInputElement;
    const minimumInput = document.getElementById('debt-minimum') as HTMLInputElement;

    if (debt) {
      nameInput.value = debt.name;
      balanceInput.value = String(debt.current_balance);
      interestInput.value = String(debt.interest_rate);
      minimumInput.value = String(debt.minimum_payment);
    } else {
      (document.getElementById('debt-form') as HTMLFormElement).reset();
    }

    modal?.classList.remove('hidden');
    nameInput.focus();
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
    (document.getElementById('debt-form') as HTMLFormElement)?.reset();
    editingDebtId = null;
  };

  document.getElementById('btn-new-debt')?.addEventListener('click', () => openModal());
  document.getElementById('btn-close-debt-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-debt-modal')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Form Submit ──────────────────────────────────────────────────────────────
  document.getElementById('debt-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal = (document.getElementById('debt-name') as HTMLInputElement).value.trim();
    const balanceVal = parseFloat((document.getElementById('debt-balance') as HTMLInputElement).value);
    const interestVal = parseFloat((document.getElementById('debt-interest') as HTMLInputElement).value);
    const minimumVal = parseFloat((document.getElementById('debt-minimum') as HTMLInputElement).value);

    if (!nameVal) { showToast('Please enter a debt name', 'error'); return; }
    if (isNaN(balanceVal) || balanceVal <= 0) { showToast('Balance must be greater than ₱0', 'error'); return; }
    if (isNaN(interestVal) || interestVal < 0) { showToast('Interest rate must be 0% or more', 'error'); return; }
    if (isNaN(minimumVal) || minimumVal < 0) { showToast('Minimum payment must be ₱0 or more', 'error'); return; }

    const submitBtn = document.getElementById('btn-save-debt') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (editingDebtId !== null) {
        await api.updateDebt(editingDebtId, {
          name: nameVal,
          current_balance: balanceVal,
          total_amount: balanceVal,
          interest_rate: interestVal,
          minimum_payment: minimumVal,
        });
        showToast('Debt updated successfully!', 'success');
      } else {
        await api.createDebt({
          name: nameVal,
          current_balance: balanceVal,
          total_amount: balanceVal,
          interest_rate: interestVal,
          minimum_payment: minimumVal,
        });
        showToast('Debt added successfully!', 'success');
      }
      closeModal();
      loadDebts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save debt', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingDebtId ? 'Update Debt' : 'Save Debt';
    }
  });

  loadDebts();
};
