import { api } from '../api.js';
import { showToast } from '../main.js';

export const renderSavings = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Savings Goals</h2>
        <p class="page-subtitle">Set targets and watch your savings grow.</p>
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

  // Append "Add Goal" modal to body
  document.getElementById('savings-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay hidden" id="savings-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">New Savings Goal</h3>
          <button class="modal-close" id="btn-close-savings-modal">&times;</button>
        </div>
        <form id="savings-form" style="padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-md);">
          <div class="form-group">
            <label class="form-label">Goal Name</label>
            <input type="text" id="goal-name" class="form-input" placeholder="e.g. Emergency Fund, Vacation" required>
          </div>
          <div class="form-group">
            <label class="form-label">Target Amount (₱)</label>
            <input type="number" id="goal-target" class="form-input" step="0.01" min="0.01" placeholder="0.00" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Starting Amount (₱)</label>
              <input type="number" id="goal-current" class="form-input" step="0.01" min="0" placeholder="0.00" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">Deadline (Optional)</label>
              <input type="date" id="goal-deadline" class="form-input">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Icon (Emoji)</label>
            <input type="text" id="goal-icon" class="form-input" placeholder="🎯" maxlength="4" value="🎯">
          </div>
          <button type="submit" class="btn btn-primary" id="btn-save-goal" style="margin-top: var(--space-md);">Create Goal</button>
        </form>
      </div>
    </div>
  `);

  // ── Load Savings Goals ───────────────────────────────────────────────────────
  const loadSavings = async () => {
    try {
      const response = await api.getSavings();
      const goals = Array.isArray(response) ? response : (response.data ?? []);
      const list = document.getElementById('savings-list');
      if (!list) return;

      if (goals.length === 0) {
        list.innerHTML = `
          <div class="glass-card" style="grid-column: span 2; text-align: center; padding: var(--space-2xl);">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-text">No savings goals yet.</div>
            <p style="color: var(--text-muted); margin-top: var(--space-sm);">Set a goal for an emergency fund, vacation, or a new car!</p>
          </div>
        `;
        return;
      }

      list.innerHTML = goals.map((g: any) => {
        const current = parseFloat(g.current_amount) || 0;
        const target  = parseFloat(g.target_amount)  || 1;
        const percent = Math.min(100, (current / target) * 100);
        return `
          <div class="glass-card" style="position: relative; overflow: hidden;">
            <!-- Bottom progress line -->
            <div style="position: absolute; bottom: 0; left: 0; width: ${percent}%; height: 2px; background: var(--text-primary); transition: width 0.8s ease;"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-xl);">
              <div>
                <div class="stat-icon" style="font-size: 2rem; margin-bottom: 0;">${g.icon || '🎯'}</div>
                <h3 style="margin-top: var(--space-sm); text-transform: uppercase; letter-spacing: 1px;">${g.name}</h3>
                ${g.deadline ? `<div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase;">Target: ${new Date(g.deadline).toLocaleDateString()}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--text-primary);">${percent.toFixed(0)}%</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Saved</div>
                <div style="font-size: var(--font-lg); font-weight: 600;">₱${current.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Goal</div>
                <div style="font-size: var(--font-lg); font-weight: 600; color: var(--text-secondary);">₱${target.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            
            <div style="margin-top: var(--space-md); display: flex; justify-content: flex-end; gap: var(--space-sm);">
              <button class="btn btn-ghost btn-sm btn-contribute" data-id="${g.id}">+ Contribute</button>
              <button class="btn btn-ghost btn-sm btn-delete-goal" data-id="${g.id}" style="color: var(--text-muted);">🗑</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach contribute listeners
      document.querySelectorAll('.btn-contribute').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          const amount = prompt('Enter contribution amount (₱):');
          if (!id || !amount) return;
          const num = parseFloat(amount);
          if (isNaN(num) || num <= 0) { showToast('Enter a valid amount', 'error'); return; }
          try {
            await api.contributeSavings(Number(id), num);
            showToast('Contribution added!', 'success');
            loadSavings();
          } catch {
            showToast('Failed to add contribution', 'error');
          }
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
  const openModal  = () => { (document.getElementById('savings-form') as HTMLFormElement).reset(); (document.getElementById('goal-icon') as HTMLInputElement).value = '🎯'; modal?.classList.remove('hidden'); };
  const closeModal = () => modal?.classList.add('hidden');

  document.getElementById('btn-new-goal')?.addEventListener('click', openModal);
  document.getElementById('btn-close-savings-modal')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // ── Form Submit ──────────────────────────────────────────────────────────────
  document.getElementById('savings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal    = (document.getElementById('goal-name')     as HTMLInputElement).value.trim();
    const targetVal  = parseFloat((document.getElementById('goal-target')   as HTMLInputElement).value);
    const currentVal = parseFloat((document.getElementById('goal-current')  as HTMLInputElement).value) || 0;
    const deadlineVal = (document.getElementById('goal-deadline') as HTMLInputElement).value || null;
    const iconVal    = (document.getElementById('goal-icon')     as HTMLInputElement).value.trim() || '🎯';

    if (!nameVal)                          { showToast('Please enter a goal name', 'error'); return; }
    if (isNaN(targetVal) || targetVal <= 0){ showToast('Target amount must be greater than ₱0', 'error'); return; }
    if (currentVal < 0)                    { showToast('Starting amount cannot be negative', 'error'); return; }

    const submitBtn = document.getElementById('btn-save-goal') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      await api.createSavingsGoal({
        name: nameVal,
        target_amount: targetVal,
        current_amount: currentVal,
        deadline: deadlineVal,
        icon: iconVal,
      });
      showToast('Savings goal created!', 'success');
      closeModal();
      loadSavings();
    } catch (err: any) {
      showToast(err.message || 'Failed to create goal', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Goal';
    }
  });

  loadSavings();
};
