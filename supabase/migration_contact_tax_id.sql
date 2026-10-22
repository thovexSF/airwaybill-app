-- Tax ID de la persona, aparte del de la empresa (tax_id).
alter table organization_defaults
  add column if not exists contact_tax_id text not null default '';
