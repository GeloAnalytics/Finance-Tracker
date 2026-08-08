import { Router } from 'express';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactions';
import { validateBody } from '../middleware/validate';
import { createTransactionSchema, updateTransactionSchema } from '../validation/schemas';

const router = Router();

router.get('/', getTransactions);
router.post('/', validateBody(createTransactionSchema), createTransaction);
router.put('/:id', validateBody(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
