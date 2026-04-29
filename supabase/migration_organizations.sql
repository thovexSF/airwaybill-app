-- Organizations table
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- Membership table (owner / admin / member)
create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'owner' check (role in ('owner', 'admin', 'member')),
  joined_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Link AWBs to an org (nullable — existing rows keep working)
alter table awb_documents
  add column if not exists organization_id uuid references organizations(id);

-- RLS: users can read their own org
alter table organizations enable row level security;

create policy "Members can read their org"
  on organizations for select
  using (
    exists (
      select 1 from organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
    )
  );

-- RLS: users can read their own memberships
alter table organization_members enable row level security;

create policy "Users can read own memberships"
  on organization_members for select
  using (user_id = auth.uid());

-- Trigger: auto-create org when any user signs up (email OR OAuth)
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_org_id uuid;
  v_org_name text;
begin
  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'company_name'), ''),
    split_part(new.email, '@', 2)  -- fallback: use email domain
  );

  insert into organizations (name)
  values (v_org_name)
  returning id into v_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
