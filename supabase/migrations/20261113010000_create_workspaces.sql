create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

grant select, insert on public.workspaces to authenticated;

drop policy if exists "Users can view their own workspace" on public.workspaces;
create policy "Users can view their own workspace"
on public.workspaces
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own workspace" on public.workspaces;
create policy "Users can create their own workspace"
on public.workspaces
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

notify pgrst, 'reload schema';
