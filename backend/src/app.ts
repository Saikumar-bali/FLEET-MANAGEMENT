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
import { sendError } from './utils/response';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);

app.use((_req, res) => sendError(res, 'Route not found', 404));

app.use(errorHandler);

export default app;
