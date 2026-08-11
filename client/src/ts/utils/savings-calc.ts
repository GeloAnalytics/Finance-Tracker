// Pure math for the savings goal calculator — no DOM, directly testable.

const AVG_DAYS_PER_MONTH = 30.44;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_DAY / AVG_DAYS_PER_MONTH;
}

// Whole months needed to close the gap at a given monthly contribution.
// Returns 0 if the goal is already met, null if contribution can't make progress.
export function monthsToReachGoal(current: number, target: number, monthlyContribution: number): number | null {
  const remaining = target - current;
  if (remaining <= 0) return 0;
  if (monthlyContribution <= 0) return null;
  return Math.ceil(remaining / monthlyContribution);
}

export function projectedCompletionDate(
  current: number,
  target: number,
  monthlyContribution: number,
  from: Date = new Date()
): Date | null {
  const months = monthsToReachGoal(current, target, monthlyContribution);
  if (months === null) return null;
  const result = new Date(from);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Monthly contribution required to reach the goal by a deadline.
// Returns 0 if already met, null if the deadline has already passed.
export function requiredMonthlyContribution(
  current: number,
  target: number,
  deadline: Date,
  from: Date = new Date()
): number | null {
  const remaining = target - current;
  if (remaining <= 0) return 0;
  const months = monthsBetween(from, deadline);
  if (months <= 0) return null;
  return remaining / months;
}
