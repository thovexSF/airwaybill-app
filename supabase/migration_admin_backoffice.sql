-- Backoffice: login counts and per-document PDF event log.
--
-- Neither existed before. `awb_usage.count` only tracks the free-plan
-- monthly quota (deduplicated: a document charges once, ever) — it cannot
-- tell you whether a user re-downloaded/re-printed the same handful of
-- documents ten times or produced ten distinct ones. `pdf_events` logs every
-- authorize() call from `usePdfDownloadGuard`/`record_awb_pdf_download`
-- (download button and CopiesDialog print/download alike) so the backoffice
-- can answer that from data instead of guessing.

-- One row per user, incremented on every SIGNED_IN.
create table if not exists user_logins (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  login_count    int not null default 0,
  first_login_at timestamptz not null default now(),
  last_login_at  timestamptz not null default now()
);

alter table user_logins enable row level security;

create policy "Users can read own login stats"
  on user_logins for select
  using (user_id = auth.uid());

create or replace function record_login()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into user_logins (user_id, login_count, first_login_at, last_login_at)
  values (auth.uid(), 1, now(), now())
  on conflict (user_id) do update
    set login_count = user_logins.login_count + 1,
        last_login_at = now();
end;
$$;

-- One row per PDF authorize() call against a saved document — not just the
-- ones that actually charge a quota unit, so re-prints/re-downloads of an
-- already-counted document still show up.
create table if not exists pdf_events (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid references organizations(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  awb_document_id   uuid references awb_documents(id) on delete cascade,
  result            text not null,  -- 'ok' | 'already_counted' | 'limit_reached'
  created_at        timestamptz not null default now()
);

create index if not exists pdf_events_document_idx on pdf_events (awb_document_id);
create index if not exists pdf_events_org_idx on pdf_events (organization_id, created_at desc);

alter table pdf_events enable row level security;

create policy "Members can read own org pdf events"
  on pdf_events for select
  using (
    exists (
      select 1 from organization_members
      where organization_id = pdf_events.organization_id
        and user_id = auth.uid()
    )
  );

-- Log every call, chargeable or not, before returning the same result as before.
create or replace function record_awb_pdf_download(p_org_id uuid, p_awb_document_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_plan       text;
  v_month      text := to_char(now(), 'YYYY-MM');
  v_count      int;
  v_counted_at timestamptz;
  v_result     text;
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
    v_result := 'already_counted';
  else
    insert into awb_usage (organization_id, month, count)
    values (p_org_id, v_month, 0)
    on conflict (organization_id, month) do nothing;

    select count into v_count
    from awb_usage
    where organization_id = p_org_id
      and month = v_month
    for update;

    if v_plan = 'free' and v_count >= 10 then
      v_result := 'limit_reached';
    else
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

      v_result := 'ok';
    end if;
  end if;

  insert into pdf_events (organization_id, user_id, awb_document_id, result)
  values (p_org_id, auth.uid(), p_awb_document_id, v_result);

  return v_result;
end;
$$;
