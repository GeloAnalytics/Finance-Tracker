import pool from '../db/connection';
import { findBestResponse } from '../knowledge/financial-literacy';

export async function generateAdvisorResponse(userMessage: string): Promise<string> {
  // 1. Check knowledge base first
  const knowledgeMatch = findBestResponse(userMessage);
  if (knowledgeMatch) {
    return knowledgeMatch.response;
  }

  // 2. Try personalized analysis based on keywords
  const lower = userMessage.toLowerCase();

  if (lower.includes('my spending') || lower.includes('my expenses') || lower.includes('analyze') || lower.includes('how am i doing')) {
    return await analyzeUserFinances();
  }

  if (lower.includes('my debt') || lower.includes('my loans') || lower.includes('what do i owe')) {
    return await analyzeUserDebts();
  }

  if (lower.includes('my savings') || lower.includes('my goals') || lower.includes('saving progress')) {
    return await analyzeUserSavings();
  }

  if (lower.includes('my budget') || lower.includes('budget status') || lower.includes('over budget')) {
    return await analyzeUserBudget();
  }

  // 3. Fallback
  return `I'm not sure I understood that question. Here are some topics I can help with:

📊 **Budgeting** — "How do I budget?" or "What's the 50/30/20 rule?"
💰 **Saving** — "How to save money" or "What's an emergency fund?"
💳 **Debt** — "How to pay off debt" or "Good vs bad debt"
📈 **Investing** — "How to start investing" or "What is compound interest?"
🏦 **Credit** — "How to build credit"
👨‍👩‍👧 **Family** — "Dealing with family debt"

You can also ask me to analyze YOUR data:
• "How am I doing?" — Overall financial analysis
• "Analyze my spending" — Spending breakdown
• "My debt status" — Debt analysis
• "My savings progress" — Savings goal review`;
}

async function analyzeUserFinances(): Promise<string> {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const monthly = await pool.query(`
      SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions
      WHERE EXTRACT(MONTH FROM date) = $1 AND EXTRACT(YEAR FROM date) = $2 GROUP BY type
    `, [month, year]);

    let income = 0, expenses = 0;
    monthly.rows.forEach((r: any) => {
      if (r.type === 'income') income = parseFloat(r.total);
      if (r.type === 'expense') expenses = parseFloat(r.total);
    });

    if (income === 0 && expenses === 0) {
      return `📊 I don't see any transactions recorded yet this month. Start by adding your income and expenses so I can give you personalized insights!\n\n**Quick start:** Go to the Transactions page and add your monthly income first, then start logging expenses as they happen.`;
    }

    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
    const topExpenses = await pool.query(`
      SELECT c.name, c.icon, SUM(t.amount) as total FROM transactions t
      JOIN categories c ON t.category_id = c.id WHERE t.type = 'expense'
      AND EXTRACT(MONTH FROM t.date) = $1 AND EXTRACT(YEAR FROM t.date) = $2
      GROUP BY c.name, c.icon ORDER BY total DESC LIMIT 5
    `, [month, year]);

    let response = `📊 **Your Financial Snapshot This Month:**\n\n`;
    response += `💚 Income: ₱${income.toLocaleString()}\n`;
    response += `🔴 Expenses: ₱${expenses.toLocaleString()}\n`;
    response += `${savingsRate >= 0 ? '💰' : '⚠️'} Net: ₱${(income - expenses).toLocaleString()} (${savingsRate.toFixed(1)}% savings rate)\n\n`;

    if (topExpenses.rows.length > 0) {
      response += `**Top Spending Categories:**\n`;
      topExpenses.rows.forEach((r: any) => {
        response += `${r.icon} ${r.name}: ₱${parseFloat(r.total).toLocaleString()}\n`;
      });
      response += '\n';
    }

    if (savingsRate >= 20) response += `✅ Great job! You're saving ${savingsRate.toFixed(0)}% — that meets the 50/30/20 rule target!`;
    else if (savingsRate >= 10) response += `👍 You're saving ${savingsRate.toFixed(0)}%. Try to push toward 20% for optimal financial health.`;
    else if (savingsRate >= 0) response += `⚠️ Your savings rate is ${savingsRate.toFixed(0)}%. Look for areas to cut spending and aim for at least 10-20%.`;
    else response += `🚨 You're spending more than you earn! This is unsustainable. Review your expenses and find areas to cut immediately.`;

    return response;
  } catch {
    return `I couldn't analyze your finances right now. Make sure you've added some transactions first!`;
  }
}

async function analyzeUserDebts(): Promise<string> {
  try {
    const debts = await pool.query('SELECT * FROM debts WHERE is_active = true ORDER BY interest_rate DESC');
    if (debts.rows.length === 0) {
      return `💳 You have no active debts recorded — that's great! If you do have debts, add them in the Debt Tracker to get payoff strategies.`;
    }
    const total = debts.rows.reduce((s: number, d: any) => s + parseFloat(d.current_balance), 0);
    let response = `💳 **Your Debt Overview:**\n\nTotal debt: ₱${total.toLocaleString()}\n\n`;
    debts.rows.forEach((d: any) => {
      response += `• **${d.name}**: ₱${parseFloat(d.current_balance).toLocaleString()} at ${d.interest_rate}% interest\n`;
    });
    const highInterest = debts.rows.filter((d: any) => parseFloat(d.interest_rate) > 10);
    if (highInterest.length > 0) {
      response += `\n⚠️ You have ${highInterest.length} high-interest debt(s). Consider the **Avalanche method** to save on interest. Check the Debt Tracker for a detailed payoff plan!`;
    }
    return response;
  } catch {
    return `I couldn't analyze your debts right now. Try adding them in the Debt Tracker page.`;
  }
}

async function analyzeUserSavings(): Promise<string> {
  try {
    const goals = await pool.query('SELECT * FROM savings_goals ORDER BY is_completed ASC');
    if (goals.rows.length === 0) {
      return `🎯 You haven't set any savings goals yet! Go to Savings Goals to create your first one.\n\n**Suggested first goals:**\n1. Emergency Fund (₱10,000-20,000)\n2. A specific short-term goal (something motivating!)`;
    }
    let response = `🎯 **Your Savings Goals:**\n\n`;
    goals.rows.forEach((g: any) => {
      const pct = parseFloat(g.target_amount) > 0 ? (parseFloat(g.current_amount) / parseFloat(g.target_amount) * 100) : 0;
      const status = g.is_completed ? '✅' : pct >= 75 ? '🔥' : pct >= 50 ? '💪' : pct >= 25 ? '📈' : '🌱';
      response += `${status} **${g.name}**: ₱${parseFloat(g.current_amount).toLocaleString()} / ₱${parseFloat(g.target_amount).toLocaleString()} (${pct.toFixed(0)}%)\n`;
    });
    return response;
  } catch {
    return `I couldn't analyze your savings right now. Try the Savings Goals page.`;
  }
}

async function analyzeUserBudget(): Promise<string> {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const budgets = await pool.query(`
      SELECT b.amount as budget, c.name, c.icon, COALESCE(s.total, 0) as spent
      FROM budgets b JOIN categories c ON b.category_id = c.id
      LEFT JOIN (SELECT category_id, SUM(amount) as total FROM transactions
        WHERE type='expense' AND EXTRACT(MONTH FROM date)=$1 AND EXTRACT(YEAR FROM date)=$2 GROUP BY category_id
      ) s ON b.category_id = s.category_id WHERE b.month=$1 AND b.year=$2 ORDER BY c.name
    `, [month, year]);
    if (budgets.rows.length === 0) {
      return `📋 No budgets set for this month. Go to the Budget page to set up your monthly budgets using the 50/30/20 rule!`;
    }
    let response = `📋 **Budget Status This Month:**\n\n`;
    let overBudget = 0;
    budgets.rows.forEach((b: any) => {
      const pct = parseFloat(b.budget) > 0 ? (parseFloat(b.spent) / parseFloat(b.budget) * 100) : 0;
      const icon = pct > 100 ? '🔴' : pct > 80 ? '🟡' : '🟢';
      response += `${icon} ${b.icon} ${b.name}: ₱${parseFloat(b.spent).toLocaleString()} / ₱${parseFloat(b.budget).toLocaleString()} (${pct.toFixed(0)}%)\n`;
      if (pct > 100) overBudget++;
    });
    if (overBudget > 0) response += `\n⚠️ You're over budget in ${overBudget} category(ies). Review and adjust spending!`;
    else response += `\n✅ You're within budget across all categories. Keep it up!`;
    return response;
  } catch {
    return `I couldn't analyze your budget right now. Set up budgets in the Budget page first.`;
  }
}
