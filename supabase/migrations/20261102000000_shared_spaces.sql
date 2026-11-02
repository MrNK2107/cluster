-- Spaces shared between accounts.
--
-- A shared space lives in its own row instead of inside the owner's
-- workspace, so everyone it is shared with reads and writes the same copy.
-- The owner adds people by email; everyone added can edit.

create table if not exists public.shared_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.space_members (
  space_id uuid not null references public.shared_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  added_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create index if not exists space_members_user_idx on public.space_members (user_id);

alter table public.shared_spaces enable row level security;
alter table public.space_members enable row level security;

-- Policies on each table look at the other one; these helpers run with the
-- definer's rights so the checks do not recurse through RLS.
create or replace function public.is_space_owner(sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.shared_spaces where id = sid and owner_id = auth.uid());
$$;

create or replace function public.is_space_member(sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.space_members where space_id = sid and user_id = auth.uid());
$$;

revoke all on function public.is_space_owner(uuid) from public, anon;
revoke all on function public.is_space_member(uuid) from public, anon;
grant execute on function public.is_space_owner(uuid) to authenticated;
grant execute on function public.is_space_member(uuid) to authenticated;

-- shared_spaces: the owner and members read and edit; only the owner creates or deletes.
drop policy if exists "Owner and members read shared spaces" on public.shared_spaces;
create policy "Owner and members read shared spaces" on public.shared_spaces
  for select to authenticated
  using (owner_id = auth.uid() or public.is_space_member(id));

drop policy if exists "Owner creates shared spaces" on public.shared_spaces;
create policy "Owner creates shared spaces" on public.shared_spaces
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owner and members edit shared spaces" on public.shared_spaces;
create policy "Owner and members edit shared spaces" on public.shared_spaces
  for update to authenticated
  using (owner_id = auth.uid() or public.is_space_member(id))
  with check (owner_id = auth.uid() or public.is_space_member(id));

drop policy if exists "Owner deletes shared spaces" on public.shared_spaces;
create policy "Owner deletes shared spaces" on public.shared_spaces
  for delete to authenticated
  using (owner_id = auth.uid());

-- Members may not hand the space to someone else or rewrite who made it.
create or replace function public.shared_spaces_guard()
returns trigger
language plpgsql
as $$
begin
  new.owner_id := old.owner_id;
  new.owner_email := old.owner_email;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists shared_spaces_guard on public.shared_spaces;
create trigger shared_spaces_guard
  before update on public.shared_spaces
  for each row execute function public.shared_spaces_guard();

-- space_members: everyone in a space sees who else is in it; the owner adds
-- and removes people; a member can remove themselves (leave).
drop policy if exists "People in a space see its members" on public.space_members;
create policy "People in a space see its members" on public.space_members
  for select to authenticated
  using (public.is_space_owner(space_id) or public.is_space_member(space_id));

drop policy if exists "Owner adds members" on public.space_members;
create policy "Owner adds members" on public.space_members
  for insert to authenticated
  with check (public.is_space_owner(space_id) and user_id <> auth.uid());

drop policy if exists "Owner removes members, members leave" on public.space_members;
create policy "Owner removes members, members leave" on public.space_members
  for delete to authenticated
  using (public.is_space_owner(space_id) or user_id = auth.uid());

-- Find people to share with by email. Needs at least three characters and
-- returns a handful of matches, never the caller.
create or replace function public.search_users(q text)
returns table (id uuid, email text, name text, avatar_url text)
language sql stable security definer set search_path = public, auth
as $$
  select u.id,
         u.email::text,
         coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
         coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  from auth.users u
  where auth.uid() is not null
    and length(trim(q)) >= 3
    and u.id <> auth.uid()
    and u.email ilike replace(replace(replace(lower(trim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by u.email
  limit 6;
$$;

revoke all on function public.search_users(text) from public, anon;
grant execute on function public.search_users(text) to authenticated;
