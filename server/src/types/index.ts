// ============================================
// FinanceWise — Server Type Definitions
// ============================================

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
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionDTO {
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  description?: string;
  date?: string;
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

export interface CreateBudgetDTO {
  category_id: number;
  amount: number;
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
  created_at: string;
  updated_at: string;
}

export interface CreateDebtDTO {
  name: string;
  total_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date?: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavingsGoalDTO {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
  icon?: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'advisor';
  content: string;
  created_at: string;
}

export interface DashboardSummary {
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

export interface DebtPayoffPlan {
  method: 'snowball' | 'avalanche';
  total_months: number;
  total_interest: number;
  total_paid: number;
  monthly_schedule: {
    month: number;
    payments: { debt_name: string; payment: number; remaining: number }[];
  }[];
  order: { name: string; balance: number; rate: number }[];
}
