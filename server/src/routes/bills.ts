import { Router } from 'express';
import { getBills, createBill, updateBill, deleteBill, payOrBuyItem } from '../controllers/bills';
import { validateBody } from '../middleware/validate';
import { createBillSchema, updateBillSchema } from '../validation/schemas';

const router = Router();

router.get('/', getBills);
router.post('/', validateBody(createBillSchema), createBill);
router.put('/:id', validateBody(updateBillSchema), updateBill);
router.delete('/:id', deleteBill);
router.post('/:id/pay-or-buy', payOrBuyItem);

export default router;
