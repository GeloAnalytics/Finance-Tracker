import { Router } from 'express';
import { getBills, createBill, updateBill, deleteBill, payOrBuyItem } from '../controllers/bills';

const router = Router();

router.get('/', getBills);
router.post('/', createBill);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);
router.post('/:id/pay-or-buy', payOrBuyItem);

export default router;
