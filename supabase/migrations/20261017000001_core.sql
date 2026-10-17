-- =============================================================================
-- Sinapsi · core schema: organizations, memberships, profiles, platform admins,
-- security helpers, audit log.
--
-- Security model (see docs/architecture.md):
--   * Nothing is exposed to the Data API unless explicitly GRANTed here.
--   * Every table has RLS enabled plus a RESTRICTIVE policy that requires the
--     session to have completed TOTP (aal2). Clinical data is never readable
--     without the second factor, regardless of other policies.
--   * Platform admins manage organizations/memberships but get NO policy on
--     clinical tables.
-- =============================================================================

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

create function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  patient_code_prefix text not null default 'PZ' check (patient_code_prefix ~ '^[A-Z]{1,4}$'),
  idle_timeout_min integer not null default 15 check (idle_timeout_min between 5 and 120),
  raw_retention_months integer not null default 24 check (raw_retention_months between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'therapist');

create table public.memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'therapist',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  ui_locale text not null default 'it' check (ui_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_touch before update on public.organizations
  for each row execute function app.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Every new auth user gets an (empty) profile row.
create function app.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_user();

-- -----------------------------------------------------------------------------
-- Security helpers (used inside RLS policies)
-- -----------------------------------------------------------------------------

-- True only when the current JWT has completed the second factor.
create function app.mfa_ok() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create function app.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
  )
$$;

-- Organizations the current user belongs to. Returned as an array so policies can
-- use `org_id = any ((select app.my_org_ids())::uuid[])`, evaluated once per statement.
create function app.my_org_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.org_id), '{}')
  from public.memberships m
  where m.user_id = (select auth.uid())
$$;

create function app.my_owned_org_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.org_id), '{}')
  from public.memberships m
  where m.user_id = (select auth.uid()) and m.role = 'owner'
$$;

create function app.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid())
  )
$$;

create function app.is_org_owner(p_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = 'owner'
  )
$$;

-- -----------------------------------------------------------------------------
-- Audit log (append-only; written by triggers and by public.log_event)
-- org_id / actor_id are plain uuids (no FK) so the trail survives deletions.
-- -----------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  org_id uuid,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
);
create index audit_log_org_at_idx on public.audit_log (org_id, at desc);

-- Row-level audit. Stores WHAT changed (column names, patient code), never the
-- clinical values themselves. Cascaded deletes (trigger depth > 1) are not
-- logged individually: the parent delete already is.
create function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_changed text[];
  v_org uuid;
  v_id uuid;
  v_details jsonb := '{}'::jsonb;
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_org := case
    when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid
    else (v_row ->> 'org_id')::uuid
  end;
  v_id := case when v_row ? 'id' then (v_row ->> 'id')::uuid end;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    select array_agg(n.key order by n.key)
      into v_changed
      from jsonb_each(v_row) n
     where n.value is distinct from v_old -> n.key
       and n.key not in ('updated_at');
    if v_changed is null then
      return null;
    end if;
    v_details := jsonb_build_object('changed', v_changed);
  end if;

  if tg_table_name = 'patients' then
    v_details := v_details || jsonb_build_object('code', v_row ->> 'code');
  elsif tg_table_name = 'memberships' then
    v_details := v_details || jsonb_build_object('user_id', v_row ->> 'user_id', 'role', v_row ->> 'role');
  elsif v_row ? 'patient_id' then
    v_details := v_details || jsonb_build_object('patient_id', v_row ->> 'patient_id');
  end if;

  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, details)
  values (v_org, (select auth.uid()), lower(tg_op), tg_table_name, v_id, v_details);
  return null;
end $$;

create trigger organizations_audit after insert or update or delete on public.organizations
  for each row execute function app.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- Second factor required for everything.
create policy mfa_required on public.platform_admins as restrictive for all to authenticated
  using ((select app.mfa_ok())) with check ((select app.mfa_ok()));
create policy mfa_required on public.organizations as restrictive for all to authenticated
  using ((select app.mfa_ok())) with check ((select app.mfa_ok()));
create policy mfa_required on public.memberships as restrictive for all to authenticated
  using ((select app.mfa_ok())) with check ((select app.mfa_ok()));
create policy mfa_required on public.profiles as restrictive for all to authenticated
  using ((select app.mfa_ok())) with check ((select app.mfa_ok()));
create policy mfa_required on public.audit_log as restrictive for all to authenticated
  using ((select app.mfa_ok())) with check ((select app.mfa_ok()));

-- platform_admins: a user can only see their own row (to know they are admin).
create policy self_read on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- organizations
create policy member_read on public.organizations for select to authenticated
  using (id = any ((select app.my_org_ids())::uuid[]) or (select app.is_platform_admin()));
create policy admin_insert on public.organizations for insert to authenticated
  with check ((select app.is_platform_admin()));
create policy owner_update on public.organizations for update to authenticated
  using (id = any ((select app.my_owned_org_ids())::uuid[]) or (select app.is_platform_admin()))
  with check (id = any ((select app.my_owned_org_ids())::uuid[]) or (select app.is_platform_admin()));
create policy admin_delete on public.organizations for delete to authenticated
  using ((select app.is_platform_admin()));

-- memberships (creation happens in the admin-invite Edge Function or by admins)
create policy member_read on public.memberships for select to authenticated
  using (org_id = any ((select app.my_org_ids())::uuid[]) or (select app.is_platform_admin()));
create policy admin_insert on public.memberships for insert to authenticated
  with check ((select app.is_platform_admin()));
create policy owner_update on public.memberships for update to authenticated
  using (org_id = any ((select app.my_owned_org_ids())::uuid[]) or (select app.is_platform_admin()))
  with check (org_id = any ((select app.my_owned_org_ids())::uuid[]) or (select app.is_platform_admin()));
create policy owner_delete on public.memberships for delete to authenticated
  using (
    (select app.is_platform_admin())
    or (org_id = any ((select app.my_owned_org_ids())::uuid[]) and user_id <> (select auth.uid()))
  );

-- profiles: own row, colleagues in the same organization, platform admins.
create policy visible_read on public.profiles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select app.is_platform_admin())
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.user_id and m.org_id = any ((select app.my_org_ids())::uuid[])
    )
  );
create policy self_update on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- audit_log: organization owners read their trail; platform admins read
-- organization/membership events only (no clinical activity).
create policy owner_read on public.audit_log for select to authenticated
  using (
    org_id = any ((select app.my_owned_org_ids())::uuid[])
    or ((select app.is_platform_admin()) and entity in ('organizations', 'memberships'))
  );

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Keep-alive endpoint for the GitHub Action: touches no data at all.
create function public.ping() returns timestamptz
language sql stable set search_path = '' as $$
  select now()
$$;

-- Everything the SPA needs to know about the signed-in user, in one round trip.
-- Returns NULL until the session has completed the second factor.
create function public.my_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', (select auth.uid()),
    'email', (select u.email from auth.users u where u.id = (select auth.uid())),
    'is_platform_admin', exists (
      select 1 from public.platform_admins pa where pa.user_id = (select auth.uid())
    ),
    'profile', (
      select jsonb_build_object('display_name', p.display_name, 'ui_locale', p.ui_locale)
      from public.profiles p where p.user_id = (select auth.uid())
    ),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
          'org_id', o.id,
          'org_name', o.name,
          'role', m.role,
          'patient_code_prefix', o.patient_code_prefix,
          'idle_timeout_min', o.idle_timeout_min,
          'raw_retention_months', o.raw_retention_months
        ) order by o.name)
      from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = (select auth.uid())
    ), '[]'::jsonb)
  )
  where (select app.mfa_ok())
$$;

-- Members of an organization with e-mail and 2FA status (owners and platform admins).
create function public.org_members(p_org uuid)
returns table (
  user_id uuid,
  email text,
  role public.org_role,
  display_name text,
  joined_at timestamptz,
  last_sign_in_at timestamptz,
  mfa_enrolled boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.mfa_ok() and (app.is_platform_admin() or app.is_org_owner(p_org))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select m.user_id, u.email::text, m.role, p.display_name, m.created_at, u.last_sign_in_at,
           exists (
             select 1 from auth.mfa_factors f
             where f.user_id = m.user_id and f.status = 'verified'
           )
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.org_id = p_org
    order by m.role, u.email;
end $$;
