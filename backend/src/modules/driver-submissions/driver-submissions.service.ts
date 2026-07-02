import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/appError';

export type SubmissionType = 'fuel' | 'expenses' | 'documents' | 'issues' | 'inspections';

const baseIncludes = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  driver: { select: { id: true, name: true, status: true } },
  createdBy: { select: { id: true, name: true, username: true } },
};

const fuelInclude = {
  ...baseIncludes,
  trip: { select: { id: true, tripNumber: true } },
  approvedBy: { select: { id: true, name: true, username: true } },
};

const expenseInclude = {
  ...baseIncludes,
  trip: { select: { id: true, tripNumber: true } },
  approvedBy: { select: { id: true, name: true, username: true } },
};

const documentInclude = {
  vehicle: { select: { id: true, vehicleNumber: true, vehicleType: true } },
  driver: { select: { id: true, name: true, status: true } },
  uploadedBy: { select: { id: true, name: true, username: true } },
  verifiedBy: { select: { id: true, name: true, username: true } },
};

const issueInclude = {
  ...baseIncludes,
  trip: { select: { id: true, tripNumber: true } },
  reviewedBy: { select: { id: true, name: true, username: true } },
};

const inspectionInclude = {
  ...baseIncludes,
  trip: { select: { id: true, tripNumber: true } },
  reviewedBy: { select: { id: true, name: true, username: true } },
};

type ListOptions = {
  page?: number;
  limit?: number;
  status?: string;
  driverId?: string;
  vehicleId?: string;
  dateFrom?: string;
  dateTo?: string;
  extraWhere?: Record<string, unknown>;
};

function buildWhere(opts: ListOptions, driverIdField: string = 'driverId'): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.driverId) where[driverIdField] = opts.driverId;
  if (opts.vehicleId) where.vehicleId = opts.vehicleId;
  if (opts.dateFrom || opts.dateTo) {
    const dateField = 'inspectionDate';
    where[dateField] = {
      gte: opts.dateFrom ? new Date(opts.dateFrom) : undefined,
      lte: opts.dateTo ? new Date(opts.dateTo) : undefined,
    };
  }
  if (opts.extraWhere) {
    where.AND = where.AND
      ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), opts.extraWhere]
      : [opts.extraWhere];
  }
  return where;
}

function paginate(page: number, limit: number) {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

export async function listFuelSubmissions(opts: ListOptions) {
  const { skip, take, page, limit } = paginate(opts.page ?? 1, opts.limit ?? 20);
  const where = buildWhere(opts);
  const [items, total] = await Promise.all([
    prisma.fuelEntry.findMany({ where, include: fuelInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.fuelEntry.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getFuelSubmission(id: string) {
  const item = await prisma.fuelEntry.findUnique({ where: { id }, include: fuelInclude });
  if (!item) throw new AppError('Fuel submission not found', 404);
  return item;
}

export async function listExpenseSubmissions(opts: ListOptions) {
  const { skip, take, page, limit } = paginate(opts.page ?? 1, opts.limit ?? 20);
  const where = buildWhere(opts);
  const [items, total] = await Promise.all([
    prisma.expense.findMany({ where, include: expenseInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.expense.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getExpenseSubmission(id: string) {
  const item = await prisma.expense.findUnique({ where: { id }, include: expenseInclude });
  if (!item) throw new AppError('Expense submission not found', 404);
  return item;
}

export async function listDocumentSubmissions(opts: ListOptions) {
  const { skip, take, page, limit } = paginate(opts.page ?? 1, opts.limit ?? 20);
  const where = buildWhere(opts, 'driverId');
  // Filter by verification status instead of generic status
  if (opts.status) {
    delete where.status;
    where.verificationStatus = opts.status;
  }
  const [items, total] = await Promise.all([
    prisma.document.findMany({ where, include: documentInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.document.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDocumentSubmission(id: string) {
  const item = await prisma.document.findUnique({ where: { id }, include: documentInclude });
  if (!item) throw new AppError('Document submission not found', 404);
  return item;
}

export async function listIssueSubmissions(opts: ListOptions) {
  const { skip, take, page, limit } = paginate(opts.page ?? 1, opts.limit ?? 20);
  const where = buildWhere(opts);
  const [items, total] = await Promise.all([
    prisma.vehicleIssue.findMany({ where, include: issueInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.vehicleIssue.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getIssueSubmission(id: string) {
  const item = await prisma.vehicleIssue.findUnique({ where: { id }, include: issueInclude });
  if (!item) throw new AppError('Vehicle issue not found', 404);
  return item;
}

export async function listInspectionSubmissions(opts: ListOptions) {
  const { skip, take, page, limit } = paginate(opts.page ?? 1, opts.limit ?? 20);
  const where: Record<string, unknown> = {};
  if (opts.status) where.reviewStatus = opts.status;
  if (opts.driverId) where.driverId = opts.driverId;
  if (opts.vehicleId) where.vehicleId = opts.vehicleId;
  if (opts.extraWhere) {
    where.AND = where.AND
      ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), opts.extraWhere]
      : [opts.extraWhere];
  }
  const [items, total] = await Promise.all([
    prisma.vehicleInspection.findMany({ where, include: inspectionInclude, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.vehicleInspection.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getInspectionSubmission(id: string) {
  const item = await prisma.vehicleInspection.findUnique({ where: { id }, include: inspectionInclude });
  if (!item) throw new AppError('Vehicle inspection not found', 404);
  return item;
}
