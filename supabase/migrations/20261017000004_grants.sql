-- =============================================================================
-- Sinapsi · Data API grants, in one place so they are easy to audit.
--
-- Starts from zero (revokes whatever the platform defaults granted), then grants
-- the minimum each role needs. `anon` can only call ping(). Column-level grants
-- stop the client from writing server-controlled columns (org_id, code,
-- created_by, timestamps).
-- =============================================================================

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema app from public, anon, authenticated;

-- --- helpers used inside RLS policies -----------------------------------------
grant execute on function
  app.mfa_ok(),
  app.is_platform_admin(),
  app.my_org_ids(),
  app.my_owned_org_ids(),
  app.is_org_member(uuid),
  app.is_org_owner(uuid),
  app.random_code(integer)
to authenticated;

-- --- core ---------------------------------------------------------------------
grant select on public.platform_admins to authenticated;

grant select, insert, delete on public.organizations to authenticated;
grant update (name, patient_code_prefix, idle_timeout_min, raw_retention_months)
  on public.organizations to authenticated;

grant select, insert, delete on public.memberships to authenticated;
grant update (role) on public.memberships to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, ui_locale) on public.profiles to authenticated;

grant select on public.audit_log to authenticated;

-- --- clinical -----------------------------------------------------------------
grant select, delete on public.patients to authenticated;
grant insert (org_id, birth_year, sex, education_years, handedness, content_locale, ui_prefs,
              target_success, notes)
  on public.patients to authenticated;
grant update (birth_year, sex, education_years, handedness, content_locale, ui_prefs,
              target_success, notes, archived_at)
  on public.patients to authenticated;

grant select, delete on public.patient_conditions to authenticated;
grant insert (patient_id, category, icd11_code, onset_year, notes)
  on public.patient_conditions to authenticated;
grant update (category, icd11_code, onset_year, notes)
  on public.patient_conditions to authenticated;

grant select, delete on public.session_templates to authenticated;
grant insert (org_id, title, description, items) on public.session_templates to authenticated;
grant update (title, description, items) on public.session_templates to authenticated;

grant select, delete on public.sessions to authenticated;
grant insert (patient_id, title, mode, scheduled_for, template_id, notes)
  on public.sessions to authenticated;
grant update (title, mode, scheduled_for, status, started_at, completed_at, notes)
  on public.sessions to authenticated;

grant select, delete on public.session_items to authenticated;
grant insert (session_id, position, activity_id, difficulty, locked, config)
  on public.session_items to authenticated;
grant update (position, difficulty, locked, config) on public.session_items to authenticated;

-- Runs are immutable once written.
grant select, delete on public.activity_runs to authenticated;
grant insert (patient_id, session_id, session_item_id, activity_id, activity_version,
              scoring_version, difficulty, seed, config, device, mode, started_at, duration_ms,
              score, performance, metrics, quality_flags, rating_before, rating_after, rd_after)
  on public.activity_runs to authenticated;

grant select on public.activity_run_events to authenticated;
grant insert (run_id, payload, encoding) on public.activity_run_events to authenticated;
grant update (pinned) on public.activity_run_events to authenticated;

grant select on public.patient_ability to authenticated;
grant insert (patient_id, activity_id, rating, rd, n_runs, last_run_at, locked, locked_difficulty)
  on public.patient_ability to authenticated;
grant update (rating, rd, n_runs, last_run_at, locked, locked_difficulty, updated_at)
  on public.patient_ability to authenticated;

-- --- RPCs -----------------------------------------------------------------------
grant execute on function public.ping() to anon, authenticated;
grant execute on function
  public.my_context(),
  public.org_members(uuid),
  public.record_activity_run(jsonb, bytea, jsonb),
  public.create_session(uuid, jsonb, text, public.session_mode, date, uuid),
  public.replace_session_items(uuid, jsonb),
  public.delete_patient(uuid, text),
  public.log_event(uuid, text, text, uuid, jsonb),
  public.admin_overview(),
  public.admin_storage()
to authenticated;

-- service_role (Edge Functions, admin scripts) bypasses RLS by design.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on all functions in schema app to service_role;
