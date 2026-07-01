import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import {
  driverProfileController,
  driverTripsController,
  driverVehiclesController,
  driverDocumentsController,
  driverFuelController,
  driverExpensesController,
  driverCreateTripController,
  driverStartTripController,
  driverEndTripController,
  driverCancelTripController,
  driverCreateFuelController,
  driverCreateExpenseController,
  driverUploadDocumentController,
  driverReportVehicleIssueController,
  driverCreateVehicleInspectionController,
  driverUploadFuelReceiptController,
  driverExtractFuelReceiptController,
  driverUploadExpenseReceiptController,
} from './driver-portal.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(asyncHandler(authMiddleware));

// ─── READ ───
router.get('/me/driver-profile', asyncHandler(driverProfileController));
router.get('/me/driver-trips', asyncHandler(driverTripsController));
router.get('/me/driver-vehicles', asyncHandler(driverVehiclesController));
router.get('/me/driver-documents', asyncHandler(driverDocumentsController));
router.get('/me/driver-fuel', asyncHandler(driverFuelController));
router.get('/me/driver-expenses', asyncHandler(driverExpensesController));

// ─── WRITE: Trips ───
router.post('/me/driver-trips', requirePermission('driver_trip_create'), asyncHandler(driverCreateTripController));
router.patch('/me/driver-trips/:id/start', requirePermission('driver_trip_start'), asyncHandler(driverStartTripController));
router.patch('/me/driver-trips/:id/end', requirePermission('driver_trip_end'), asyncHandler(driverEndTripController));
router.patch('/me/driver-trips/:id/cancel', requirePermission('driver_trip_cancel'), asyncHandler(driverCancelTripController));

// ─── WRITE: Fuel ───
router.post('/me/driver-fuel', requirePermission('driver_quick_fuel_create'), asyncHandler(driverCreateFuelController));
router.post('/me/driver-fuel/receipt-upload', requirePermission('driver_quick_fuel_create'), upload.single('file'), asyncHandler(driverUploadFuelReceiptController));
router.post('/me/driver-fuel/extract-receipt', requirePermission('driver_quick_fuel_create'), asyncHandler(driverExtractFuelReceiptController));

// ─── WRITE: Expenses ───
router.post('/me/driver-expenses', requirePermission('driver_expense_create'), asyncHandler(driverCreateExpenseController));
router.post('/me/driver-expenses/receipt-upload', requirePermission('driver_expense_create'), upload.single('file'), asyncHandler(driverUploadExpenseReceiptController));

// ─── WRITE: Documents ───
router.post('/me/driver-documents', requirePermission('driver_document_upload'), upload.single('file'), asyncHandler(driverUploadDocumentController));

// ─── WRITE: Vehicle Issues & Inspections ───
router.post('/me/driver-vehicle-issues', requirePermission('driver_vehicle_issue_report'), asyncHandler(driverReportVehicleIssueController));
router.post('/me/driver-vehicle-inspections', requirePermission('driver_vehicle_inspection_create'), asyncHandler(driverCreateVehicleInspectionController));

export default router;
