import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { createAuditLog } from '../audit/audit.service';
import { createExpense, getExpense, listExpenses, transitionExpense, updateExpense } from './expenses.service';

export async function listExpensesController(req: Request, res: Response) {
  return sendSuccess(res, await listExpenses({ ...req.query, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 20 }));
}
export async function getExpenseController(req: Request, res: Response) { return sendSuccess(res, await getExpense(String(req.params.id))); }
export async function createExpenseController(req: Request, res: Response) {
  const item = await createExpense({ ...req.body, createdById: req.authUser?.id });
  await createAuditLog(req, { userId: req.authUser?.id, action: 'expense.create', entityType: 'expense', entityId: item.id });
  return sendSuccess(res, item, 'Expense created successfully', 201);
}
export async function updateExpenseController(req: Request, res: Response) {
  const item = await updateExpense(String(req.params.id), req.body, req.authPermissions?.includes('expense_approve') ?? false);
  await createAuditLog(req, { userId: req.authUser?.id, action: 'expense.update', entityType: 'expense', entityId: item.id });
  return sendSuccess(res, item, 'Expense updated successfully');
}
async function action(req: Request, res: Response, status: any, actionName: string) {
  const item = await transitionExpense(String(req.params.id), status, req.authUser?.id, req.body.notes);
  await createAuditLog(req, { userId: req.authUser?.id, action: `expense.${actionName}`, entityType: 'expense', entityId: item.id });
  return sendSuccess(res, item, `Expense ${actionName}ed successfully`);
}
export const submitExpenseController = (req: Request, res: Response) => action(req, res, 'SUBMITTED', 'submit');
export const approveExpenseController = (req: Request, res: Response) => action(req, res, 'APPROVED', 'approve');
export const rejectExpenseController = (req: Request, res: Response) => action(req, res, 'REJECTED', 'reject');
export const cancelExpenseController = (req: Request, res: Response) => action(req, res, 'CANCELLED', 'cancel');
