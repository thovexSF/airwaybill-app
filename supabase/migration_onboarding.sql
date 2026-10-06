-- Perfil de empresa (onboarding): datos que se reescribían en cada documento.
-- Viven en organization_defaults, que ya tiene RLS por membresía de la organización.
alter table organization_defaults
  add column if not exists legal_name text not null default '',
  add column if not exists country text not null default '',            -- nombre en inglés, igual que el formulario de IATA
  add column if not exists tax_id text not null default '',             -- RUT en Chile
  add column if not exists phone text not null default '',
  add column if not exists contact_name text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists legal_rep_name text not null default '',
  add column if not exists legal_rep_title text not null default '',
  add column if not exists iata_agent_code text not null default '',    -- 7 dígitos o N/A
  add column if not exists cass_code text not null default '',          -- 4 dígitos
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_dismissed_at timestamptz;
