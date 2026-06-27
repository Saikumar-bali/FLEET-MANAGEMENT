import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middlewares/authMiddleware';
import { validateRequest } from '../../middlewares/validate';
import { loginController, logoutController, meController, refreshController, effectivePermissionsController } from './auth.controller';
import { loginSchema, logoutSchema, refreshSchema } from './auth.validators';

const router = Router();

router.post('/login', validateRequest({ body: loginSchema }), asyncHandler(loginController));
router.post('/logout', validateRequest({ body: logoutSchema }), asyncHandler(logoutController));
router.post('/refresh', validateRequest({ body: refreshSchema }), asyncHandler(refreshController));
router.get('/me', asyncHandler(authMiddleware), asyncHandler(meController));
router.get('/effective-permissions', asyncHandler(authMiddleware), asyncHandler(effectivePermissionsController));

export default router;
