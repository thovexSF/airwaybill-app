-- Copia local de la lista pública "Freight Forwarders and Affiliates" del Multilateral
-- e-AWB Agreement de IATA, para avisar al cliente si su empresa ya figura antes de pedir el acuerdo.
-- Se reemplaza completa desde /admin (CSV exportado del reporte de IATA). Solo el servidor
-- (service role) la lee o escribe: RLS activo y sin políticas.

create table if not exists iata_eawb_registry (
  id            bigserial primary key,
  batch         uuid not null,
  country_code  text,
  country_name  text,
  city          text,
  company_name  text not null,
  norm_name     text not null,
  joining_date  date,
  comments      text
);

create index if not exists iata_eawb_registry_norm_idx on iata_eawb_registry (norm_name);
create index if not exists iata_eawb_registry_batch_idx on iata_eawb_registry (batch);

alter table iata_eawb_registry enable row level security;

create table if not exists iata_eawb_registry_meta (
  id           int primary key default 1 check (id = 1),
  as_of        date not null,   -- fecha en que se descargó la lista de IATA
  uploaded_at  timestamptz not null default now(),
  row_count    int not null,
  batch        uuid not null
);

alter table iata_eawb_registry_meta enable row level security;
