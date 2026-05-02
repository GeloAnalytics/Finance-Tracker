// FinanceWise — API Client (fetch wrapper)

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request<any>('/dashboard/summary'),
  getCategories: (type?: string) => request<any[]>(`/categories${type ? `?type=${type}` : ''}`),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/transactions${qs}`);
  },
  createTransaction: (data: any) => request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: any) => request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => request<any>(`/transactions/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.set('month', String(month));
    if (year) params.set('year', String(year));
    return request<any>(`/budgets?${params}`);
  },
  createBudget: (data: any) => request<any>('/budgets', { method: 'POST', body: JSON.stringify(data) }),
  deleteBudget: (id: number) => request<any>(`/budgets/${id}`, { method: 'DELETE' }),
  suggestBudgets: (income: number) => request<any>(`/budgets/suggest?income=${income}`),

  // Debts
  getDebts: () => request<any>('/debts'),
  createDebt: (data: any) => request<any>('/debts', { method: 'POST', body: JSON.stringify(data) }),
  updateDebt: (id: number, data: any) => request<any>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDebt: (id: number) => request<any>(`/debts/${id}`, { method: 'DELETE' }),
  getPayoffPlan: (method: string, extra?: number) =>
    request<any>(`/debts/payoff?method=${method}${extra ? `&extra_payment=${extra}` : ''}`),

  // Savings
  getSavings: () => request<any>('/savings'),
  createSavingsGoal: (data: any) => request<any>('/savings', { method: 'POST', body: JSON.stringify(data) }),
  updateSavingsGoal: (id: number, data: any) => request<any>(`/savings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavingsGoal: (id: number) => request<any>(`/savings/${id}`, { method: 'DELETE' }),
  contributeSavings: (id: number, amount: number) =>
    request<any>(`/savings/${id}/contribute`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Advisor
  sendMessage: (message: string) => request<any>('/advisor/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  getChatHistory: () => request<any[]>('/advisor/history'),
  clearChatHistory: () => request<any>('/advisor/history', { method: 'DELETE' }),
};
