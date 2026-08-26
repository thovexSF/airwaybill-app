-- Partner API: API keys per organization (B2B Express and other clients).
-- Apply manually via Supabase SQL editor / CLI.

-- Allow partner inserts that already set user_id (service role has no auth.uid()).
create or replace function set_user_id()
returns trigger language plpgsql security definer as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

create table if not exists partner_api_keys (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- Documents created via this key are owned by this user (org owner recommended)
  acting_user_id  uuid not null references auth.users(id) on delete cascade,
  name            text not null default 'default',
  -- Prefix shown in UI; full secret is only returned once at creation
  key_prefix      text not null,
  key_hash        text not null unique,
  plan_override   text check (plan_override is null or plan_override in ('free', 'starter', 'pro', 'enterprise')),
  revoked_at      timestamptz,
  last_used_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists partner_api_keys_org_idx
  on partner_api_keys (organization_id)
  where revoked_at is null;

alter table partner_api_keys enable row level security;

-- Org owners/admins can list their keys (never see key_hash as useful secret)
create policy "Org admins can read api keys"
  on partner_api_keys for select
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Org admins can insert api keys"
  on partner_api_keys for insert
  with check (
    acting_user_id = auth.uid()
    and exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Org admins can update api keys"
  on partner_api_keys for update
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- External id for partner systems (e.g. B2B operation id)
alter table awb_documents
  add column if not exists external_id text;

create index if not exists awb_documents_org_external_idx
  on awb_documents (organization_id, external_id)
  where external_id is not null;

comment on table partner_api_keys is
  'API keys for partner integrations (e.g. B2B). Hash is sha256 hex of the secret.';
