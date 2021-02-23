import Router from '@koa/router';
import { router as sessionRouter } from './session.mjs';
import { router as accountRouter } from './accounts.mjs';
import { router as swaggerRouter } from './swagger.mjs';
import { router as eventsRouter } from './events.mjs';
import { router as locationsRouter } from './locations.mjs';
import { router as presentationsRouter } from './presentations.mjs';
import { router as attendeesRouter } from './attendees.mjs';
import { router as badgesRouter } from './badges.mjs';

export const router = new Router();

router.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods());
router.use('/api', sessionRouter.routes(), sessionRouter.allowedMethods());
router.use('/api', accountRouter.routes(), accountRouter.allowedMethods());
router.use('/api', eventsRouter.routes(), eventsRouter.allowedMethods());
router.use('/api', locationsRouter.routes(), locationsRouter.allowedMethods());
router.use('/api', presentationsRouter.routes(), presentationsRouter.allowedMethods());
router.use('/api', attendeesRouter.routes(), attendeesRouter.allowedMethods());
router.use('/api', badgesRouter.routes(), badgesRouter.allowedMethods());
