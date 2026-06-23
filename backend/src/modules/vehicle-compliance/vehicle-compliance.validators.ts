import { z } from 'zod';

export const vehicleIdParamsSchema = z.object({ vehicleId: z.string().min(1) });
export const complianceIdParamsSchema = z.object({ vehicleId: z.string().min(1), id: z.string().min(1) });

const complianceDocStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWAL_DUE', 'VERIFIED', 'REJECTED']);
const createComplianceDocStatusEnum = z.enum(['DRAFT', 'ACTIVE']);
const editableComplianceDocStatusEnum = z.enum(['DRAFT', 'ACTIVE']);
const complianceTypeEnum = z.enum(['RC', 'INSURANCE', 'PERMIT', 'FITNESS', 'PUC', 'ROAD_TAX', 'FASTAG', 'GPS_AIS140', 'HYPOTHECATION', 'OTHER']);
const insurancePolicyTypeEnum = z.enum(['THIRD_PARTY', 'COMPREHENSIVE', 'OWN_DAMAGE', 'PACKAGE']);
const permitTypeEnum = z.enum(['NATIONAL', 'STATE', 'GOODS_CARRIAGE', 'CONTRACT_CARRIAGE', 'TOURIST', 'STAGE_CARRIAGE', 'PRIVATE_SERVICE', 'OTHER']);
const emissionNormEnum = z.enum(['BSIII', 'BSIV', 'BSVI', 'OTHER']);
const roadTaxTypeEnum = z.enum(['LIFETIME', 'ANNUAL', 'QUARTERLY', 'MONTHLY', 'OTHER']);
const fastagStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'LOW_BALANCE', 'CLOSED']);
const gpsDeviceStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'FAULTY', 'REMOVED']);

// Registration
export const createRegistrationSchema = z.object({
  registrationNumber: z.string().optional(),
  registrationDate: z.string().datetime().optional().nullable(),
  ownerName: z.string().optional(),
  rtoCode: z.string().optional(),
  rtoName: z.string().optional(),
  vehicleClass: z.string().optional(),
  transportCategory: z.string().optional(),
  bodyType: z.string().optional(),
  seatingCapacity: z.number().int().min(0).optional().nullable(),
  grossVehicleWeight: z.number().int().min(0).optional().nullable(),
  unladenWeight: z.number().int().min(0).optional().nullable(),
  hypothecationName: z.string().optional(),
  hypothecationType: z.string().optional(),
});
export const updateRegistrationSchema = createRegistrationSchema;

// Insurance
export const createInsuranceSchema = z.object({
  policyNumber: z.string().min(1, 'Policy number is required'),
  insurerName: z.string().min(1, 'Insurer name is required'),
  policyType: insurancePolicyTypeEnum,
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  premiumAmount: z.number().min(0).optional().nullable(),
  idvAmount: z.number().min(0).optional().nullable(),
  renewalReminderDays: z.number().int().min(0).max(365).default(30),
  status: complianceDocStatusEnum.default('ACTIVE'),
});
export const updateInsuranceSchema = z.object({
  policyNumber: z.string().min(1).optional(),
  insurerName: z.string().min(1).optional(),
  policyType: insurancePolicyTypeEnum.optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  premiumAmount: z.number().min(0).optional().nullable(),
  idvAmount: z.number().min(0).optional().nullable(),
  renewalReminderDays: z.number().int().min(0).max(365).optional(),
  status: complianceDocStatusEnum.optional(),
});

// Permit
export const createPermitSchema = z.object({
  permitNumber: z.string().min(1, 'Permit number is required'),
  permitType: permitTypeEnum,
  issuingAuthority: z.string().optional(),
  coveredStates: z.string().optional(),
  coveredRoutes: z.string().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  renewalReminderDays: z.number().int().min(0).max(365).default(30),
  status: complianceDocStatusEnum.default('ACTIVE'),
});
export const updatePermitSchema = z.object({
  permitNumber: z.string().min(1).optional(),
  permitType: permitTypeEnum.optional(),
  issuingAuthority: z.string().optional(),
  coveredStates: z.string().optional(),
  coveredRoutes: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).optional(),
  status: complianceDocStatusEnum.optional(),
});

// Fitness
export const createFitnessSchema = z.object({
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  inspectionDate: z.string().datetime(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  inspectionCenter: z.string().optional(),
  remarks: z.string().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).default(30),
  status: complianceDocStatusEnum.default('ACTIVE'),
});
export const updateFitnessSchema = z.object({
  certificateNumber: z.string().min(1).optional(),
  inspectionDate: z.string().datetime().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  inspectionCenter: z.string().optional(),
  remarks: z.string().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).optional(),
  status: complianceDocStatusEnum.optional(),
});

// PUC
export const createPucSchema = z.object({
  certificateNumber: z.string().min(1, 'Certificate number is required'),
  emissionNorm: emissionNormEnum,
  testingCenter: z.string().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  renewalReminderDays: z.number().int().min(0).max(365).default(30),
  status: complianceDocStatusEnum.default('ACTIVE'),
});
export const updatePucSchema = z.object({
  certificateNumber: z.string().min(1).optional(),
  emissionNorm: emissionNormEnum.optional(),
  testingCenter: z.string().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).optional(),
  status: complianceDocStatusEnum.optional(),
});

// Road Tax
export const createRoadTaxSchema = z.object({
  taxReceiptNumber: z.string().min(1, 'Tax receipt number is required'),
  taxType: roadTaxTypeEnum,
  paidFrom: z.string().datetime(),
  paidTo: z.string().datetime(),
  amount: z.number().min(0).optional().nullable(),
  issuingState: z.string().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).default(30),
  status: complianceDocStatusEnum.default('ACTIVE'),
});
export const updateRoadTaxSchema = z.object({
  taxReceiptNumber: z.string().min(1).optional(),
  taxType: roadTaxTypeEnum.optional(),
  paidFrom: z.string().datetime().optional(),
  paidTo: z.string().datetime().optional(),
  amount: z.number().min(0).optional().nullable(),
  issuingState: z.string().optional(),
  renewalReminderDays: z.number().int().min(0).max(365).optional(),
  status: complianceDocStatusEnum.optional(),
});

// FASTag
export const createFastagSchema = z.object({
  fastagId: z.string().min(1, 'FASTag ID is required'),
  issuerBank: z.string().optional(),
  linkedMobileMasked: z.string().optional(),
  status: fastagStatusEnum.default('ACTIVE'),
  lastRechargeDate: z.string().datetime().optional().nullable(),
  lastKnownBalance: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});
export const updateFastagSchema = z.object({
  fastagId: z.string().min(1).optional(),
  issuerBank: z.string().optional(),
  linkedMobileMasked: z.string().optional(),
  status: fastagStatusEnum.optional(),
  lastRechargeDate: z.string().datetime().optional().nullable(),
  lastKnownBalance: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
});

// GPS Device
export const createGpsDeviceSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  imei: z.string().optional(),
  simNumberMasked: z.string().optional(),
  vendorName: z.string().optional(),
  installedAt: z.string().datetime().optional().nullable(),
  ais140Certified: z.boolean().default(false),
  certificateNumber: z.string().optional(),
  status: gpsDeviceStatusEnum.default('ACTIVE'),
  notes: z.string().optional(),
});
export const updateGpsDeviceSchema = z.object({
  deviceId: z.string().min(1).optional(),
  imei: z.string().optional(),
  simNumberMasked: z.string().optional(),
  vendorName: z.string().optional(),
  installedAt: z.string().datetime().optional().nullable(),
  ais140Certified: z.boolean().optional(),
  certificateNumber: z.string().optional(),
  status: gpsDeviceStatusEnum.optional(),
  notes: z.string().optional(),
});

// Compliance Document
export const createComplianceDocumentSchema = z.object({
  complianceType: complianceTypeEnum,
  documentNumber: z.string().optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  issuingAuthority: z.string().optional(),
  externalFileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional(),
  status: createComplianceDocStatusEnum.optional(),
});
export const updateComplianceDocumentSchema = z.object({
  complianceType: complianceTypeEnum.optional(),
  documentNumber: z.string().optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  issuingAuthority: z.string().optional(),
  externalFileUrl: z.string().url().optional().nullable(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().min(0).optional().nullable(),
  status: editableComplianceDocStatusEnum.optional(),
  notes: z.string().optional(),
});

// Verify
export const verifyDocumentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
});

// Renew
export const renewDocumentSchema = z.object({
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  documentNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Compliance query
export const complianceQuerySchema = z.object({
  vehicleId: z.string().optional(),
  complianceType: complianceTypeEnum.optional(),
  status: complianceDocStatusEnum.optional(),
  expiringWithinDays: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// History query
export const historyQuerySchema = z.object({
  complianceType: complianceTypeEnum.optional(),
  action: z.enum(['CREATED', 'UPDATED', 'RENEWED', 'VERIFIED', 'STATUS_CHANGED', 'DOCUMENT_UPLOADED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Alerts query
export const alertsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

// Document ID params
export const documentIdParamsSchema = z.object({ id: z.string().min(1) });
