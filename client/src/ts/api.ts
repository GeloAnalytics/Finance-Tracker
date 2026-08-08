/// <reference types="vite/client" />
// FinanceWise — API Client (fetch wrapper)

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
} from './types';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) {
    // Session expired or missing — reload to show the login screen.
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard/summary'),
  getCategories: (type?: string) => request<Category[]>(`/categories${type ? `?type=${type}` : ''}`),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<PaginatedTransactions>(`/transactions${qs}`);
  },
  createTransaction: (data: CreateTransactionDTO) =>
    request<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: UpdateTransactionDTO) =>
    request<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => request<{ message: string; id: number }>(`/transactions/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return request<BudgetsResponse>(`/budgets?${params}`);
  },
  createBudget: (data: CreateBudgetDTO) => request<BudgetsResponse['data'][number]>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudget: (id: number) => request<{ message: string; id: number }>(`/budgets/${id}`, { method: 'DELETE' }),
  suggestBudgets: (income: number) => request<BudgetSuggestion>(`/budgets/suggest?income=${income}`),

  // Debts
  getDebts: () => request<DebtsResponse>('/debts'),
  createDebt: (data: CreateDebtDTO) => request<Debt>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  updateDebt: (id: number, data: UpdateDebtDTO) => request<Debt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDebt: (id: number) => request<{ message: string; id: number }>(`/debts/${id}`, { method: 'DELETE' }),
  getPayoffPlan: (method: string, extra?: number) =>
    request<PayoffPlan>(`/debts/payoff?method=${method}${extra ? `&extra_payment=${extra}` : ''}`),

  // Savings
  getSavings: () => request<SavingsResponse>('/savings'),
  createSavingsGoal: (data: CreateSavingsGoalDTO) =>
    request<SavingsGoal>('/savings', { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsGoal: (id: number, data: UpdateSavingsGoalDTO) =>
    request<SavingsGoal>(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavingsGoal: (id: number) => request<{ message: string; id: number }>(`/savings/${id}`, { method: 'DELETE' }),
  contributeSavings: (id: number, amount: number) =>
    request<SavingsGoal>(`/savings/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Advisor
  sendMessage: (message: string) => request<ChatMessage>('/advisor/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  getChatHistory: () => request<ChatMessage[]>('/advisor/history'),
  clearChatHistory: () => request<{ message: string }>('/advisor/history', { method: 'DELETE' }),
};
