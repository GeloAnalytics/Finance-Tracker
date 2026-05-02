import { api } from '../api.js';
import { showToast } from '../main.js';

export const renderTransactions = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Transactions</h2>
        <p class="page-subtitle">Track your income and expenses.</p>
      </div>
      <button class="btn btn-primary" id="btn-new-tx">
        + Add Transaction
      </button>
    </div>

    <div class="glass-card animate-in stagger-2">
      <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-lg); flex-wrap: wrap;">
        <input type="text" class="form-input" placeholder="Search transactions..." id="tx-search" style="flex: 1; min-width: 200px;">
        <select class="form-select" id="tx-filter-type">
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select class="form-select" id="tx-filter-month">
          <option value="">All Time</option>
          <option value="current">Current Month</option>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tx-list">
            <tr><td colspan="5" class="empty-state">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Transaction Modal (Hidden by default) -->
    <div id="tx-modal" class="modal-overlay hidden">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3 class="modal-title">New Transaction</h3>
          <button class="modal-close" id="btn-close-modal">&times;</button>
        </div>
        <form id="tx-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-select" id="tx-type" required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" class="form-input" id="tx-date" required>
            </div>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label">Amount</label>
            <input type="number" step="0.01" class="form-input" id="tx-amount" required>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label">Category</label>
            <select class="form-select" id="tx-category" required>
              <option value="">Select Category...</option>
            </select>
          </div>
          <div class="form-group" style="margin-top: var(--space-md);">
            <label class="form-label">Description</label>
            <input type="text" class="form-input" id="tx-description" required>
          </div>
          <div style="margin-top: var(--space-xl); display: flex; justify-content: flex-end; gap: var(--space-md);">
            <button type="button" class="btn btn-ghost" id="btn-cancel-modal">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Transaction</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const loadTransactions = async () => {
    try {
      const transactions = await api.getTransactions();
      const list = document.getElementById('tx-list');
      if (!list) return;

      if (transactions.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions found.</td></tr>';
        return;
      }

      list.innerHTML = transactions.map((tx: any) => `
        <tr>
          <td>${new Date(tx.date).toLocaleDateString()}</td>
          <td>${tx.description}</td>
          <td><span class="badge badge-${tx.type}">${tx.category_name || 'Uncategorized'}</span></td>
          <td style="color: ${tx.type === 'income' ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: 600;">
            ${tx.type === 'income' ? '+' : '-'}$${parseFloat(tx.amount).toFixed(2)}
          </td>
          <td>
            <button class="btn btn-icon btn-ghost delete-tx" data-id="${tx.id}">🗑️</button>
          </td>
        </tr>
      `).join('');

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
      const categories = await api.getCategories();
      const select = document.getElementById('tx-category');
      if (select) {
        select.innerHTML = '<option value="">Select Category...</option>' + categories.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Modal logic
  const modal = document.getElementById('tx-modal');
  const openModal = () => {
    if (modal) modal.classList.remove('hidden');
    (document.getElementById('tx-date') as HTMLInputElement).valueAsDate = new Date();
  };
  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
    (document.getElementById('tx-form') as HTMLFormElement).reset();
  };

  document.getElementById('btn-new-tx')?.addEventListener('click', openModal);
  document.getElementById('btn-close-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

  // Form submission
  document.getElementById('tx-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      type: (document.getElementById('tx-type') as HTMLSelectElement).value,
      date: (document.getElementById('tx-date') as HTMLInputElement).value,
      amount: parseFloat((document.getElementById('tx-amount') as HTMLInputElement).value),
      categoryId: parseInt((document.getElementById('tx-category') as HTMLSelectElement).value),
      description: (document.getElementById('tx-description') as HTMLInputElement).value
    };

    try {
      await api.createTransaction(data);
      showToast('Transaction added successfully', 'success');
      closeModal();
      loadTransactions();
    } catch (err) {
      showToast('Failed to add transaction', 'error');
    }
  });

  loadCategories();
  loadTransactions();
};
