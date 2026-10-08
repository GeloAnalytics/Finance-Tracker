import { z } from 'zod';

const positiveAmount = z.coerce.number().positive();
const nonNegativeAmount = z.coerce.number().nonnegative();
const dateOnly = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD')
  .refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Date is not valid');

// Auth schemas
export const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50, 'Username too long')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username may only contain letters, numbers, underscores, dots, or hyphens'),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  identifier: z.string().trim().max(255).optional(),
  email: z.string().trim().max(255).optional(),
  username: z.string().trim().max(50).optional(),
  password: z.string().min(1, 'Password is required').max(128),
});

// Transaction schemas
export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: positiveAmount,
  category_id: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  date: dateOnly.optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: positiveAmount.optional(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  date: dateOnly.optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Debt schemas
export const createDebtSchema = z.object({
  name: z.string().trim().min(1).max(100),
  total_amount: positiveAmount,
  current_balance: nonNegativeAmount,
  interest_rate: nonNegativeAmount.optional().default(0),
  minimum_payment: nonNegativeAmount.optional().default(0),
  due_date: z.coerce.number().int().min(1).max(31).nullable().optional(),
});

export const updateDebtSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  total_amount: positiveAmount.optional(),
  current_balance: nonNegativeAmount.optional(),
  interest_rate: nonNegativeAmount.optional(),
  minimum_payment: nonNegativeAmount.optional(),
  due_date: z.coerce.number().int().min(1).max(31).nullable().optional(),
  is_active: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Savings schemas
export const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  target_amount: positiveAmount,
  current_amount: nonNegativeAmount.optional().default(0),
  deadline: dateOnly.nullable().optional(),
  icon: z.string().trim().max(10).optional(),
});

export const updateSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  target_amount: positiveAmount.optional(),
  current_amount: nonNegativeAmount.optional(),
  deadline: dateOnly.nullable().optional(),
  icon: z.string().trim().max(10).optional(),
  is_completed: z.boolean().optional(),
});

export const contributeSavingsSchema = z.object({
  amount: positiveAmount,
});

// Budget schemas
export const createBudgetSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  amount: nonNegativeAmount,
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
});

// Bills schemas
export const createBillSchema = z.object({
  item_type: z.enum(['bill', 'to_buy']),
  name: z.string().trim().min(1).max(150),
  amount: nonNegativeAmount,
  due_date: dateOnly.nullable().optional(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export const updateBillSchema = z.object({
  item_type: z.enum(['bill', 'to_buy']).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  amount: nonNegativeAmount.optional(),
  due_date: dateOnly.nullable().optional(),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(['pending', 'completed']).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

// Advisor schema
export const advisorChatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000, 'Message is too long'),
});
