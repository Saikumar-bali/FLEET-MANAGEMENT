import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';
import { FinanceQuery, PnlQuery } from './finance.types';

function generateTransactionNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${timestamp}-${random}`;
}

export class FinanceService {
  private prisma = prisma;

  // ─── Accounts ───

  async listAccounts(query: FinanceQuery) {
    const { page = 1, limit = 20, search, sort, order, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FinanceAccountWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type && { type: type as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.financeAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'createdAt']: order || 'desc' },
      }),
      this.prisma.financeAccount.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getAccount(id: string) {
    const account = await this.prisma.financeAccount.findUnique({ where: { id } });
    if (!account) throw new AppError('Finance account not found', 404);
    return account;
  }

  async createAccount(data: Record<string, unknown>) {
    return this.prisma.financeAccount.create({
      data: {
        name: data.name as string,
        type: data.type as any,
        accountNumberMasked: data.accountNumberMasked as string | undefined,
        bankName: data.bankName as string | undefined,
        openingBalance: data.openingBalance != null ? new Decimal(data.openingBalance as number) : undefined,
      },
    });
  }

  async updateAccount(id: string, data: Record<string, unknown>) {
    await this.getAccount(id);
    return this.prisma.financeAccount.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        type: data.type as any,
        accountNumberMasked: data.accountNumberMasked as string | undefined,
        bankName: data.bankName as string | undefined,
        openingBalance: data.openingBalance != null ? new Decimal(data.openingBalance as number) : undefined,
        isActive: data.isActive as boolean | undefined,
      },
    });
  }

  async deleteAccount(id: string) {
    await this.getAccount(id);
    await this.prisma.financeAccount.update({ where: { id }, data: { isActive: false } });
    return { deleted: true };
  }

  // ─── Categories ───

  async listCategories(query: FinanceQuery) {
    const { page = 1, limit = 20, search, type, module } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FinanceCategoryWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type && { type: type as any }),
      ...(module && { module: module as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.financeCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.financeCategory.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCategory(id: string) {
    const category = await this.prisma.financeCategory.findUnique({ where: { id } });
    if (!category) throw new AppError('Finance category not found', 404);
    return category;
  }

  async createCategory(data: Record<string, unknown>) {
    return this.prisma.financeCategory.create({
      data: {
        name: data.name as string,
        type: data.type as any,
        module: data.module as any,
      },
    });
  }

  async deleteCategory(id: string) {
    await this.getCategory(id);
    const transactionCount = await this.prisma.financeTransaction.count({ where: { categoryId: id } });
    if (transactionCount > 0) {
      throw new AppError('Cannot delete category with existing transactions', 409);
    }
    await this.prisma.financeCategory.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Vendors ───

  async listVendors(query: FinanceQuery) {
    const { page = 1, limit = 20, search, sort, order, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.VendorWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type && { vendorType: type as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'createdAt']: order || 'desc' },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppError('Vendor not found', 404);
    return vendor;
  }

  async createVendor(data: Record<string, unknown>) {
    return this.prisma.vendor.create({
      data: {
        name: data.name as string,
        vendorType: data.vendorType as any,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        address: data.address as string | undefined,
      },
    });
  }

  async updateVendor(id: string, data: Record<string, unknown>) {
    await this.getVendor(id);
    return this.prisma.vendor.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        vendorType: data.vendorType as any,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        address: data.address as string | undefined,
      },
    });
  }

  async deleteVendor(id: string) {
    await this.getVendor(id);
    const hasTransactions = await this.prisma.financeTransaction.count({ where: { vendorId: id } });
    if (hasTransactions > 0) {
      throw new AppError('Cannot delete vendor with existing transactions', 409);
    }
    await this.prisma.vendor.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Customers ───

  async listCustomers(query: FinanceQuery) {
    const { page = 1, limit = 20, search, sort, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'createdAt']: order || 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new AppError('Customer not found', 404);
    return customer;
  }

  async createCustomer(data: Record<string, unknown>) {
    return this.prisma.customer.create({
      data: {
        name: data.name as string,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        billingAddress: data.billingAddress as string | undefined,
        shippingAddress: data.shippingAddress as string | undefined,
      },
    });
  }

  async updateCustomer(id: string, data: Record<string, unknown>) {
    await this.getCustomer(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: data.name as string | undefined,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        billingAddress: data.billingAddress as string | undefined,
        shippingAddress: data.shippingAddress as string | undefined,
      },
    });
  }

  async deleteCustomer(id: string) {
    await this.getCustomer(id);
    const hasBillings = await this.prisma.tripBilling.count({ where: { customerId: id } });
    if (hasBillings > 0) {
      throw new AppError('Cannot delete customer with existing billings', 409);
    }
    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Trip Billings ───

  async listTripBillings(query: FinanceQuery) {
    const { page = 1, limit = 20, search, sort, order, status, customerId, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TripBillingWhereInput = {
      ...(search && { invoiceNumber: { contains: search, mode: 'insensitive' } }),
      ...(status && { paymentStatus: status as any }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            invoiceDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.tripBilling.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'createdAt']: order || 'desc' },
        include: { trip: true, customer: true },
      }),
      this.prisma.tripBilling.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTripBilling(id: string) {
    const billing = await this.prisma.tripBilling.findUnique({
      where: { id },
      include: { trip: true, customer: true, payments: true },
    });
    if (!billing) throw new AppError('Trip billing not found', 404);
    return billing;
  }

  async createTripBilling(data: Record<string, unknown>, userId?: string) {
    const billingAmount = new Decimal(data.billingAmount as number);
    const taxAmount = new Decimal((data.taxAmount as number) ?? 0);
    const discountAmount = new Decimal((data.discountAmount as number) ?? 0);
    const totalAmount = billingAmount.plus(taxAmount).minus(discountAmount);

    return this.prisma.tripBilling.create({
      data: {
        tripId: data.tripId as string,
        customerId: data.customerId as string | undefined,
        invoiceNumber: data.invoiceNumber as string | undefined,
        invoiceDate: new Date(data.invoiceDate as string),
        billingAmount,
        taxAmount,
        discountAmount,
        totalAmount,
        balanceAmount: totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined,
        notes: data.notes as string | undefined,
        createdById: userId,
      },
      include: { trip: true, customer: true },
    });
  }

  async updateTripBilling(id: string, data: Record<string, unknown>, userId?: string) {
    await this.getTripBilling(id);

    const updateData: Prisma.TripBillingUpdateInput = {
      ...(data.customerId != null && { customer: { connect: { id: data.customerId as string } } }),
      ...(data.invoiceNumber != null && { invoiceNumber: data.invoiceNumber as string }),
      ...(data.invoiceDate != null && { invoiceDate: new Date(data.invoiceDate as string) }),
      ...(data.notes != null && { notes: data.notes as string }),
      ...(data.dueDate != null && { dueDate: data.dueDate ? new Date(data.dueDate as string) : null }),
      ...(userId && { updatedBy: { connect: { id: userId } } }),
    };

    if (data.billingAmount != null || data.taxAmount != null || data.discountAmount != null) {
      const existing = await this.prisma.tripBilling.findUnique({ where: { id } });
      const billingAmount = data.billingAmount != null ? new Decimal(data.billingAmount as number) : existing!.billingAmount;
      const taxAmount = data.taxAmount != null ? new Decimal(data.taxAmount as number) : existing!.taxAmount;
      const discountAmount = data.discountAmount != null ? new Decimal(data.discountAmount as number) : existing!.discountAmount;
      const totalAmount = billingAmount.plus(taxAmount).minus(discountAmount);

      updateData.billingAmount = billingAmount;
      updateData.taxAmount = taxAmount;
      updateData.discountAmount = discountAmount;
      updateData.totalAmount = totalAmount;
      updateData.balanceAmount = totalAmount.minus(existing!.paidAmount);
    }

    return this.prisma.tripBilling.update({
      where: { id },
      data: updateData,
      include: { trip: true, customer: true },
    });
  }

  async deleteTripBilling(id: string) {
    const billing = await this.getTripBilling(id);
    if (billing.paidAmount.greaterThan(0)) {
      throw new AppError('Cannot delete billing with payments', 409);
    }
    await this.prisma.tripBilling.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Transactions ───

  async listTransactions(query: FinanceQuery) {
    const { page = 1, limit = 20, search, sort, order, type, module, status, vehicleId, tripId, driverId, vendorId, customerId, dateFrom, dateTo, paymentMode, paymentStatus } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.FinanceTransactionWhereInput = {
      ...(search && {
        OR: [
          { transactionNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { referenceNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(type && { transactionType: type as any }),
      ...(module && { sourceModule: module as any }),
      ...(status && { paymentStatus: status as any }),
      ...(vehicleId && { vehicleId }),
      ...(tripId && { tripId }),
      ...(driverId && { driverId }),
      ...(vendorId && { vendorId }),
      ...(customerId && { customerId }),
      ...(paymentMode && { paymentMode: paymentMode as any }),
      ...(paymentStatus && { paymentStatus: paymentStatus as any }),
      ...(dateFrom || dateTo
        ? {
            transactionDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.financeTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'transactionDate']: order || 'desc' },
        include: { vehicle: true, driver: true, vendor: true, customer: true, account: true, category: true },
      }),
      this.prisma.financeTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTransaction(id: string) {
    const txn = await this.prisma.financeTransaction.findUnique({
      where: { id },
      include: { vehicle: true, driver: true, vendor: true, customer: true, account: true, category: true, payments: true },
    });
    if (!txn) throw new AppError('Transaction not found', 404);
    return txn;
  }

  async createTransaction(data: Record<string, unknown>, userId?: string) {
    const amount = new Decimal(data.amount as number);
    const taxAmount = new Decimal((data.taxAmount as number) ?? 0);
    const totalAmount = amount.plus(taxAmount);

    return this.prisma.financeTransaction.create({
      data: {
        transactionNumber: generateTransactionNumber(),
        transactionType: data.transactionType as any,
        sourceModule: data.sourceModule as any,
        sourceId: data.sourceId as string | undefined,
        vehicleId: data.vehicleId as string | undefined,
        tripId: data.tripId as string | undefined,
        driverId: data.driverId as string | undefined,
        vendorId: data.vendorId as string | undefined,
        customerId: data.customerId as string | undefined,
        accountId: data.accountId as string | undefined,
        categoryId: data.categoryId as string | undefined,
        amount,
        taxAmount,
        totalAmount,
        transactionDate: new Date(data.transactionDate as string),
        paymentMode: data.paymentMode as any,
        referenceNumber: data.referenceNumber as string | undefined,
        description: data.description as string | undefined,
        createdById: userId,
      },
      include: { vehicle: true, driver: true, vendor: true, customer: true, account: true, category: true },
    });
  }

  async deleteTransaction(id: string) {
    const txn = await this.getTransaction(id);
    if (txn.payments && txn.payments.length > 0) {
      throw new AppError('Cannot delete transaction with payments', 409);
    }
    await this.prisma.financeTransaction.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Payments ───

  async listPayments(query: FinanceQuery) {
    const { page = 1, limit = 20, sort, order, vendorId, customerId, dateFrom, dateTo, paymentMode } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRecordWhereInput = {
      ...(vendorId && { vendorId }),
      ...(customerId && { customerId }),
      ...(paymentMode && { paymentMode: paymentMode as any }),
      ...(dateFrom || dateTo
        ? {
            paymentDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort || 'paymentDate']: order || 'desc' },
        include: { account: true, vendor: true, customer: true, tripBilling: true },
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPayment(id: string) {
    const payment = await this.prisma.paymentRecord.findUnique({
      where: { id },
      include: { account: true, vendor: true, customer: true, transaction: true, tripBilling: true },
    });
    if (!payment) throw new AppError('Payment record not found', 404);
    return payment;
  }

  async createPayment(data: Record<string, unknown>, userId?: string) {
    const amount = new Decimal(data.amount as number);

    const payment = await this.prisma.paymentRecord.create({
      data: {
        transactionId: data.transactionId as string | undefined,
        tripBillingId: data.tripBillingId as string | undefined,
        accountId: data.accountId as string | undefined,
        vendorId: data.vendorId as string | undefined,
        customerId: data.customerId as string | undefined,
        amount,
        paymentDate: new Date(data.paymentDate as string),
        paymentMode: data.paymentMode as any,
        referenceNumber: data.referenceNumber as string | undefined,
        notes: data.notes as string | undefined,
        createdById: userId,
      },
      include: { account: true, vendor: true, customer: true, transaction: true, tripBilling: true },
    });

    // Update account balance
    if (data.accountId) {
      await this.prisma.financeAccount.update({
        where: { id: data.accountId as string },
        data: { currentBalance: { increment: amount } },
      });
    }

    // Update trip billing paid amount and status
    if (data.tripBillingId) {
      const billing = await this.prisma.tripBilling.findUnique({ where: { id: data.tripBillingId as string } });
      if (billing) {
        const newPaidAmount = billing.paidAmount.plus(amount);
        const newBalanceAmount = billing.totalAmount.minus(newPaidAmount);
        let newStatus: any = 'PARTIALLY_PAID';
        if (newBalanceAmount.lte(0)) {
          newStatus = 'PAID';
        }
        await this.prisma.tripBilling.update({
          where: { id: data.tripBillingId as string },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newStatus,
          },
        });
      }
    }

    return payment;
  }

  async deletePayment(id: string) {
    const payment = await this.getPayment(id);

    // Reverse account balance
    if (payment.accountId) {
      await this.prisma.financeAccount.update({
        where: { id: payment.accountId },
        data: { currentBalance: { decrement: payment.amount } },
      });
    }

    // Reverse trip billing
    if (payment.tripBillingId) {
      const billing = await this.prisma.tripBilling.findUnique({ where: { id: payment.tripBillingId } });
      if (billing) {
        const newPaidAmount = billing.paidAmount.minus(payment.amount);
        const newBalanceAmount = billing.totalAmount.minus(newPaidAmount);
        await this.prisma.tripBilling.update({
          where: { id: payment.tripBillingId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newBalanceAmount.equals(0) ? 'PAID' : newPaidAmount.equals(0) ? 'UNBILLED' : 'PARTIALLY_PAID',
          },
        });
      }
    }

    await this.prisma.paymentRecord.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── P&L ───

  async getPnl(query: PnlQuery) {
    const { dateFrom, dateTo, vehicleId, driverId } = query;

    const where: Prisma.FinanceTransactionWhereInput = {
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(dateFrom || dateTo
        ? {
            transactionDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const transactions = await this.prisma.financeTransaction.findMany({
      where,
      include: { category: true },
    });

    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0);

    const categoryBreakdown: Record<string, { income: Decimal; expense: Decimal }> = {};

    for (const txn of transactions) {
      const categoryName = txn.category?.name || 'Uncategorized';
      if (!categoryBreakdown[categoryName]) {
        categoryBreakdown[categoryName] = { income: new Decimal(0), expense: new Decimal(0) };
      }

      if (txn.transactionType === 'INCOME') {
        totalIncome = totalIncome.plus(txn.amount);
        categoryBreakdown[categoryName].income = categoryBreakdown[categoryName].income.plus(txn.amount);
      } else if (txn.transactionType === 'EXPENSE') {
        totalExpenses = totalExpenses.plus(txn.amount);
        categoryBreakdown[categoryName].expense = categoryBreakdown[categoryName].expense.plus(txn.amount);
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome.minus(totalExpenses),
      breakdown: categoryBreakdown,
    };
  }

  // ─── Dashboard Summary ───

  async getDashboardSummary() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [currentMonthIncome, currentMonthExpenses, pendingPayments, overduePayments, totalReceivable, totalPayable, recentTransactions] = await Promise.all([
      this.prisma.financeTransaction.aggregate({
        _sum: { amount: true },
        where: {
          transactionType: 'INCOME',
          transactionDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      this.prisma.financeTransaction.aggregate({
        _sum: { amount: true },
        where: {
          transactionType: 'EXPENSE',
          transactionDate: { gte: currentMonthStart, lte: currentMonthEnd },
        },
      }),
      this.prisma.paymentRecord.count({
        where: {
          transaction: { paymentStatus: 'PENDING' },
        },
      }),
      this.prisma.tripBilling.count({
        where: {
          paymentStatus: 'OVERDUE',
        },
      }),
      this.prisma.tripBilling.aggregate({
        _sum: { balanceAmount: true },
        where: { paymentStatus: { in: ['BILLED', 'PARTIALLY_PAID', 'OVERDUE'] } },
      }),
      this.prisma.financeTransaction.aggregate({
        _sum: { amount: true },
        where: { transactionType: 'EXPENSE', paymentStatus: 'PENDING' },
      }),
      this.prisma.financeTransaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vendor: true, customer: true, account: true, category: true },
      }),
    ]);

    return {
      currentMonthIncome: currentMonthIncome._sum.amount || new Decimal(0),
      currentMonthExpenses: currentMonthExpenses._sum.amount || new Decimal(0),
      pendingPayments,
      overduePayments,
      totalReceivable: totalReceivable._sum.balanceAmount || new Decimal(0),
      totalPayable: totalPayable._sum.amount || new Decimal(0),
      recentTransactions,
    };
  }
}
