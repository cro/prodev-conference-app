import { pool } from '../db/index.mjs';
import Router from '@koa/router';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_HASH = '$2a$10$QlWNohhjpbGuty6UnyeeJOeKY6dKbiaoFxeWdOoIUiNYaO/ZD2khW';

const secret = process.env['JWT_SECRET']
if (secret === undefined || secret.length === 0) {
  console.error('ERROR: Missing JWT_SECRET environment variable.');
  process.exit(2);
}

export const router = new Router({
  prefix: '/session',
});

router.put('new_session', '/', async ctx => {
  let { email, password } = ctx.request.body;
  email = email.toLowerCase().trim();
  password = password.trim();
  const { rows } = await pool.query(`
    SELECT name, hashed_password
    FROM accounts
    WHERE email = $1`,
    [email]
  );
  let hash = DEFAULT_HASH;
  if (rows.length === 0) {
    password = '';
  } else {
    hash = rows[0].hashed_password;
  }
  const good = await bcrypt.compare(password, hash) && rows.length === 1;
  if (good) {
    const token = jwt.sign({ name: rows[0].name, email }, secret);
    ctx.status = 201;
    ctx.body = { token };
  } else {
    ctx.status = 404;
    ctx.body = {
      code: 'BAD_CREDENTIALS',
      message: 'Could not authenticate with those credentials'
    };
  }
});
