// FinanceWise — Demo Mode mock API
//
// Implements the exact same surface as `api` in ../api.ts, but reads/writes
// the in-browser demo store instead of making network requests. Mirrors the
// server controllers' logic (server/src/controllers/*.ts) closely enough
// that every view behaves identically to the real app.

import { getDemoData, saveDemoData } from './mock-store.js';
import { findBestResponse } from './financial-literacy.js';
import type { DemoTransaction, DemoBudget, DemoDebt, DemoSavingsGoal } from './mock-data.js';
import type {
  Category,
  DashboardData,
  PaginatedTransactions,
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  BudgetsResponse,
  BudgetSuggestion,
  CreateBudgetDTO,
  DebtsResponse,
  Debt,
  CreateDebtDTO,
  UpdateDebtDTO,
  PayoffPlan,
  SavingsResponse,
  SavingsGoal,
  CreateSavingsGoalDTO,
  UpdateSavingsGoalDTO,
  ChatMessage,
} from '../types.js';

const CHART_COLORS = ['#7c5cfc', '#34d399', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#a855f7', '#06b6d4'];
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// A small artificial delay so the UI feels like it's hitting a real network — not required, purely cosmetic.
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

function categoryById(id: number | null) {
  if (id === null) return undefined;
  return getDemoData().categories.find((c) => c.id === id);
}

function toTransaction(t: DemoTransaction): Transaction {
  const cat = categoryById(t.category_id);
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    category_id: t.category_id,
    category_name: cat?.name,
    category_icon: cat?.icon,
    description: t.description,
    date: t.date,
  };
}

function toBudget(b: DemoBudget, spent: number): BudgetsResponse['data'][number] {
  const cat = categoryById(b.category_id);
  return {
    id: b.id,
    category_id: b.category_id,
    category_name: cat?.name,
    category_icon: cat?.icon,
    budget_group: cat?.budget_group ?? undefined,
    amount: b.amount,
    spent,
    month: b.month,
    year: b.year,
  };
}

function toDebt(d: DemoDebt): Debt {
  return { ...d };
}

function toSavingsGoal(g: DemoSavingsGoal): SavingsGoal {
  return { ...g };
}

function monthYearOf(dateStr: string): { month: number; year: number } {
  const d = new Date(dateStr);
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboard(): Promise<DashboardData> {
  await delay();
  const data = getDemoData();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let totalIncome = 0, totalExpenses = 0;
  let monthlyIncome = 0, monthlyExpenses = 0;
  const byCategory = new Map<number, number>();
  const trendMap: Record<string, { income: number; expenses: number }> = {};

  for (const t of data.transactions) {
    if (t.type === 'income') totalIncome += t.amount; else totalExpenses += t.amount;

    const { month: tMonth, year: tYear } = monthYearOf(t.date);
    if (tMonth === month && tYear === year) {
      if (t.type === 'income') monthlyIncome += t.amount; else monthlyExpenses += t.amount;
      if (t.type === 'expense' && t.category_id !== null) {
        byCategory.set(t.category_id, (byCategory.get(t.category_id) || 0) + t.amount);
      }
    }

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    if (new Date(t.date) >= sixMonthsAgo) {
      const key = `${tYear}-${String(tMonth).padStart(2, '0')}`;
      if (!trendMap[key]) trendMap[key] = { income: 0, expenses: 0 };
      if (t.type === 'income') trendMap[key].income += t.amount; else trendMap[key].expenses += t.amount;
    }
  }

  const spendingByCategory = [...byCategory.entries()]
    .map(([catId, amount]) => {
      const cat = categoryById(catId);
      return { name: cat?.name || 'Uncategorized', icon: cat?.icon || '❔', amount };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map((c, i) => ({ ...c, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const monthlyTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ month: m, ...v }));

  const recentTransactions = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map(toTransaction);

  const activeDebtsTotal = data.debts.filter((d) => d.is_active).reduce((sum, d) => sum + d.current_balance, 0);
  const totalSaved = data.savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalTarget = data.savingsGoals.reduce((sum, g) => sum + g.target_amount, 0);

  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
  const debtRatio = monthlyIncome > 0 ? activeDebtsTotal / (monthlyIncome * 12) : 0;
  let healthScore = 50;
  healthScore += savingsRate > 0.2 ? 20 : savingsRate > 0.1 ? 10 : savingsRate > 0 ? 5 : -10;
  healthScore += debtRatio < 0.3 ? 15 : debtRatio < 0.5 ? 5 : -10;
  healthScore += spendingByCategory.length > 0 ? 5 : 0;
  healthScore += monthlyIncome > 0 ? 10 : 0;
  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    total_balance: totalIncome - totalExpenses,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    monthly_income: monthlyIncome,
    monthly_expenses: monthlyExpenses,
    health_score: healthScore,
    spending_by_category: spendingByCategory,
    monthly_trend: monthlyTrend,
    recent_transactions: recentTransactions,
    active_debts_total: activeDebtsTotal,
    savings_progress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
  };
}

function getCategories(type?: string): Promise<Category[]> {
  return delay().then(() => {
    let cats = getDemoData().categories;
    if (type) cats = cats.filter((c) => c.type === type || c.type === 'both');
    return [...cats].sort((a, b) => {
      const g = (a.budget_group ?? '').localeCompare(b.budget_group ?? '');
      const groupCmp = a.budget_group === null && b.budget_group === null ? 0 : a.budget_group === null ? -1 : b.budget_group === null ? 1 : g;
      return groupCmp !== 0 ? groupCmp : a.name.localeCompare(b.name);
    });
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

function getTransactions(params?: Record<string, string>): Promise<PaginatedTransactions> {
  return delay().then(() => {
    const data = getDemoData();
    let filtered = data.transactions;

    if (params?.type) filtered = filtered.filter((t) => t.type === params.type);
    if (params?.category_id) filtered = filtered.filter((t) => t.category_id === Number(params.category_id));
    if (params?.from) filtered = filtered.filter((t) => t.date >= params.from);
    if (params?.to) filtered = filtered.filter((t) => t.date <= params.to);
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter((t) => {
        const cat = categoryById(t.category_id);
        return (t.description ?? '').toLowerCase().includes(q) || (cat?.name ?? '').toLowerCase().includes(q);
      });
    }

    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

    const rawLimit = parseInt(params?.limit ?? '', 10);
    const rawOffset = parseInt(params?.offset ?? '', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    return {
      data: sorted.slice(offset, offset + limit).map(toTransaction),
      total: sorted.length,
      limit,
      offset,
    };
  });
}

function createTransaction(data: CreateTransactionDTO): Promise<Transaction> {
  return delay().then(() => {
    const store = getDemoData();
    const tx: DemoTransaction = {
      id: store.nextIds.transaction++,
      type: data.type,
      amount: data.amount,
      category_id: data.category_id ?? null,
      description: data.description ?? null,
      date: data.date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };
    store.transactions.push(tx);
    saveDemoData();
    return toTransaction(tx);
  });
}

function updateTransaction(id: number, data: UpdateTransactionDTO): Promise<Transaction> {
  return delay().then(() => {
    const store = getDemoData();
    const tx = store.transactions.find((t) => t.id === id);
    if (!tx) throw new Error('Transaction not found');
    if (data.type !== undefined) tx.type = data.type;
    if (data.amount !== undefined) tx.amount = data.amount;
    if (data.category_id !== undefined) tx.category_id = data.category_id;
    if (data.description !== undefined) tx.description = data.description ?? null;
    if (data.date !== undefined && data.date) tx.date = data.date;
    saveDemoData();
    return toTransaction(tx);
  });
}

function deleteTransaction(id: number): Promise<{ message: string; id: number }> {
  return delay().then(() => {
    const store = getDemoData();
    const idx = store.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');
    store.transactions.splice(idx, 1);
    saveDemoData();
    return { message: 'Transaction deleted', id };
  });
}

// ── Budgets ──────────────────────────────────────────────────────────────────

function spentFor(categoryId: number, month: number, year: number): number {
  return getDemoData().transactions
    .filter((t) => t.type === 'expense' && t.category_id === categoryId)
    .filter((t) => {
      const { month: m, year: y } = monthYearOf(t.date);
      return m === month && y === year;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

function getBudgets(month?: number, year?: number): Promise<BudgetsResponse> {
  return delay().then(() => {
    const now = new Date();
    const m = month || now.getMonth() + 1;
    const y = year || now.getFullYear();

    const rows = getDemoData().budgets
      .filter((b) => b.month === m && b.year === y)
      .map((b) => toBudget(b, spentFor(b.category_id, m, y)));

    const totalBudget = rows.reduce((sum, b) => sum + b.amount, 0);
    const groups = { needs: 0, wants: 0, savings: 0 };
    const groupSpent = { needs: 0, wants: 0, savings: 0 };
    rows.forEach((b) => {
      const group = b.budget_group as keyof typeof groups;
      if (group && groups[group] !== undefined) {
        groups[group] += b.amount;
        groupSpent[group] += b.spent ?? 0;
      }
    });

    return {
      data: rows,
      month: m,
      year: y,
      total_budget: totalBudget,
      groups: {
        needs: { budget: groups.needs, spent: groupSpent.needs, target_pct: 50 },
        wants: { budget: groups.wants, spent: groupSpent.wants, target_pct: 30 },
        savings: { budget: groups.savings, spent: groupSpent.savings, target_pct: 20 },
      },
    };
  });
}

function createBudget(data: CreateBudgetDTO): Promise<BudgetsResponse['data'][number]> {
  return delay().then(() => {
    const store = getDemoData();
    let b = store.budgets.find((x) => x.category_id === data.category_id && x.month === data.month && x.year === data.year);
    if (b) {
      b.amount = data.amount;
    } else {
      b = { id: store.nextIds.budget++, category_id: data.category_id, amount: data.amount, month: data.month, year: data.year };
      store.budgets.push(b);
    }
    saveDemoData();
    return toBudget(b, spentFor(b.category_id, b.month, b.year));
  });
}

function deleteBudget(id: number): Promise<{ message: string; id: number }> {
  return delay().then(() => {
    const store = getDemoData();
    const idx = store.budgets.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Budget not found');
    store.budgets.splice(idx, 1);
    saveDemoData();
    return { message: 'Budget deleted', id };
  });
}

function suggestBudgets(income: number): Promise<BudgetSuggestion> {
  return delay().then(() => {
    const suggestion = {
      total_income: income,
      needs: { amount: income * 0.5, percentage: 50, description: 'Essential expenses: rent, food, utilities, transport' },
      wants: { amount: income * 0.3, percentage: 30, description: 'Non-essentials: dining out, entertainment, shopping' },
      savings: { amount: income * 0.2, percentage: 20, description: 'Savings, investments, debt payoff' },
    };
    const categories = getDemoData().categories
      .filter((c) => c.type === 'expense' && c.budget_group !== null)
      .sort((a, b) => (a.budget_group ?? '').localeCompare(b.budget_group ?? '') || a.name.localeCompare(b.name));
    return { suggestion, categories };
  });
}

// ── Debts ────────────────────────────────────────────────────────────────────

function getDebts(): Promise<DebtsResponse> {
  return delay().then(() => {
    const debts = getDemoData().debts;
    const totalDebt = debts.filter((d) => d.is_active).reduce((sum, d) => sum + d.current_balance, 0);
    return { data: debts.map(toDebt), total_debt: totalDebt, count: debts.length };
  });
}

function createDebt(data: CreateDebtDTO): Promise<Debt> {
  return delay().then(() => {
    const store = getDemoData();
    const debt: DemoDebt = {
      id: store.nextIds.debt++,
      name: data.name,
      total_amount: data.total_amount,
      current_balance: data.current_balance,
      interest_rate: data.interest_rate,
      minimum_payment: data.minimum_payment,
      due_date: data.due_date ?? null,
      is_active: true,
    };
    store.debts.push(debt);
    saveDemoData();
    return toDebt(debt);
  });
}

function updateDebt(id: number, data: UpdateDebtDTO): Promise<Debt> {
  return delay().then(() => {
    const store = getDemoData();
    const debt = store.debts.find((d) => d.id === id);
    if (!debt) throw new Error('Debt not found');
    if (data.name !== undefined) debt.name = data.name;
    if (data.total_amount !== undefined) debt.total_amount = data.total_amount;
    if (data.current_balance !== undefined) debt.current_balance = data.current_balance;
    if (data.interest_rate !== undefined) debt.interest_rate = data.interest_rate;
    if (data.minimum_payment !== undefined) debt.minimum_payment = data.minimum_payment;
    if (data.due_date !== undefined) debt.due_date = data.due_date;
    if (data.is_active !== undefined) debt.is_active = data.is_active;
    saveDemoData();
    return toDebt(debt);
  });
}

function deleteDebt(id: number): Promise<{ message: string; id: number }> {
  return delay().then(() => {
    const store = getDemoData();
    const idx = store.debts.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Debt not found');
    store.debts.splice(idx, 1);
    saveDemoData();
    return { message: 'Debt deleted', id };
  });
}

function getPayoffPlan(method: string, extraPayment = 0): Promise<PayoffPlan> {
  return delay().then(() => {
    const activeDebts = getDemoData().debts.filter((d) => d.is_active && d.current_balance > 0);
    if (activeDebts.length === 0) {
      return { method: method as 'snowball' | 'avalanche', total_months: 0, total_interest: 0, total_paid: 0, order: [], monthly_schedule: [] };
    }

    const debts = activeDebts.map((d) => ({
      name: d.name,
      balance: d.current_balance,
      rate: d.interest_rate / 100 / 12,
      minPayment: d.minimum_payment,
    }));

    if (method === 'snowball') {
      debts.sort((a, b) => a.balance - b.balance);
    } else {
      debts.sort((a, b) => b.rate - a.rate);
    }

    const order = debts.map((d) => ({ name: d.name, balance: d.balance, rate: d.rate * 12 * 100 }));

    let totalInterest = 0, totalPaid = 0, month = 0;
    const maxMonths = 360;
    const schedule: { month: number; payments: { debt_name: string; payment: number; remaining: number }[] }[] = [];
    const active = debts.map((d) => ({ ...d }));

    while (active.some((d) => d.balance > 0) && month < maxMonths) {
      month++;
      const monthPayments: { debt_name: string; payment: number; remaining: number }[] = [];
      let availableExtra = extraPayment;

      active.forEach((d) => {
        if (d.balance > 0) {
          const interest = d.balance * d.rate;
          d.balance += interest;
          totalInterest += interest;
        }
      });

      active.forEach((d) => {
        if (d.balance > 0) {
          const payment = Math.min(d.minPayment, d.balance);
          d.balance -= payment;
          totalPaid += payment;
          monthPayments.push({ debt_name: d.name, payment, remaining: Math.max(0, d.balance) });
        }
      });

      for (const d of active) {
        if (d.balance > 0 && availableExtra > 0) {
          const extra = Math.min(availableExtra, d.balance);
          d.balance -= extra;
          totalPaid += extra;
          availableExtra -= extra;
          const record = monthPayments.find((p) => p.debt_name === d.name);
          if (record) {
            record.payment += extra;
            record.remaining = Math.max(0, d.balance);
          }
          if (d.balance <= 0) continue;
          break;
        }
      }

      active.forEach((d) => {
        if (d.balance <= 0.01) d.balance = 0;
      });

      if (month <= 24 || month % 6 === 0) schedule.push({ month, payments: monthPayments });
    }

    return {
      method: method as 'snowball' | 'avalanche',
      total_months: month,
      total_interest: Math.round(totalInterest * 100) / 100,
      total_paid: Math.round(totalPaid * 100) / 100,
      order,
      monthly_schedule: schedule,
    };
  });
}

// ── Savings ──────────────────────────────────────────────────────────────────

function getSavings(): Promise<SavingsResponse> {
  return delay().then(() => {
    const goals = [...getDemoData().savingsGoals].sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || b.id - a.id);
    const totalSaved = goals.reduce((sum, g) => sum + g.current_amount, 0);
    const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
    return {
      data: goals.map(toSavingsGoal),
      total_saved: totalSaved,
      total_target: totalTarget,
      overall_progress: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0,
    };
  });
}

function createSavingsGoal(data: CreateSavingsGoalDTO): Promise<SavingsGoal> {
  return delay().then(() => {
    const store = getDemoData();
    const goal: DemoSavingsGoal = {
      id: store.nextIds.savingsGoal++,
      name: data.name,
      target_amount: data.target_amount,
      current_amount: data.current_amount ?? 0,
      deadline: data.deadline ?? null,
      icon: data.icon || '🎯',
      is_completed: false,
    };
    store.savingsGoals.push(goal);
    saveDemoData();
    return toSavingsGoal(goal);
  });
}

function updateSavingsGoal(id: number, data: UpdateSavingsGoalDTO): Promise<SavingsGoal> {
  return delay().then(() => {
    const store = getDemoData();
    const goal = store.savingsGoals.find((g) => g.id === id);
    if (!goal) throw new Error('Savings goal not found');
    if (data.name !== undefined) goal.name = data.name;
    if (data.target_amount !== undefined) goal.target_amount = data.target_amount;
    if (data.current_amount !== undefined) goal.current_amount = data.current_amount;
    if (data.deadline !== undefined) goal.deadline = data.deadline;
    if (data.icon !== undefined) goal.icon = data.icon;
    if (data.is_completed !== undefined) goal.is_completed = data.is_completed;
    saveDemoData();
    return toSavingsGoal(goal);
  });
}

function deleteSavingsGoal(id: number): Promise<{ message: string; id: number }> {
  return delay().then(() => {
    const store = getDemoData();
    const idx = store.savingsGoals.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error('Savings goal not found');
    store.savingsGoals.splice(idx, 1);
    saveDemoData();
    return { message: 'Savings goal deleted', id };
  });
}

function contributeSavings(id: number, amount: number): Promise<SavingsGoal> {
  return delay().then(() => {
    const store = getDemoData();
    const goal = store.savingsGoals.find((g) => g.id === id);
    if (!goal) throw new Error('Savings goal not found');
    goal.current_amount += amount;
    goal.is_completed = goal.current_amount >= goal.target_amount;
    saveDemoData();
    return toSavingsGoal(goal);
  });
}

// ── Advisor ──────────────────────────────────────────────────────────────────

function buildAdvisorReply(userMessage: string): string {
  const match = findBestResponse(userMessage);
  if (match) return match.response;

  const store = getDemoData();
  const activeDebts = store.debts.filter((d) => d.is_active);
  const totalDebt = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalSaved = store.savingsGoals.reduce((sum, g) => sum + g.current_amount, 0);

  return `That's a great question! I don't have a canned answer for that exact topic in this offline demo (the live app uses Google Gemini for open-ended questions like this — that part needs a real API key, so it's disabled here to keep the demo free to run).

Here's a quick snapshot of your demo finances in the meantime:
• Active debt: ₱${totalDebt.toLocaleString()} across ${activeDebts.length} debt${activeDebts.length === 1 ? '' : 's'}
• Total saved toward goals: ₱${totalSaved.toLocaleString()}

Try asking about **budgeting**, **debt payoff**, **saving money**, **investing**, **emergency funds**, or **credit** — those topics have full answers built in. 💡`;
}

function sendMessage(message: string): Promise<ChatMessage> {
  return delay(400).then(() => {
    const store = getDemoData();
    const now = new Date().toISOString();
    store.chatMessages.push({ id: store.nextIds.chat++, role: 'user', content: message, created_at: now });
    const content = buildAdvisorReply(message);
    store.chatMessages.push({ id: store.nextIds.chat++, role: 'advisor', content, created_at: new Date().toISOString() });
    saveDemoData();
    return { role: 'advisor', content };
  });
}

function getChatHistory(): Promise<ChatMessage[]> {
  return delay().then(() => [...getDemoData().chatMessages]);
}

function clearChatHistory(): Promise<{ message: string }> {
  return delay().then(() => {
    getDemoData().chatMessages.length = 0;
    saveDemoData();
    return { message: 'Chat history cleared' };
  });
}

export const mockApi = {
  getDashboard,
  getCategories,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBudgets,
  createBudget,
  deleteBudget,
  suggestBudgets,
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  getPayoffPlan,
  getSavings,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  contributeSavings,
  sendMessage,
  getChatHistory,
  clearChatHistory,
};
