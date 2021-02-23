import { authorize, identify } from '../security.mjs';
import { pool } from '../db/index.mjs';
import { trimProperty } from '../strings.mjs';
import Router from '@koa/router';

export const router = new Router({
  prefix: '/events/:eventId/attendees',
});

router.use(authorize);
router.use(identify);

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
    SELECT p.id, p.email, p.name, p.company_name AS "companyName", p.created
    FROM attendees p
    JOIN events e ON (p.event_id = e.id)
    JOIN accounts a ON (e.account_id = a.id)
    WHERE a.id = $1
    AND e.id = $2
  `, [ctx.claims.id, eventId])
  ctx.body = rows;
});

router.post('/', async ctx => {
  trimProperty(ctx.request.body, 'name');
  trimProperty(ctx.request.body, 'email');
  trimProperty(ctx.request.body, 'companyName');
  let v = await ctx.validator(ctx.request.body, {
    name: 'required|minLength:1|maxLength:100',
    email: 'required|email|maxLength:100',
    companyName: 'required|minLength:1|maxLength:100',
  });
  let fails = await v.fails();
  if (fails) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not create a proposal because at least one of the values is bad.',
      errors: v.errors,
    };
  }

  const { eventId } = ctx.params;
  v = await ctx.validator(ctx.params, {
    eventId: 'required|integer',
  });
  fails = await v.fails();
  if (fails) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not create a proposal because at least one of the values is bad.',
      errors: v.errors,
    };
  }

  const accountId = ctx.claims.id;

  const { email, name, companyName } = ctx.request.body;
  const { rows: attendeesRows } = await pool.query(`
    INSERT INTO attendees (name, email, company_name, event_id)
    SELECT $1, $2, $3, e.id
    FROM events e
    JOIN accounts a ON (e.account_id = a.id) 
    WHERE e.id = $4
    AND a.id = $5
    RETURNING id, created
  `, [email, name, companyName, eventId, accountId]);

  if (attendeesRows.length === 0) {
    ctx.status = 404;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not find an event with that id to add an attendee to'
    };
  }

  await pool.query(`
    INSERT INTO badges (email, name, company_name, role, event_id)
    VALUES ($1, $2, $3, '', $4)
    ON CONFLICT (email, event_id)
    DO NOTHING
  `, [email, name, companyName, eventId]);

  const { id, created } = attendeesRows[0];
  ctx.status = 201;
  ctx.body = {
    id,
    email,
    name,
    companyName,
    created,
  };
});
