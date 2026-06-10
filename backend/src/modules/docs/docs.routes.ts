import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../../docs/openapi';

const router = Router();

router.use('/', swaggerUi.serve);
router.get(
  '/',
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

router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

export default router;
