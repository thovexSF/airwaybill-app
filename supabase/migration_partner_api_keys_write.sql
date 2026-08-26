-- If migration_partner_api.sql was already applied without insert/update policies, run this.

create policy "Org admins can insert api keys"
  on partner_api_keys for insert
  with check (
    acting_user_id = auth.uid()
    and exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "Org admins can update api keys"
  on partner_api_keys for update
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from organization_members m
      where m.organization_id = partner_api_keys.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );
