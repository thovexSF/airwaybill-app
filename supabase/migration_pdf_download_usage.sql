-- Track the first counted PDF download per AWB document.
alter table awb_documents
  add column if not exists download_counted_at timestamptz;

-- Record one monthly usage unit the first time a document is downloaded as a PDF.
-- Returns 'ok' | 'already_counted' | 'limit_reached'
create or replace function record_awb_pdf_download(p_org_id uuid, p_awb_document_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plan       text;
  v_month      text := to_char(now(), 'YYYY-MM');
  v_count      int;
  v_counted_at timestamptz;
begin
  if not exists (
    select 1 from organization_members
    where organization_id = p_org_id
      and user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  select plan into v_plan
  from organizations
  where id = p_org_id;

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

  insert into awb_usage (organization_id, month, count)
  values (p_org_id, v_month, 0)
  on conflict (organization_id, month) do nothing;

  select count into v_count
  from awb_usage
  where organization_id = p_org_id
    and month = v_month
  for update;

  if v_plan = 'free' and v_count >= 10 then
    return 'limit_reached';
  end if;

  update awb_usage
  set count = count + 1
  where organization_id = p_org_id
    and month = v_month;

  update awb_documents
  set
    organization_id = coalesce(organization_id, p_org_id),
    download_counted_at = now(),
    status = 'final'
  where id = p_awb_document_id
    and user_id = auth.uid();

  return 'ok';
end;
$$;
