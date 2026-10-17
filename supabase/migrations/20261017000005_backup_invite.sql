-- =============================================================================
-- Sinapsi · encrypted backup restore and invitation helpers.
-- =============================================================================

-- Keep the patient code when restoring a backup. Clients can never send a code
-- (no column privilege), so for them it is always generated.
create or replace function app.patients_before_insert() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_prefix text;
  v_code text;
  v_try integer := 0;
begin
  select o.patient_code_prefix into v_prefix from public.organizations o where o.id = new.org_id;
  if v_prefix is null then
    raise exception 'organization not accessible' using errcode = '42501';
  end if;
  if new.code is null then
    loop
      v_code := v_prefix || '-' || app.random_code(case when v_try < 20 then 4 else 6 end);
      exit when not exists (
        select 1 from public.patients p where p.org_id = new.org_id and p.code = v_code
      );
      v_try := v_try + 1;
    end loop;
    new.code := v_code;
  end if;
  new.created_by := coalesce(new.created_by, (select auth.uid()));
  return new;
end $$;

-- Row-level audit is suspended during a restore (one summary event is logged instead).
create or replace function app.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_changed text[];
  v_org uuid;
  v_id uuid;
  v_details jsonb := '{}'::jsonb;
begin
  if pg_trigger_depth() > 1 or coalesce(current_setting('app.restoring', true), '') = 'on' then
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

/**
 * Restores one table chunk of an (already decrypted) organization backup into
 * the caller's organization. Owners only, second factor required. Original ids
 * and patient codes are preserved; rows that already exist are skipped. Child
 * rows are accepted only if their parent belongs to the target organization, so
 * a backup can never inject rows into another organization.
 */
create function public.restore_rows(p_org uuid, p_table text, p_rows jsonb) returns integer
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

  if p_table = 'patients' then
    insert into public.patients (id, org_id, code, birth_year, sex, education_years, handedness,
      content_locale, ui_prefs, target_success, notes, created_by, created_at, updated_at, archived_at)
    select r.id, p_org, r.code, r.birth_year, r.sex, r.education_years, r.handedness,
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

-- Used by the admin-invite Edge Function (service role only) to find an existing account.
create function public.admin_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;

revoke execute on function public.restore_rows(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.restore_rows(uuid, text, jsonb) to authenticated;
revoke execute on function public.admin_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_user_id_by_email(text) to service_role;
