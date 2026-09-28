interface LandingHandlers {
  onTryDemo: () => void;
  onLogin: (tab?: 'login' | 'register') => void;
}

const FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: '📊', title: 'Dashboard', desc: 'Balance, income vs. expenses, spending-by-category and 6-month trend charts, plus a computed 0–100 financial health score.' },
  { icon: '💰', title: 'Transactions', desc: 'Full CRUD for income and expenses, filterable by type, category, date range, and search.' },
  { icon: '📋', title: 'Budgets (50/30/20)', desc: 'Monthly per-category limits with spent-vs-budget rollups and a needs/wants/savings breakdown.' },
  { icon: '💳', title: 'Debt Payoff Tracker', desc: 'Snowball and avalanche payoff simulators projected up to 30 years, with total interest and time-to-debt-free.' },
  { icon: '🎯', title: 'Savings Goals', desc: 'Multiple goals with contributions, auto-completion, and a calculator for months-to-goal or required monthly savings.' },
  { icon: '🤖', title: 'AI Advisor', desc: 'Chat grounded in the account’s live financial data — income, debts, budgets, and savings — with full chat history.' },
];

const STACK = ['TypeScript', 'Vite', 'Express', 'PostgreSQL', 'Zod', 'Chart.js', 'JWT Auth', 'Gemini AI'];

export function renderLandingScreen(handlers: LandingHandlers): void {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="landing-screen">
      <div class="landing-hero animate-in stagger-1">
        <div class="logo landing-logo">
          <span class="logo-icon">💰</span>
          <h1 class="logo-text">FinanceWise</h1>
        </div>
        <h2 class="landing-title">Track income. Master budgets. Kill debt. Hit savings goals.</h2>
        <p class="landing-subtitle">
          A full-stack multi-user personal finance tracker — vanilla TypeScript SPA, Express + PostgreSQL API,
          and an AI financial advisor grounded in your own user-bound live data.
        </p>
        <div class="landing-cta">
          <button id="btn-go-register" class="btn btn-primary btn-lg">Create Account →</button>
          <button id="btn-go-login" class="btn btn-ghost btn-lg">Log In</button>
          <button id="btn-try-demo" class="btn btn-ghost btn-lg">Try Live Demo</button>
        </div>
        <p class="landing-note">
          Create your own account to track your finances privately, or try the demo mode to test with sample data.
        </p>
      </div>

      <div class="landing-features animate-in stagger-2">
        ${FEATURES.map((f) => `
          <div class="glass-card landing-feature">
            <div class="stat-icon">${f.icon}</div>
            <h3>${f.title}</h3>
            <p>${f.desc}</p>
          </div>
        `).join('')}
      </div>

      <div class="landing-stack animate-in stagger-3">
        <h3 class="landing-stack-title">Built with</h3>
        <div class="landing-stack-badges">
          ${STACK.map((s) => `<span class="badge">${s}</span>`).join('')}
        </div>
      </div>

      <footer class="landing-footer">Built with 💜 for your financial future</footer>
    </div>
  `;

  document.getElementById('btn-try-demo')?.addEventListener('click', handlers.onTryDemo);
  document.getElementById('btn-go-register')?.addEventListener('click', () => handlers.onLogin('register'));
  document.getElementById('btn-go-login')?.addEventListener('click', () => handlers.onLogin('login'));
}
