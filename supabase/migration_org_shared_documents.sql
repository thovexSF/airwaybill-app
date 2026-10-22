-- Documents are shared by every member of their organization, so a team
-- embedded from a partner (B2B Operaciones) can sign in each person as
-- themselves and still work on the same AWBs.

-- Fill the org on insert: the ported editors (documentService) never send it.
create or replace function set_awb_document_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select organization_id into new.organization_id
    from organization_members
    where user_id = new.user_id
    order by joined_at
    limit 1;
  end if;
  return new;
end;
$$;

-- Named after awb_documents_set_user_id so it fires after it (triggers run alphabetically).
create or replace trigger awb_documents_set_user_org
  before insert on awb_documents
  for each row execute function set_awb_document_org();

update awb_documents d
set organization_id = m.organization_id
from organization_members m
where d.organization_id is null
  and m.user_id = d.user_id
  and (select count(*) from organization_members x where x.user_id = d.user_id) = 1;

create or replace function is_org_member(p_org_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members
    where organization_id = p_org_id and user_id = auth.uid()
  )
$$;

drop policy if exists "Users can read own AWBs" on awb_documents;
drop policy if exists "Users can update own AWBs" on awb_documents;
drop policy if exists "Users can delete own AWBs" on awb_documents;

create policy "Members can read org AWBs"
  on awb_documents for select
  using (auth.uid() = user_id or is_org_member(organization_id));

create policy "Members can update org AWBs"
  on awb_documents for update
  using (auth.uid() = user_id or is_org_member(organization_id));

create policy "Members can delete org AWBs"
  on awb_documents for delete
  using (auth.uid() = user_id or is_org_member(organization_id));

-- Same as migration_admin_backoffice.sql, but any member may count a teammate's document.
create or replace function record_awb_pdf_download(p_org_id uuid, p_awb_document_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plan       text;
  v_month      text := to_char(now(), 'YYYY-MM');
  v_counted_at timestamptz;
  v_result     text;
begin
  if not is_org_member(p_org_id) then
    raise exception 'not_authorized';
  end if;

  select plan into v_plan
  from organizations
  where id = p_org_id;

  select download_counted_at into v_counted_at
  from awb_documents
  where id = p_awb_document_id
    and (organization_id = p_org_id or (organization_id is null and user_id = auth.uid()))
  for update;

  if not found then
    raise exception 'document_not_found';
  end if;

  if v_counted_at is not null then
    v_result := 'already_counted';
  elsif v_plan = 'free' and org_docs_used(p_org_id) >= free_doc_limit() then
    -- Past the free allowance nothing is charged; the client watermarks the PDF.
    v_result := 'limit_reached';
  else
    insert into awb_usage (organization_id, month, count)
    values (p_org_id, v_month, 1)
    on conflict (organization_id, month) do update set count = awb_usage.count + 1;

    update awb_documents
    set
      organization_id = coalesce(organization_id, p_org_id),
      download_counted_at = now(),
      status = 'final'
    where id = p_awb_document_id;

    v_result := 'ok';
  end if;

  insert into pdf_events (organization_id, user_id, awb_document_id, result)
  values (p_org_id, auth.uid(), p_awb_document_id, v_result);

  return v_result;
end;
$$;

-- A user created by a partner embed joins the partner's org instead of getting
-- a personal one. app_metadata, unlike user_metadata, only the service role can set.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_org_name text;
begin
  v_org_id := nullif(new.raw_app_meta_data->>'partner_org_id', '')::uuid;
  if v_org_id is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (v_org_id, new.id, 'member');
    return new;
  end if;

  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'company_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, new.id::text), '@', 2)
  );

  insert into public.organizations (name)
  values (v_org_name)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, new.id, 'owner');

  return new;
exception when others then
  raise log 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$;
