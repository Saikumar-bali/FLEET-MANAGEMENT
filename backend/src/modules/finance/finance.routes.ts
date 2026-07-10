import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import { financeController } from './finance.controller';
import {
  createFinanceAccountSchema,
  updateFinanceAccountSchema,
  createFinanceCategorySchema,
  createVendorSchema,
  updateVendorSchema,
  createCustomerSchema,
  updateCustomerSchema,
  createTripBillingSchema,
  updateTripBillingSchema,
  createFinanceTransactionSchema,
  updateFinanceTransactionSchema,
  createPaymentRecordSchema,
  updatePaymentRecordSchema,
  financeQuerySchema,
  pnlQuerySchema,
  idParamsSchema,
} from './finance.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

// ─── Dashboard & Stats ───
router.get(
  '/dashboard-summary',
  requireAnyPermission(['finance_view', 'pnl_view']),
  asyncHandler(financeController.getDashboardSummary),
);

router.get(
  '/pnl',
  requireAnyPermission(['pnl_view']),
  validateRequest({ query: pnlQuerySchema }),
  asyncHandler(financeController.getPnl),
);

// ─── Accounts ───
router.get(
  '/accounts',
  requireAnyPermission(['finance_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listAccounts),
);

router.get(
  '/accounts/:id',
  requireAnyPermission(['finance_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getAccount),
);

router.post(
  '/accounts',
  requireAnyPermission(['finance_create']),
  validateRequest({ body: createFinanceAccountSchema }),
  asyncHandler(financeController.createAccount),
);

router.put(
  '/accounts/:id',
  requireAnyPermission(['finance_update']),
  validateRequest({ params: idParamsSchema, body: updateFinanceAccountSchema }),
  asyncHandler(financeController.updateAccount),
);

router.delete(
  '/accounts/:id',
  requireAnyPermission(['finance_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteAccount),
);

// ─── Categories ───
router.get(
  '/categories',
  requireAnyPermission(['finance_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listCategories),
);

router.get(
  '/categories/:id',
  requireAnyPermission(['finance_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getCategory),
);

router.post(
  '/categories',
  requireAnyPermission(['finance_create']),
  validateRequest({ body: createFinanceCategorySchema }),
  asyncHandler(financeController.createCategory),
);

router.delete(
  '/categories/:id',
  requireAnyPermission(['finance_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteCategory),
);

// ─── Vendors ───
router.get(
  '/vendors',
  requireAnyPermission(['vendors_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listVendors),
);

router.get(
  '/vendors/:id',
  requireAnyPermission(['vendors_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getVendor),
);

router.post(
  '/vendors',
  requireAnyPermission(['vendors_create']),
  validateRequest({ body: createVendorSchema }),
  asyncHandler(financeController.createVendor),
);

router.put(
  '/vendors/:id',
  requireAnyPermission(['vendors_update']),
  validateRequest({ params: idParamsSchema, body: updateVendorSchema }),
  asyncHandler(financeController.updateVendor),
);

router.delete(
  '/vendors/:id',
  requireAnyPermission(['vendors_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteVendor),
);

// ─── Customers ───
router.get(
  '/customers',
  requireAnyPermission(['customers_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listCustomers),
);

router.get(
  '/customers/:id',
  requireAnyPermission(['customers_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getCustomer),
);

router.post(
  '/customers',
  requireAnyPermission(['customers_create']),
  validateRequest({ body: createCustomerSchema }),
  asyncHandler(financeController.createCustomer),
);

router.put(
  '/customers/:id',
  requireAnyPermission(['customers_update']),
  validateRequest({ params: idParamsSchema, body: updateCustomerSchema }),
  asyncHandler(financeController.updateCustomer),
);

router.delete(
  '/customers/:id',
  requireAnyPermission(['customers_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteCustomer),
);

// ─── Trip Billings ───
router.get(
  '/trip-billings',
  requireAnyPermission(['trip_billing_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listTripBillings),
);

router.get(
  '/trip-billings/:id',
  requireAnyPermission(['trip_billing_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getTripBilling),
);

router.post(
  '/trip-billings',
  requireAnyPermission(['trip_billing_create']),
  validateRequest({ body: createTripBillingSchema }),
  asyncHandler(financeController.createTripBilling),
);

router.put(
  '/trip-billings/:id',
  requireAnyPermission(['trip_billing_update']),
  validateRequest({ params: idParamsSchema, body: updateTripBillingSchema }),
  asyncHandler(financeController.updateTripBilling),
);

router.delete(
  '/trip-billings/:id',
  requireAnyPermission(['trip_billing_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteTripBilling),
);

// ─── Transactions ───
router.get(
  '/transactions',
  requireAnyPermission(['finance_transactions_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listTransactions),
);

router.get(
  '/transactions/:id',
  requireAnyPermission(['finance_transactions_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getTransaction),
);

router.post(
  '/transactions',
  requireAnyPermission(['finance_transactions_create']),
  validateRequest({ body: createFinanceTransactionSchema }),
  asyncHandler(financeController.createTransaction),
);

router.put(
  '/transactions/:id',
  requireAnyPermission(['finance_transactions_update']),
  validateRequest({ params: idParamsSchema, body: updateFinanceTransactionSchema }),
  asyncHandler(financeController.updateTransaction),
);

router.delete(
  '/transactions/:id',
  requireAnyPermission(['finance_transactions_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deleteTransaction),
);

// ─── Payments ───
router.get(
  '/payments',
  requireAnyPermission(['payments_view']),
  validateRequest({ query: financeQuerySchema }),
  asyncHandler(financeController.listPayments),
);

router.get(
  '/payments/:id',
  requireAnyPermission(['payments_view']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.getPayment),
);

router.post(
  '/payments',
  requireAnyPermission(['payments_create']),
  validateRequest({ body: createPaymentRecordSchema }),
  asyncHandler(financeController.createPayment),
);

router.delete(
  '/payments/:id',
  requireAnyPermission(['payments_delete']),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(financeController.deletePayment),
);

export default router;
