import { Router } from 'express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { validateRequest } from '../../middlewares/validate';
import { asyncHandler } from '../../utils/asyncHandler';
import * as c from './vehicle-compliance.controller';
import * as v from './vehicle-compliance.validators';

const router = Router();
router.use(asyncHandler(authMiddleware));

// Dashboard (top-level)
router.get('/compliance/dashboard', requirePermission('vehicle_compliance_view'), asyncHandler(c.getComplianceDashboardController));
router.get('/compliance/alerts/expiring', requirePermission('vehicle_compliance_view'), validateRequest({ query: v.alertsQuerySchema }), asyncHandler(c.listExpiringSoonController));
router.get('/compliance/alerts/expired', requirePermission('vehicle_compliance_view'), asyncHandler(c.listExpiredController));

// Registration (one-to-one per vehicle)
router.get('/vehicle/:vehicleId/compliance/registration', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.getRegistrationController));
router.put('/vehicle/:vehicleId/compliance/registration', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createRegistrationSchema }), asyncHandler(c.upsertRegistrationController));

// Insurance (one-to-many per vehicle)
router.get('/vehicle/:vehicleId/compliance/insurance', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.listInsuranceController));
router.get('/vehicle/:vehicleId/compliance/insurance/:id', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.complianceIdParamsSchema }), asyncHandler(c.getInsuranceController));
router.post('/vehicle/:vehicleId/compliance/insurance', requirePermission('vehicle_compliance_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createInsuranceSchema }), asyncHandler(c.createInsuranceController));
router.put('/vehicle/:vehicleId/compliance/insurance/:id', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.complianceIdParamsSchema, body: v.updateInsuranceSchema }), asyncHandler(c.updateInsuranceController));

// Permit (one-to-many)
router.get('/vehicle/:vehicleId/compliance/permits', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.listPermitsController));
router.get('/vehicle/:vehicleId/compliance/permits/:id', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.complianceIdParamsSchema }), asyncHandler(c.getPermitController));
router.post('/vehicle/:vehicleId/compliance/permits', requirePermission('vehicle_compliance_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createPermitSchema }), asyncHandler(c.createPermitController));
router.put('/vehicle/:vehicleId/compliance/permits/:id', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.complianceIdParamsSchema, body: v.updatePermitSchema }), asyncHandler(c.updatePermitController));

// Fitness
router.get('/vehicle/:vehicleId/compliance/fitness', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.listFitnessController));
router.get('/vehicle/:vehicleId/compliance/fitness/:id', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.complianceIdParamsSchema }), asyncHandler(c.getFitnessController));
router.post('/vehicle/:vehicleId/compliance/fitness', requirePermission('vehicle_compliance_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createFitnessSchema }), asyncHandler(c.createFitnessController));
router.put('/vehicle/:vehicleId/compliance/fitness/:id', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.complianceIdParamsSchema, body: v.updateFitnessSchema }), asyncHandler(c.updateFitnessController));

// PUC
router.get('/vehicle/:vehicleId/compliance/puc', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.listPucController));
router.get('/vehicle/:vehicleId/compliance/puc/:id', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.complianceIdParamsSchema }), asyncHandler(c.getPucController));
router.post('/vehicle/:vehicleId/compliance/puc', requirePermission('vehicle_compliance_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createPucSchema }), asyncHandler(c.createPucController));
router.put('/vehicle/:vehicleId/compliance/puc/:id', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.complianceIdParamsSchema, body: v.updatePucSchema }), asyncHandler(c.updatePucController));

// Road Tax
router.get('/vehicle/:vehicleId/compliance/road-tax', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.listRoadTaxController));
router.get('/vehicle/:vehicleId/compliance/road-tax/:id', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.complianceIdParamsSchema }), asyncHandler(c.getRoadTaxController));
router.post('/vehicle/:vehicleId/compliance/road-tax', requirePermission('vehicle_compliance_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createRoadTaxSchema }), asyncHandler(c.createRoadTaxController));
router.put('/vehicle/:vehicleId/compliance/road-tax/:id', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.complianceIdParamsSchema, body: v.updateRoadTaxSchema }), asyncHandler(c.updateRoadTaxController));

// FASTag (one-to-one)
router.get('/vehicle/:vehicleId/compliance/fastag', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.getFastagController));
router.put('/vehicle/:vehicleId/compliance/fastag', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createFastagSchema }), asyncHandler(c.upsertFastagController));

// GPS Device (one-to-one)
router.get('/vehicle/:vehicleId/compliance/gps-device', requirePermission('vehicle_compliance_view'), validateRequest({ params: v.vehicleIdParamsSchema }), asyncHandler(c.getGpsDeviceController));
router.put('/vehicle/:vehicleId/compliance/gps-device', requirePermission('vehicle_compliance_update'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createGpsDeviceSchema }), asyncHandler(c.upsertGpsDeviceController));

// Documents (cross-type, queryable by vehicleId or complianceType)
router.get('/compliance/documents', requirePermission('document_metadata_view'), validateRequest({ query: v.complianceQuerySchema }), asyncHandler(c.listComplianceDocumentsController));
router.get('/compliance/documents/:id', requirePermission('document_metadata_view'), validateRequest({ params: v.documentIdParamsSchema }), asyncHandler(c.getComplianceDocumentController));
router.post('/vehicle/:vehicleId/compliance/documents', requirePermission('document_metadata_create'), validateRequest({ params: v.vehicleIdParamsSchema, body: v.createComplianceDocumentSchema }), asyncHandler(c.createComplianceDocumentController));
router.put('/compliance/documents/:id', requirePermission('document_metadata_update'), validateRequest({ params: v.documentIdParamsSchema, body: v.updateComplianceDocumentSchema }), asyncHandler(c.updateComplianceDocumentController));
router.put('/compliance/documents/:id/verify', requirePermission('document_metadata_verify'), validateRequest({ params: v.documentIdParamsSchema, body: v.verifyDocumentSchema }), asyncHandler(c.verifyComplianceDocumentController));
router.put('/compliance/documents/:id/renew', requirePermission('vehicle_compliance_renew'), validateRequest({ params: v.documentIdParamsSchema, body: v.renewDocumentSchema }), asyncHandler(c.renewComplianceDocumentController));

// History (per vehicle)
router.get('/vehicle/:vehicleId/compliance/history', requirePermission('compliance_history_view'), validateRequest({ params: v.vehicleIdParamsSchema, query: v.historyQuerySchema }), asyncHandler(c.listComplianceHistoryController));

export default router;
