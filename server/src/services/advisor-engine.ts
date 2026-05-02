import pool from '../db/connection';
import { GoogleGenAI } from '@google/genai';

// Keep the old functions for context gathering
async function getFinancialContext(): Promise<string> {
  const [finances, debts, savings, budget] = await Promise.all([
    analyzeUserFinances(),
    analyzeUserDebts(),
    analyzeUserSavings(),
    analyzeUserBudget()
  ]);

  return `
--- USER FINANCIAL CONTEXT ---
FINANCES:
${finances}

DEBTS:
${debts}

SAVINGS:
${savings}

BUDGET:
${budget}
------------------------------
`;
}

export async function generateAdvisorResponse(userMessage: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return `**AI Advisor is not configured.**\n\nTo enable the smart AI advisor, please set the \`GEMINI_API_KEY\` environment variable in your Render dashboard (or local \`.env\` file) with a valid Google Gemini API key.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const context = await getFinancialContext();

    const systemPrompt = `You are FinanceWise Advisor, a helpful, encouraging, and expert financial AI assistant. 
Your goal is to provide personalized financial advice, explain financial concepts clearly, and help the user manage their money effectively.
Always use the Philippine Peso (₱) as the default currency context. Keep your responses concise, engaging, and well-formatted using markdown.

Here is the user's current financial data to help you personalize your advice:
${context}

When answering the user's question, try to reference their actual data if it's relevant (e.g. if they ask how to pay off debt, mention their specific high-interest debts). Be encouraging but realistic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will use this context to provide personalized financial advice.' }] },
        { role: 'user', parts: [{ text: userMessage }] }
      ]
    });

    return response.text || "I'm sorry, I couldn't generate a response at this time.";
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    return `I encountered an error while trying to generate a response. Please try again later.`;
  }
}

// Below are the context-gathering functions repurposed for the AI prompt
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
      return `No transactions recorded yet this month.`;
    }

    const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
    let response = `This month's income: ₱${income.toLocaleString()}, expenses: ₱${expenses.toLocaleString()}, net: ₱${(income - expenses).toLocaleString()} (${savingsRate.toFixed(1)}% savings rate).\n`;
    return response;
  } catch {
    return `Could not fetch finance data.`;
  }
}

async function analyzeUserDebts(): Promise<string> {
  try {
    const debts = await pool.query('SELECT * FROM debts WHERE is_active = true ORDER BY interest_rate DESC');
    if (debts.rows.length === 0) {
      return `No active debts recorded.`;
    }
    const total = debts.rows.reduce((s: number, d: any) => s + parseFloat(d.current_balance), 0);
    let response = `Total debt: ₱${total.toLocaleString()}.\n`;
    debts.rows.forEach((d: any) => {
      response += `- ${d.name}: ₱${parseFloat(d.current_balance).toLocaleString()} at ${d.interest_rate}% interest\n`;
    });
    return response;
  } catch {
    return `Could not fetch debt data.`;
  }
}

async function analyzeUserSavings(): Promise<string> {
  try {
    const goals = await pool.query('SELECT * FROM savings_goals ORDER BY is_completed ASC');
    if (goals.rows.length === 0) {
      return `No savings goals set.`;
    }
    let response = `Savings goals:\n`;
    goals.rows.forEach((g: any) => {
      const pct = parseFloat(g.target_amount) > 0 ? (parseFloat(g.current_amount) / parseFloat(g.target_amount) * 100) : 0;
      response += `- ${g.name}: ₱${parseFloat(g.current_amount).toLocaleString()} / ₱${parseFloat(g.target_amount).toLocaleString()} (${pct.toFixed(0)}%)\n`;
    });
    return response;
  } catch {
    return `Could not fetch savings data.`;
  }
}

async function analyzeUserBudget(): Promise<string> {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const budgets = await pool.query(`
      SELECT b.amount as budget, c.name, COALESCE(s.total, 0) as spent
      FROM budgets b JOIN categories c ON b.category_id = c.id
      LEFT JOIN (SELECT category_id, SUM(amount) as total FROM transactions
        WHERE type='expense' AND EXTRACT(MONTH FROM date)=$1 AND EXTRACT(YEAR FROM date)=$2 GROUP BY category_id
      ) s ON b.category_id = s.category_id WHERE b.month=$1 AND b.year=$2 ORDER BY c.name
    `, [month, year]);
    if (budgets.rows.length === 0) {
      return `No budgets set for this month.`;
    }
    let response = `Monthly Budget Status:\n`;
    budgets.rows.forEach((b: any) => {
      const pct = parseFloat(b.budget) > 0 ? (parseFloat(b.spent) / parseFloat(b.budget) * 100) : 0;
      response += `- ${b.name}: ₱${parseFloat(b.spent).toLocaleString()} / ₱${parseFloat(b.budget).toLocaleString()} (${pct.toFixed(0)}%)\n`;
    });
    return response;
  } catch {
    return `Could not fetch budget data.`;
  }
}
