-- =============================================================================
-- Sinapsi · patient names, END-TO-END encrypted in the browser.
--
-- The browser encrypts "first + last name" with AES-256-GCM using a key derived
-- (PBKDF2) from the practice passphrase, which never leaves the therapists'
-- devices. The database only ever receives ciphertext: neither Supabase nor the
-- platform admin can read names. organizations.name_key stores the public
-- derivation parameters (salt, iterations) and an encrypted check value used
-- to verify the passphrase — never the key itself.
-- =============================================================================

alter table public.patients
  add column name_enc text
  check (name_enc ~ '^v1\.[A-Za-z0-9+/]+={0,2}\.[A-Za-z0-9+/]+={0,2}$' and char_length(name_enc) <= 2048);

alter table public.organizations
  add column name_key jsonb
  check (name_key is null or (jsonb_typeof(name_key) = 'object' and name_key ? 'salt' and name_key ? 'check'));

-- Only the practice owner can set or change the passphrase parameters.
create function app.guard_name_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- (the service role is trusted server-side tooling: restore scripts, local demo data)
  if new.name_key is distinct from old.name_key and not app.is_org_owner(new.id)
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'only the practice owner can change the names passphrase' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger organizations_name_key_guard before update of name_key on public.organizations
  for each row execute function app.guard_name_key();

-- Re-encrypts every name of a practice with a new passphrase, atomically.
-- p_names = [{ "id": uuid, "name_enc": text | null }]
create function public.rekey_patient_names(p_org uuid, p_name_key jsonb, p_names jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  if not app.is_org_owner(p_org) then
    raise exception 'only the practice owner can change the names passphrase' using errcode = '42501';
  end if;
  update public.patients p
     set name_enc = n.name_enc
    from jsonb_to_recordset(p_names) as n (id uuid, name_enc text)
   where p.id = n.id and p.org_id = p_org;
  get diagnostics v_count = row_count;
  update public.organizations set name_key = p_name_key where id = p_org;
  return v_count;
end $$;

-- Lost passphrase: erase every encrypted name of the practice (codes and data stay).
create function public.reset_patient_names(p_org uuid) returns integer
language plpgsql security invoker set search_path = '' as $$
declare
  v_count integer;
begin
  if not app.is_org_owner(p_org) then
    raise exception 'only the practice owner can reset the names' using errcode = '42501';
  end if;
  update public.patients set name_enc = null where org_id = p_org and name_enc is not null;
  get diagnostics v_count = row_count;
  update public.organizations set name_key = null where id = p_org;
  return v_count;
end $$;

-- my_context(): also return the passphrase parameters of each practice.
create or replace function public.my_context() returns jsonb
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
          'raw_retention_months', o.raw_retention_months,
          'name_key', o.name_key
        ) order by o.name)
      from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = (select auth.uid())
    ), '[]'::jsonb)
  )
  where (select app.mfa_ok())
$$;

-- Backups: restore name ciphertext and, if the practice has none yet, the key parameters.
create or replace function public.restore_rows(p_org uuid, p_table text, p_rows jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
begin
  if not (app.mfa_ok() and app.is_org_owner(p_org)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'rows must be an array' using errcode = '22023';
  end if;
  perform set_config('app.restoring', 'on', true);

  if p_table = 'organization_name_key' then
    update public.organizations
       set name_key = p_rows -> 0 -> 'name_key'
     where id = p_org and name_key is null and jsonb_typeof(p_rows -> 0 -> 'name_key') = 'object';
  elsif p_table = 'patients' then
    insert into public.patients (id, org_id, code, name_enc, birth_year, sex, education_years, handedness,
      content_locale, ui_prefs, target_success, notes, created_by, created_at, updated_at, archived_at)
    select r.id, p_org, r.code, r.name_enc, r.birth_year, r.sex, r.education_years, r.handedness,
      coalesce(r.content_locale, 'it'), coalesce(r.ui_prefs, '{}'::jsonb), coalesce(r.target_success, 0.75), r.notes,
      r.created_by, coalesce(r.created_at, now()), coalesce(r.updated_at, now()), r.archived_at
    from jsonb_populate_recordset(null::public.patients, p_rows) r
    on conflict do nothing;
  elsif p_table = 'patient_conditions' then
    insert into public.patient_conditions (id, org_id, patient_id, category, icd11_code, onset_year, notes, created_at)
    select r.id, p_org, r.patient_id, r.category, r.icd11_code, r.onset_year, r.notes, coalesce(r.created_at, now())
    from jsonb_populate_recordset(null::public.patient_conditions, p_rows) r
    where exists (select 1 from public.patients p where p.id = r.patient_id and p.org_id = p_org)
    on conflict do nothing;
  elsif p_table = 'session_templates' then
    insert into public.session_templates (id, org_id, title, description, items, created_by, created_at, updated_at)
    select r.id, p_org, r.title, r.description, coalesce(r.items, '[]'::jsonb), r.created_by, coalesce(r.created_at, now()), coalesce(r.updated_at, now())
    from jsonb_populate_recordset(null::public.session_templates, p_rows) r
    on conflict do nothing;
  elsif p_table = 'sessions' then
    insert into public.sessions (id, org_id, patient_id, title, mode, scheduled_for, status, started_at,
      completed_at, template_id, notes, created_by, created_at, updated_at)
    select r.id, p_org, r.patient_id, r.title, coalesce(r.mode, 'clinic'), coalesce(r.scheduled_for, current_date), coalesce(r.status, 'planned'), r.started_at,
      r.completed_at,
      case when exists (select 1 from public.session_templates t where t.id = r.template_id and t.org_id = p_org) then r.template_id end,
      r.notes, r.created_by, coalesce(r.created_at, now()), coalesce(r.updated_at, now())
    from jsonb_populate_recordset(null::public.sessions, p_rows) r
    where exists (select 1 from public.patients p where p.id = r.patient_id and p.org_id = p_org)
    on conflict do nothing;
  elsif p_table = 'session_items' then
    insert into public.session_items (id, org_id, session_id, position, activity_id, difficulty, locked, config, created_at)
    select r.id, p_org, r.session_id, r.position, r.activity_id, r.difficulty, coalesce(r.locked, false), coalesce(r.config, '{}'::jsonb), coalesce(r.created_at, now())
    from jsonb_populate_recordset(null::public.session_items, p_rows) r
    where exists (select 1 from public.sessions s where s.id = r.session_id and s.org_id = p_org)
    on conflict do nothing;
  elsif p_table = 'activity_runs' then
    insert into public.activity_runs (id, org_id, patient_id, session_id, session_item_id, activity_id,
      activity_version, scoring_version, difficulty, seed, config, device, mode, started_at, duration_ms,
      score, performance, metrics, quality_flags, rating_before, rating_after, rd_after, created_by, created_at)
    select r.id, p_org, r.patient_id,
      case when exists (select 1 from public.sessions s where s.id = r.session_id and s.org_id = p_org) then r.session_id end,
      case when exists (select 1 from public.session_items i where i.id = r.session_item_id and i.org_id = p_org) then r.session_item_id end,
      r.activity_id, r.activity_version, r.scoring_version, r.difficulty, r.seed, coalesce(r.config, '{}'::jsonb),
      coalesce(r.device, '{}'::jsonb), coalesce(r.mode, 'clinic'), r.started_at, r.duration_ms, r.score, r.performance,
      coalesce(r.metrics, '{}'::jsonb), coalesce(r.quality_flags, '{}'), r.rating_before,
      r.rating_after, r.rd_after, r.created_by, coalesce(r.created_at, now())
    from jsonb_populate_recordset(null::public.activity_runs, p_rows) r
    where exists (select 1 from public.patients p where p.id = r.patient_id and p.org_id = p_org)
    on conflict do nothing;
  elsif p_table = 'activity_run_events' then
    insert into public.activity_run_events (run_id, org_id, payload, encoding, pinned, created_at)
    select r.run_id, p_org, r.payload, coalesce(r.encoding, 'deflate-json-v1'), coalesce(r.pinned, false), coalesce(r.created_at, now())
    from jsonb_populate_recordset(null::public.activity_run_events, p_rows) r
    where exists (select 1 from public.activity_runs a where a.id = r.run_id and a.org_id = p_org)
    on conflict do nothing;
  elsif p_table = 'patient_ability' then
    insert into public.patient_ability (patient_id, activity_id, org_id, rating, rd, n_runs, locked,
      locked_difficulty, last_run_at, updated_at)
    select r.patient_id, r.activity_id, p_org, r.rating, r.rd, coalesce(r.n_runs, 0), coalesce(r.locked, false), r.locked_difficulty,
      r.last_run_at, coalesce(r.updated_at, now())
    from jsonb_populate_recordset(null::public.patient_ability, p_rows) r
    where exists (select 1 from public.patients p where p.id = r.patient_id and p.org_id = p_org)
    on conflict do nothing;
  else
    raise exception 'unknown table %', p_table using errcode = '22023';
  end if;

  get diagnostics v_count = row_count;
  perform set_config('app.restoring', 'off', true);
  return v_count;
end $$;

grant insert (name_enc), update (name_enc) on public.patients to authenticated;
grant update (name_key) on public.organizations to authenticated;
revoke execute on function public.rekey_patient_names(uuid, jsonb, jsonb), public.reset_patient_names(uuid) from public, anon;
grant execute on function public.rekey_patient_names(uuid, jsonb, jsonb), public.reset_patient_names(uuid) to authenticated;
revoke execute on function app.guard_name_key() from public, anon, authenticated;
