export interface FinanceQuery {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  type?: string;
  module?: string;
  status?: string;
  vehicleId?: string;
  tripId?: string;
  driverId?: string;
  vendorId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
  paymentStatus?: string;
}

export interface PnlQuery {
  dateFrom?: string;
  dateTo?: string;
  vehicleId?: string;
  driverId?: string;
}
