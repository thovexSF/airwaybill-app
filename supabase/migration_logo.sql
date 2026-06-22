-- Add carrier logo to organization defaults
alter table organization_defaults
  add column if not exists carrier_logo_url text not null default '';
