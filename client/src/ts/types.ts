// FinanceWise — Shared TypeScript Interfaces (Client)

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  budget_group: 'needs' | 'wants' | 'savings' | null;
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
  monthly_expenses: number;
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
  groups: {
    needs: BudgetGroupSummary;
    wants: BudgetGroupSummary;
    savings: BudgetGroupSummary;
  };
}

export interface BudgetSuggestion {
  suggestion: {
    total_income: number;
    needs: { amount: number; percentage: number; description: string };
    wants: { amount: number; percentage: number; description: string };
    savings: { amount: number; percentage: number; description: string };
  };
  categories: Category[];
}

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
