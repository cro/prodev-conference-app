import Router from '@koa/router';
import { router as sessionRouter } from './session.mjs';
import { router as swaggerRouter } from './swagger.mjs';
import { router as badgesRouter } from './badges.mjs';

export const router = new Router();

router.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods());
router.use('/api', sessionRouter.routes(), sessionRouter.allowedMethods());
router.use('/api', badgesRouter.routes(), badgesRouter.allowedMethods());
