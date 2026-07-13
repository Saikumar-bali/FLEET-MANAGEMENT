import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { adjustWallet, getWalletWithLedger, listWallets } from './staff-wallets.service';
import { AppError } from '../../utils/appError';

const router=Router();
router.use(asyncHandler(authMiddleware));
router.get('/me/staff-wallet', requireAnyPermission(['staff_wallet_view_own','staff_wallet_view']), asyncHandler(async (req,res) => sendSuccess(res, await getWalletWithLedger(req.authUser!.id, Number(req.query.page)||1, Number(req.query.limit)||50))));
router.get('/staff-wallets', requireAnyPermission(['staff_wallet_view']), asyncHandler(async (_req,res) => sendSuccess(res, { items: await listWallets() })));
router.get('/staff-wallets/:userId', requireAnyPermission(['staff_wallet_view']), asyncHandler(async (req,res) => sendSuccess(res, await getWalletWithLedger(String(req.params.userId), Number(req.query.page)||1, Number(req.query.limit)||50))));
router.post('/staff-wallets/:userId/transactions', requireAnyPermission(['staff_wallet_adjust']), asyncHandler(async (req,res) => {
  const amount=Number(req.body.amount); const direction=String(req.body.direction||''); const reason=String(req.body.reason||'').trim(); const reference=String(req.body.reference||'').trim();
  if (!['CREDIT','DEBIT'].includes(direction) || !Number.isFinite(amount) || amount<=0 || !reason || !reference) throw new AppError('direction, positive amount, reason and unique reference are required',400);
  sendSuccess(res, await adjustWallet({userId:String(req.params.userId),direction:direction as any,amount,reason,reference,createdById:req.authUser!.id}), 'Wallet transaction posted', 201);
}));
export default router;
