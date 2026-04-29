-- Add plan tracking to organizations
alter table organizations
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'starter', 'pro', 'enterprise')),
  add column if not exists plan_expires_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- AWB usage counter (per org per month)
create table if not exists awb_usage (
  organization_id uuid not null references organizations(id) on delete cascade,
  month           text not null,  -- format: 'YYYY-MM'
  count           int  not null default 0,
  primary key (organization_id, month)
);

alter table awb_usage enable row level security;

create policy "Members can read own org usage"
  on awb_usage for select
  using (
    exists (
      select 1 from organization_members
      where organization_id = awb_usage.organization_id
        and user_id = auth.uid()
    )
  );

-- Function: increment AWB count and enforce Free plan limit
-- Returns 'ok' | 'limit_reached'
create or replace function increment_awb_usage(p_org_id uuid)
returns text language plpgsql security definer as $$
declare
  v_plan   text;
  v_month  text := to_char(now(), 'YYYY-MM');
  v_count  int;
begin
  select plan into v_plan from organizations where id = p_org_id;

  -- Paid plans: just increment, no limit
  if v_plan != 'free' then
    insert into awb_usage (organization_id, month, count)
    values (p_org_id, v_month, 1)
    on conflict (organization_id, month)
    do update set count = awb_usage.count + 1;
    return 'ok';
  end if;

  -- Free plan: check limit
  select coalesce(count, 0) into v_count
  from awb_usage
  where organization_id = p_org_id and month = v_month;

  if v_count >= 10 then
    return 'limit_reached';
  end if;

  insert into awb_usage (organization_id, month, count)
  values (p_org_id, v_month, 1)
  on conflict (organization_id, month)
  do update set count = awb_usage.count + 1;

  return 'ok';
end;
$$;
