import { api } from '../api.js';
import { showToast } from '../main.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { SavingsGoal } from '../types.js';
import { monthsToReachGoal, projectedCompletionDate, requiredMonthlyContribution } from '../utils/savings-calc.js';

export const renderSavings = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Savings Goals</h2>
        <p class="page-subtitle">Set targets, make contributions, and track your financial growth.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-goal">
        + New Goal
      </button>
    </div>

    <div class="charts-grid animate-in stagger-2" id="savings-list">
      <div class="glass-card" style="grid-column: span 2; display: flex; align-items: center; justify-content: center; min-height: 200px;">
        <div class="empty-state">Loading goals...</div>
      </div>
    </div>
  `;

  // Append "Add / Edit Goal" modal to body
  document.getElementById('savings-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="savings-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="savings-modal-title">New Savings Goal</h3>
          <button class="modal-close" id="btn-close-savings-modal">&times;</button>
        </div>
        <form id="savings-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label" for="goal-name">Goal Name</label>
            <input type="text" id="goal-name" class="form-input" placeholder="e.g. Emergency Fund, Vacation" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="goal-target">Target Amount (₱)</label>
            <input type="number" id="goal-target" class="form-input" step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="goal-current">Current Amount (₱)</label>
              <input type="number" id="goal-current" class="form-input" step="0.01" min="0" placeholder="0.00" value="0">
            </div>
            <div class="form-group">
              <label class="form-label" for="goal-deadline">Deadline (Optional)</label>
              <input type="date" id="goal-deadline" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="goal-icon">Icon (Emoji)</label>
            <input type="text" id="goal-icon" class="form-input" placeholder="🎯" maxlength="4" value="🎯">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: var(--space-md); margin-top: var(--space-md);">
            <button type="button" class="btn btn-ghost" id="btn-cancel-savings-modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-goal">Save Goal</button>
          </div>
        </form>
      </div>
    </div>
  `);

  // Append "Contribute" modal to body
  document.getElementById('savings-contribute-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="savings-contribute-modal">
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h3 class="modal-title" id="contribute-modal-title">Add Contribution</h3>
          <button class="modal-close" id="btn-close-contribute-modal">&times;</button>
        </div>
        <form id="contribute-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label" for="contribute-amount">Contribution Amount (₱)</label>
            <input type="number" id="contribute-amount" class="form-input" step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: var(--space-md); margin-top: var(--space-sm);">
            <button type="button" class="btn btn-ghost" id="btn-cancel-contribute-modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-contribute">Add Contribution</button>
          </div>
        </form>
      </div>
    </div>
  `);

  // Append "Goal Calculator" modal to body
  document.getElementById('goal-calc-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="goal-calc-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="goal-calc-title">Goal Calculator</h3>
          <button class="modal-close" id="btn-close-goal-calc">&times;</button>
        </div>
        <div style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div style="display: flex; gap: var(--space-sm);">
            <button type="button" class="btn btn-ghost btn-sm goal-calc-mode-btn active" data-mode="contribution" style="flex:1;">By monthly amount</button>
            <button type="button" class="btn btn-ghost btn-sm goal-calc-mode-btn" data-mode="deadline" style="flex:1;">By target date</button>
          </div>

          <div class="form-group" id="goal-calc-input-contribution">
            <label class="form-label" for="goal-calc-monthly">Monthly Contribution (₱)</label>
            <input type="number" id="goal-calc-monthly" class="form-input" step="0.01" min="0.01" placeholder="e.g. 2000">
          </div>

          <div class="form-group hidden" id="goal-calc-input-deadline">
            <label class="form-label" for="goal-calc-date">Target Date</label>
            <input type="date" id="goal-calc-date" class="form-input">
          </div>

          <button type="button" class="btn btn-primary" id="btn-goal-calc-run">Calculate</button>

          <div id="goal-calc-result" class="glass-card hidden" style="text-align: center; margin-top: var(--space-sm);"></div>
        </div>
      </div>
    </div>
  `);

  let goalsCache: SavingsGoal[] = [];
  let editingGoalId: number | null = null;
  let contributingGoalId: number | null = null;

  // ── Contribute Modal Logic ──────────────────────────────────────────────────
  const contributeModal = document.getElementById('savings-contribute-modal');

  const openContributeModal = (goalId: number, goalName: string) => {
    contributingGoalId = goalId;
    const title = document.getElementById('contribute-modal-title');
    const amountInput = document.getElementById('contribute-amount') as HTMLInputElement;
    if (title) title.textContent = `Contribute to: ${goalName}`;
    if (amountInput) { amountInput.value = ''; }
    contributeModal?.classList.remove('hidden');
    amountInput?.focus();
  };

  const closeContributeModal = () => {
    contributeModal?.classList.add('hidden');
    contributingGoalId = null;
    (document.getElementById('contribute-form') as HTMLFormElement)?.reset();
  };

  document.getElementById('btn-close-contribute-modal')?.addEventListener('click', closeContributeModal);
  document.getElementById('btn-cancel-contribute-modal')?.addEventListener('click', closeContributeModal);
  contributeModal?.addEventListener('click', (e) => { if (e.target === contributeModal) closeContributeModal(); });

  document.getElementById('contribute-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (contributingGoalId === null) return;
    const amountInput = document.getElementById('contribute-amount') as HTMLInputElement;
    const num = parseFloat(amountInput.value);
    if (isNaN(num) || num <= 0) { showToast('Enter a valid amount greater than ₱0', 'error'); return; }
    const submitBtn = document.getElementById('btn-save-contribute') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
      await api.contributeSavings(contributingGoalId, num);
      showToast('Contribution added! 🎉', 'success');
      closeContributeModal();
      loadSavings();
    } catch {
      showToast('Failed to add contribution', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Contribution';
    }
  });

  // ── Load Savings Goals ───────────────────────────────────────────────────────
  const loadSavings = async () => {
    try {
      const response = await api.getSavings();
      goalsCache = response.data ?? [];
      const list = document.getElementById('savings-list');
      if (!list) return;

      if (goalsCache.length === 0) {
        list.innerHTML = `
          <div class="glass-card" style="grid-column: span 2; text-align: center; padding: var(--space-2xl);">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-text">No savings goals yet.</div>
            <p style="color: var(--text-muted); margin-top: var(--space-sm);">Set a goal for an emergency fund, vacation, or an investment!</p>
          </div>
        `;
        return;
      }

      list.innerHTML = goalsCache.map((g: SavingsGoal) => {
        const current = g.current_amount || 0;
        const target  = g.target_amount  || 1;
        const percent = Math.min(100, (current / target) * 100);
        return `
          <div class="glass-card" style="position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
            <!-- Bottom progress line -->
            <div style="position: absolute; bottom: 0; left: 0; width: ${percent}%; height: 3px; background: var(--income-color, #34d399); transition: width 0.8s ease;"></div>
            
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md);">
                <div>
                  <div class="stat-icon" style="font-size: 1.8rem; margin-bottom: 0;">${escapeHtml(g.icon || '🎯')}</div>
                  <h3 style="margin-top: var(--space-xs); text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(g.name)}</h3>
                  ${g.deadline ? `<div style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px;">Target: ${new Date(g.deadline).toLocaleDateString()}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="font-size: var(--font-2xl); font-weight: 800; color: ${g.is_completed ? 'var(--income-color, #34d399)' : 'var(--text-primary)'};">${percent.toFixed(0)}%</div>
                  ${g.is_completed ? '<span class="badge badge-income" style="font-size: 10px;">COMPLETED</span>' : ''}
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-lg);">
                <div>
                  <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Saved</div>
                  <div style="font-size: var(--font-lg); font-weight: 700; color: var(--income-color, #34d399);">₱${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Target</div>
                  <div style="font-size: var(--font-lg); font-weight: 600; color: var(--text-secondary);">₱${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
            
            <div style="padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-xs);">
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-ghost btn-sm btn-goal-calc" data-id="${g.id}" data-name="${escapeHtml(g.name)}" data-current="${current}" data-target="${target}" title="Calculator">🧮 Plan</button>
                <button class="btn btn-ghost btn-sm btn-contribute" data-id="${g.id}">+ Contribute</button>
              </div>
              <div style="display: flex; gap: 4px;">
                <button class="btn btn-icon btn-ghost btn-edit-goal" data-id="${g.id}" title="Edit Goal">✏️</button>
                <button class="btn btn-icon btn-ghost btn-delete-goal" data-id="${g.id}" title="Delete Goal" style="color: var(--expense-color, #ef4444);">🗑️</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Attach edit listeners
      document.querySelectorAll('.btn-edit-goal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).dataset.id);
          const goal = goalsCache.find(g => g.id === id);
          if (goal) openModal(goal);
        });
      });

      // Attach contribute listeners
      document.querySelectorAll('.btn-contribute').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).dataset.id);
          const goal = goalsCache.find(g => g.id === id);
          if (goal) openContributeModal(goal.id, goal.name);
        });
      });

      // Attach goal-calculator listeners
      document.querySelectorAll<HTMLButtonElement>('.btn-goal-calc').forEach(btn => {
        btn.addEventListener('click', () => {
          openCalcModal(
            btn.dataset.name || 'Goal',
            parseFloat(btn.dataset.current || '0'),
            parseFloat(btn.dataset.target || '0')
          );
        });
      });

      // Attach delete listeners
      document.querySelectorAll('.btn-delete-goal').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          if (id && confirm('Delete this savings goal?')) {
            try {
              await api.deleteSavingsGoal(Number(id));
              showToast('Goal deleted', 'success');
              loadSavings();
            } catch {
              showToast('Failed to delete goal', 'error');
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
      showToast('Failed to load savings goals', 'error');
    }
  };

  // ── Modal Logic ──────────────────────────────────────────────────────────────
  const modal = document.getElementById('savings-modal');
  const modalTitle = document.getElementById('savings-modal-title');
  const saveBtn = document.getElementById('btn-save-goal');

  const openModal = (goal?: SavingsGoal) => {
    editingGoalId = goal?.id ?? null;
    if (modalTitle) modalTitle.textContent = goal ? 'Edit Savings Goal' : 'New Savings Goal';
    if (saveBtn) saveBtn.textContent = goal ? 'Update Goal' : 'Create Goal';

    const nameInput = document.getElementById('goal-name') as HTMLInputElement;
    const targetInput = document.getElementById('goal-target') as HTMLInputElement;
    const currentInput = document.getElementById('goal-current') as HTMLInputElement;
    const deadlineInput = document.getElementById('goal-deadline') as HTMLInputElement;
    const iconInput = document.getElementById('goal-icon') as HTMLInputElement;

    if (goal) {
      nameInput.value = goal.name;
      targetInput.value = String(goal.target_amount);
      currentInput.value = String(goal.current_amount);
      deadlineInput.value = goal.deadline ? goal.deadline.substring(0, 10) : '';
      iconInput.value = goal.icon || '🎯';
    } else {
      (document.getElementById('savings-form') as HTMLFormElement)?.reset();
      iconInput.value = '🎯';
    }

    modal?.classList.remove('hidden');
    nameInput.focus();
  };

  const closeModal = () => {
    modal?.classList.add('hidden');
    (document.getElementById('savings-form') as HTMLFormElement)?.reset();
    editingGoalId = null;
  };

  document.getElementById('btn-new-goal')?.addEventListener('click', () => openModal());
  document.getElementById('btn-close-savings-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-savings-modal')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Form Submit ──────────────────────────────────────────────────────────────
  document.getElementById('savings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal = (document.getElementById('goal-name') as HTMLInputElement).value.trim();
    const targetVal = parseFloat((document.getElementById('goal-target') as HTMLInputElement).value);
    const currentVal = parseFloat((document.getElementById('goal-current') as HTMLInputElement).value) || 0;
    const deadlineVal = (document.getElementById('goal-deadline') as HTMLInputElement).value || null;
    const iconVal = (document.getElementById('goal-icon') as HTMLInputElement).value.trim() || '🎯';

    if (!nameVal) { showToast('Please enter a goal name', 'error'); return; }
    if (isNaN(targetVal) || targetVal <= 0) { showToast('Target amount must be greater than ₱0', 'error'); return; }
    if (currentVal < 0) { showToast('Starting amount cannot be negative', 'error'); return; }

    const submitBtn = document.getElementById('btn-save-goal') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (editingGoalId !== null) {
        await api.updateSavingsGoal(editingGoalId, {
          name: nameVal,
          target_amount: targetVal,
          current_amount: currentVal,
          deadline: deadlineVal,
          icon: iconVal,
        });
        showToast('Savings goal updated!', 'success');
      } else {
        await api.createSavingsGoal({
          name: nameVal,
          target_amount: targetVal,
          current_amount: currentVal,
          deadline: deadlineVal,
          icon: iconVal,
        });
        showToast('Savings goal created!', 'success');
      }
      closeModal();
      loadSavings();
    } catch (err: any) {
      showToast(err.message || 'Failed to save goal', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingGoalId ? 'Update Goal' : 'Create Goal';
    }
  });

  // ── Goal Calculator Modal Logic ──────────────────────────────────────────────
  const calcModal = document.getElementById('goal-calc-modal');
  const calcTitle = document.getElementById('goal-calc-title') as HTMLElement;
  const calcResult = document.getElementById('goal-calc-result') as HTMLElement;
  const calcMonthlyInput = document.getElementById('goal-calc-monthly') as HTMLInputElement;
  const calcDateInput = document.getElementById('goal-calc-date') as HTMLInputElement;
  const calcInputContribution = document.getElementById('goal-calc-input-contribution') as HTMLElement;
  const calcInputDeadline = document.getElementById('goal-calc-input-deadline') as HTMLElement;

  let calcMode: 'contribution' | 'deadline' = 'contribution';
  let calcGoal: { current: number; target: number } | null = null;

  function openCalcModal(name: string, current: number, target: number) {
    calcGoal = { current, target };
    calcTitle.textContent = `Calculate: ${name}`;
    calcMonthlyInput.value = '';
    calcDateInput.value = '';
    calcResult.classList.add('hidden');
    calcModal?.classList.remove('hidden');
  }
  const closeCalcModal = () => calcModal?.classList.add('hidden');

  document.getElementById('btn-close-goal-calc')?.addEventListener('click', closeCalcModal);
  calcModal?.addEventListener('click', (e) => { if (e.target === calcModal) closeCalcModal(); });

  calcModal?.querySelectorAll<HTMLButtonElement>('.goal-calc-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      calcMode = btn.dataset.mode as 'contribution' | 'deadline';
      calcModal?.querySelectorAll('.goal-calc-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      calcInputContribution.classList.toggle('hidden', calcMode !== 'contribution');
      calcInputDeadline.classList.toggle('hidden', calcMode !== 'deadline');
      calcResult.classList.add('hidden');
    });
  });

  document.getElementById('btn-goal-calc-run')?.addEventListener('click', () => {
    if (!calcGoal) return;
    const { current, target } = calcGoal;

    if (calcMode === 'contribution') {
      const monthly = parseFloat(calcMonthlyInput.value);
      if (isNaN(monthly) || monthly <= 0) { showToast('Enter a valid monthly amount', 'error'); return; }
      const months = monthsToReachGoal(current, target, monthly);
      if (months === 0) {
        calcResult.innerHTML = `<strong>Goal already reached! 🎉</strong>`;
      } else {
        const date = projectedCompletionDate(current, target, monthly);
        const dateLabel = date ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
        calcResult.innerHTML = `Saving <strong>₱${monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>/month, you'll reach this goal in <strong>${months} month${months === 1 ? '' : 's'}</strong> — around <strong>${dateLabel}</strong>.`;
      }
    } else {
      const dateVal = calcDateInput.value;
      if (!dateVal) { showToast('Select a target date', 'error'); return; }
      const deadline = new Date(dateVal);
      const monthly = requiredMonthlyContribution(current, target, deadline);
      if (monthly === 0) {
        calcResult.innerHTML = `<strong>Goal already reached! 🎉</strong>`;
      } else if (monthly === null) {
        calcResult.innerHTML = `<strong style="color: var(--expense-color, #ef4444);">That date has already passed — pick a future date.</strong>`;
      } else {
        calcResult.innerHTML = `To reach this goal by <strong>${deadline.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>, save about <strong>₱${monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>/month.`;
      }
    }
    calcResult.classList.remove('hidden');
  });

  loadSavings();
};
