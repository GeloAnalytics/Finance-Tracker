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
      <div class="glass-card" style="display: flex; align-items: center; justify-content: center; min-height: 200px;">
        <div class="empty-state">Loading goals...</div>
      </div>
    </div>
  `;

  const loadSavings = async () => {
    try {
      const goals = await api.getSavings();
      const list = document.getElementById('savings-list');
      if (!list) return;

      if (goals.length === 0) {
        list.innerHTML = `
          <div class="glass-card" style="grid-column: span 2; text-align: center; padding: var(--space-2xl);">
            <div class="empty-state-icon">🎯</div>
            <div class="empty-state-text">No savings goals yet.</div>
            <p style="color: var(--text-muted);">Set a goal for an emergency fund, vacation, or a new car!</p>
          </div>
        `;
        return;
      }

      list.innerHTML = goals.map((g: any) => {
        const percent = Math.min(100, (g.current_amount / g.target_amount) * 100);
        return `
          <div class="glass-card" style="position: relative; overflow: hidden;">
            <!-- Subtle background progress -->
            <div style="position: absolute; bottom: 0; left: 0; width: ${percent}%; height: 2px; background: var(--text-primary);"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-xl);">
              <div>
                <div class="stat-icon" style="font-size: 2rem; margin-bottom: 0;">${g.icon || '🎯'}</div>
                <h3 style="margin-top: var(--space-sm); text-transform: uppercase; letter-spacing: 1px;">${g.name}</h3>
                ${g.target_date ? `<div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase;">Target: ${new Date(g.target_date).toLocaleDateString()}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--text-primary);">${percent.toFixed(0)}%</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Saved</div>
                <div style="font-size: var(--font-lg); font-weight: 600;">$${parseFloat(g.current_amount).toLocaleString()}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: var(--font-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Goal</div>
                <div style="font-size: var(--font-lg); font-weight: 600; color: var(--text-secondary);">$${parseFloat(g.target_amount).toLocaleString()}</div>
              </div>
            </div>
            
            <div style="margin-top: var(--space-md); text-align: right;">
              <button class="btn btn-ghost btn-sm btn-contribute" data-id="${g.id}">+ Contribute</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach contribute listeners
      document.querySelectorAll('.btn-contribute').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          const amount = prompt('Amount to contribute:');
          if (id && amount && !isNaN(Number(amount))) {
            try {
              await api.contributeSavings(Number(id), Number(amount));
              showToast('Contribution added!', 'success');
              loadSavings();
            } catch (err) {
              showToast('Failed to add contribution', 'error');
            }
          }
        });
      });

    } catch (err) {
      console.error(err);
      showToast('Failed to load savings goals', 'error');
    }
  };

  loadSavings();
};
