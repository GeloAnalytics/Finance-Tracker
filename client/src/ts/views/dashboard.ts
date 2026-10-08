import Chart from 'chart.js/auto';
import { api } from '../api.js';
import { escapeHtml } from '../utils/sanitize.js';
import type { Transaction, DashboardData } from '../types.js';

let trendChartInstance: Chart | null = null;
let categoryChartInstance: Chart | null = null;

const destroyCharts = () => {
  if (trendChartInstance) {
    trendChartInstance.destroy();
    trendChartInstance = null;
  }
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }
};

// Safe number formatter — guards against an unexpected non-numeric API response
const fmt = (val: number, digits = 2): string => {
  return isNaN(val) ? '0.00' : val.toLocaleString('en-US', { minimumFractionDigits: digits });
};

const formatMonthName = (mStr: string) => {
  try {
    const [year, month] = mStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  } catch {
    return mStr;
  }
};

export const renderDashboard = async () => {
  const container = document.getElementById('page-container');
  if (!container) return;

  destroyCharts();

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
      <div class="glass-card stat-card income">
        <div class="stat-icon">🏦</div>
        <div class="stat-label">Overall Income</div>
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
      <div class="glass-card stat-card income">
        <div class="stat-icon">📅</div>
        <div class="stat-label">Income Available to Budget</div>
        <div class="stat-value">...</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">🧾</div>
        <div class="stat-label">Bills Still to Pay</div>
        <div class="stat-value">...</div>
      </div>
    </div>
    
    <div class="charts-grid animate-in stagger-3">
      <div class="glass-card" style="display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <h3 style="text-transform: uppercase; letter-spacing: 1px; font-size: var(--font-sm); color: var(--text-secondary);">Income vs Expenses (6-Month Trend)</h3>
        </div>
        <div class="chart-container" style="position: relative; height: 260px; width: 100%;">
          <canvas id="chart-income-vs-expenses"></canvas>
        </div>
      </div>
      <div class="glass-card" style="display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <h3 style="text-transform: uppercase; letter-spacing: 1px; font-size: var(--font-sm); color: var(--text-secondary);">Spending by Category</h3>
        </div>
        <div class="chart-container" style="position: relative; height: 260px; width: 100%; display: flex; align-items: center; justify-content: center;">
          <canvas id="chart-spending-category"></canvas>
        </div>
      </div>
    </div>
    
    <div class="glass-card animate-in stagger-4" style="margin-bottom: var(--space-lg);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h3>Upcoming Bills</h3>
        <a href="#bills" class="btn btn-ghost btn-sm">View Bills</a>
      </div>
      <div id="dashboard-upcoming-bills" class="empty-state">Loading...</div>
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
    const summary: DashboardData = await api.getDashboard();
    
    // Update Stats
    const statsHtml = `
      <div class="glass-card stat-card balance">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Total Balance</div>
        <div class="stat-value">₱${fmt(summary.total_balance)}</div>
      </div>
      <div class="glass-card stat-card income">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Monthly Income</div>
        <div class="stat-value" style="color: var(--income-color);">₱${fmt(summary.monthly_income)}</div>
        <div class="stat-label" style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px;">This calendar month</div>
      </div>
      <div class="glass-card stat-card income">
        <div class="stat-icon">🏦</div>
        <div class="stat-label">Overall Income</div>
        <div class="stat-value" style="color: var(--income-color);">₱${fmt(summary.total_income)}</div>
        <div class="stat-label" style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px;">All recorded income</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">📉</div>
        <div class="stat-label">Monthly Expenses</div>
        <div class="stat-value" style="color: var(--expense-color);">₱${fmt(summary.monthly_expenses)}</div>
      </div>
      <div class="glass-card stat-card debt">
        <div class="stat-icon">💳</div>
        <div class="stat-label">Total Debt</div>
        <div class="stat-value" style="color: var(--debt-color);">₱${fmt(summary.active_debts_total)}</div>
      </div>
      <div class="glass-card stat-card income">
        <div class="stat-icon">📅</div>
        <div class="stat-label">Income Available to Budget</div>
        <div class="stat-value" style="color: var(--income-color);">₱${fmt(summary.budget_income)}</div>
        <div class="stat-label" style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px;">Received in last 30 days</div>
      </div>
      <div class="glass-card stat-card expense">
        <div class="stat-icon">🧾</div>
        <div class="stat-label">Bills Still to Pay</div>
        <div class="stat-value" style="color: var(--expense-color);">₱${fmt(summary.pending_bills_total)}</div>
        <div class="stat-label" style="font-size: var(--font-xs); color: var(--text-muted); margin-top: 2px;">${summary.pending_bills_count} pending</div>
      </div>
    `;
    const statsContainer = document.getElementById('dashboard-stats');
    if (statsContainer) statsContainer.innerHTML = statsHtml;

    // Render Real Chart.js Charts
    renderTrendChart(summary);
    renderCategoryChart(summary);

    // Upcoming Bills
    const billsContainer = document.getElementById('dashboard-upcoming-bills');
    if (billsContainer) {
      billsContainer.innerHTML = summary.upcoming_bills.length
        ? summary.upcoming_bills.map(bill => `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-md); padding: var(--space-sm) 0; border-bottom: 1px solid var(--border-subtle);">
              <span>
                ${escapeHtml(bill.category_icon ?? '🧾')} ${escapeHtml(bill.name)} 
                <span style="color: var(--text-muted); margin-left: 8px; font-size: var(--font-xs);">
                  ${bill.due_date ? `Due ${new Date(`${bill.due_date}T00:00:00`).toLocaleDateString()}` : 'No due date'}
                </span>
              </span>
              <strong style="color: var(--expense-color, #ef4444);">₱${fmt(bill.amount)}</strong>
            </div>
          `).join('')
        : '<div class="empty-state">No pending bills. You are all caught up! 🎉</div>';
    }

    // Update Recent Transactions
    const txContainer = document.getElementById('dashboard-recent-tx');
    if (txContainer) {
      if (!summary.recent_transactions || summary.recent_transactions.length === 0) {
        txContainer.innerHTML = '<tr><td colspan="4" class="empty-state">No recent transactions.</td></tr>';
      } else {
        txContainer.innerHTML = summary.recent_transactions.map((tx: Transaction) => `
          <tr>
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${escapeHtml(tx.description ?? '—')}</td>
            <td>${escapeHtml(tx.category_name || 'Uncategorized')}</td>
            <td style="color: ${tx.type === 'income' ? 'var(--income-color, #34d399)' : 'var(--expense-color, #ef4444)'}; font-weight: 600;">
              ${tx.type === 'income' ? '+' : '-'}₱${fmt(tx.amount)}
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load dashboard', error);
    const statsContainer = document.getElementById('dashboard-stats');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="glass-card stat-card balance"><div class="stat-icon">💰</div><div class="stat-label">Total Balance</div><div class="stat-value">₱0.00</div></div>
        <div class="glass-card stat-card income"><div class="stat-icon">📈</div><div class="stat-label">Monthly Income</div><div class="stat-value">₱0.00</div></div>
        <div class="glass-card stat-card expense"><div class="stat-icon">📉</div><div class="stat-label">Monthly Expenses</div><div class="stat-value">₱0.00</div></div>
        <div class="glass-card stat-card debt"><div class="stat-icon">💳</div><div class="stat-label">Total Debt</div><div class="stat-value">₱0.00</div></div>
      `;
    }
    const txContainer = document.getElementById('dashboard-recent-tx');
    if (txContainer) txContainer.innerHTML = '<tr><td colspan="4" class="empty-state">Could not load data. Check your connection.</td></tr>';
  }
};

function renderTrendChart(summary: DashboardData) {
  const canvas = document.getElementById('chart-income-vs-expenses') as HTMLCanvasElement | null;
  if (!canvas) return;

  const trendData = summary.monthly_trend && summary.monthly_trend.length > 0
    ? summary.monthly_trend
    : [
        { month: '2026-01', income: 0, expenses: 0 },
        { month: '2026-02', income: 0, expenses: 0 },
        { month: '2026-03', income: 0, expenses: 0 },
      ];

  const labels = trendData.map(t => formatMonthName(t.month));
  const incomeData = trendData.map(t => t.income);
  const expenseData = trendData.map(t => t.expenses);

  trendChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Income (₱)',
          data: incomeData,
          backgroundColor: '#34d399',
          borderRadius: 4,
          maxBarThickness: 32,
        },
        {
          label: 'Expenses (₱)',
          data: expenseData,
          backgroundColor: '#ef4444',
          borderRadius: 4,
          maxBarThickness: 32,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#a0a0a0',
            font: { family: "'Inter', sans-serif", size: 12 },
            boxWidth: 12,
            boxHeight: 12,
          },
        },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#ffffff',
          bodyColor: '#e0e0e0',
          borderColor: '#333333',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ₱${Number(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#888888', font: { family: "'Inter', sans-serif", size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#888888',
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: (v) => `₱${Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(0)}k` : v}`,
          },
        },
      },
    },
  });
}

function renderCategoryChart(summary: DashboardData) {
  const canvas = document.getElementById('chart-spending-category') as HTMLCanvasElement | null;
  if (!canvas) return;

  const categories = summary.spending_by_category && summary.spending_by_category.length > 0
    ? summary.spending_by_category
    : [];

  if (categories.length === 0) {
    categoryChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['No expenses yet'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#222222'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });
    return;
  }

  const labels = categories.map(c => `${c.icon ? c.icon + ' ' : ''}${c.name}`);
  const data = categories.map(c => c.amount);
  const colors = categories.map((c, i) => c.color || ['#7c5cfc','#34d399','#f59e0b','#ef4444','#3b82f6','#ec4899'][i % 6]);

  categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: '#0a0a0a',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#a0a0a0',
            font: { family: "'Inter', sans-serif", size: 11 },
            boxWidth: 10,
            boxHeight: 10,
          },
        },
        tooltip: {
          backgroundColor: '#141414',
          titleColor: '#ffffff',
          bodyColor: '#e0e0e0',
          borderColor: '#333333',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ₱${Number(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
        },
      },
    },
  });
}
