// FinanceWise — Shared TypeScript Interfaces (Client)

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  budget_group: 'needs' | 'wants' | 'tithes' | 'savings' | 'debt_payments' | null;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  category_name?: string;
  category_icon?: string;
  description: string | null;
  date: string;
}

export interface Budget {
  id: number;
  category_id: number;
  category_name?: string;
  category_icon?: string;
  budget_group?: string;
  amount: number;
  spent?: number;
  month: number;
  year: number;
}

export interface Debt {
  id: number;
  name: string;
  total_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: number | null;
  is_active: boolean;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  is_completed: boolean;
}

export interface DashboardData {
  total_balance: number;
  total_income: number;
  total_expenses: number;
  monthly_income: number;
  /** Income received during the trailing 30 days; appropriate for funding the next budget period. */
  budget_income: number;
  monthly_expenses: number;
  pending_bills_total: number;
  pending_bills_count: number;
  upcoming_bills: { id: number; name: string; amount: number; due_date: string | null; category_name?: string; category_icon?: string }[];
  health_score: number;
  spending_by_category: { name: string; icon: string; amount: number; color: string }[];
  monthly_trend: { month: string; income: number; expenses: number }[];
  recent_transactions: Transaction[];
  active_debts_total: number;
  savings_progress: number;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'advisor';
  content: string;
  created_at?: string;
}

// ── API response envelopes ──────────────────────────────────────────────────

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface DebtsResponse {
  data: Debt[];
  total_debt: number;
  count: number;
}

export interface SavingsResponse {
  data: SavingsGoal[];
  total_saved: number;
  total_target: number;
  overall_progress: number;
}

export type BudgetGroupKey = 'needs' | 'wants' | 'tithes' | 'savings' | 'debt_payments';

export interface BudgetAllocation {
  group_key: BudgetGroupKey;
  percentage: number;
}

export interface BudgetGroupSummary {
  budget: number;
  spent: number;
  target_pct: number;
}

export interface BudgetsResponse {
  data: Budget[];
  month: number;
  year: number;
  total_budget: number;
  allocations: BudgetAllocation[];
  groups: Record<string, BudgetGroupSummary>;
}

export interface BudgetSuggestion {
  total_income: number;
  allocations: BudgetAllocation[];
  suggestion: Record<string, { amount: number; percentage: number; description: string }>;
  categories: Category[];
}

// ── Bills & To-Buy ──────────────────────────────────────────────────────────

export interface BillItem {
  id: number;
  item_type: 'bill' | 'to_buy';
  name: string;
  amount: number;
  due_date: string | null;
  category_id: number | null;
  category_name?: string;
  category_icon?: string;
  status: 'pending' | 'completed';
  notes: string | null;
  created_at: string;
}

export interface BillsResponse {
  data: BillItem[];
  total_pending_bills: number;
  total_pending_to_buy: number;
}

export interface CreateBillDTO {
  item_type: 'bill' | 'to_buy';
  name: string;
  amount: number;
  due_date?: string | null;
  category_id?: number | null;
  notes?: string;
}

export type UpdateBillDTO = Partial<Omit<CreateBillDTO, 'item_type'>> & { status?: 'pending' | 'completed' };

export interface PayoffPlan {
  method: 'snowball' | 'avalanche';
  total_months: number;
  total_interest: number;
  total_paid: number;
  monthly_schedule: { month: number; payments: { debt_name: string; payment: number; remaining: number }[] }[];
  order: { name: string; balance: number; rate: number }[];
}

// ── Create/update DTOs ──────────────────────────────────────────────────────

export interface CreateTransactionDTO {
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  description?: string;
  date?: string;
}

export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

export interface CreateDebtDTO {
  name: string;
  total_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date?: number | null;
}

export type UpdateDebtDTO = Partial<CreateDebtDTO> & { is_active?: boolean };

export interface CreateSavingsGoalDTO {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string | null;
  icon?: string;
}

export type UpdateSavingsGoalDTO = Partial<CreateSavingsGoalDTO> & { is_completed?: boolean };

export interface CreateBudgetDTO {
  category_id: number;
  amount: number;
  month: number;
  year: number;
}
