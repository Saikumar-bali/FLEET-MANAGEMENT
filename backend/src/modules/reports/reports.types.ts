export type ReportRow = Record<string, string | number | boolean | null>;

export type VehicleUtilizationRow = {
  vehicleId: string;
  vehicleNumber: string;
  tripCount: number;
  totalDistanceKm: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalRepairCost: number;
  utilizationPct: number;
};

export type TripSummaryRow = {
  tripId: string;
  tripNumber: string;
  vehicleNumber: string | null;
  driverName: string | null;
  status: string;
  tripType: string;
  startDate: string | null;
  endDate: string | null;
  distanceKm: number;
};

export type FuelSummaryRow = {
  vehicleId: string;
  vehicleNumber: string;
  entryCount: number;
  totalLiters: number;
  totalAmount: number;
  avgPricePerLiter: number;
};

export type FuelMissingReceiptRow = {
  fuelEntryId: string;
  vehicleNumber: string;
  fuelDate: string;
  totalAmount: number;
  stationName: string | null;
  receiptNumber: string | null;
};

export type ComplianceExpiryRow = {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  complianceType: string;
  validTo: string;
  daysToExpire: number;
  status: string;
};

export type DocumentVerificationRow = {
  documentStatus: string;
  verificationStatus: string;
  count: number;
};

export type MaintenanceSummaryRow = {
  status: string;
  count: number;
  totalEstimatedCost: number;
  totalActualCost: number;
};