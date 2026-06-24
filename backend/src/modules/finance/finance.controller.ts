import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { FinanceService } from './finance.service';

const service = new FinanceService();

export class FinanceController {
  // ─── Accounts ───

  async listAccounts(req: Request, res: Response) {
    return sendSuccess(res, await service.listAccounts(req.query as any));
  }

  async getAccount(req: Request, res: Response) {
    return sendSuccess(res, await service.getAccount(String(req.params.id)));
  }

  async createAccount(req: Request, res: Response) {
    const item = await service.createAccount(req.body);
    return sendSuccess(res, item, 'Finance account created successfully', 201);
  }

  async updateAccount(req: Request, res: Response) {
    return sendSuccess(res, await service.updateAccount(String(req.params.id), req.body));
  }

  async deleteAccount(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteAccount(String(req.params.id)));
  }

  // ─── Categories ───

  async listCategories(req: Request, res: Response) {
    return sendSuccess(res, await service.listCategories(req.query as any));
  }

  async getCategory(req: Request, res: Response) {
    return sendSuccess(res, await service.getCategory(String(req.params.id)));
  }

  async createCategory(req: Request, res: Response) {
    const item = await service.createCategory(req.body);
    return sendSuccess(res, item, 'Finance category created successfully', 201);
  }

  async deleteCategory(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteCategory(String(req.params.id)));
  }

  // ─── Vendors ───

  async listVendors(req: Request, res: Response) {
    return sendSuccess(res, await service.listVendors(req.query as any));
  }

  async getVendor(req: Request, res: Response) {
    return sendSuccess(res, await service.getVendor(String(req.params.id)));
  }

  async createVendor(req: Request, res: Response) {
    const item = await service.createVendor(req.body);
    return sendSuccess(res, item, 'Vendor created successfully', 201);
  }

  async updateVendor(req: Request, res: Response) {
    return sendSuccess(res, await service.updateVendor(String(req.params.id), req.body));
  }

  async deleteVendor(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteVendor(String(req.params.id)));
  }

  // ─── Customers ───

  async listCustomers(req: Request, res: Response) {
    return sendSuccess(res, await service.listCustomers(req.query as any));
  }

  async getCustomer(req: Request, res: Response) {
    return sendSuccess(res, await service.getCustomer(String(req.params.id)));
  }

  async createCustomer(req: Request, res: Response) {
    const item = await service.createCustomer(req.body);
    return sendSuccess(res, item, 'Customer created successfully', 201);
  }

  async updateCustomer(req: Request, res: Response) {
    return sendSuccess(res, await service.updateCustomer(String(req.params.id), req.body));
  }

  async deleteCustomer(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteCustomer(String(req.params.id)));
  }

  // ─── Trip Billings ───

  async listTripBillings(req: Request, res: Response) {
    return sendSuccess(res, await service.listTripBillings(req.query as any));
  }

  async getTripBilling(req: Request, res: Response) {
    return sendSuccess(res, await service.getTripBilling(String(req.params.id)));
  }

  async createTripBilling(req: Request, res: Response) {
    const item = await service.createTripBilling(req.body, req.authUser?.id);
    return sendSuccess(res, item, 'Trip billing created successfully', 201);
  }

  async updateTripBilling(req: Request, res: Response) {
    return sendSuccess(res, await service.updateTripBilling(String(req.params.id), req.body, req.authUser?.id));
  }

  async deleteTripBilling(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteTripBilling(String(req.params.id)));
  }

  // ─── Transactions ───

  async listTransactions(req: Request, res: Response) {
    return sendSuccess(res, await service.listTransactions(req.query as any));
  }

  async getTransaction(req: Request, res: Response) {
    return sendSuccess(res, await service.getTransaction(String(req.params.id)));
  }

  async createTransaction(req: Request, res: Response) {
    const item = await service.createTransaction(req.body, req.authUser?.id);
    return sendSuccess(res, item, 'Transaction created successfully', 201);
  }

  async deleteTransaction(req: Request, res: Response) {
    return sendSuccess(res, await service.deleteTransaction(String(req.params.id)));
  }

  // ─── Payments ───

  async listPayments(req: Request, res: Response) {
    return sendSuccess(res, await service.listPayments(req.query as any));
  }

  async getPayment(req: Request, res: Response) {
    return sendSuccess(res, await service.getPayment(String(req.params.id)));
  }

  async createPayment(req: Request, res: Response) {
    const item = await service.createPayment(req.body, req.authUser?.id);
    return sendSuccess(res, item, 'Payment created successfully', 201);
  }

  async deletePayment(req: Request, res: Response) {
    return sendSuccess(res, await service.deletePayment(String(req.params.id)));
  }

  // ─── Stats ───

  async getPnl(req: Request, res: Response) {
    return sendSuccess(res, await service.getPnl(req.query as any));
  }

  async getDashboardSummary(req: Request, res: Response) {
    return sendSuccess(res, await service.getDashboardSummary());
  }
}

export const financeController = new FinanceController();
