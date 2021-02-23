import { pool } from '../db/index.mjs';
import Router from '@koa/router';
import { authorize, identify } from '../security.mjs';

async function getOneEvent(id, email) {
  const { rows } = await pool.query(`
    SELECT e.id, e.name, e.from, e.to, e.description, e.logo_url AS "logoUrl", e.created, e.updated, e.version,
           e.number_of_presentations AS "numberOfPresentations",
           e.maximum_number_of_attendees AS "maximumNumberOfAttendees",
           l.id AS location_id, l.name AS location_name, l.city AS location_city, l.state AS location_state,
           l.maximum_vendor_count AS location_maximum_vendor_count, l.room_count AS location_room_count,
           l.created AS location_created, l.updated AS location_updated
    FROM events e
    JOIN locations l ON (e.location_id = l.id)
    JOIN accounts a ON (e.account_id = a.id)
    WHERE e.id = $1
    AND a.email = $2
  `, [id, email]);

  if (rows.length === 0) {
    return null;
  }

  const record = rows[0];
  let { name, from, to, description, logoUrl, created, updated, numberOfPresentations, maximumNumberOfAttendees, version } = record;
  return {
    id,
    name,
    from,
    to,
    description,
    logoUrl,
    created,
    updated,
    numberOfPresentations,
    maximumNumberOfAttendees,
    version,
    location: {
      id: record.location_id,
      name: record.location_name,
      city: record.location_city,
      state: record.locaiton_state,
      maximumVendorCount: record.location_maximum_vendor_count,
      roomCount: record.location_room_count,
      created: record.location_created,
      updated: record.location_updated,
    },
  };
}

export const router = new Router({
  prefix: '/events',
});

router.use(authorize);

router.get('/', async ctx => {
  const { rows } = await pool.query(`
      SELECT e.id, e.name, e.from, e.to, e.description, e.logo_url AS "logoUrl"
      FROM events e
      JOIN accounts a ON(e.account_id = a.id)
      WHERE a.email = $1
    `,
    [ctx.claims.email]
  );
  ctx.body = rows;
});

router.post('/', identify, async ctx => {
  const accountId = ctx.claims.id;
  if (!accountId) {
    ctx.status = 401;
    return ctx.body = {
      code: 'INVALID_TOKEN',
      message: 'Provided an invalid authorization token',
    };
  }
  const { name, description, locationId } = ctx.request.body;

  let eventRows = null;
  try {
    const { rows } = await pool.query(`
      INSERT INTO events (name, description, location_id, account_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created, updated, version,
                number_of_presentations AS "numberOfPresentations",
                maximum_number_of_attendees AS "maximumNumberOfAttendees"
    `, [name, description, locationId, accountId]);
    eventRows = rows;
  } catch (e) {
    console.error(e);
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not create an event with that location or account.'
    };
  }
  const { rows: locationRows } = await pool.query(`
    SELECT l.id, l.name, l.city, l.state, l.maximum_vendor_count as "maximumVendorCount", l.room_count AS "roomCount", created, updated
    FROM locations l
    WHERE l.id = $1
  `, [locationId]);

  const [{ id, created, updated, version, numberOfPresentations, maximumNumberOfAttendees }] = eventRows;
  ctx.status = 201;
  ctx.body = {
    name,
    description,
    locationId,
    id,
    created,
    updated,
    version,
    numberOfPresentations,
    maximumNumberOfAttendees,
    location: locationRows[0],
  };
});

router.get('/:id', async ctx => {
  const { id } = ctx.params;
  const event = await getOneEvent(id, ctx.claims.email);

  if (event === null) {
    ctx.status = 404;
    return ctx.body = {
      code: 'INVALID_IDENTIFIER',
      message: `Could not find the event with identifier ${id}`,
    };
  }

  ctx.body = event;
});

router.delete('/:id', async ctx => {
  const { id } = ctx.params;
  const event = await getOneEvent(id, ctx.claims.email);

  if (event !== null) {
    await pool.query(`
      DELETE FROM events
      WHERE id = $1
        AND account_id IN(SELECT id from accounts WHERE email = $2)
    `, [id, ctx.claims.email]);
  }

  ctx.body = event || {};
});

router.put('/:id', identify, async ctx => {
  let { name, from, to, description, logoUrl, locationId, version, numberOfPresentations, maximumNumberOfAttendees } = ctx.request.body;
  if (from === '') { from = null; }
  if (to === '') { to = null; }
  if (logoUrl === '') { logoUrl = null; }
  let eventRows;
  try {
    const { rows } = await pool.query(`
      UPDATE events
      SET name = $3
        , "from" = $4
        , "to" = $5
        , description = $6
        , logo_url = $7
        , location_id = $8
        , updated = CURRENT_TIMESTAMP
        , version = version + 1
        , number_of_presentations = $9
        , maximum_number_of_attendees = $10
      WHERE id = $1
        AND version = $2
        AND account_id = $11
      RETURNING id, created, updated, version
    `, [ctx.params.id, version, name, from, to, description, logoUrl, locationId, numberOfPresentations,  maximumNumberOfAttendees, ctx.claims.id ]);
    eventRows = rows;
  } catch (e) {
    console.error(e);
    ctx.status = 400;
    return ctx.body = {
      code: 'INVALID_PARAMETER',
      message: 'Could not update the event because of missing or invalid information',
    };
  }
  if (eventRows.length === 0) {
    ctx.status = 409;
    return ctx.body = {
      code: 'VERSION_CONFLICT',
      message: 'Attempted to update an event with an old version',
    };
  }

  const { rows: locationRows } = await pool.query(`
    SELECT l.id, l.name, l.city, l.state, l.maximum_vendor_count as "maximumVendorCount", l.room_count AS "roomCount", created, updated
    FROM locations l
    WHERE l.id = $1
  `, [locationId]);

  const [{ id, created, updated: newUpdated, version: newVersion }] = eventRows;
  ctx.body = {
    name,
    description,
    locationId,
    from,
    to,
    logoUrl,
    id,
    created,
    updated: newUpdated,
    version: newVersion,
    numberOfPresentations,
    maximumNumberOfAttendees,
    location: locationRows[0],
  };
});
