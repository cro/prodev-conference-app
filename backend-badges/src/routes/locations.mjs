import { pool } from '../db/index.mjs';
import Router from '@koa/router';
import { authorize } from '../security.mjs';
import { trimProperty } from '../strings.mjs';

async function selectAll() {
  return await pool.query(`
    SELECT l.id, l.name, l.city, l.state, l.maximum_vendor_count as "maximumVendorCount", l.room_count AS "roomCount", l.created, l.updated, l.version
    FROM locations l
    ORDER BY l.name
  `);
}

export const router = new Router({
  prefix: '/locations',
});

router.use(authorize);

router.get('/', async ctx => {
  const { rows } = await selectAll();
  ctx.body = rows;
});

router.post('/', async ctx => {
  trimProperty(ctx.request.body, 'name');
  trimProperty(ctx.request.body, 'city');
  trimProperty(ctx.request.body, 'state');
  const v = await ctx.validator(ctx.request.body, {
    name: 'required|minLength:1',
    city: 'required|minLength:1',
    state: 'required|minLength:2|maxLength:2',
    roomCount: 'required|integer|min:1',
    maximumVendorCount: 'required|integer|min:1',
  });
  const fails = await v.fails();
  if (fails) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not create a location because at least one of the values is bad.',
      errors: v.errors,
    };
  }

  try {
    let { name, city, state, maximumVendorCount, roomCount } = ctx.request.body;
    await pool.query(`
      INSERT INTO locations (name, city, state, maximum_vendor_count, room_count)
      VALUES ($1, $2, $3, $4, $5)
    `, [name, city, state, maximumVendorCount, roomCount]);
  } catch (e) {
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not create that location because it is not a unique name.',
    };
  }

  const { rows } = await selectAll();
  ctx.status = 201;
  ctx.body = rows;
});
