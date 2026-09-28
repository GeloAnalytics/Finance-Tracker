import { api } from '../api.js';
import { showToast } from '../main.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { Budget, BudgetAllocation, BudgetGroupKey } from '../types.js';

const GROUP_META: Record<BudgetGroupKey, { label: string; color: string; icon: string }> = {
  needs: { label: 'Needs', color: '#6c63ff', icon: '🏠' },
  wants: { label: 'Wants', color: '#f59e0b', icon: '✨' },
  tithes: { label: 'Tithes', color: '#10b981', icon: '🙏' },
  savings: { label: 'Savings', color: '#3b82f6', icon: '💰' },
  debt_payments: { label: 'Debt Payments', color: '#ef4444', icon: '💳' },
};

const ALL_GROUPS: BudgetGroupKey[] = ['needs', 'wants', 'tithes', 'savings', 'debt_payments'];

export const renderBudget = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Budget Management</h2>
        <p class="page-subtitle">Set your own allocation groups and track monthly spending limits.</p>
      </div>
      <button class="btn btn-primary" id="btn-configure-allocation">⚙️ Configure Allocations</button>
    </div>

    <!-- Allocation Summary Bar -->
    <div class="glass-card animate-in stagger-2" id="allocation-summary-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--space-md);">
        <h3>Your Budget Allocations</h3>
        <span id="alloc-total-pct" style="font-weight:700; font-size:var(--font-lg);"></span>
      </div>
      <div id="allocation-bar" style="height:20px; display:flex; border-radius:var(--radius-full); overflow:hidden; background:var(--bg-tertiary);"></div>
      <div id="allocation-legend" style="display:flex; flex-wrap:wrap; gap: var(--space-md); margin-top: var(--space-md);"></div>
    </div>

    <!-- Allocation Config Modal (hidden) -->
    <div id="alloc-modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1000; align-items:center; justify-content:center;">
      <div class="glass-card" style="width:min(580px,95vw); max-height:90vh; overflow-y:auto; position:relative; padding: var(--space-xl);">
        <button id="alloc-modal-close" style="position:absolute; top:var(--space-md); right:var(--space-md); background:none; border:none; color:var(--text-primary); font-size:1.5rem; cursor:pointer;">✕</button>
        <h3 style="margin-bottom: var(--space-xs);">⚙️ Configure Allocations</h3>
        <p style="color:var(--text-muted); font-size:var(--font-sm); margin-bottom:var(--space-xl);">Choose 3–5 groups and set percentages that total 100%.</p>

        <div id="alloc-group-selector" style="display:flex; flex-wrap:wrap; gap:var(--space-sm); margin-bottom:var(--space-xl);"></div>

        <div id="alloc-sliders" style="display:flex; flex-direction:column; gap:var(--space-lg); margin-bottom:var(--space-xl);"></div>

        <div style="display:flex; align-items:center; justify-content:space-between;">
          <span id="alloc-sum-display" style="font-weight:700; font-size:var(--font-lg);"></span>
          <div style="display:flex; gap:var(--space-sm);">
            <button class="btn btn-ghost btn-sm" id="alloc-auto-balance">Auto-balance</button>
            <button class="btn btn-primary" id="alloc-save">Save Allocations</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="stats-grid animate-in stagger-3" id="budget-stats">
      <div class="glass-card stat-card income">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Monthly Income</div>
        <div class="stat-value" id="budget-income">Loading…</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">📊</div>
        <div class="stat-label">Total Budget Set</div>
        <div class="stat-value" id="budget-total">Loading…</div>
      </div>
      <div class="glass-card stat-card balance">
        <div class="stat-icon">🔥</div>
        <div class="stat-label">Over-budget Categories</div>
        <div class="stat-value" id="budget-over">—</div>
      </div>
    </div>

    <!-- Category Limits -->
    <div class="glass-card animate-in stagger-4">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-xl);">
        <h3>Category Limits</h3>
        <button class="btn btn-primary btn-sm" id="btn-suggest-budget">✨ AI Suggest Budget</button>
      </div>
      <div id="budget-list" style="display:flex; flex-direction:column; gap:var(--space-lg);">
        <div class="empty-state">Loading budgets…</div>
      </div>
    </div>
  `;

  // ── State ────────────────────────────────────────────────────────────────
  let currentAllocations: BudgetAllocation[] = [];

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmt = (n: number) => '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const renderAllocationBar = (allocs: BudgetAllocation[]) => {
    const bar = document.getElementById('allocation-bar')!;
    const legend = document.getElementById('allocation-legend')!;
    const totalEl = document.getElementById('alloc-total-pct')!;

    const total = allocs.reduce((s, a) => s + a.percentage, 0);
    totalEl.textContent = `${total.toFixed(1)}%`;
    totalEl.style.color = Math.abs(total - 100) < 0.1 ? 'var(--income-color)' : 'var(--expense-color)';

    bar.innerHTML = allocs.map(a => {
      const m = GROUP_META[a.group_key];
      return `<div style="width:${a.percentage}%; background:${m.color}; transition:width 0.5s ease;" title="${m.label} ${a.percentage}%"></div>`;
    }).join('');

    legend.innerHTML = allocs.map(a => {
      const m = GROUP_META[a.group_key];
      return `<div style="display:flex; align-items:center; gap:6px; font-size:var(--font-sm);">
        <span style="width:12px; height:12px; border-radius:3px; background:${m.color}; display:inline-block;"></span>
        <span>${m.icon} ${m.label} <strong>${a.percentage}%</strong></span>
      </div>`;
    }).join('');
  };

  // ── Load Allocation ──────────────────────────────────────────────────────
  const loadAllocation = async () => {
    try {
      const res = await api.getBudgetAllocation();
      currentAllocations = res.allocations || [];
      renderAllocationBar(currentAllocations);
    } catch {
      /* use empty */
    }
  };

  // ── Load Budgets ─────────────────────────────────────────────────────────
  const loadBudgets = async () => {
    try {
      const [data, summary] = await Promise.all([api.getBudgets(), api.getDashboard().catch(() => null)]);
      const list = document.getElementById('budget-list')!;

      const incomeEl = document.getElementById('budget-income')!;
      const totalEl = document.getElementById('budget-total')!;
      const overEl = document.getElementById('budget-over')!;

      if (summary) incomeEl.textContent = fmt(summary.monthly_income);
      else incomeEl.textContent = 'N/A';

      totalEl.textContent = fmt(data.total_budget ?? 0);

      if (!data.data || data.data.length === 0) {
        list.innerHTML = '<div class="empty-state">No budgets set. Use "AI Suggest Budget" to get started!</div>';
        overEl.textContent = '—';
        return;
      }

      let overCount = 0;
      list.innerHTML = data.data.map((b: Budget) => {
        const spent = b.spent ?? 0;
        const percent = Math.min(100, (spent / b.amount) * 100);
        const over = spent > b.amount;
        if (over) overCount++;
        const group = b.budget_group as BudgetGroupKey | null;
        const groupColor = group ? GROUP_META[group]?.color ?? 'var(--accent-primary)' : 'var(--accent-primary)';
        const groupLabel = group ? (GROUP_META[group]?.label ?? group) : '';
        return `
          <div class="budget-item">
            <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-xs);">
              <span style="font-weight:600;">${escapeHtml(b.category_name)} ${groupLabel ? `<small style="color:var(--text-muted); font-weight:400;">(${groupLabel})</small>` : ''}</span>
              <span style="color:${over ? 'var(--expense-color)' : 'var(--text-muted)'};">${fmt(spent)} / ${fmt(b.amount)}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill ${over ? 'over' : ''}" style="width:${percent}%; background:${groupColor};"></div>
            </div>
            ${over ? `<div style="color:var(--expense-color); font-size:var(--font-xs); margin-top:4px; text-transform:uppercase; letter-spacing:1px; font-weight:700;">⚠ Over budget!</div>` : ''}
          </div>
        `;
      }).join('');
      overEl.textContent = String(overCount);
      overEl.style.color = overCount > 0 ? 'var(--expense-color)' : 'var(--income-color)';
    } catch (err) {
      console.error(err);
    }
  };

  // ── Allocation Config Modal ──────────────────────────────────────────────
  let selectedGroups: Set<BudgetGroupKey> = new Set();
  let sliderValues: Partial<Record<BudgetGroupKey, number>> = {};

  const openModal = () => {
    selectedGroups = new Set(currentAllocations.map(a => a.group_key));
    sliderValues = Object.fromEntries(currentAllocations.map(a => [a.group_key, a.percentage]));
    if (selectedGroups.size === 0) {
      selectedGroups = new Set(['needs', 'wants', 'savings'] as BudgetGroupKey[]);
      sliderValues = { needs: 50, wants: 30, savings: 20 };
    }
    renderModal();
    const overlay = document.getElementById('alloc-modal-overlay')!;
    overlay.style.display = 'flex';
  };

  const renderModal = () => {
    // Group chips
    const chipContainer = document.getElementById('alloc-group-selector')!;
    chipContainer.innerHTML = ALL_GROUPS.map(g => {
      const active = selectedGroups.has(g);
      const m = GROUP_META[g];
      return `<button class="alloc-chip ${active ? 'active' : ''}" data-group="${g}"
        style="border:2px solid ${active ? m.color : 'var(--border-color)'}; background:${active ? m.color + '22' : 'transparent'}; color:var(--text-primary); padding:6px 14px; border-radius:var(--radius-full); cursor:pointer; font-size:var(--font-sm); transition:all 0.2s;">
        ${m.icon} ${m.label}
      </button>`;
    }).join('');

    chipContainer.querySelectorAll('.alloc-chip').forEach(el => {
      el.addEventListener('click', () => {
        const g = (el as HTMLElement).dataset.group as BudgetGroupKey;
        if (selectedGroups.has(g)) {
          if (selectedGroups.size <= 3) { showToast('Minimum 3 groups required', 'info'); return; }
          selectedGroups.delete(g);
          delete sliderValues[g];
        } else {
          if (selectedGroups.size >= 5) { showToast('Maximum 5 groups allowed', 'info'); return; }
          selectedGroups.add(g);
          sliderValues[g] = 0;
        }
        renderModal();
      });
    });

    // Sliders
    const sliderContainer = document.getElementById('alloc-sliders')!;
    sliderContainer.innerHTML = [...selectedGroups].map(g => {
      const m = GROUP_META[g];
      const val = sliderValues[g] ?? 0;
      return `
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:var(--font-sm);">
            <span>${m.icon} ${m.label}</span>
            <span id="lbl-${g}" style="font-weight:700; color:${m.color};">${val}%</span>
          </div>
          <input type="range" id="slider-${g}" data-group="${g}" min="0" max="100" step="1" value="${val}"
            style="width:100%; accent-color:${m.color};" />
        </div>
      `;
    }).join('');

    sliderContainer.querySelectorAll('input[type="range"]').forEach(el => {
      el.addEventListener('input', () => {
        const g = (el as HTMLInputElement).dataset.group as BudgetGroupKey;
        sliderValues[g] = Number((el as HTMLInputElement).value);
        const lbl = document.getElementById(`lbl-${g}`);
        if (lbl) lbl.textContent = `${sliderValues[g]}%`;
        updateSumDisplay();
      });
    });

    updateSumDisplay();
  };

  const updateSumDisplay = () => {
    const sum = [...selectedGroups].reduce((acc, g) => acc + (sliderValues[g] ?? 0), 0);
    const el = document.getElementById('alloc-sum-display')!;
    el.textContent = `Total: ${sum.toFixed(1)}%`;
    el.style.color = Math.abs(sum - 100) < 0.1 ? 'var(--income-color)' : 'var(--expense-color)';
  };

  // Wire up modal buttons
  document.getElementById('btn-configure-allocation')?.addEventListener('click', openModal);

  document.getElementById('alloc-modal-close')?.addEventListener('click', () => {
    (document.getElementById('alloc-modal-overlay') as HTMLElement).style.display = 'none';
  });

  document.getElementById('alloc-modal-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'alloc-modal-overlay') {
      (document.getElementById('alloc-modal-overlay') as HTMLElement).style.display = 'none';
    }
  });

  document.getElementById('alloc-auto-balance')?.addEventListener('click', () => {
    const groups = [...selectedGroups];
    const equal = Math.floor(100 / groups.length);
    const remainder = 100 - equal * groups.length;
    groups.forEach((g, i) => { sliderValues[g] = equal + (i === 0 ? remainder : 0); });
    renderModal();
  });

  document.getElementById('alloc-save')?.addEventListener('click', async () => {
    const allocations: BudgetAllocation[] = [...selectedGroups].map(g => ({ group_key: g, percentage: sliderValues[g] ?? 0 }));
    const sum = allocations.reduce((s, a) => s + a.percentage, 0);
    if (Math.abs(sum - 100) > 0.5) { showToast(`Percentages must total 100% (currently ${sum.toFixed(1)}%)`, 'error'); return; }
    try {
      const res = await api.updateBudgetAllocation(allocations);
      currentAllocations = res.allocations;
      renderAllocationBar(currentAllocations);
      (document.getElementById('alloc-modal-overlay') as HTMLElement).style.display = 'none';
      showToast('Allocations saved!', 'success');
    } catch {
      showToast('Failed to save allocations', 'error');
    }
  });

  // ── AI Suggest ───────────────────────────────────────────────────────────
  document.getElementById('btn-suggest-budget')?.addEventListener('click', async () => {
    let income = 5000;
    try { const s = await api.getDashboard(); income = s.monthly_income || 5000; } catch { /* fallback */ }
    try {
      await api.suggestBudgets(income);
      showToast(`Budget suggested based on ${fmt(income)} monthly income`, 'success');
      loadBudgets();
    } catch {
      showToast('Failed to generate suggestions', 'error');
    }
  });

  await Promise.all([loadAllocation(), loadBudgets()]);
};
