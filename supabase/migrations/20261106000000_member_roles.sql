-- View-only and edit access for people a space is shared with.
--
-- Each person added to a shared space is either "edit" (can change the space,
-- the way everyone could before) or "view" (can read it but not change it).
-- Existing members stay "edit". The owner picks the role when adding someone
-- and can change it later. Only the owner and "edit" members can save changes;
-- the database refuses anyone else, whatever the app does.
--
-- People who can only view have no vote, so the agreement needed to remove an
-- entry is the owner's plus every "edit" member's.

alter table public.space_members
  add column if not exists role text not null default 'edit';

alter table public.space_members drop constraint if exists space_members_role_check;
alter table public.space_members
  add constraint space_members_role_check check (role in ('edit', 'view'));

create or replace function public.can_edit_space(sid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.shared_spaces where id = sid and owner_id = auth.uid())
      or exists (select 1 from public.space_members where space_id = sid and user_id = auth.uid() and role = 'edit');
$$;

revoke all on function public.can_edit_space(uuid) from public, anon;
grant execute on function public.can_edit_space(uuid) to authenticated;

-- Saving changes needs edit access; reading stays open to every member.
drop policy if exists "Owner and members edit shared spaces" on public.shared_spaces;
drop policy if exists "Owner and editors edit shared spaces" on public.shared_spaces;
create policy "Owner and editors edit shared spaces" on public.shared_spaces
  for update to authenticated
  using (public.can_edit_space(id))
  with check (public.can_edit_space(id));

-- The owner changes someone's role. Nothing else about a membership can be edited.
revoke update on public.space_members from authenticated, anon;
grant update (role) on public.space_members to authenticated;

drop policy if exists "Owner changes member roles" on public.space_members;
create policy "Owner changes member roles" on public.space_members
  for update to authenticated
  using (public.is_space_owner(space_id))
  with check (public.is_space_owner(space_id));

-- Same rules as before, except only "edit" members count as people who must agree.
create or replace function public.shared_spaces_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  via_api boolean := current_user in ('anon', 'authenticated', 'service_role');
  old_cards jsonb;
  new_cards jsonb;
  people text[];
  bad jsonb;
begin
  if tg_op = 'DELETE' then
    if old.doc -> 'protected' = 'true'::jsonb then
      raise exception 'clustr_refused: this space is protected and cannot be deleted'
        using hint = 'Remove "protected" from the doc with SQL first.';
    end if;
    return old;
  end if;

  -- Protection: kept on once set; only the owner or the service role sets it.
  if via_api then
    if old.doc -> 'protected' = 'true'::jsonb then
      if new.doc -> 'protected' is distinct from 'true'::jsonb then
        new.doc := jsonb_set(new.doc, '{protected}', 'true'::jsonb);
      end if;
    elsif new.doc ? 'protected' and current_user <> 'service_role' and uid is distinct from old.owner_id then
      new.doc := new.doc - 'protected';
    end if;
  end if;

  -- Entries: the owner (and the service role) are not limited.
  if uid is null or uid = old.owner_id then
    return new;
  end if;

  old_cards := case when jsonb_typeof(old.doc -> 'cards') = 'array' then old.doc -> 'cards' else '[]'::jsonb end;
  new_cards := case when jsonb_typeof(new.doc -> 'cards') = 'array' then new.doc -> 'cards' else '[]'::jsonb end;

  select array_agg(p) into people from (
    select old.owner_id::text as p
    union
    select m.user_id::text from public.space_members m where m.space_id = old.id and m.role = 'edit'
  ) s;

  -- A removed entry needs everyone's agreement, the remover's included.
  select c into bad
  from jsonb_array_elements(old_cards) c
  where jsonb_typeof(c) = 'object'
    and c ->> 'id' not in (
      select n ->> 'id' from jsonb_array_elements(new_cards) n where n ->> 'id' is not null
    )
    and (
      jsonb_typeof(c -> 'rejection') is distinct from 'object'
      or not (people <@ (public.clustr_approvals(c -> 'rejection') || uid::text))
    )
  limit 1;
  if bad is not null then
    raise exception 'clustr_refused: only the owner can delete an entry before everyone agrees (entry %)', bad ->> 'id';
  end if;

  -- Votes: the only new name on a rejection may be the saver's own.
  select n into bad
  from jsonb_array_elements(new_cards) n
  left join lateral (
    select o -> 'rejection' as r
    from jsonb_array_elements(old_cards) o
    where jsonb_typeof(o) = 'object' and o ->> 'id' = n ->> 'id'
    limit 1
  ) b on true
  where jsonb_typeof(n) = 'object'
    and jsonb_typeof(n -> 'rejection') = 'object'
    and not (
      public.clustr_approvals(n -> 'rejection') <@ (
        case when b.r ->> 'id' = n -> 'rejection' ->> 'id' then public.clustr_approvals(b.r) else '{}'::text[] end
        || uid::text
      )
    )
  limit 1;
  if bad is not null then
    raise exception 'clustr_refused: you can only add your own vote (entry %)', bad ->> 'id';
  end if;

  return new;
end;
$$;

-- Triggers already point at this function; replacing it is enough.
