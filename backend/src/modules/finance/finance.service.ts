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

function generatePaymentNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${timestamp}-${random}`;
}

function calculateTripBillingTotals(data: Record<string, unknown>) {
  const freightAmount = new Decimal((data.freightAmount as number) ?? 0);
  const loadingCharges = new Decimal((data.loadingCharges as number) ?? 0);
  const unloadingCharges = new Decimal((data.unloadingCharges as number) ?? 0);
  const detentionCharges = new Decimal((data.detentionCharges as number) ?? 0);
  const tollCharges = new Decimal((data.tollCharges as number) ?? 0);
  const permitCharges = new Decimal((data.permitCharges as number) ?? 0);
  const otherCharges = new Decimal((data.otherCharges as number) ?? 0);
  const discountAmount = new Decimal((data.discountAmount as number) ?? 0);
  const cgstAmount = new Decimal((data.cgstAmount as number) ?? 0);
  const sgstAmount = new Decimal((data.sgstAmount as number) ?? 0);
  const igstAmount = new Decimal((data.igstAmount as number) ?? 0);
  const tdsAmount = new Decimal((data.tdsAmount as number) ?? 0);

  const totalCharges = freightAmount
    .plus(loadingCharges)
    .plus(unloadingCharges)
    .plus(detentionCharges)
    .plus(tollCharges)
    .plus(permitCharges)
    .plus(otherCharges);

  const taxableAmount = totalCharges.minus(discountAmount);
  const totalAmount = taxableAmount.plus(cgstAmount).plus(sgstAmount).plus(igstAmount);
  const netReceivable = totalAmount.minus(tdsAmount);

  return {
    freightAmount,
    loadingCharges,
    unloadingCharges,
    detentionCharges,
    tollCharges,
    permitCharges,
    otherCharges,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    tdsAmount,
    netReceivable,
  };
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
        vendorCode: data.vendorCode as string | undefined,
        name: data.name as string,
        legalName: data.legalName as string | undefined,
        tradeName: data.tradeName as string | undefined,
        vendorType: data.vendorType as any,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        pan: data.pan as string | undefined,
        state: data.state as string | undefined,
        stateCode: data.stateCode as string | undefined,
        pincode: data.pincode as string | undefined,
        contactPersonName: data.contactPersonName as string | undefined,
        contactPersonPhone: data.contactPersonPhone as string | undefined,
        paymentTermsDays: data.paymentTermsDays as number | undefined,
        bankAccountMasked: data.bankAccountMasked as string | undefined,
        ifscCode: data.ifscCode as string | undefined,
        upiId: data.upiId as string | undefined,
        address: data.address as string | undefined,
      },
    });
  }

  async updateVendor(id: string, data: Record<string, unknown>) {
    await this.getVendor(id);
    return this.prisma.vendor.update({
      where: { id },
      data: {
        vendorCode: data.vendorCode as string | undefined,
        name: data.name as string | undefined,
        legalName: data.legalName as string | undefined,
        tradeName: data.tradeName as string | undefined,
        vendorType: data.vendorType as any,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        pan: data.pan as string | undefined,
        state: data.state as string | undefined,
        stateCode: data.stateCode as string | undefined,
        pincode: data.pincode as string | undefined,
        contactPersonName: data.contactPersonName as string | undefined,
        contactPersonPhone: data.contactPersonPhone as string | undefined,
        paymentTermsDays: data.paymentTermsDays as number | undefined,
        bankAccountMasked: data.bankAccountMasked as string | undefined,
        ifscCode: data.ifscCode as string | undefined,
        upiId: data.upiId as string | undefined,
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
        customerCode: data.customerCode as string | undefined,
        name: data.name as string,
        legalName: data.legalName as string | undefined,
        tradeName: data.tradeName as string | undefined,
        customerType: data.customerType as string | undefined,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        pan: data.pan as string | undefined,
        state: data.state as string | undefined,
        stateCode: data.stateCode as string | undefined,
        pincode: data.pincode as string | undefined,
        billingAddress: data.billingAddress as string | undefined,
        shippingAddress: data.shippingAddress as string | undefined,
        contactPersonName: data.contactPersonName as string | undefined,
        contactPersonPhone: data.contactPersonPhone as string | undefined,
        paymentTermsDays: data.paymentTermsDays as number | undefined,
        creditLimit: data.creditLimit != null ? new Decimal(data.creditLimit as number) : undefined,
        isGstRegistered: (data.isGstRegistered as boolean) ?? false,
      },
    });
  }

  async updateCustomer(id: string, data: Record<string, unknown>) {
    await this.getCustomer(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        customerCode: data.customerCode as string | undefined,
        name: data.name as string | undefined,
        legalName: data.legalName as string | undefined,
        tradeName: data.tradeName as string | undefined,
        customerType: data.customerType as string | undefined,
        phone: data.phone as string | undefined,
        email: data.email as string | undefined,
        gstin: data.gstin as string | undefined,
        pan: data.pan as string | undefined,
        state: data.state as string | undefined,
        stateCode: data.stateCode as string | undefined,
        pincode: data.pincode as string | undefined,
        billingAddress: data.billingAddress as string | undefined,
        shippingAddress: data.shippingAddress as string | undefined,
        contactPersonName: data.contactPersonName as string | undefined,
        contactPersonPhone: data.contactPersonPhone as string | undefined,
        paymentTermsDays: data.paymentTermsDays as number | undefined,
        creditLimit: data.creditLimit != null ? new Decimal(data.creditLimit as number) : undefined,
        isGstRegistered: data.isGstRegistered as boolean | undefined,
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
    const { page = 1, limit = 20, search, sort, order, status, customerId, vehicleId, driverId, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TripBillingWhereInput = {
      ...(search && { invoiceNumber: { contains: search, mode: 'insensitive' } }),
      ...(status && { paymentStatus: status as any }),
      ...(customerId && { customerId }),
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
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
        include: { trip: true, customer: true, vehicle: true, driver: true },
      }),
      this.prisma.tripBilling.count({ where }),
    ]);

    return {
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTripBilling(id: string) {
    const billing = await this.prisma.tripBilling.findUnique({
      where: { id },
      include: { trip: true, customer: true, vehicle: true, driver: true, payments: true },
    });
    if (!billing) throw new AppError('Trip billing not found', 404);
    return billing;
  }

  async createTripBilling(data: Record<string, unknown>, userId?: string) {
    const totals = calculateTripBillingTotals(data);
    const balanceAmount = totals.netReceivable;

    return this.prisma.tripBilling.create({
      data: {
        tripId: data.tripId as string,
        customerId: data.customerId as string | undefined,
        vehicleId: data.vehicleId as string | undefined,
        driverId: data.driverId as string | undefined,
        invoiceNumber: data.invoiceNumber as string | undefined,
        invoiceDate: new Date(data.invoiceDate as string),
        lrNumber: data.lrNumber as string | undefined,
        challanNumber: data.challanNumber as string | undefined,
        ewayBillNumber: data.ewayBillNumber as string | undefined,
        customerPoNumber: data.customerPoNumber as string | undefined,
        placeOfSupplyState: data.placeOfSupplyState as string | undefined,
        originState: data.originState as string | undefined,
        destinationState: data.destinationState as string | undefined,
        ...totals,
        balanceAmount,
        dueDate: data.dueDate ? new Date(data.dueDate as string) : undefined,
        notes: data.notes as string | undefined,
        createdById: userId,
      },
      include: { trip: true, customer: true, vehicle: true, driver: true },
    });
  }

  async updateTripBilling(id: string, data: Record<string, unknown>, userId?: string) {
    await this.getTripBilling(id);

    const existing = await this.prisma.tripBilling.findUnique({ where: { id } });

    const merged = {
      freightAmount: data.freightAmount != null ? (data.freightAmount as number) : Number(existing!.freightAmount),
      loadingCharges: data.loadingCharges != null ? (data.loadingCharges as number) : Number(existing!.loadingCharges),
      unloadingCharges: data.unloadingCharges != null ? (data.unloadingCharges as number) : Number(existing!.unloadingCharges),
      detentionCharges: data.detentionCharges != null ? (data.detentionCharges as number) : Number(existing!.detentionCharges),
      tollCharges: data.tollCharges != null ? (data.tollCharges as number) : Number(existing!.tollCharges),
      permitCharges: data.permitCharges != null ? (data.permitCharges as number) : Number(existing!.permitCharges),
      otherCharges: data.otherCharges != null ? (data.otherCharges as number) : Number(existing!.otherCharges),
      discountAmount: data.discountAmount != null ? (data.discountAmount as number) : Number(existing!.discountAmount),
      cgstAmount: data.cgstAmount != null ? (data.cgstAmount as number) : Number(existing!.cgstAmount),
      sgstAmount: data.sgstAmount != null ? (data.sgstAmount as number) : Number(existing!.sgstAmount),
      igstAmount: data.igstAmount != null ? (data.igstAmount as number) : Number(existing!.igstAmount),
      tdsAmount: data.tdsAmount != null ? (data.tdsAmount as number) : Number(existing!.tdsAmount),
    };

    const totals = calculateTripBillingTotals(merged);
    const balanceAmount = totals.netReceivable.minus(existing!.paidAmount);

    const updateData: Prisma.TripBillingUpdateInput = {
      ...(data.customerId != null && { customer: { connect: { id: data.customerId as string } } }),
      ...(data.vehicleId != null && { vehicle: { connect: { id: data.vehicleId as string } } }),
      ...(data.driverId != null && { driver: { connect: { id: data.driverId as string } } }),
      ...(data.invoiceNumber != null && { invoiceNumber: data.invoiceNumber as string }),
      ...(data.invoiceDate != null && { invoiceDate: new Date(data.invoiceDate as string) }),
      ...(data.lrNumber != null && { lrNumber: data.lrNumber as string }),
      ...(data.challanNumber != null && { challanNumber: data.challanNumber as string }),
      ...(data.ewayBillNumber != null && { ewayBillNumber: data.ewayBillNumber as string }),
      ...(data.customerPoNumber != null && { customerPoNumber: data.customerPoNumber as string }),
      ...(data.placeOfSupplyState != null && { placeOfSupplyState: data.placeOfSupplyState as string }),
      ...(data.originState != null && { originState: data.originState as string }),
      ...(data.destinationState != null && { destinationState: data.destinationState as string }),
      ...(data.notes != null && { notes: data.notes as string }),
      ...(data.dueDate != null && { dueDate: data.dueDate ? new Date(data.dueDate as string) : null }),
      ...(userId && { updatedBy: { connect: { id: userId } } }),
      freightAmount: totals.freightAmount,
      loadingCharges: totals.loadingCharges,
      unloadingCharges: totals.unloadingCharges,
      detentionCharges: totals.detentionCharges,
      tollCharges: totals.tollCharges,
      permitCharges: totals.permitCharges,
      otherCharges: totals.otherCharges,
      discountAmount: totals.discountAmount,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: totals.igstAmount,
      totalAmount: totals.totalAmount,
      tdsAmount: totals.tdsAmount,
      netReceivable: totals.netReceivable,
      balanceAmount,
    };

    return this.prisma.tripBilling.update({
      where: { id },
      data: updateData,
      include: { trip: true, customer: true, vehicle: true, driver: true },
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

    const vendorId = data.vendorId ? String(data.vendorId) : undefined;
    const customerId = data.customerId ? String(data.customerId) : undefined;
    const accountId = data.accountId ? String(data.accountId) : undefined;
    const categoryId = data.categoryId ? String(data.categoryId) : undefined;
    const vehicleId = data.vehicleId ? String(data.vehicleId) : undefined;
    const driverId = data.driverId ? String(data.driverId) : undefined;
    const tripId = data.tripId ? String(data.tripId) : undefined;

    if (vendorId) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404);
    }
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new AppError('Customer not found', 404);
    }
    if (accountId) {
      const account = await this.prisma.financeAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('Account not found', 404);
    }
    if (categoryId) {
      const category = await this.prisma.financeCategory.findUnique({ where: { id: categoryId } });
      if (!category) throw new AppError('Category not found', 404);
    }
    if (vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }
    if (driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) throw new AppError('Driver not found', 404);
    }

    return this.prisma.financeTransaction.create({
      data: {
        transactionNumber: generateTransactionNumber(),
        transactionType: data.transactionType as any,
        sourceModule: data.sourceModule as any,
        sourceId: data.sourceId as string | undefined,
        vehicleId,
        tripId,
        driverId,
        vendorId,
        customerId,
        accountId,
        categoryId,
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

  async updateTransaction(id: string, data: Record<string, unknown>) {
    await this.getTransaction(id);

    const vendorId = data.vendorId != null ? String(data.vendorId) : undefined;
    const customerId = data.customerId != null ? String(data.customerId) : undefined;
    const accountId = data.accountId != null ? String(data.accountId) : undefined;
    const categoryId = data.categoryId != null ? String(data.categoryId) : undefined;
    const vehicleId = data.vehicleId != null ? String(data.vehicleId) : undefined;
    const driverId = data.driverId != null ? String(data.driverId) : undefined;
    const tripId = data.tripId != null ? String(data.tripId) : undefined;

    if (vendorId) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404);
    }
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new AppError('Customer not found', 404);
    }
    if (accountId) {
      const account = await this.prisma.financeAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('Account not found', 404);
    }
    if (categoryId) {
      const category = await this.prisma.financeCategory.findUnique({ where: { id: categoryId } });
      if (!category) throw new AppError('Category not found', 404);
    }
    if (vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new AppError('Vehicle not found', 404);
    }
    if (driverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
      if (!driver) throw new AppError('Driver not found', 404);
    }

    const existing = await this.prisma.financeTransaction.findUnique({ where: { id } });
    const amount = data.amount != null ? new Decimal(data.amount as number) : existing!.amount;
    const taxAmount = data.taxAmount != null ? new Decimal(data.taxAmount as number) : existing!.taxAmount;
    const totalAmount = amount.plus(taxAmount);

    return this.prisma.financeTransaction.update({
      where: { id },
      data: {
        ...(data.transactionType != null && { transactionType: data.transactionType as any }),
        ...(data.sourceModule != null && { sourceModule: data.sourceModule as any }),
        ...(data.sourceId != null && { sourceId: data.sourceId as string }),
        ...(data.paymentStatus != null && { paymentStatus: data.paymentStatus as any }),
        ...(vehicleId != null && { vehicleId }),
        ...(tripId != null && { tripId }),
        ...(driverId != null && { driverId }),
        ...(vendorId != null && { vendorId }),
        ...(customerId != null && { customerId }),
        ...(accountId != null && { accountId }),
        ...(categoryId != null && { categoryId }),
        ...(data.amount != null && { amount }),
        ...(data.taxAmount != null && { taxAmount }),
        ...(data.amount != null || data.taxAmount != null ? { totalAmount } : {}),
        ...(data.transactionDate != null && { transactionDate: new Date(data.transactionDate as string) }),
        ...(data.paymentMode != null && { paymentMode: data.paymentMode as any }),
        ...(data.referenceNumber != null && { referenceNumber: data.referenceNumber as string }),
        ...(data.description != null && { description: data.description as string }),
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

  // CodeQL[js/sensitive-data-in-get-request] Query parameters are filter criteria only (vendorId, dateFrom, etc.), not sensitive data. The actual payment records are returned in the response body.
  async listPayments(query: FinanceQuery) {
    const { page = 1, limit = 20, sort, order, vendorId, customerId, tripBillingId, dateFrom, dateTo, paymentMode } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRecordWhereInput = {
      ...(vendorId && { vendorId }),
      ...(customerId && { customerId }),
      ...(tripBillingId && { tripBillingId }),
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
      items: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

    const vendorId = data.vendorId ? String(data.vendorId) : undefined;
    const customerId = data.customerId ? String(data.customerId) : undefined;
    const accountId = data.accountId ? String(data.accountId) : undefined;
    const transactionId = data.transactionId ? String(data.transactionId) : undefined;
    const tripBillingId = data.tripBillingId ? String(data.tripBillingId) : undefined;
    const collectedByDriverId = data.collectedByDriverId ? String(data.collectedByDriverId) : undefined;

    if (vendorId) {
      const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404);
    }
    if (customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new AppError('Customer not found', 404);
    }
    if (accountId) {
      const account = await this.prisma.financeAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('Account not found', 404);
    }
    if (transactionId) {
      const txn = await this.prisma.financeTransaction.findUnique({ where: { id: transactionId } });
      if (!txn) throw new AppError('Transaction not found', 404);
    }
    if (tripBillingId) {
      const billing = await this.prisma.tripBilling.findUnique({ where: { id: tripBillingId } });
      if (!billing) throw new AppError('Trip billing not found', 404);
      if (billing.paymentStatus === 'CANCELLED') {
        throw new AppError('Cannot create payment for cancelled billing', 409);
      }
      const newPaidAmount = billing.paidAmount.plus(amount);
      if (newPaidAmount.greaterThan(billing.netReceivable)) {
        throw new AppError(`Payment amount exceeds balance. Balance: ${billing.netReceivable}, Payment: ${amount}`, 409);
      }
    }
    if (collectedByDriverId) {
      const driver = await this.prisma.driver.findUnique({ where: { id: collectedByDriverId } });
      if (!driver) throw new AppError('Driver not found', 404);
    }

    const payment = await this.prisma.paymentRecord.create({
      data: {
        paymentNumber: generatePaymentNumber(),
        transactionId,
        tripBillingId,
        accountId,
        vendorId,
        customerId,
        amount,
        paymentDate: new Date(data.paymentDate as string),
        paymentMode: data.paymentMode as any,
        upiReference: data.upiReference as string | undefined,
        bankUtrNumber: data.bankUtrNumber as string | undefined,
        chequeNumber: data.chequeNumber as string | undefined,
        chequeDate: data.chequeDate ? new Date(data.chequeDate as string) : undefined,
        collectedByDriverId,
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
        const newBalanceAmount = billing.netReceivable.minus(newPaidAmount);
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
        const newBalanceAmount = billing.netReceivable.minus(newPaidAmount);
        await this.prisma.tripBilling.update({
          where: { id: payment.tripBillingId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            paymentStatus: newBalanceAmount.equals(0) && newPaidAmount.equals(0) ? 'BILLED' : newPaidAmount.equals(0) ? 'UNBILLED' : newBalanceAmount.lte(0) ? 'PAID' : 'PARTIALLY_PAID',
          },
        });
      }
    }

    await this.prisma.paymentRecord.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── P&L ───

  async getPnl(query: PnlQuery) {
    const { dateFrom, dateTo, vehicleId, driverId, tripId, customerId } = query;

    const txnWhere: Prisma.FinanceTransactionWhereInput = {
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(tripId && { tripId }),
      ...(customerId && { customerId }),
      ...(dateFrom || dateTo
        ? {
            transactionDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const billingWhere: Prisma.TripBillingWhereInput = {
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(tripId && { tripId }),
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

    const fuelWhere: any = {
      ...(vehicleId && { vehicleId }),
      ...(dateFrom || dateTo
        ? {
            fuelDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const expenseWhere: any = {
      ...(vehicleId && { vehicleId }),
      ...(driverId && { driverId }),
      ...(dateFrom || dateTo
        ? {
            expenseDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const maintenanceWhere: any = {
      ...(vehicleId && { vehicleId }),
      ...(dateFrom || dateTo
        ? {
            requestDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const repairWhere: any = {
      ...(vehicleId && { vehicleId }),
      ...(dateFrom || dateTo
        ? {
            repairDate: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [transactions, tripBillings, fuelEntries, expenses, maintenanceRequests, repairs] = await Promise.all([
      this.prisma.financeTransaction.findMany({
        where: txnWhere,
        include: { category: true },
      }),
      this.prisma.tripBilling.findMany({
        where: billingWhere,
        select: { netReceivable: true, totalAmount: true, paymentStatus: true },
      }),
      this.prisma.fuelEntry.findMany({
        where: fuelWhere,
        select: { totalAmount: true },
      }).catch(() => []),
      this.prisma.expense.findMany({
        where: expenseWhere,
        select: { amount: true },
      }).catch(() => []),
      this.prisma.maintenanceRequest.findMany({
        where: maintenanceWhere,
        select: { estimatedCost: true, actualCost: true },
      }).catch(() => []),
      this.prisma.repair.findMany({
        where: repairWhere,
        select: { estimatedCost: true, actualCost: true },
      }).catch(() => []),
    ]);

    let totalIncome = new Decimal(0);
    let totalExpenses = new Decimal(0);

    const categoryBreakdown: Record<string, { income: Decimal; expense: Decimal }> = {};

    function addToBreakdown(categoryName: string, type: 'income' | 'expense', amount: Decimal) {
      if (!categoryBreakdown[categoryName]) {
        categoryBreakdown[categoryName] = { income: new Decimal(0), expense: new Decimal(0) };
      }
      categoryBreakdown[categoryName][type] = categoryBreakdown[categoryName][type].plus(amount);
    }

    // Income from FinanceTransactions
    for (const txn of transactions) {
      if (txn.transactionType === 'INCOME') {
        const amount = txn.amount;
        totalIncome = totalIncome.plus(amount);
        addToBreakdown(txn.category?.name || 'Uncategorized', 'income', amount);
      }
    }

    // Income from TripBillings (non-cancelled)
    for (const billing of tripBillings) {
      if (billing.paymentStatus !== 'CANCELLED') {
        const amount = billing.netReceivable.greaterThan(0) ? billing.netReceivable : billing.totalAmount;
        totalIncome = totalIncome.plus(amount);
        addToBreakdown('Trip Billing', 'income', amount);
      }
    }

    // Expenses from FinanceTransactions
    for (const txn of transactions) {
      if (txn.transactionType === 'EXPENSE') {
        const amount = txn.amount;
        totalExpenses = totalExpenses.plus(amount);
        addToBreakdown(txn.category?.name || 'Uncategorized', 'expense', amount);
      }
    }

    // Fuel costs
    let fuelTotal = new Decimal(0);
    for (const fuel of fuelEntries) {
      fuelTotal = fuelTotal.plus(fuel.totalAmount);
    }
    if (fuelTotal.greaterThan(0)) {
      totalExpenses = totalExpenses.plus(fuelTotal);
      addToBreakdown('Fuel', 'expense', fuelTotal);
    }

    // Expense module costs
    let expenseTotal = new Decimal(0);
    for (const exp of expenses) {
      expenseTotal = expenseTotal.plus(exp.amount);
    }
    if (expenseTotal.greaterThan(0)) {
      totalExpenses = totalExpenses.plus(expenseTotal);
      addToBreakdown('Expenses', 'expense', expenseTotal);
    }

    // Maintenance costs
    let maintenanceTotal = new Decimal(0);
    for (const m of maintenanceRequests) {
      const cost = m.actualCost ?? m.estimatedCost ?? new Decimal(0);
      maintenanceTotal = maintenanceTotal.plus(cost);
    }
    if (maintenanceTotal.greaterThan(0)) {
      totalExpenses = totalExpenses.plus(maintenanceTotal);
      addToBreakdown('Maintenance', 'expense', maintenanceTotal);
    }

    // Repair costs
    let repairTotal = new Decimal(0);
    for (const r of repairs) {
      const cost = r.actualCost ?? r.estimatedCost ?? new Decimal(0);
      repairTotal = repairTotal.plus(cost);
    }
    if (repairTotal.greaterThan(0)) {
      totalExpenses = totalExpenses.plus(repairTotal);
      addToBreakdown('Repairs', 'expense', repairTotal);
    }

    const breakdown = Object.entries(categoryBreakdown).map(([category, amounts]) => ({
      category,
      type: amounts.income.greaterThan(0) ? 'INCOME' as const : 'EXPENSE' as const,
      total: amounts.income.greaterThan(0) ? Number(amounts.income) : Number(amounts.expense),
    }));

    return {
      totalIncome: Number(totalIncome),
      totalExpenses: Number(totalExpenses),
      netProfit: Number(totalIncome.minus(totalExpenses)),
      breakdown,
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
        include: { vendor: true, customer: true, driver: true, account: true, category: true },
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
