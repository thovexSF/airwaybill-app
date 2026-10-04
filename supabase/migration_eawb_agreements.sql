-- Servicio Multilateral e-AWB Agreement (IATA Res. 672).
-- El cliente llena el formulario en airwaybill.app; el admin lo sube al Formstack
-- de IATA, IATA manda el contrato a firmar al cliente y el cliente sube aquí el PDF firmado.
--
-- Estados: solicitado → enviado_iata → pendiente_firma → firmado → aprobado | rechazado
-- Los clientes solo pueden insertar (como 'solicitado') y subir el PDF firmado vía RPC;
-- el resto de las transiciones las hace el backoffice con service role.

create table if not exists eawb_agreements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid references auth.users(id) on delete set null,
  form             jsonb not null,
  status           text not null default 'solicitado'
                     check (status in ('solicitado','enviado_iata','pendiente_firma','firmado','aprobado','rechazado')),
  authorized_at    timestamptz not null default now(),
  sent_to_iata_at  timestamptz,
  signed_pdf_path  text,
  signed_at        timestamptz,
  estimated_ready_at date,
  approved_at      timestamptz,
  admin_note       text,
  created_at       timestamptz not null default now()
);

create index if not exists eawb_agreements_org_idx on eawb_agreements (organization_id, created_at desc);

alter table eawb_agreements enable row level security;

create policy "Members can read own org agreements"
  on eawb_agreements for select
  using (exists (
    select 1 from organization_members m
    where m.organization_id = eawb_agreements.organization_id and m.user_id = auth.uid()
  ));

create policy "Members can request agreement"
  on eawb_agreements for insert
  with check (
    status = 'solicitado'
    and user_id = auth.uid()
    and exists (
      select 1 from organization_members m
      where m.organization_id = eawb_agreements.organization_id and m.user_id = auth.uid()
    )
  );

create or replace function add_business_days(p_from date, p_days int)
returns date language plpgsql immutable as $$
declare d date := p_from; n int := 0;
begin
  while n < p_days loop
    d := d + 1;
    if extract(isodow from d) < 6 then n := n + 1; end if;
  end loop;
  return d;
end;
$$;

create or replace function eawb_attach_signed(p_id uuid, p_path text)
returns void language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from eawb_agreements
  where id = p_id and status in ('pendiente_firma','firmado');
  if v_org is null then raise exception 'agreement_not_awaiting_signature'; end if;
  if not exists (select 1 from organization_members where organization_id = v_org and user_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;
  if split_part(p_path, '/', 1) <> v_org::text then raise exception 'bad_path'; end if;

  update eawb_agreements
  set status = 'firmado',
      signed_pdf_path = p_path,
      signed_at = now(),
      estimated_ready_at = add_business_days(current_date, 10)
  where id = p_id;
end;
$$;

-- Bucket privado: cada org solo ve/sube bajo "<org_id>/".
insert into storage.buckets (id, name, public)
values ('eawb-agreements', 'eawb-agreements', false)
on conflict (id) do nothing;

create policy "Org members upload signed agreements"
  on storage.objects for insert
  with check (
    bucket_id = 'eawb-agreements'
    and exists (
      select 1 from organization_members m
      where m.user_id = auth.uid() and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Org members read signed agreements"
  on storage.objects for select
  using (
    bucket_id = 'eawb-agreements'
    and exists (
      select 1 from organization_members m
      where m.user_id = auth.uid() and m.organization_id::text = (storage.foldername(name))[1]
    )
  );
