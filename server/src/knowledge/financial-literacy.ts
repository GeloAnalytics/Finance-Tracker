// FinanceWise — Financial Literacy Knowledge Base
// Comprehensive knowledge for the AI Financial Advisor

export interface KnowledgeTopic {
  keywords: string[];
  title: string;
  response: string;
}

export const financialKnowledge: KnowledgeTopic[] = [
  {
    keywords: ['budget', 'budgeting', 'how to budget', 'create budget', 'make budget'],
    title: 'Budgeting Basics',
    response: `Great question! Budgeting is the foundation of financial health. Here's a simple approach:

**The 50/30/20 Rule:**
• 50% of income → Needs (rent, food, utilities, transport)
• 30% of income → Wants (entertainment, dining out, hobbies)
• 20% of income → Savings & Debt payoff

**Steps to start:**
1. Track ALL your income for the month
2. List your essential expenses (needs)
3. Set limits for non-essentials (wants)
4. Automatically set aside savings before spending
5. Review and adjust monthly

💡 **Tip:** The best budget is one you can actually stick to. Start simple and adjust as you learn your spending patterns.`
  },
  {
    keywords: ['50/30/20', '50 30 20', 'fifty thirty twenty', 'budget rule'],
    title: 'The 50/30/20 Rule',
    response: `The 50/30/20 rule is a simple budgeting framework:

**50% — Needs (Must-haves)**
Rent/housing, groceries, utilities, transportation, insurance, minimum debt payments

**30% — Wants (Nice-to-haves)**
Dining out, entertainment, shopping, subscriptions, hobbies, travel

**20% — Savings & Debt**
Emergency fund, investments, extra debt payments, retirement savings

**Example:** If you earn ₱20,000/month:
• Needs: ₱10,000
• Wants: ₱6,000
• Savings: ₱4,000

💡 **Starting from zero?** Even if you can only save 5-10% at first, that's a great start. Increase gradually as your income grows.`
  },
  {
    keywords: ['emergency fund', 'emergency savings', 'rainy day', 'safety net'],
    title: 'Emergency Fund',
    response: `An emergency fund is your financial safety net — money set aside for unexpected expenses.

**How much?**
• Starter goal: ₱10,000-20,000 (1 month of expenses)
• Intermediate: 3 months of expenses
• Ideal: 6 months of expenses

**Where to keep it:**
• A separate savings account you don't touch
• Somewhere accessible but not too easy to spend

**What counts as an emergency:**
✅ Job loss, medical bills, car/appliance repair, urgent home repair
❌ Sales, vacations, new gadgets, "treating yourself"

💡 **Start small:** Even ₱500/month adds up. ₱500 × 12 = ₱6,000 in a year. The habit matters more than the amount.`
  },
  {
    keywords: ['debt', 'pay off debt', 'debt payoff', 'get out of debt', 'owe money', 'loan'],
    title: 'Debt Payoff Strategies',
    response: `Paying off debt is one of the most powerful things you can do for your finances. Here are two proven methods:

**🔥 Avalanche Method (saves most money):**
Pay minimums on all debts, put extra money toward the HIGHEST interest rate debt first. Mathematically optimal.

**⛄ Snowball Method (builds motivation):**
Pay minimums on all debts, put extra money toward the SMALLEST balance first. Quick wins keep you motivated.

**Key principles:**
1. Always pay at least the minimum on ALL debts
2. Stop taking on new debt while paying off existing debt
3. Find extra money to accelerate payoff (cut expenses or earn more)
4. Celebrate each debt you eliminate

💡 **Which method?** If you need motivation, use Snowball. If you want to save the most money, use Avalanche. Both work — pick one and commit.`
  },
  {
    keywords: ['save', 'saving', 'how to save', 'save money', 'tips to save'],
    title: 'Saving Money Tips',
    response: `Here are practical ways to save money, especially when starting from zero:

**Pay Yourself First:**
When you get paid, immediately move your savings amount before spending anything else.

**Reduce expenses:**
• Cook at home (can save 50-70% vs eating out)
• Cancel unused subscriptions
• Use free entertainment (library, parks, free events)
• Buy generic/store brands
• Wait 24-48 hours before impulse purchases

**Earn more:**
• Ask for a raise or overtime
• Start a side hustle (freelancing, tutoring, selling items)
• Sell things you don't use

**Automate it:**
Set up automatic transfers to savings on payday. You can't spend what you don't see.

💡 **The Latte Factor:** Small daily expenses add up. ₱150/day coffee × 365 = ₱54,750/year. Not saying don't enjoy life — just be aware of the math.`
  },
  {
    keywords: ['credit', 'credit score', 'credit rating', 'build credit'],
    title: 'Understanding Credit',
    response: `Credit is your financial reputation — it shows lenders how trustworthy you are with borrowed money.

**Credit Score Factors:**
• Payment history (35%) — Pay on time, always
• Credit utilization (30%) — Keep balances below 30% of limit
• Length of history (15%) — Longer is better
• Credit mix (10%) — Different types of credit
• New inquiries (10%) — Don't apply for too much at once

**Building credit from scratch:**
1. Start with a secured credit card or store card
2. Use it for small purchases only
3. Pay the FULL balance every month
4. Never miss a payment
5. Keep utilization low

⚠️ **Warning:** Credit cards are tools, not free money. If you can't pay it off monthly, don't charge it.`
  },
  {
    keywords: ['invest', 'investing', 'investment', 'stock', 'stocks', 'mutual fund'],
    title: 'Investing Basics',
    response: `Investing is how you make your money grow over time. But build your foundation first!

**Before investing, make sure you have:**
✅ No high-interest debt (credit cards)
✅ An emergency fund (3-6 months)
✅ A stable income and budget

**Beginner-friendly options:**
• **Index funds/ETFs** — Diversified, low-cost, great for beginners
• **Mutual funds** — Professionally managed, good for hands-off investing
• **Government bonds** — Very safe, lower returns

**Key concepts:**
• **Compound interest** — Your money earns money on its money. Time is your biggest advantage.
• **Diversification** — Don't put all eggs in one basket
• **Dollar-cost averaging** — Invest a fixed amount regularly regardless of market conditions

💡 **Example of compound interest:** ₱5,000/month at 8% annual return:
• After 10 years: ~₱920,000
• After 20 years: ~₱2,900,000
• After 30 years: ~₱7,400,000

Start early. Time in the market > timing the market.`
  },
  {
    keywords: ['compound interest', 'compound', 'interest', 'time value'],
    title: 'The Power of Compound Interest',
    response: `Compound interest is often called the "8th wonder of the world" — and for good reason.

**Simple interest:** You earn interest only on your original amount
**Compound interest:** You earn interest on your original amount PLUS previous interest

**Example:**
₱100,000 at 8% annual return:
• Year 1: ₱108,000 (+₱8,000)
• Year 5: ₱146,933 (+₱46,933)
• Year 10: ₱215,892 (+₱115,892)
• Year 20: ₱466,096 (+₱366,096)
• Year 30: ₱1,006,266 (+₱906,266)

Your money MORE THAN DOUBLES every decade!

💡 **The flip side:** Compound interest works AGAINST you on debt. A ₱100,000 credit card balance at 24% interest becomes ₱248,000 in just 4 years if unpaid. This is why paying off high-interest debt is priority #1.`
  },
  {
    keywords: ['needs vs wants', 'need or want', 'necessary', 'essential'],
    title: 'Needs vs. Wants',
    response: `Distinguishing needs from wants is crucial for smart spending:

**Needs (survival & basic functioning):**
🏠 Housing, 🍚 Basic food, 💡 Utilities, 🚌 Transportation to work, 🏥 Healthcare, 📱 Basic phone

**Wants (improve quality of life but not essential):**
🍕 Dining out, 📺 Streaming services, 🛍️ New clothes (beyond basics), 🎮 Entertainment, ☕ Daily coffee shop visits

**The gray area:**
Internet could be a need (for work) or want (for Netflix). Be honest with yourself.

**Ask yourself:**
1. Can I survive without this? → If yes, it's a want
2. Is there a cheaper alternative? → If yes, consider it
3. Am I buying this emotionally? → Wait 24 hours

💡 **Not about deprivation:** Having wants is normal and healthy. The goal is to be intentional about spending, not to eliminate all joy.`
  },
  {
    keywords: ['lifestyle inflation', 'lifestyle creep', 'spending more'],
    title: 'Avoiding Lifestyle Inflation',
    response: `Lifestyle inflation is when your spending increases as your income increases — keeping you in the same financial position despite earning more.

**Example:**
You get a ₱5,000 raise. Instead of saving it, you:
• Upgrade your phone plan (+₱500)
• Eat out more (+₱2,000)
• Subscribe to new services (+₱1,000)
• Buy nicer things (+₱1,500)
Now your raise is gone and you're no better off.

**How to avoid it:**
1. When you get a raise, save at least 50% of the increase
2. Keep your fixed expenses the same as long as possible
3. Upgrade your lifestyle slowly and intentionally
4. Focus on experiences over things
5. Remember: wealth is what you DON'T spend

💡 **The millionaire mindset:** Many millionaires drive used cars and live below their means. They got wealthy by keeping expenses low while income grew.`
  },
  {
    keywords: ['side hustle', 'extra income', 'earn more', 'make money', 'additional income'],
    title: 'Building Additional Income',
    response: `Increasing income accelerates your financial goals. Here are ideas:

**Skills-based:**
• Freelancing (writing, design, programming, tutoring)
• Virtual assistant work
• Teaching/tutoring online
• Social media management

**Physical/Local:**
• Selling crafts or food
• Reselling items (thrift → online)
• Pet sitting/dog walking
• Delivery services

**Digital/Passive (takes time to build):**
• Content creation (YouTube, blog)
• Online courses
• Print-on-demand
• Affiliate marketing

**Key principles:**
1. Start with skills you already have
2. Reinvest early earnings into the business
3. Don't let it affect your main job
4. Track income and expenses separately

💡 **Even ₱3,000-5,000/month extra** directed entirely to savings or debt payoff can dramatically change your financial trajectory.`
  },
  {
    keywords: ['parent debt', 'family debt', 'parents owe', 'family financial', 'help parents'],
    title: 'Dealing with Family Debt',
    response: `This is a sensitive and important topic. Here's some guidance:

**Important truths:**
• Your parents' debt is NOT your legal obligation (unless you co-signed)
• You can help without sacrificing your own financial future
• Setting boundaries is healthy and necessary

**How to help wisely:**
1. **Secure your own finances first** — You can't pour from an empty cup
2. **Help with strategy, not just money** — Help them budget and plan
3. **Set clear limits** — Decide what you can contribute without harming yourself
4. **Avoid co-signing** new loans for family members
5. **Break the cycle** — Learn from their experience and build differently

**Breaking the debt cycle:**
• Learn financial literacy (you're already doing this!)
• Build an emergency fund before helping others
• Live below your means
• Avoid consumer debt
• Communicate openly about money with family

💡 **You're not selfish for building your own foundation first.** A financially stable you can help your family much more in the long run than someone who's also drowning in debt.`
  },
  {
    keywords: ['good debt', 'bad debt', 'types of debt', 'debt difference'],
    title: 'Good Debt vs Bad Debt',
    response: `Not all debt is equal. Understanding the difference is crucial:

**"Good" Debt (can build wealth):**
• Education loans (increases earning potential)
• Business loans (creates income)
• Mortgage (builds equity in an appreciating asset)
• Characteristics: Low interest, builds value over time

**"Bad" Debt (destroys wealth):**
• Credit card debt (high interest, depreciating purchases)
• Payday loans (extremely high interest)
• Car loans for cars you can't afford
• Consumer debt for wants (gadgets, clothes, etc.)
• Characteristics: High interest, purchases lose value

**Rules of thumb:**
• If the interest rate is higher than potential investment returns (~8%), it's likely bad debt
• If the purchase loses value over time, borrowing for it is usually bad
• If you can't afford the payments comfortably, don't take the debt

💡 **Best approach for beginners:** Avoid ALL debt until you have a solid financial foundation. If you must borrow, understand the total cost including interest.`
  },
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'start', 'what can you do', 'intro'],
    title: 'Welcome',
    response: `Hi there! 👋 I'm your FinanceWise Advisor — here to help you build smart financial habits.

**I can help you with:**
📊 Budgeting strategies (like the 50/30/20 rule)
💰 Saving money tips and goals
💳 Debt payoff strategies (snowball vs avalanche)
🏦 Building an emergency fund
📈 Investment basics
💡 Financial literacy concepts
🎯 Personalized advice based on YOUR financial data

**Quick topics to ask about:**
• "How do I start budgeting?"
• "How do I pay off debt?"
• "What's an emergency fund?"
• "How do I start investing?"
• "Needs vs wants"
• "How to save money"

Just type your question and I'll do my best to help! 🚀`
  },
  {
    keywords: ['zero based', 'zero-based', 'envelope', 'envelope method', 'budget method'],
    title: 'Zero-Based Budgeting & Envelope Method',
    response: `These are two powerful budgeting methods:

**Zero-Based Budgeting:**
Every peso has a job. Income minus all planned spending = exactly ₱0.

Example with ₱20,000 income:
• Rent: ₱5,000
• Food: ₱4,000
• Transport: ₱2,000
• Utilities: ₱1,500
• Savings: ₱3,000
• Entertainment: ₱2,000
• Misc: ₱2,500
• Total: ₱20,000 (zero left unassigned)

**Envelope Method (digital or physical):**
Put cash in labeled envelopes for each category. When an envelope is empty, you stop spending in that category.

Works great for categories you tend to overspend on (dining out, shopping, entertainment).

💡 **Digital version:** Use this app's budget feature! Set limits per category and watch your progress bars — same concept, no cash needed.`
  },
  {
    keywords: ['pay yourself first', 'automatic savings', 'automate'],
    title: 'Pay Yourself First',
    response: `This is one of the most important financial principles:

**The concept:** Treat savings like a bill. Pay it FIRST, before any other spending.

**How it works:**
1. Get paid
2. Immediately transfer savings amount (even 10% is great)
3. Pay bills and necessities
4. Whatever's left is for discretionary spending

**Why it works:**
• You save consistently regardless of willpower
• You adjust spending to what's left (and you WILL adjust)
• It removes the "I'll save whatever's left" trap (there's never anything left)

**Automate it:**
Set up automatic transfers on payday. You can't miss what you never see.

💡 **Start with whatever you can.** ₱500/payday is infinitely better than ₱0. Increase by ₱500 every few months as you adjust.`
  },
];

export function findBestResponse(message: string): { title: string; response: string } | null {
  const lower = message.toLowerCase().trim();

  let bestMatch: KnowledgeTopic | null = null;
  let bestScore = 0;

  for (const topic of financialKnowledge) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += keyword.split(' ').length; // multi-word matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = topic;
    }
  }

  if (bestMatch && bestScore > 0) {
    return { title: bestMatch.title, response: bestMatch.response };
  }

  return null;
}
