-- Mensajería eAWB: la plataforma transmite los FWB de todos sus clientes a cada
-- aerolínea por su canal (por ahora SMTP: una casilla que la aerolínea asigna a
-- airwaybill.app como proveedor) y registra cada mensaje enviado y recibido.
-- El agente va identificado dentro del FWB (código IATA / CASS / cuenta); las
-- respuestas (FMA, FNA, FSU) se asignan al documento por número de AWB.

create table if not exists eawb_channels (
  airline_prefix    text primary key check (airline_prefix ~ '^\d{3}$'),
  airline_name      text not null default '',
  channel           text not null default 'smtp' check (channel in ('smtp')),
  destination_email text not null,
  type_b_address    text,           -- dirección Type B de la aerolínea, si la asignó (7 caracteres)
  active            boolean not null default true,
  notes             text,
  updated_at        timestamptz not null default now()
);

alter table eawb_channels enable row level security;

-- Cualquier usuario puede saber si una aerolínea recibe eAWB; solo el backoffice (service role) escribe.
create policy "Signed-in users can read eAWB channels"
  on eawb_channels for select
  using (auth.uid() is not null);

create table if not exists eawb_messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade,
  document_id      uuid references awb_documents(id) on delete set null,
  awb_number       text not null,                 -- 045-12345678
  airline_prefix   text,
  direction        text not null check (direction in ('out', 'in')),
  message_type     text not null,                 -- FWB, FHL, FMA, FNA, FSU
  status_code      text,                          -- FSU: RCS, DEP, ARR, DLV…
  counterpart      text,                          -- casilla de la aerolínea (destino o remitente)
  subject          text,
  body             text not null,
  error            text,                          -- FNA: motivo del rechazo; out: fallo del envío
  provider_id      text,                          -- id del correo en Resend
  created_at       timestamptz not null default now()
);

create index if not exists eawb_messages_awb_idx on eawb_messages (awb_number, created_at desc);
create index if not exists eawb_messages_doc_idx on eawb_messages (document_id, created_at desc);
create index if not exists eawb_messages_org_idx on eawb_messages (organization_id, created_at desc);

alter table eawb_messages enable row level security;

create policy "Members can read own org eAWB messages"
  on eawb_messages for select
  using (exists (
    select 1 from organization_members m
    where m.organization_id = eawb_messages.organization_id and m.user_id = auth.uid()
  ));
