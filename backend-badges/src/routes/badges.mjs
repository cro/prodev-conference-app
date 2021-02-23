import { authorize, identify } from '../security.mjs';
import { pool } from '../db/index.mjs';
import { trimProperty } from '../strings.mjs';
import qrcode from 'qrcode';
import Router from '@koa/router';

export const router = new Router({
  prefix: '/events/:eventId/badges',
});

router.use(authorize);
router.use(identify);

router.post('/', async ctx => {
  trimProperty(ctx.request.body, 'name')
  trimProperty(ctx.request.body, 'email')
  trimProperty(ctx.request.body, 'company_name')
  trimProperty(ctx.request.body, 'role')
  let v1 = await ctx.validator(ctx.request.body, {
    name: 'required|minLength:1',
    email: 'required|email',
    company_name: 'required|minLength:1',
    role: 'optional',
  });
  let fails1 = await v1.fails();
  if (fails1) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Bad parameters for new badge.',
      errors: v1.errors,
    };
  }
  const { eventId } = ctx.params;
  let v2 = await ctx.validator(ctx.params, {
    eventId: 'required|integer',
  });
  let fails2 = await v2.fails();
  if (fails2) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not find that event.',
      errors: v2.errors,
    };
  }

  let attendee_name = ctx.request.body['name'];
  let company_name = ctx.request.body['company_name'];
  let email = ctx.request.body['email'];
  let role = ctx.request.body['role'];
  const { rows } = await pool.query(`
    INSERT into badges(event_id, email, name,
                       company_name, role, account_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (account_id) DO UPDATE SET
       event_id = $1, email = $2, name = $3, company_name = $4,
       role = $5, account_id = $6
  `, [eventId, email, attendee_name, company_name, role, ctx.claims.id]);
  ctx.body = {
    name: attendee_name,
    companyName: company_name,
    role: role,
  }
  for (let item of ctx.body) {
    item.qrcode = await qrcode.toString(`${item.id}|${item.name}`);
    console.log(item);
  }
});
router.get('/', async ctx => {
  const { eventId } = ctx.params;
  let v = await ctx.validator(ctx.params, {
    eventId: 'required|integer',
  });
  let fails = await v.fails();
  if (fails) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not find that event.',
      errors: v.errors,
    };
  }

  const { rows } = await pool.query(`
    SELECT b.id, b.event_id, b.email, b.name, b.company_name AS "companyName", b.role
    FROM badges b
    WHERE b.event_id = $2
  `, [ctx.claims.id, eventId])
  ctx.body = rows.map(x => ({
    name: x.name,
    companyName: x.companyName,
    role: x.role,
  }));
  for (let item of ctx.body) {
    item.qrcode = await qrcode.toString(`${item.id}|${item.name}`);
  }
});

    // This was the pre-refactor query.
    // SELECT b.id, b.event_id, b.email, b.name, b.company_name AS "companyName", b.role,
    // FROM badges b
    // JOIN events e ON (b.event_id = e.id)
    // JOIN accounts a ON (e.account_id = a.id)
    // WHERE a.id = $1
    // AND e.id = $2
