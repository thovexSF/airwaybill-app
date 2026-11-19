-- Names of the people in the caller's organizations, so the document list can
-- show who entered each document. auth.users is not readable from the client;
-- this exposes only the name (or email) of the caller's own teammates.
create or replace function org_member_names()
returns table (user_id uuid, name text)
language sql stable security definer set search_path = public as $$
  select distinct u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email)
  from organization_members m
  join auth.users u on u.id = m.user_id
  where m.organization_id in (select x.organization_id from organization_members x where x.user_id = auth.uid())
$$;

revoke all on function org_member_names() from public, anon;
grant execute on function org_member_names() to authenticated;
