-- Air Waybill documents table
create table if not exists awb_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null default '{}',
  status      text not null default 'draft' check (status in ('draft', 'final')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast per-user listing
create index if not exists awb_documents_user_id_updated_at
  on awb_documents (user_id, updated_at desc);

-- Row Level Security: users can only see and modify their own documents
alter table awb_documents enable row level security;

create policy "Users can read own AWBs"
  on awb_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own AWBs"
  on awb_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own AWBs"
  on awb_documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own AWBs"
  on awb_documents for delete
  using (auth.uid() = user_id);

-- Auto-set user_id on insert
create or replace function set_user_id()
returns trigger language plpgsql security definer as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace trigger awb_documents_set_user_id
  before insert on awb_documents
  for each row execute function set_user_id();

-- Auto-update updated_at on row change
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger awb_documents_touch_updated_at
  before update on awb_documents
  for each row execute function touch_updated_at();
