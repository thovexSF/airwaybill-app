-- schema_migrations es contabilidad del runner (scripts/migrate.ts), que entra como
-- postgres y no pasa por RLS. Ningún cliente de la Data API debe leerla ni escribirla:
-- RLS sin políticas bloquea todo, y el revoke cierra también el acceso por grants.
alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from anon, authenticated;
