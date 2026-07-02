import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import roleRoutes from './modules/roles/roles.routes';
import permissionRoutes from './modules/permissions/permissions.routes';
import userRoutes from './modules/users/users.routes';
import vehicleRoutes from './modules/vehicles/vehicles.routes';
import driverRoutes from './modules/drivers/drivers.routes';
import assetRoutes from './modules/assets/assets.routes';
import documentRoutes from './modules/documents/documents.routes';
import tripRoutes from './modules/trips/trips.routes';
import fuelRoutes from './modules/fuel/fuel.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import repairRoutes from './modules/repairs/repairs.routes';
import vehicleComplianceRoutes from './modules/vehicle-compliance/vehicle-compliance.routes';
import financeRoutes from './modules/finance/finance.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import docsRoutes from './modules/docs/docs.routes';
import accessRoutes from './modules/access/access-permissions.routes';
import accessAliasRoutes from './modules/access/access-alias.routes';
import userProfileLinkRoutes from './modules/user-profile-links/user-profile-links.routes';
import userProfileLinkUserAliasRoutes from './modules/user-profile-links/user-profile-links-user-aliases.routes';
import driverPortalRoutes from './modules/user-profile-links/driver-portal.routes';
import driverSubmissionRoutes from './modules/driver-submissions/driver-submissions.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';
import { sendError } from './utils/response';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net', 'https://validator.swagger.io'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://validator.swagger.io'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  }),
);
app.use(cors({ origin: config.corsOrigins }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/fuel', fuelRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/repairs', repairRoutes);
app.use('/api/v1/docs', docsRoutes);
app.use('/api/v1', vehicleComplianceRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/access', accessRoutes);
app.use('/api/v1/users', accessAliasRoutes);
app.use('/api/v1/users', userProfileLinkUserAliasRoutes);
app.use('/api/v1/user-profile-links', userProfileLinkRoutes);
app.use('/api/v1', driverPortalRoutes);
app.use('/api/v1', driverSubmissionRoutes);
app.use('/api/v1', workspaceRoutes);

app.use((_req, res) => sendError(res, 'Route not found', 404));

app.use(errorHandler);

export default app;
