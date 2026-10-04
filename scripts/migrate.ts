/**
 * Corre las migraciones pendientes de `supabase/` contra Postgres (Railway preDeploy).
 * Cada archivo corre una sola vez, en una transacción, y queda en `schema_migrations`.
 * Las migraciones anteriores a este runner ya se aplicaron a mano y no figuran en la lista.
 *
 *   DATABASE_URL        cadena de conexión de Supabase (Project Settings → Database)
 *   npm run migrate -- --baseline <archivo>   marca como aplicada sin ejecutarla
 *
 * Para una migración nueva: agrégala al final de MIGRATIONS.
 */
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const MIGRATIONS = [
  'migration_free_lifetime_limit.sql',
  'migration_admin_backoffice.sql',
  'migration_eawb_agreements.sql',
  'migration_iata_registry.sql',
  'migration_awb_prefix_3digits.sql',
]

const url = process.env.DATABASE_URL
if (!url) {
  console.warn('[migrate] DATABASE_URL no está definida: se omiten las migraciones. Defínela en Railway.')
  process.exit(0)
}

const baselineIdx = process.argv.indexOf('--baseline')
const baseline = baselineIdx > -1 ? process.argv[baselineIdx + 1] : null

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
async function main() {
await client.connect()
try {
  await client.query(
    'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
  )
  if (baseline) {
    await client.query('insert into schema_migrations (name) values ($1) on conflict do nothing', [baseline])
    console.log(`[migrate] ${baseline} marcada como aplicada`)
  } else {
    const done = new Set((await client.query('select name from schema_migrations')).rows.map(r => r.name))
    for (const name of MIGRATIONS.filter(n => !done.has(n))) {
      const sql = fs.readFileSync(path.resolve('supabase', name), 'utf8')
      console.log(`[migrate] aplicando ${name}…`)
      try {
        await client.query('begin')
        await client.query(sql)
        await client.query('insert into schema_migrations (name) values ($1)', [name])
        await client.query('commit')
      } catch (e) {
        await client.query('rollback')
        console.error(`[migrate] falló ${name}:`, (e as Error).message)
        process.exit(1)
      }
    }
    console.log('[migrate] al día')
  }
} finally {
  await client.end()
}
}

main().catch(e => { console.error('[migrate]', e.message); process.exit(1) })
