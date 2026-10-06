import { api } from '../api.js';
import { showToast } from '../main.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { BillItem, CreateBillDTO } from '../types.js';

const fmt = (n: number) => '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const isDueSoon = (due: string | null) => {
  if (!due) return false;
  const diff = (new Date(due).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 7;
};
const isOverdue = (due: string | null) => {
  if (!due) return false;
  return new Date(due).getTime() < Date.now();
};

export const renderBills = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;
  // Remove any stale modal from a previous visit before re-rendering.
  document.getElementById('bills-modal-overlay')?.remove();

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Bills &amp; Payments</h2>
        <p class="page-subtitle">Track bills to pay and items to buy, separate from your debt tracker.</p>
      </div>
      <button type="button" class="btn btn-primary" id="btn-add-item">+ Add Item</button>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid animate-in stagger-2">
      <div class="glass-card stat-card expense">
        <div class="stat-icon">🧾</div>
        <div class="stat-label">Pending Bills</div>
        <div class="stat-value" id="stat-pending-bills">—</div>
      </div>
      <div class="glass-card stat-card balance">
        <div class="stat-icon">🛒</div>
        <div class="stat-label">Pending To-Buy</div>
        <div class="stat-value" id="stat-pending-buy">—</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="glass-card animate-in stagger-3">
      <div style="display:flex; gap:var(--space-sm); margin-bottom:var(--space-xl); border-bottom:1px solid var(--border-color); padding-bottom:var(--space-md);">
        <button class="bills-tab btn btn-ghost" data-tab="all" style="border-radius:var(--radius-sm);">All</button>
        <button class="bills-tab btn btn-ghost" data-tab="bill">Bills to Pay</button>
        <button class="bills-tab btn btn-ghost" data-tab="to_buy">To Buy</button>
        <button class="bills-tab btn btn-ghost" data-tab="completed" style="margin-left:auto;">✅ Completed</button>
      </div>
      <div id="bills-list" style="display:flex; flex-direction:column; gap:var(--space-md);">
        <div class="empty-state">Loading…</div>
      </div>
    </div>
  `;

  // ── Build modal directly on <body> (never inside container.innerHTML) ──────
  // This avoids the fragile "inject-then-move" pattern that caused the modal
  // to sometimes be unreachable when the page-container was mid-animation.
  const billsModal = document.createElement('div');
  billsModal.id = 'bills-modal-overlay';
  billsModal.className = 'modal-overlay hidden';
  billsModal.style.cssText = 'background:rgba(0,0,0,0.65); z-index:1000;';
  billsModal.innerHTML = `
    <div class="glass-card" style="width:min(520px,95vw); max-height:90vh; overflow-y:auto; padding:var(--space-xl); position:relative;">
      <button id="bills-modal-close" style="position:absolute; top:var(--space-md); right:var(--space-md); background:none; border:none; color:var(--text-primary); font-size:1.5rem; cursor:pointer;">✕</button>
      <h3 id="modal-title" style="margin-bottom:var(--space-xl);">Add Item</h3>
      <form id="bills-form" style="display:flex; flex-direction:column; gap:var(--space-lg);">
        <div>
          <label style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:4px; display:block;">Type</label>
          <div style="display:flex; gap:var(--space-sm);">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:8px 16px; border-radius:var(--radius-sm); border:2px solid var(--border-color); flex:1; justify-content:center; transition:background-color .15s, border-color .15s, color .15s;" id="type-bill-label">
              <input type="radio" name="item_type" value="bill" checked style="display:none;" id="radio-bill" />
              🧾 Bill to Pay
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:8px 16px; border-radius:var(--radius-sm); border:2px solid var(--border-color); flex:1; justify-content:center; transition:background-color .15s, border-color .15s, color .15s;" id="type-buy-label">
              <input type="radio" name="item_type" value="to_buy" style="display:none;" id="radio-buy" />
              🛒 To Buy
            </label>
          </div>
        </div>
        <div>
          <label for="bill-name" style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:4px; display:block;">Name *</label>
          <input type="text" id="bill-name" class="form-input" placeholder="e.g. Electric bill, Netflix…" required />
        </div>
        <div>
          <label for="bill-amount" style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:4px; display:block;">Amount *</label>
          <input type="number" id="bill-amount" class="form-input" placeholder="0.00" step="0.01" min="0" required />
        </div>
        <div>
          <label for="bill-due" style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:4px; display:block;">Due Date</label>
          <input type="date" id="bill-due" class="form-input" />
        </div>
        <div>
          <label for="bill-notes" style="font-size:var(--font-sm); color:var(--text-muted); margin-bottom:4px; display:block;">Notes</label>
          <textarea id="bill-notes" class="form-input" rows="2" placeholder="Optional notes…" style="resize:vertical;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:var(--space-sm);">
          <button type="button" class="btn btn-ghost" id="bills-form-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="bills-form-submit">Add Item</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(billsModal);


  let activeTab: string = 'all';
  let editingId: number | null = null;
  let allItems: BillItem[] = [];

  // ── Radio button style ───────────────────────────────────────────────────
  const syncRadioStyles = () => {
    const billLbl = billsModal.querySelector('#type-bill-label') as HTMLLabelElement | null;
    const buyLbl = billsModal.querySelector('#type-buy-label') as HTMLLabelElement | null;
    const billRadio = billsModal.querySelector('#radio-bill') as HTMLInputElement | null;
    const buyRadio = billsModal.querySelector('#radio-buy') as HTMLInputElement | null;

    if (!billLbl || !buyLbl || !billRadio || !buyRadio) return;

    const update = () => {
      const setSelectedStyle = (label: HTMLLabelElement, selected: boolean) => {
        label.style.borderColor = selected ? 'var(--accent-primary)' : 'var(--border-color)';
        label.style.backgroundColor = selected ? 'var(--accent-primary)' : 'transparent';
        label.style.color = selected ? '#fff' : 'var(--text-primary)';
        label.style.fontWeight = selected ? '700' : '400';
        label.style.boxShadow = selected ? '0 0 0 2px color-mix(in srgb, var(--accent-primary) 30%, transparent)' : 'none';
        label.setAttribute('aria-checked', String(selected));
      };

      setSelectedStyle(billLbl, billRadio.checked);
      setSelectedStyle(buyLbl, buyRadio.checked);
    };
    update();
  };

  const billLbl = billsModal.querySelector('#type-bill-label') as HTMLLabelElement | null;
  const buyLbl = billsModal.querySelector('#type-buy-label') as HTMLLabelElement | null;
  const billRadio = billsModal.querySelector('#radio-bill') as HTMLInputElement | null;
  const buyRadio = billsModal.querySelector('#radio-buy') as HTMLInputElement | null;
  if (!billLbl || !buyLbl || !billRadio || !buyRadio) {
    console.error('Bills modal type controls are missing');
    return;
  }
  billLbl.addEventListener('click', () => { billRadio.checked = true; syncRadioStyles(); });
  buyLbl.addEventListener('click', () => { buyRadio.checked = true; syncRadioStyles(); });
  billRadio.addEventListener('change', syncRadioStyles);
  buyRadio.addEventListener('change', syncRadioStyles);
  syncRadioStyles();

  // The router removes this modal as soon as navigation starts. Check the
  // actual mounted element instead of a module-level render counter: a counter
  // can drift after a route remount and incorrectly reject the live button.
  const isActiveView = () =>
    billsModal.isConnected &&
    document.getElementById('bills-modal-overlay') === billsModal;

  // ── Tabs ─────────────────────────────────────────────────────────────────
  const setActiveTab = (tab: string) => {
    activeTab = tab;
    document.querySelectorAll('.bills-tab').forEach(el => {
      const t = (el as HTMLElement).dataset.tab;
      (el as HTMLElement).classList.toggle('btn-primary', t === tab);
      (el as HTMLElement).classList.toggle('btn-ghost', t !== tab);
    });
    renderList();
  };

  document.querySelectorAll('.bills-tab').forEach(el => {
    el.addEventListener('click', () => setActiveTab((el as HTMLElement).dataset.tab!));
  });

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    try {
      const res = await api.getBills();
      if (!isActiveView()) return;
      allItems = res.data;
      const pendingBills = document.getElementById('stat-pending-bills');
      const pendingBuy = document.getElementById('stat-pending-buy');
      if (!pendingBills || !pendingBuy) return;
      pendingBills.textContent = fmt(res.total_pending_bills);
      pendingBuy.textContent = fmt(res.total_pending_to_buy);
      renderList();
    } catch {
      showToast('Failed to load bills', 'error');
    }
  };

  const renderList = () => {
    if (!isActiveView()) return;
    const list = document.getElementById('bills-list');
    if (!list) return;
    let items = allItems;
    if (activeTab === 'bill') items = allItems.filter(i => i.item_type === 'bill' && i.status === 'pending');
    else if (activeTab === 'to_buy') items = allItems.filter(i => i.item_type === 'to_buy' && i.status === 'pending');
    else if (activeTab === 'completed') items = allItems.filter(i => i.status === 'completed');
    else items = allItems.filter(i => i.status === 'pending');

    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state">No items here yet! ${activeTab !== 'completed' ? 'Click <strong>+ Add Item</strong> to add one.' : ''}</div>`;
      return;
    }

    list.innerHTML = items.map(item => {
      const completed = item.status === 'completed';
      const overdue = !completed && isOverdue(item.due_date);
      const soon = !completed && !overdue && isDueSoon(item.due_date);
      const typeLabel = item.item_type === 'bill' ? '🧾 Bill' : '🛒 To Buy';
      const typeColor = item.item_type === 'bill' ? 'var(--expense-color)' : 'var(--accent-primary)';
      const dueBadge = overdue
        ? `<span style="background:var(--expense-color); color:#fff; padding:2px 8px; border-radius:var(--radius-full); font-size:11px; font-weight:700;">OVERDUE</span>`
        : soon ? `<span style="background:#f59e0b; color:#000; padding:2px 8px; border-radius:var(--radius-full); font-size:11px; font-weight:700;">DUE SOON</span>` : '';

      return `
        <div class="bill-item ${completed ? 'completed' : ''}" data-id="${item.id}" style="
          display:flex; align-items:flex-start; gap:var(--space-md); padding:var(--space-md) var(--space-lg);
          border-radius:var(--radius-md); border:1px solid ${overdue ? 'var(--expense-color)' : soon ? '#f59e0b' : 'var(--border-color)'};
          background:var(--bg-secondary); opacity:${completed ? 0.6 : 1}; transition:opacity 0.2s;
        ">
          <!-- Check circle -->
          ${!completed ? `<button class="btn-check" data-id="${item.id}" title="Mark as ${item.item_type === 'bill' ? 'paid' : 'bought'}"
            style="width:28px; height:28px; border-radius:50%; border:2px solid ${typeColor}; background:none; cursor:pointer; flex-shrink:0; margin-top:2px; transition:background 0.2s; color:${typeColor}; font-size:14px; display:flex; align-items:center; justify-content:center;">
            ○
          </button>` : `<span style="width:28px; height:28px; border-radius:50%; background:var(--income-color); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:14px; margin-top:2px;">✓</span>`}

          <!-- Info -->
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:var(--space-sm); flex-wrap:wrap; margin-bottom:4px;">
              <span style="font-weight:600; font-size:var(--font-base);">${escapeHtml(item.name)}</span>
              <span style="color:${typeColor}; font-size:var(--font-xs); font-weight:600;">${typeLabel}</span>
              ${dueBadge}
            </div>
            <div style="display:flex; gap:var(--space-md); flex-wrap:wrap; font-size:var(--font-sm); color:var(--text-muted);">
              <span>📅 ${fmtDate(item.due_date)}</span>
              ${item.notes ? `<span title="${escapeHtml(item.notes ?? '')}">📝 ${escapeHtml(item.notes?.substring(0, 40) ?? '')}${(item.notes?.length ?? 0) > 40 ? '…' : ''}</span>` : ''}
            </div>
          </div>

          <!-- Amount & Actions -->
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-weight:700; font-size:var(--font-lg); color:${typeColor};">${fmt(item.amount)}</div>
            ${!completed ? `
              <div style="display:flex; gap:6px; margin-top:6px; justify-content:flex-end;">
                <button class="btn-edit btn btn-ghost btn-sm" data-id="${item.id}" title="Edit">✏️</button>
                <button class="btn-delete btn btn-ghost btn-sm" data-id="${item.id}" title="Delete" style="color:var(--expense-color);">🗑️</button>
              </div>` : `
              <div style="font-size:var(--font-xs); color:var(--income-color); margin-top:4px;">✓ Done</div>`}
          </div>
        </div>
      `;
    }).join('');

    // Wire up action buttons
    list.querySelectorAll('.btn-check').forEach(el => {
      el.addEventListener('click', async () => {
        const id = Number((el as HTMLElement).dataset.id);
        try {
          await api.payOrBuyItem(id, true);
          showToast('Marked as done!', 'success');
          loadAll();
        } catch { showToast('Failed to update', 'error'); }
      });
    });

    list.querySelectorAll('.btn-edit').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number((el as HTMLElement).dataset.id);
        const item = allItems.find(i => i.id === id);
        if (!item) return;
        openModal(item);
      });
    });

    list.querySelectorAll('.btn-delete').forEach(el => {
      el.addEventListener('click', async () => {
        if (!confirm('Delete this item?')) return;
        const id = Number((el as HTMLElement).dataset.id);
        try {
          await api.deleteBill(id);
          showToast('Deleted', 'success');
          loadAll();
        } catch { showToast('Failed to delete', 'error'); }
      });
    });
  };

  // ── Modal ────────────────────────────────────────────────────────────────
  const openModal = (item?: BillItem) => {
    if (!isActiveView()) return;

    editingId = item?.id ?? null;
    const title = billsModal.querySelector('#modal-title') as HTMLElement | null;
    const nameEl = billsModal.querySelector('#bill-name') as HTMLInputElement | null;
    const amtEl = billsModal.querySelector('#bill-amount') as HTMLInputElement | null;
    const dueEl = billsModal.querySelector('#bill-due') as HTMLInputElement | null;
    const notesEl = billsModal.querySelector('#bill-notes') as HTMLTextAreaElement | null;
    const billRadio = billsModal.querySelector('#radio-bill') as HTMLInputElement | null;
    const buyRadio = billsModal.querySelector('#radio-buy') as HTMLInputElement | null;
    const submitBtn = billsModal.querySelector('#bills-form-submit') as HTMLButtonElement | null;

    if (!title || !nameEl || !amtEl || !dueEl || !notesEl || !billRadio || !buyRadio || !submitBtn) {
      console.error('Bills modal controls are missing');
      return;
    }

    title.textContent = item ? 'Edit Item' : 'Add Item';
    submitBtn.textContent = item ? 'Save Changes' : 'Add Item';

    if (item) {
      nameEl.value = item.name;
      amtEl.value = String(item.amount);
      dueEl.value = item.due_date ? item.due_date.substring(0, 10) : '';
      notesEl.value = item.notes ?? '';
      if (item.item_type === 'to_buy') buyRadio.checked = true;
      else billRadio.checked = true;
    } else {
      nameEl.value = '';
      amtEl.value = '';
      dueEl.value = '';
      notesEl.value = '';
      billRadio.checked = true;
    }

    syncRadioStyles();
    billsModal.classList.remove('hidden');
    nameEl.focus();
  };

  const closeModal = () => {
    billsModal.classList.add('hidden');
    editingId = null;
  };

  // Keep this wired like the other add flows. The modal is mounted on <body>,
  // while the trigger remains in the freshly-rendered page container.
  document.getElementById('btn-add-item')?.addEventListener('click', () => openModal());
  billsModal?.querySelector('#bills-modal-close')?.addEventListener('click', closeModal);
  billsModal?.querySelector('#bills-form-cancel')?.addEventListener('click', closeModal);
  billsModal?.addEventListener('click', e => {
    if ((e.target as HTMLElement).id === 'bills-modal-overlay') closeModal();
  });

  billsModal?.querySelector('#bills-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isActiveView()) return;
    const nameEl = billsModal.querySelector('#bill-name') as HTMLInputElement;
    const amtEl = billsModal.querySelector('#bill-amount') as HTMLInputElement;
    const dueEl = billsModal.querySelector('#bill-due') as HTMLInputElement;
    const notesEl = billsModal.querySelector('#bill-notes') as HTMLTextAreaElement;
    const billRadio = billsModal.querySelector('#radio-bill') as HTMLInputElement;

    const data: CreateBillDTO = {
      item_type: billRadio.checked ? 'bill' : 'to_buy',
      name: nameEl.value.trim(),
      amount: Number(amtEl.value),
      due_date: dueEl.value || null,
      notes: notesEl.value.trim() || undefined,
    };

    try {
      if (editingId !== null) {
        await api.updateBill(editingId, { name: data.name, amount: data.amount, due_date: data.due_date, notes: data.notes });
        showToast('Item updated!', 'success');
      } else {
        await api.createBill(data);
        showToast('Item added!', 'success');
      }
      if (!isActiveView()) return;
      closeModal();
      loadAll();
    } catch {
      showToast('Failed to save item', 'error');
    }
  });

  // renderList is declared above; initialize the active tab only after it is
  // available. Calling setActiveTab earlier throws at runtime and prevents the
  // Add Item listener (and every subsequent setup step) from being registered.
  setActiveTab('all');
  loadAll();
};
