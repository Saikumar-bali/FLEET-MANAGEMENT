import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  createDriverController,
  getDriverController,
  getDriverLinkedAccountController,
  getMyDriverProfileController,
  listDriversController,
  updateDriverController,
  updateDriverStatusController,
  getDriverAssignmentController,
  assignVehicleController,
  unassignVehicleController,
  getDriverActivityController,
  getDriverEffectivePermissionsController,
  getDriverOperationsSummaryController,
  getActiveDriversController,
} from './drivers.controller';
import {
  createMyTripController,
  getMyTripController,
  startMyTripController,
  endMyTripController,
  cancelMyTripController,
  getMyTripsController,
  createMyFuelEntryController,
  getMyFuelEntriesController,
  createMyExpenseController,
  getMyExpensesController,
  getMyDocumentsController,
  getMyVehicleController,
  createMyMaintenanceReportController,
  createMyRepairReportController,
} from './driver-self.controller';
import {
  createDriverSchema,
  driverIdParamsSchema,
  driverQuerySchema,
  updateDriverSchema,
  updateDriverStatusSchema,
} from './drivers.validators';

const router = Router();

router.use(asyncHandler(authMiddleware));

router.get(
  '/',
  requirePermission('driver_view'),
  validateRequest({ query: driverQuerySchema }),
  asyncHandler(listDriversController),
);

router.get(
  '/me',
  asyncHandler(getMyDriverProfileController),
);
router.get(
  '/me/trips',
  asyncHandler(getMyTripsController),
);
router.get(
  '/me/trips/:tripId',
  requirePermission('driver_trip_view'),
  asyncHandler(getMyTripController),
);
router.post(
  '/me/trips',
  requirePermission('driver_trip_create'),
  asyncHandler(createMyTripController),
);
router.post(
  '/me/trips/:tripId/start',
  requirePermission('driver_trip_start'),
  asyncHandler(startMyTripController),
);
router.post(
  '/me/trips/:tripId/end',
  requirePermission('driver_trip_end'),
  asyncHandler(endMyTripController),
);
router.post(
  '/me/trips/:tripId/cancel',
  requirePermission('driver_trip_cancel'),
  asyncHandler(cancelMyTripController),
);
router.get(
  '/me/fuel',
  requirePermission('driver_fuel_view_own'),
  asyncHandler(getMyFuelEntriesController),
);
router.post(
  '/me/fuel',
  requirePermission('driver_quick_fuel_create'),
  asyncHandler(createMyFuelEntryController),
);
router.get(
  '/me/expenses',
  requirePermission('driver_expense_view_own'),
  asyncHandler(getMyExpensesController),
);
router.post(
  '/me/expenses',
  requirePermission('driver_expense_create'),
  asyncHandler(createMyExpenseController),
);
router.get(
  '/me/documents',
  requirePermission('driver_my_documents_view'),
  asyncHandler(getMyDocumentsController),
);
router.get(
  '/me/vehicle',
  requirePermission('driver_assigned_vehicle_view'),
  asyncHandler(getMyVehicleController),
);
router.post(
  '/me/maintenance-reports',
  requirePermission('driver_maintenance_report_create'),
  asyncHandler(createMyMaintenanceReportController),
);
router.post(
  '/me/repair-reports',
  requirePermission('driver_repair_report_create'),
  asyncHandler(createMyRepairReportController),
);

router.get(
  '/active-operations',
  requireAnyPermission(['driver_view', 'driver_update']),
  asyncHandler(getActiveDriversController),
);

router.get(
  '/:id/assignment',
  requirePermission('driver_view'),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverAssignmentController),
);

router.post(
  '/:id/assign-vehicle',
  requireAnyPermission(['driver_update', 'vehicle_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(assignVehicleController),
);

router.post(
  '/:id/unassign-vehicle',
  requireAnyPermission(['driver_update', 'vehicle_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(unassignVehicleController),
);

router.get(
  '/:id/activity',
  requireAnyPermission(['driver_view', 'driver_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverActivityController),
);

router.get(
  '/:id/effective-permissions',
  requireAnyPermission(['driver_view', 'driver_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverEffectivePermissionsController),
);

router.get(
  '/:id/operations-summary',
  requireAnyPermission(['driver_view', 'driver_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverOperationsSummaryController),
);

router.get(
  '/:id/linked-account',
  requireAnyPermission(['user_view', 'user_update']),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverLinkedAccountController),
);

router.get(
  '/:id',
  requirePermission('driver_view'),
  validateRequest({ params: driverIdParamsSchema }),
  asyncHandler(getDriverController),
);
router.post(
  '/',
  requirePermission('driver_create'),
  validateRequest({ body: createDriverSchema }),
  asyncHandler(createDriverController),
);
router.patch(
  '/:id',
  requirePermission('driver_update'),
  validateRequest({ params: driverIdParamsSchema, body: updateDriverSchema }),
  asyncHandler(updateDriverController),
);
router.patch(
  '/:id/status',
  requireAnyPermission(['driver_update', 'driver_delete']),
  validateRequest({ params: driverIdParamsSchema, body: updateDriverStatusSchema }),
  asyncHandler(updateDriverStatusController),
);

export default router;
