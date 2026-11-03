-- Protected spaces, and who may delete entries in a shared space.
--
-- 1. A shared space whose doc has "protected": true cannot be deleted by
--    anyone (the app offers no way to either). Through the API nobody can
--    switch the flag off; only the owner or the service role can switch it
--    on. To really delete such a space, run SQL by hand as postgres:
--      update public.shared_spaces set doc = doc - 'protected' where id = '<id>';
--      delete from public.shared_spaces where id = '<id>';
--    Note: deleting the owner's account cascades here and is refused too.
--
-- 2. The owner can change a shared space freely, deleting entries included.
--    Anyone else may remove an entry only once the owner and every current
--    member have agreed to reject it (the save that removes it counts as the
--    saver's own vote), and may add only their own vote to a rejection.
--    The service role (auth.uid() is null) is not limited by this.
--
-- Errors start with "clustr_refused" so the app can tell a refusal from a
-- failed request.

-- The user ids in a rejection's "approvals" list, or none.
create or replace function public.clustr_approvals(r jsonb)
returns text[]
language sql immutable
as $$
  select case
    when jsonb_typeof(r -> 'approvals') = 'array'
      then array(select jsonb_array_elements_text(r -> 'approvals'))
    else '{}'::text[]
  end;
$$;

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
    select m.user_id::text from public.space_members m where m.space_id = old.id
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

drop trigger if exists shared_spaces_rules_update on public.shared_spaces;
create trigger shared_spaces_rules_update
  before update on public.shared_spaces
  for each row execute function public.shared_spaces_rules();

drop trigger if exists shared_spaces_rules_delete on public.shared_spaces;
create trigger shared_spaces_rules_delete
  before delete on public.shared_spaces
  for each row execute function public.shared_spaces_rules();

-- The opportunities space is protected from the start.
update public.shared_spaces
set doc = jsonb_set(doc, '{protected}', 'true'::jsonb)
where id = '939b2ca9-d61e-4a97-9c5a-f41aee912b2a';
