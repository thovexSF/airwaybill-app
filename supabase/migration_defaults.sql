-- Organization default values for pre-filling AWB forms
create table if not exists organization_defaults (
  organization_id        uuid primary key references organizations(id) on delete cascade,
  shipper_name_and_address text not null default '',
  shipper_account_number   text not null default '',
  carrier_name             text not null default '',
  carrier_address          text not null default '',
  issuing_carrier_agent    text not null default '',
  airport_of_departure     text not null default '',
  awb_prefix               text not null default '',
  updated_at               timestamptz not null default now()
);

-- RLS: members can read/write their org defaults
alter table organization_defaults enable row level security;

create policy "Members can read org defaults"
  on organization_defaults for select
  using (
    exists (
      select 1 from organization_members
      where organization_id = organization_defaults.organization_id
        and user_id = auth.uid()
    )
  );

create policy "Members can upsert org defaults"
  on organization_defaults for insert
  with check (
    exists (
      select 1 from organization_members
      where organization_id = organization_defaults.organization_id
        and user_id = auth.uid()
    )
  );

create policy "Members can update org defaults"
  on organization_defaults for update
  using (
    exists (
      select 1 from organization_members
      where organization_id = organization_defaults.organization_id
        and user_id = auth.uid()
    )
  );
