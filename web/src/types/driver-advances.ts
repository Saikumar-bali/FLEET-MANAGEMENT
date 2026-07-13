export type DriverAdvanceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ISSUED' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'REJECTED' | 'NEEDS_CHANGES' | 'CANCELLED';
export type DriverSettlementStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'NEEDS_CHANGES' | 'CANCELLED';

export type DriverAdvance = {
  id: string;
  advanceNumber: string;
  driverId: string;
  driverName?: string | null;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  tripId?: string | null;
  tripNumber?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  amount: number;
  includeExistingBalance?: boolean;
  existingBalanceApplied?: number;
  cashIssuedAmount?: number;
  walletBalance?: number;
  issuedAmount: number;
  settledAmount: number;
  returnedAmount: number;
  balanceAmount: number;
  paymentMode: string;
  dueDate?: string | null;
  isOverdue?: boolean;
  purpose?: string | null;
  notes?: string | null;
  status: DriverAdvanceStatus;
  reviewComments?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  issuedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  settlements?: DriverSettlement[];
  history?: DriverSettlementHistory[];
};

export type DriverSettlementLine = {
  id: string;
  line_type?: string;
  lineType?: string;
  amount: number;
  approved_amount?: number | null;
  approvedAmount?: number | null;
  description?: string | null;
  fuel_receipt_number?: string | null;
  expense_category?: string | null;
};

export type DriverSettlementHistory = {
  id: string;
  settlement_id?: string | null;
  advance_id?: string | null;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  remarks?: string | null;
  created_at?: string;
  createdAt?: string;
};

export type DriverSettlement = {
  id: string;
  settlementNumber: string;
  advanceId: string;
  advanceNumber?: string | null;
  advanceAmount?: number;
  advanceIssuedAmount: number;
  driverId: string;
  driverName?: string | null;
  vehicleId?: string | null;
  vehicleNumber?: string | null;
  tripId?: string | null;
  tripNumber?: string | null;
  submittedFuelTotal: number;
  approvedFuelTotal: number;
  submittedExpenseTotal: number;
  approvedExpenseTotal: number;
  returnedCashAmount: number;
  adjustmentAmount: number;
  totalApprovedSpend: number;
  settlementTotal: number;
  balanceDueFromDriver: number;
  reimbursementDueToDriver: number;
  balanceDisposition?: 'RETURN' | 'CARRY_FORWARD';
  status: DriverSettlementStatus;
  reviewComments?: string | null;
  notes?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  settledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: DriverSettlementLine[];
  history?: DriverSettlementHistory[];
};

export type DriverAdvanceReport = {
  summary: {
    totalAdvances: number;
    totalRequested: number;
    totalIssued: number;
    totalSpentSettled: number;
    totalReturned: number;
    totalOutstanding: number;
    overdueCount: number;
  };
  byDriver: Array<{
    driverId: string;
    driverName: string;
    totalAdvances: number;
    totalIssued: number;
    totalSpentSettled: number;
    totalReturned: number;
    totalOutstanding: number;
    overdueCount: number;
  }>;
};

export type DriverAdvanceList = {
  items: DriverAdvance[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type DriverSettlementList = {
  items: DriverSettlement[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
