-- Free plan: 3 clean documents in total per organisation (not per month), no trials.
-- Past the allowance the RPCs answer 'limit_reached' WITHOUT counting; the client then
-- still delivers the PDF, but forces the DRAFT watermark. Paid plans never hit the limit.
-- Supersedes migration_pdf_download_usage.sql, which was never applied in production
-- (so record_awb_pdf_download did not exist and the limit was not enforced).

alter table awb_documents
  add column if not exists download_counted_at timestamptz;

-- Single source of truth for the limit; keep in step with FREE_DOC_LIMIT in src/lib/usePlan.ts.
create or replace function free_doc_limit() returns int
language sql immutable as $$ select 3 $$;

-- Lifetime units used by an organisation (sum over every month row).
create or replace function org_docs_used(p_org_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(count), 0)::int from awb_usage where organization_id = p_org_id
$$;

create or replace function increment_awb_usage(p_org_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plan  text;
  v_month text := to_char(now(), 'YYYY-MM');
begin
  if not exists (
    select 1 from organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  select plan into v_plan from organizations where id = p_org_id;

  if v_plan = 'free' and org_docs_used(p_org_id) >= free_doc_limit() then
    return 'limit_reached';
  end if;

  insert into awb_usage (organization_id, month, count)
  values (p_org_id, v_month, 1)
  on conflict (organization_id, month) do update set count = awb_usage.count + 1;

  return 'ok';
end;
$$;

-- Returns 'ok' | 'already_counted' | 'limit_reached'
-- migration_admin_backoffice.sql later redefines this to also log into pdf_events.
create or replace function record_awb_pdf_download(p_org_id uuid, p_awb_document_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plan       text;
  v_month      text := to_char(now(), 'YYYY-MM');
  v_counted_at timestamptz;
begin
  if not exists (
    select 1 from organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  select plan into v_plan from organizations where id = p_org_id;

  select download_counted_at into v_counted_at
  from awb_documents
  where id = p_awb_document_id
    and user_id = auth.uid()
    and (organization_id is null or organization_id = p_org_id)
  for update;

  if not found then
    raise exception 'document_not_found';
  end if;

  if v_counted_at is not null then
    return 'already_counted';
  end if;

  if v_plan = 'free' and org_docs_used(p_org_id) >= free_doc_limit() then
    return 'limit_reached';
  end if;

  insert into awb_usage (organization_id, month, count)
  values (p_org_id, v_month, 1)
  on conflict (organization_id, month) do update set count = awb_usage.count + 1;

  update awb_documents
  set organization_id = coalesce(organization_id, p_org_id),
      download_counted_at = now(),
      status = 'final'
  where id = p_awb_document_id and user_id = auth.uid();

  return 'ok';
end;
$$;

grant execute on function increment_awb_usage(uuid), record_awb_pdf_download(uuid, uuid) to authenticated;
revoke execute on function increment_awb_usage(uuid), record_awb_pdf_download(uuid, uuid) from anon;
