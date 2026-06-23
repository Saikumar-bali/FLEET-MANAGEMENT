import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './vehicle-compliance.controller';

const router = Router();
router.use(asyncHandler(authMiddleware));

// Dashboard (top-level)
router.get('/compliance/dashboard', requirePermission('vehicle_compliance_view'), asyncHandler(c.getComplianceDashboardController));
router.get('/compliance/alerts/expiring', requirePermission('vehicle_compliance_view'), asyncHandler(c.listExpiringSoonController));
router.get('/compliance/alerts/expired', requirePermission('vehicle_compliance_view'), asyncHandler(c.listExpiredController));

// Registration (one-to-one per vehicle)
router.get('/vehicle/:vehicleId/compliance/registration', requirePermission('vehicle_compliance_view'), asyncHandler(c.getRegistrationController));
router.put('/vehicle/:vehicleId/compliance/registration', requirePermission('vehicle_compliance_update'), asyncHandler(c.upsertRegistrationController));

// Insurance (one-to-many per vehicle)
router.get('/vehicle/:vehicleId/compliance/insurance', requirePermission('vehicle_compliance_view'), asyncHandler(c.listInsuranceController));
router.get('/vehicle/:vehicleId/compliance/insurance/:id', requirePermission('vehicle_compliance_view'), asyncHandler(c.getInsuranceController));
router.post('/vehicle/:vehicleId/compliance/insurance', requirePermission('vehicle_compliance_create'), asyncHandler(c.createInsuranceController));
router.put('/vehicle/:vehicleId/compliance/insurance/:id', requirePermission('vehicle_compliance_update'), asyncHandler(c.updateInsuranceController));

// Permit (one-to-many)
router.get('/vehicle/:vehicleId/compliance/permits', requirePermission('vehicle_compliance_view'), asyncHandler(c.listPermitsController));
router.get('/vehicle/:vehicleId/compliance/permits/:id', requirePermission('vehicle_compliance_view'), asyncHandler(c.getPermitController));
router.post('/vehicle/:vehicleId/compliance/permits', requirePermission('vehicle_compliance_create'), asyncHandler(c.createPermitController));
router.put('/vehicle/:vehicleId/compliance/permits/:id', requirePermission('vehicle_compliance_update'), asyncHandler(c.updatePermitController));

// Fitness
router.get('/vehicle/:vehicleId/compliance/fitness', requirePermission('vehicle_compliance_view'), asyncHandler(c.listFitnessController));
router.get('/vehicle/:vehicleId/compliance/fitness/:id', requirePermission('vehicle_compliance_view'), asyncHandler(c.getFitnessController));
router.post('/vehicle/:vehicleId/compliance/fitness', requirePermission('vehicle_compliance_create'), asyncHandler(c.createFitnessController));
router.put('/vehicle/:vehicleId/compliance/fitness/:id', requirePermission('vehicle_compliance_update'), asyncHandler(c.updateFitnessController));

// PUC
router.get('/vehicle/:vehicleId/compliance/puc', requirePermission('vehicle_compliance_view'), asyncHandler(c.listPucController));
router.get('/vehicle/:vehicleId/compliance/puc/:id', requirePermission('vehicle_compliance_view'), asyncHandler(c.getPucController));
router.post('/vehicle/:vehicleId/compliance/puc', requirePermission('vehicle_compliance_create'), asyncHandler(c.createPucController));
router.put('/vehicle/:vehicleId/compliance/puc/:id', requirePermission('vehicle_compliance_update'), asyncHandler(c.updatePucController));

// Road Tax
router.get('/vehicle/:vehicleId/compliance/road-tax', requirePermission('vehicle_compliance_view'), asyncHandler(c.listRoadTaxController));
router.get('/vehicle/:vehicleId/compliance/road-tax/:id', requirePermission('vehicle_compliance_view'), asyncHandler(c.getRoadTaxController));
router.post('/vehicle/:vehicleId/compliance/road-tax', requirePermission('vehicle_compliance_create'), asyncHandler(c.createRoadTaxController));
router.put('/vehicle/:vehicleId/compliance/road-tax/:id', requirePermission('vehicle_compliance_update'), asyncHandler(c.updateRoadTaxController));

// FASTag (one-to-one)
router.get('/vehicle/:vehicleId/compliance/fastag', requirePermission('vehicle_compliance_view'), asyncHandler(c.getFastagController));
router.put('/vehicle/:vehicleId/compliance/fastag', requirePermission('vehicle_compliance_update'), asyncHandler(c.upsertFastagController));

// GPS Device (one-to-one)
router.get('/vehicle/:vehicleId/compliance/gps-device', requirePermission('vehicle_compliance_view'), asyncHandler(c.getGpsDeviceController));
router.put('/vehicle/:vehicleId/compliance/gps-device', requirePermission('vehicle_compliance_update'), asyncHandler(c.upsertGpsDeviceController));

// Documents (cross-type, queryable by vehicleId or complianceType)
router.get('/compliance/documents', requirePermission('document_metadata_view'), asyncHandler(c.listComplianceDocumentsController));
router.get('/compliance/documents/:id', requirePermission('document_metadata_view'), asyncHandler(c.getComplianceDocumentController));
router.post('/vehicle/:vehicleId/compliance/documents', requirePermission('document_metadata_create'), asyncHandler(c.createComplianceDocumentController));
router.put('/compliance/documents/:id', requirePermission('document_metadata_update'), asyncHandler(c.updateComplianceDocumentController));
router.put('/compliance/documents/:id/verify', requirePermission('document_metadata_verify'), asyncHandler(c.verifyComplianceDocumentController));

// History (per vehicle)
router.get('/vehicle/:vehicleId/compliance/history', requirePermission('compliance_history_view'), asyncHandler(c.listComplianceHistoryController));

export default router;
