import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { requirePermission } from '../../middlewares/permissions';
import { asyncHandler } from '../../utils/asyncHandler';
import { openApiSpec } from '../../docs/openapi';

const router = Router();

router.use(
  '/',
  asyncHandler(authMiddleware),
  requirePermission('settings_view'),
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'Fleet Management API Docs',
    customfavIcon: '',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  }),
);

router.get('/openapi.json', asyncHandler(authMiddleware), requirePermission('settings_view'), (_req, res) => {
  res.json(openApiSpec);
});

export default router;
