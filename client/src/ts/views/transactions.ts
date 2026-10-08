import { api } from '../api.js';
import { showToast } from '../main.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { Transaction, Category } from '../types.js';

export const renderTransactions = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Transactions</h2>
        <p class="page-subtitle">Track, filter, and manage your income and expenses.</p>
      </div>
      <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
        <button class="btn btn-ghost" id="btn-export-csv" title="Export to CSV file">
          📥 Export CSV
        </button>
        <button class="btn btn-primary" id="btn-new-tx">
          + Add Transaction
        </button>
      </div>
    </div>

    <div class="glass-card animate-in stagger-2">
      <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-lg); flex-wrap: wrap; align-items: center;">
        <input type="text" class="form-input" placeholder="Search description or category..." id="tx-search" style="flex: 1; min-width: 220px;">
        <select class="form-select" id="tx-filter-type" style="min-width: 140px;">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select class="form-select" id="tx-filter-date" style="min-width: 150px;">
          <option value="">All Time</option>
          <option value="current_month">This Month</option>
          <option value="last_30">Last 30 Days</option>
          <option value="last_90">Last 90 Days</option>
        </select>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody id="tx-list">
            <tr><td colspan="5" class="empty-state">Loading...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination controls -->
      <div id="tx-pagination" style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--space-lg); padding-top: var(--space-md); border-top: 1px solid var(--border-subtle); font-size: var(--font-sm); color: var(--text-muted);">
        <span id="tx-count-label">Showing 0 of 0</span>
        <div style="display: flex; gap: var(--space-sm); align-items: center;">
          <button class="btn btn-ghost btn-sm" id="btn-prev-page" disabled>&larr; Previous</button>
          <span id="tx-page-label" style="font-weight: 600; color: var(--text-primary);">Page 1</span>
          <button class="btn btn-ghost btn-sm" id="btn-next-page" disabled>Next &rarr;</button>
        </div>
      </div>
    </div>
  `;

  // Append Modal HTML to body
  document.getElementById('tx-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="tx-modal" class="modal-overlay hidden">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="tx-modal-title">New Transaction</h3>
          <button class="modal-close" id="btn-close-modal">&times;</button>
        </div>
        <form id="tx-form" style="padding: var(--space-lg);">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="tx-type">Type</label>
              <select class="form-select" id="tx-type" required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="tx-date">Date</label>
              <input type="date" class="form-input" id="tx-date" required>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label" for="tx-amount">Amount (₱)</label>
            <input type="number" step="0.01" min="0.01" class="form-input" id="tx-amount" placeholder="0.00" required>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label" for="tx-category">Category</label>
            <select class="form-select" id="tx-category" required>
              <option value="">Select Category...</option>
            </select>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label" for="tx-description">Description</label>
            <input type="text" class="form-input" id="tx-description" placeholder="e.g. Monthly salary, Groceries" required>
          </div>
          <div style="margin-top: var(--space-xl); display: flex; justify-content: flex-end; gap: var(--space-md);">
            <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary" id="btn-save-tx">Save Transaction</button>
          </div>
        </form>
      </div>
    </div>
  `);

  // State
  let categoriesCache: Category[] = [];
  let currentTransactions: Transaction[] = [];
  let editingTxId: number | null = null;
  const limit = 20;
  let offset = 0;
  let totalCount = 0;
  let debounceTimeout: any = null;

  const getDateRange = (filterType: string): { from?: string; to?: string } => {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    if (filterType === 'current_month') {
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: fromDate.toISOString().split('T')[0], to };
    }
    if (filterType === 'last_30') {
      const fromDate = new Date();
      fromDate.setDate(now.getDate() - 30);
      return { from: fromDate.toISOString().split('T')[0], to };
    }
    if (filterType === 'last_90') {
      const fromDate = new Date();
      fromDate.setDate(now.getDate() - 90);
      return { from: fromDate.toISOString().split('T')[0], to };
    }
    return {};
  };

  const getActiveFilters = () => {
    const searchInput = document.getElementById('tx-search') as HTMLInputElement | null;
    const typeSelect = document.getElementById('tx-filter-type') as HTMLSelectElement | null;
    const dateSelect = document.getElementById('tx-filter-date') as HTMLSelectElement | null;

    const search = searchInput?.value.trim() || undefined;
    const type = typeSelect?.value || undefined;
    const dateRange = getDateRange(dateSelect?.value || '');

    return {
      search,
      type,
      from: dateRange.from,
      to: dateRange.to,
      limit: String(limit),
      offset: String(offset),
    };
  };

  const loadTransactions = async () => {
    try {
      const params = getActiveFilters();
      const response = await api.getTransactions(params as Record<string, string>);
      currentTransactions = response.data ?? [];
      totalCount = response.total ?? currentTransactions.length;

      const list = document.getElementById('tx-list');
      const countLabel = document.getElementById('tx-count-label');
      const pageLabel = document.getElementById('tx-page-label');
      const prevBtn = document.getElementById('btn-prev-page') as HTMLButtonElement | null;
      const nextBtn = document.getElementById('btn-next-page') as HTMLButtonElement | null;

      if (!list) return;

      if (countLabel) {
        const start = totalCount === 0 ? 0 : offset + 1;
        const end = Math.min(offset + limit, totalCount);
        countLabel.textContent = `Showing ${start}–${end} of ${totalCount}`;
      }

      if (pageLabel) {
        const currentPage = Math.floor(offset / limit) + 1;
        const totalPages = Math.max(1, Math.ceil(totalCount / limit));
        pageLabel.textContent = `Page ${currentPage} of ${totalPages}`;
      }

      if (prevBtn) prevBtn.disabled = offset === 0;
      if (nextBtn) nextBtn.disabled = offset + limit >= totalCount;

      if (currentTransactions.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions match your search or filter.</td></tr>';
        return;
      }

      list.innerHTML = currentTransactions.map((tx: Transaction) => `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString()}</td>
          <td>${escapeHtml(tx.description ?? '—')}</td>
          <td><span class="badge badge-${tx.type}">${escapeHtml(tx.category_icon ? tx.category_icon + ' ' : '')}${escapeHtml(tx.category_name || 'Uncategorized')}</span></td>
          <td style="color: ${tx.type === 'income' ? 'var(--income-color, #34d399)' : 'var(--expense-color, #ef4444)'}; font-weight: 600;">
            ${tx.type === 'income' ? '+' : '-'}₱${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </td>
          <td style="text-align: right;">
            <button class="btn btn-icon btn-ghost edit-tx" data-id="${tx.id}" title="Edit transaction">✏️</button>
            <button class="btn btn-icon btn-ghost delete-tx" data-id="${tx.id}" title="Delete transaction">🗑️</button>
          </td>
        </tr>
      `).join('');

      // Attach edit listeners
      document.querySelectorAll('.edit-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).dataset.id);
          const tx = currentTransactions.find(t => t.id === id);
          if (tx) openModal(tx);
        });
      });

      // Attach delete listeners
      document.querySelectorAll('.delete-tx').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = (e.currentTarget as HTMLButtonElement).dataset.id;
          if (id && confirm('Delete this transaction?')) {
            await api.deleteTransaction(Number(id));
            showToast('Transaction deleted', 'success');
            loadTransactions();
          }
        });
      });
    } catch (err) {
      console.error(err);
      showToast('Failed to load transactions', 'error');
    }
  };

  const loadCategories = async () => {
    try {
      categoriesCache = await api.getCategories();
      populateCategoryDropdown(categoriesCache);
    } catch (err) {
      console.error(err);
    }
  };

  const populateCategoryDropdown = (categories: Category[], selectedType?: 'income' | 'expense') => {
    const select = document.getElementById('tx-category') as HTMLSelectElement | null;
    if (!select) return;

    let filtered = categories;
    if (selectedType) {
      filtered = categories.filter(c => c.type === selectedType || c.type === 'both');
    }

    select.innerHTML = '<option value="">Select Category...</option>' +
      filtered.map((c: Category) => `<option value="${c.id}">${c.icon ? escapeHtml(c.icon) + ' ' : ''}${escapeHtml(c.name)}</option>`).join('');
  };

  // Wire search and filter inputs
  const searchInput = document.getElementById('tx-search');
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      offset = 0;
      loadTransactions();
    }, 250);
  });

  document.getElementById('tx-filter-type')?.addEventListener('change', () => {
    offset = 0;
    loadTransactions();
  });

  document.getElementById('tx-filter-date')?.addEventListener('change', () => {
    offset = 0;
    loadTransactions();
  });

  // Wire pagination buttons
  document.getElementById('btn-prev-page')?.addEventListener('click', () => {
    if (offset >= limit) {
      offset -= limit;
      loadTransactions();
    }
  });

  document.getElementById('btn-next-page')?.addEventListener('click', () => {
    if (offset + limit < totalCount) {
      offset += limit;
      loadTransactions();
    }
  });

  // Modal logic
  const modal = document.getElementById('tx-modal');
  const modalTitle = document.getElementById('tx-modal-title');
  const saveBtn = document.getElementById('btn-save-tx');
  const typeSelect = document.getElementById('tx-type') as HTMLSelectElement | null;

  typeSelect?.addEventListener('change', () => {
    populateCategoryDropdown(categoriesCache, typeSelect.value as 'income' | 'expense');
  });

  const openModal = (tx?: Transaction) => {
    editingTxId = tx?.id ?? null;
    if (modal) modal.classList.remove('hidden');

    if (modalTitle) modalTitle.textContent = tx ? 'Edit Transaction' : 'New Transaction';
    if (saveBtn) saveBtn.textContent = tx ? 'Update Transaction' : 'Save Transaction';

    const typeInput = document.getElementById('tx-type') as HTMLSelectElement;
    const dateInput = document.getElementById('tx-date') as HTMLInputElement;
    const amountInput = document.getElementById('tx-amount') as HTMLInputElement;
    const categorySelect = document.getElementById('tx-category') as HTMLSelectElement;
    const descInput = document.getElementById('tx-description') as HTMLInputElement;

    if (tx) {
      typeInput.value = tx.type;
      populateCategoryDropdown(categoriesCache, tx.type);
      dateInput.value = tx.date ? tx.date.substring(0, 10) : new Date().toISOString().split('T')[0];
      amountInput.value = String(tx.amount);
      categorySelect.value = tx.category_id ? String(tx.category_id) : '';
      descInput.value = tx.description || '';
    } else {
      typeInput.value = 'expense';
      populateCategoryDropdown(categoriesCache, 'expense');
      dateInput.valueAsDate = new Date();
      amountInput.value = '';
      categorySelect.value = '';
      descInput.value = '';
    }
  };

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
    (document.getElementById('tx-form') as HTMLFormElement)?.reset();
    editingTxId = null;
  };

  document.getElementById('btn-new-tx')?.addEventListener('click', () => openModal());
  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Form submission (handles both Create and Edit)
  document.getElementById('tx-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const typeRaw = (document.getElementById('tx-type') as HTMLSelectElement).value;
    const dateVal = (document.getElementById('tx-date') as HTMLInputElement).value;
    const amountVal = parseFloat((document.getElementById('tx-amount') as HTMLInputElement).value);
    const catVal = (document.getElementById('tx-category') as HTMLSelectElement).value;
    const descVal = (document.getElementById('tx-description') as HTMLInputElement).value.trim();

    if (typeRaw !== 'income' && typeRaw !== 'expense') { showToast('Invalid transaction type', 'error'); return; }
    if (isNaN(amountVal) || amountVal <= 0) { showToast('Amount must be greater than ₱0', 'error'); return; }
    if (!catVal) { showToast('Please select a category', 'error'); return; }
    if (!descVal) { showToast('Please enter a description', 'error'); return; }
    if (!dateVal) { showToast('Please select a date', 'error'); return; }

    const submitBtn = document.getElementById('btn-save-tx') as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      if (editingTxId !== null) {
        await api.updateTransaction(editingTxId, {
          type: typeRaw,
          date: dateVal,
          amount: amountVal,
          category_id: parseInt(catVal),
          description: descVal,
        });
        showToast('Transaction updated successfully!', 'success');
      } else {
        await api.createTransaction({
          type: typeRaw,
          date: dateVal,
          amount: amountVal,
          category_id: parseInt(catVal),
          description: descVal,
        });
        showToast('Transaction added successfully!', 'success');
      }
      closeModal();
      loadTransactions();
    } catch (err: any) {
      showToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = editingTxId ? 'Update Transaction' : 'Save Transaction';
    }
  });

  // CSV Export
  document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
    try {
      showToast('Generating CSV export...', 'info');
      // Fetch all transactions matching current filters (up to 200 limit)
      const params = getActiveFilters();
      params.limit = '200';
      params.offset = '0';
      const res = await api.getTransactions(params as Record<string, string>);
      const txs = res.data || [];

      if (txs.length === 0) {
        showToast('No transactions to export', 'error');
        return;
      }

      const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount (PHP)'];
      const rows = txs.map(t => [
        t.id,
        t.date ? t.date.substring(0, 10) : '',
        t.type,
        `"${(t.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2),
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FinanceWise_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('CSV export downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export CSV', 'error');
    }
  });

  await loadCategories();
  await loadTransactions();
};
