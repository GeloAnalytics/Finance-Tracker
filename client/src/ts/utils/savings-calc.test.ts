import { describe, it, expect } from 'vitest';
import { monthsToReachGoal, projectedCompletionDate, requiredMonthlyContribution } from './savings-calc';

describe('monthsToReachGoal', () => {
  it('computes months needed, rounding up', () => {
    // 1000 remaining / 300 per month = 3.33 -> 4 months
    expect(monthsToReachGoal(0, 1000, 300)).toBe(4);
  });

  it('returns 0 when the goal is already met', () => {
    expect(monthsToReachGoal(1000, 1000, 100)).toBe(0);
    expect(monthsToReachGoal(1200, 1000, 100)).toBe(0);
  });

  it('returns null when contribution cannot make progress', () => {
    expect(monthsToReachGoal(0, 1000, 0)).toBeNull();
    expect(monthsToReachGoal(0, 1000, -50)).toBeNull();
  });
});

describe('projectedCompletionDate', () => {
  it('adds the computed number of months to the from date', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const result = projectedCompletionDate(0, 600, 300, from);
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2026);
    expect(result!.getUTCMonth()).toBe(2); // 0-indexed: March, 2 months out
  });

  it('returns null when contribution cannot make progress', () => {
    expect(projectedCompletionDate(0, 1000, 0)).toBeNull();
  });
});

describe('requiredMonthlyContribution', () => {
  it('computes the amount needed per month to hit a future deadline', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const deadline = new Date('2026-07-01T00:00:00Z'); // ~6 months out
    const result = requiredMonthlyContribution(0, 6000, deadline, from);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(900);
    expect(result!).toBeLessThan(1100);
  });

  it('returns 0 when the goal is already met', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const deadline = new Date('2026-07-01T00:00:00Z');
    expect(requiredMonthlyContribution(1000, 1000, deadline, from)).toBe(0);
  });

  it('returns null when the deadline has already passed', () => {
    const from = new Date('2026-06-01T00:00:00Z');
    const deadline = new Date('2026-01-01T00:00:00Z');
    expect(requiredMonthlyContribution(0, 1000, deadline, from)).toBeNull();
  });
});
