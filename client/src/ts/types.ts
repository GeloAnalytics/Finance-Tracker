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
