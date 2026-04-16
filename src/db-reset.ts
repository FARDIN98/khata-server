// One-shot demo DB reset.
//
// Drops the entire `public` schema and recreates it empty. Use this when
// `synchronize:true` cannot reconcile a column type change (e.g. timestamp ->
// timestamptz) because of existing rows. After running this, `npm run seed`
// will recreate the schema fresh and populate demo data.
//
// Usage:  npm run db:reset
//
// WARNING: destroys ALL tables in the public schema. Only safe for dev/demo.

import 'dotenv/config';
import { DataSource } from 'typeorm';

async function reset() {
  const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL or DATABASE_URL_DIRECT is required');

  const ds = new DataSource({
    type: 'postgres',
    url,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
    entities: [],
  });

  await ds.initialize();
  console.log('> connected, dropping public schema...');
  await ds.query('DROP SCHEMA IF EXISTS public CASCADE');
  await ds.query('CREATE SCHEMA public');
  await ds.query('GRANT ALL ON SCHEMA public TO public');
  console.log('> public schema reset clean.');
  console.log('> next: run `npm run seed` to recreate tables and demo data.');
  await ds.destroy();
}

reset().catch((err) => {
  console.error('db reset failed:', err);
  process.exit(1);
});
