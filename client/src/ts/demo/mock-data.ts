// FinanceWise — Demo Mode seed data
//
// Purely client-side dummy data (Philippine Peso amounts) used to power the
// live portfolio demo. Nothing here ever touches the real API or database.

export interface DemoCategory {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense' | 'both';
  budget_group: 'needs' | 'wants' | 'savings' | null;
}

export interface DemoTransaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  description: string | null;
  date: string;
  created_at: string;
}

export interface DemoBudget {
  id: number;
  category_id: number;
  amount: number;
  month: number;
  year: number;
}

export interface DemoDebt {
  id: number;
  name: string;
  total_amount: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: number | null;
  is_active: boolean;
}

export interface DemoSavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  is_completed: boolean;
}

export interface DemoChatMessage {
  id: number;
  role: 'user' | 'advisor';
  content: string;
  created_at: string;
}

export interface DemoData {
  categories: DemoCategory[];
  transactions: DemoTransaction[];
  budgets: DemoBudget[];
  debts: DemoDebt[];
  savingsGoals: DemoSavingsGoal[];
  chatMessages: DemoChatMessage[];
  nextIds: { transaction: number; budget: number; debt: number; savingsGoal: number; chat: number };
}

const CATEGORIES: DemoCategory[] = [
  { id: 1, name: 'Salary', icon: '💼', type: 'income', budget_group: null },
  { id: 2, name: 'Freelance', icon: '💻', type: 'income', budget_group: null },
  { id: 3, name: 'Side Hustle', icon: '🔧', type: 'income', budget_group: null },
  { id: 4, name: 'Gifts', icon: '🎁', type: 'both', budget_group: null },
  { id: 5, name: 'Other Income', icon: '💵', type: 'income', budget_group: null },
  { id: 6, name: 'Rent / Housing', icon: '🏠', type: 'expense', budget_group: 'needs' },
  { id: 7, name: 'Groceries', icon: '🛒', type: 'expense', budget_group: 'needs' },
  { id: 8, name: 'Utilities', icon: '💡', type: 'expense', budget_group: 'needs' },
  { id: 9, name: 'Transportation', icon: '🚌', type: 'expense', budget_group: 'needs' },
  { id: 10, name: 'Insurance', icon: '🛡️', type: 'expense', budget_group: 'needs' },
  { id: 11, name: 'Healthcare', icon: '🏥', type: 'expense', budget_group: 'needs' },
  { id: 12, name: 'Phone / Internet', icon: '📱', type: 'expense', budget_group: 'needs' },
  { id: 13, name: 'Dining Out', icon: '🍕', type: 'expense', budget_group: 'wants' },
  { id: 14, name: 'Entertainment', icon: '🎬', type: 'expense', budget_group: 'wants' },
  { id: 15, name: 'Shopping', icon: '🛍️', type: 'expense', budget_group: 'wants' },
  { id: 16, name: 'Subscriptions', icon: '📺', type: 'expense', budget_group: 'wants' },
  { id: 17, name: 'Hobbies', icon: '🎮', type: 'expense', budget_group: 'wants' },
  { id: 18, name: 'Personal Care', icon: '💅', type: 'expense', budget_group: 'wants' },
  { id: 19, name: 'Travel', icon: '✈️', type: 'expense', budget_group: 'wants' },
  { id: 20, name: 'Emergency Fund', icon: '🆘', type: 'expense', budget_group: 'savings' },
  { id: 21, name: 'Investments', icon: '📈', type: 'expense', budget_group: 'savings' },
  { id: 22, name: 'Debt Payment', icon: '💳', type: 'expense', budget_group: 'savings' },
  { id: 23, name: 'Savings', icon: '🏦', type: 'expense', budget_group: 'savings' },
];

function rand(min: number, max: number, step = 1): number {
  const val = Math.random() * (max - min) + min;
  return Math.round(val / step) * step;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Formats a Date's LOCAL calendar date as YYYY-MM-DD — deliberately avoids
// toISOString(), which converts through UTC and can shift day-1 dates into
// the previous month depending on the browser's timezone offset.
function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateInMonth(monthsBack: number, day: number, now: Date): string {
  const daysInTargetMonth = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0).getDate();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, Math.min(day, daysInTargetMonth));
  return toDateString(d);
}

export function createSeedData(): DemoData {
  const now = new Date();
  const transactions: DemoTransaction[] = [];
  let txId = 1;

  const addTx = (type: 'income' | 'expense', categoryId: number, amount: number, monthsBack: number, day: number, description: string) => {
    const date = dateInMonth(monthsBack, day, now);
    transactions.push({
      id: txId++,
      type,
      amount,
      category_id: categoryId,
      description,
      date,
      created_at: `${date}T${String(rand(7, 21)).padStart(2, '0')}:00:00.000Z`,
    });
  };

  for (let m = 5; m >= 0; m--) {
    // Income
    addTx('income', 1, rand(42000, 50000, 500), m, 15, 'Monthly salary');
    if (Math.random() < 0.6) {
      addTx('income', 2, rand(3000, 9000, 500), m, rand(5, 25), pick(['Freelance web project', 'Freelance design gig', 'Consulting work']));
    }

    // Needs
    addTx('expense', 6, 12000, m, 1, 'Monthly rent');
    for (let i = 0; i < rand(2, 3); i++) {
      addTx('expense', 7, rand(1200, 2500, 50), m, rand(1, 28), pick(['Grocery run', 'Weekly groceries', 'Supermarket']));
    }
    addTx('expense', 8, rand(2200, 3200, 50), m, rand(3, 10), 'Electricity & water bill');
    addTx('expense', 9, rand(1500, 2800, 50), m, rand(2, 28), pick(['Gas / fuel', 'Grab rides', 'Transport fare']));
    addTx('expense', 10, 1200, m, 5, 'Health insurance premium');
    if (Math.random() < 0.3) {
      addTx('expense', 11, rand(500, 2500, 50), m, rand(1, 28), pick(['Doctor visit', 'Pharmacy', 'Dental checkup']));
    }
    addTx('expense', 12, 1599, m, 8, 'Phone & internet bill');

    // Wants
    for (let i = 0; i < rand(2, 4); i++) {
      addTx('expense', 13, rand(300, 900, 50), m, rand(1, 28), pick(['Dinner out', 'Coffee shop', 'Fast food', 'Restaurant']));
    }
    for (let i = 0; i < rand(1, 2); i++) {
      addTx('expense', 14, rand(400, 1200, 50), m, rand(1, 28), pick(['Movie night', 'Streaming rental', 'Concert']));
    }
    for (let i = 0; i < rand(1, 2); i++) {
      addTx('expense', 15, rand(600, 2500, 100), m, rand(1, 28), pick(['Clothes shopping', 'Online shopping', 'New gadget accessory']));
    }
    addTx('expense', 16, 598, m, 20, 'Netflix & Spotify');
    if (Math.random() < 0.4) {
      addTx('expense', 17, rand(500, 1500, 50), m, rand(1, 28), pick(['Gaming purchase', 'Hobby supplies']));
    }
    addTx('expense', 18, rand(400, 1000, 50), m, rand(1, 28), pick(['Haircut', 'Skincare', 'Personal care']));
    if (m === 3) {
      addTx('expense', 19, rand(4000, 9000, 500), m, rand(1, 28), 'Weekend trip');
    }

    // Savings group
    addTx('expense', 23, rand(3000, 6000, 500), m, 16, 'Transfer to savings');
    if (Math.random() < 0.5) {
      addTx('expense', 21, rand(1500, 4000, 500), m, rand(1, 28), 'Index fund contribution');
    }
    addTx('expense', 22, rand(2000, 4000, 500), m, rand(1, 28), 'Extra debt payment');
    if (Math.random() < 0.3) {
      addTx('expense', 20, rand(1000, 3000, 500), m, rand(1, 28), 'Emergency fund top-up');
    }
  }

  const budgets: DemoBudget[] = [
    { category_id: 6, amount: 12000 },
    { category_id: 7, amount: 6000 },
    { category_id: 8, amount: 3000 },
    { category_id: 9, amount: 2500 },
    { category_id: 10, amount: 1200 },
    { category_id: 12, amount: 1600 },
    { category_id: 13, amount: 3000 },
    { category_id: 14, amount: 2000 },
    { category_id: 15, amount: 3500 },
    { category_id: 16, amount: 600 },
    { category_id: 23, amount: 5000 },
    { category_id: 21, amount: 3000 },
    { category_id: 22, amount: 3000 },
    { category_id: 20, amount: 2000 },
  ].map((b, i) => ({ id: i + 1, month: now.getMonth() + 1, year: now.getFullYear(), ...b }));

  const debts: DemoDebt[] = [
    { id: 1, name: 'Credit Card', total_amount: 45000, current_balance: 32000, interest_rate: 24, minimum_payment: 2500, due_date: 10, is_active: true },
    { id: 2, name: 'Car Loan', total_amount: 350000, current_balance: 210000, interest_rate: 8.5, minimum_payment: 9800, due_date: 5, is_active: true },
    { id: 3, name: 'Appliance Installment', total_amount: 15000, current_balance: 6000, interest_rate: 12, minimum_payment: 1500, due_date: 20, is_active: true },
  ];

  const inMonths = (n: number): string => {
    const d = new Date(now.getFullYear(), now.getMonth() + n, now.getDate());
    return toDateString(d);
  };

  const savingsGoals: DemoSavingsGoal[] = [
    { id: 1, name: 'Emergency Fund', target_amount: 100000, current_amount: 42000, deadline: inMonths(8), icon: '🆘', is_completed: false },
    { id: 2, name: 'New Laptop', target_amount: 65000, current_amount: 65000, deadline: inMonths(-1), icon: '💻', is_completed: true },
    { id: 3, name: 'Japan Trip', target_amount: 150000, current_amount: 38000, deadline: inMonths(14), icon: '✈️', is_completed: false },
    { id: 4, name: 'Investment Starter Fund', target_amount: 50000, current_amount: 12000, deadline: null, icon: '📈', is_completed: false },
  ];

  return {
    categories: CATEGORIES,
    transactions,
    budgets,
    debts,
    savingsGoals,
    chatMessages: [],
    nextIds: {
      transaction: txId,
      budget: budgets.length + 1,
      debt: debts.length + 1,
      savingsGoal: savingsGoals.length + 1,
      chat: 1,
    },
  };
}
