import { api } from '../api.js';

export const renderDashboard = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = `
    <div class="page-header animate-in stagger-1">
      <div>
        <h2 class="page-title">Dashboard</h2>
        <p class="page-subtitle">Welcome back! Here's your financial overview.</p>
      </div>
      <button class="btn btn-primary" onclick="window.location.hash='transactions'">
        + Add Transaction
      </button>
    </div>
    
    <div class="stats-grid animate-in stagger-2" id="dashboard-stats">
      <div class="glass-card stat-card balance">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total Balance</div>
        <div class="stat-value">...</div>
      </div>
      <div class="glass-card stat-card income">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Monthly Income</div>
        <div class="stat-value">...</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">📉</div>
        <div class="stat-label">Monthly Expenses</div>
        <div class="stat-value">...</div>
      </div>
      <div class="glass-card stat-card debt">
        <div class="stat-icon">💳</div>
        <div class="stat-label">Total Debt</div>
        <div class="stat-value">...</div>
      </div>
    </div>
    
    <div class="charts-grid animate-in stagger-3">
      <div class="glass-card">
        <h3 style="margin-bottom: var(--space-md); text-transform: uppercase; letter-spacing: 1px;">Income vs Expenses</h3>
        <div class="chart-container" style="height: 250px; display: flex; align-items: flex-end; gap: var(--space-sm); justify-content: space-around; padding-top: var(--space-xl);">
          <!-- Mock Chart Bars -->
          <div style="width: 40px; height: 80%; background: #ffffff;"></div>
          <div style="width: 40px; height: 60%; background: #555555;"></div>
          <div style="width: 40px; height: 90%; background: #ffffff;"></div>
          <div style="width: 40px; height: 75%; background: #555555;"></div>
        </div>
      </div>
      <div class="glass-card">
        <h3 style="margin-bottom: var(--space-md); text-transform: uppercase; letter-spacing: 1px;">Spending by Category</h3>
        <div class="chart-container" style="height: 250px; display: flex; align-items: center; justify-content: center;">
          <!-- Mock Pie Chart / Circle -->
          <div style="width: 180px; height: 180px; border-radius: 50%; background: conic-gradient(#ffffff 0% 40%, #888888 40% 70%, #444444 70% 85%, #222222 85% 100%);"></div>
        </div>
      </div>
    </div>
    
    <div class="glass-card animate-in stagger-4">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h3>Recent Transactions</h3>
        <a href="#transactions" class="btn btn-ghost btn-sm">View All</a>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody id="dashboard-recent-tx">
            <tr><td colspan="4" class="empty-state">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  try {
    const summary = await api.getDashboard();
    
    // Update Stats
    const statsHtml = `
      <div class="glass-card stat-card balance">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total Balance</div>
        <div class="stat-value">$${parseFloat(summary.total_balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      </div>
      <div class="glass-card stat-card income">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Monthly Income</div>
        <div class="stat-value">$${parseFloat(summary.monthly_income).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">📉</div>
        <div class="stat-label">Monthly Expenses</div>
        <div class="stat-value">$${parseFloat(summary.monthly_expenses).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      </div>
      <div class="glass-card stat-card debt">
        <div class="stat-icon">💳</div>
        <div class="stat-label">Total Debt</div>
        <div class="stat-value">$${parseFloat(summary.active_debts_total).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
      </div>
    `;
    const statsContainer = document.getElementById('dashboard-stats');
    if (statsContainer) statsContainer.innerHTML = statsHtml;

    // Update Recent Tx
    const txContainer = document.getElementById('dashboard-recent-tx');
    if (txContainer) {
      if (!summary.recent_transactions || summary.recent_transactions.length === 0) {
        txContainer.innerHTML = '<tr><td colspan="4" class="empty-state">No recent transactions.</td></tr>';
      } else {
        txContainer.innerHTML = summary.recent_transactions.map((tx: any) => `
          <tr>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.description}</td>
            <td>${tx.category_name || 'Uncategorized'}</td>
            <td style="color: ${tx.type === 'income' ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight: 600;">
              ${tx.type === 'income' ? '+' : '-'}$${parseFloat(tx.amount).toFixed(2)}
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard', error);
  }
};
