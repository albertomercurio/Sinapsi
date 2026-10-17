-- =============================================================================
-- Sinapsi · clinical schema: patients (pseudonymous), sessions, activity runs,
-- raw event logs, ability ratings.
--
-- Pseudonymization rules enforced by the schema itself:
--   * there are NO name / surname / tax-code / date-of-birth columns;
--   * patient codes are generated server-side and must match ^[A-Z]{1,4}-[A-Z0-9]{4,8}$,
--     so a name can never be stored as a code;
--   * only birth year, schooling years, sex and handedness are kept.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Unambiguous alphabet (no 0/O, 1/I/L, U).
create function app.random_code(n integer) returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('23456789ABCDEFGHJKMNPQRSTVWXYZ', 1 + floor(random() * 30)::int, 1), '')
  from generate_series(1, n)
$$;

-- Child rows always inherit org_id from their parent; the client can never choose it.
create function app.inherit_org_from_patient() returns trigger
language plpgsql set search_path = '' as $$
begin
  select p.org_id into new.org_id from public.patients p where p.id = new.patient_id;
  if new.org_id is null then
    raise exception 'patient not accessible' using errcode = '42501';
  end if;
  return new;
end $$;

create function app.inherit_org_from_session() returns trigger
language plpgsql set search_path = '' as $$
begin
  select s.org_id into new.org_id from public.sessions s where s.id = new.session_id;
  if new.org_id is null then
    raise exception 'session not accessible' using errcode = '42501';
  end if;
  return new;
end $$;

create function app.inherit_org_from_run() returns trigger
language plpgsql set search_path = '' as $$
begin
  select r.org_id into new.org_id from public.activity_runs r where r.id = new.run_id;
  if new.org_id is null then
    raise exception 'run not accessible' using errcode = '42501';
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Patients
-- -----------------------------------------------------------------------------

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  code text not null check (code ~ '^[A-Z]{1,4}-[A-Z0-9]{4,8}$'),
  birth_year integer check (birth_year between 1900 and 2100),
  sex text check (sex in ('F', 'M', 'X')),
  education_years integer check (education_years between 0 and 30),
  handedness text check (handedness in ('right', 'left', 'ambi')),
  content_locale text not null default 'it' check (content_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  -- theme (standard|kids), font_scale, high_contrast, reduced_motion, audio, show_timer
  ui_prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(ui_prefs) = 'object'),
  -- target probability of success used by the adaptive engine
  target_success numeric(3, 2) not null default 0.75 check (target_success between 0.5 and 0.95),
  notes text check (char_length(notes) <= 4000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (org_id, code)
);
create index patients_org_active_idx on public.patients (org_id) where archived_at is null;

create function app.patients_before_insert() returns trigger
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
  loop
    v_code := v_prefix || '-' || app.random_code(case when v_try < 20 then 4 else 6 end);
    exit when not exists (
      select 1 from public.patients p where p.org_id = new.org_id and p.code = v_code
    );
    v_try := v_try + 1;
  end loop;
  new.code := v_code;
  new.created_by := coalesce(new.created_by, (select auth.uid()));
  return new;
end $$;

create trigger patients_code before insert on public.patients
  for each row execute function app.patients_before_insert();
create trigger patients_touch before update on public.patients
  for each row execute function app.touch_updated_at();

create table public.patient_conditions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  category text not null check (category ~ '^[a-z_.]{2,60}$'),
  icd11_code text check (icd11_code ~ '^[0-9A-Z.&/-]{2,20}$'),
  onset_year integer check (onset_year between 1900 and 2100),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index patient_conditions_patient_idx on public.patient_conditions (patient_id);

create trigger a_inherit_org before insert on public.patient_conditions
  for each row execute function app.inherit_org_from_patient();

-- -----------------------------------------------------------------------------
-- Sessions
-- -----------------------------------------------------------------------------

create type public.session_mode as enum ('clinic', 'home');
create type public.session_status as enum ('planned', 'in_progress', 'completed', 'cancelled');

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  -- [{activity_id, difficulty|null, locked, config}]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_templates_org_idx on public.session_templates (org_id);
create trigger session_templates_touch before update on public.session_templates
  for each row execute function app.touch_updated_at();

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text check (char_length(title) <= 120),
  mode public.session_mode not null default 'clinic',
  scheduled_for date not null default current_date,
  status public.session_status not null default 'planned',
  started_at timestamptz,
  completed_at timestamptz,
  template_id uuid references public.session_templates (id) on delete set null,
  notes text check (char_length(notes) <= 2000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_patient_idx on public.sessions (patient_id, scheduled_for desc);
create index sessions_org_date_idx on public.sessions (org_id, scheduled_for);

create trigger a_inherit_org before insert on public.sessions
  for each row execute function app.inherit_org_from_patient();
create trigger sessions_touch before update on public.sessions
  for each row execute function app.touch_updated_at();

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  position integer not null check (position >= 0),
  activity_id text not null check (activity_id ~ '^[a-z0-9-]{2,40}$'),
  -- NULL = adaptive (the engine picks the difficulty from the ability rating)
  difficulty numeric(4, 2) check (difficulty between 1 and 5),
  locked boolean not null default false,
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now()
);
create index session_items_session_idx on public.session_items (session_id, position);

create trigger a_inherit_org before insert on public.session_items
  for each row execute function app.inherit_org_from_session();

-- -----------------------------------------------------------------------------
-- Activity runs (summary metrics are kept forever; raw events expire)
-- -----------------------------------------------------------------------------

create table public.activity_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  session_item_id uuid references public.session_items (id) on delete set null,
  activity_id text not null check (activity_id ~ '^[a-z0-9-]{2,40}$'),
  activity_version integer not null check (activity_version > 0),
  scoring_version integer not null check (scoring_version > 0),
  difficulty numeric(4, 2) not null check (difficulty between 1 and 5),
  seed bigint not null,
  config jsonb not null default '{}'::jsonb,
  -- input type, screen size, refresh rate: never a user agent string
  device jsonb not null default '{}'::jsonb,
  mode public.session_mode not null default 'clinic',
  started_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  score numeric(5, 2) check (score between 0 and 100),
  performance numeric(5, 4) check (performance between 0 and 1),
  metrics jsonb not null default '{}'::jsonb,
  quality_flags text[] not null default '{}',
  rating_before numeric(7, 2),
  rating_after numeric(7, 2),
  rd_after numeric(6, 2),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index activity_runs_patient_idx on public.activity_runs (patient_id, activity_id, started_at);
create index activity_runs_org_idx on public.activity_runs (org_id, started_at desc);
create index activity_runs_session_idx on public.activity_runs (session_id);

create trigger a_inherit_org before insert on public.activity_runs
  for each row execute function app.inherit_org_from_patient();

create table public.activity_run_events (
  run_id uuid primary key references public.activity_runs (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  payload bytea not null check (octet_length(payload) <= 262144),
  encoding text not null default 'deflate-json-v1' check (encoding ~ '^[a-z0-9-]{3,30}$'),
  pinned boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index activity_run_events_expiry_idx on public.activity_run_events (expires_at) where not pinned;

create function app.run_events_set_expiry() returns trigger
language plpgsql set search_path = '' as $$
begin
  select now() + make_interval(months => o.raw_retention_months)
    into new.expires_at
    from public.organizations o where o.id = new.org_id;
  return new;
end $$;

create trigger a_inherit_org before insert on public.activity_run_events
  for each row execute function app.inherit_org_from_run();
create trigger b_set_expiry before insert on public.activity_run_events
  for each row execute function app.run_events_set_expiry();

-- Ability rating per patient × activity (Glicko-style: rating + rating deviation).
create table public.patient_ability (
  patient_id uuid not null references public.patients (id) on delete cascade,
  activity_id text not null check (activity_id ~ '^[a-z0-9-]{2,40}$'),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rating numeric(7, 2) not null,
  rd numeric(6, 2) not null check (rd > 0),
  n_runs integer not null default 0,
  locked boolean not null default false,
  locked_difficulty numeric(4, 2) check (locked_difficulty between 1 and 5),
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (patient_id, activity_id)
);

create trigger a_inherit_org before insert on public.patient_ability
  for each row execute function app.inherit_org_from_patient();

-- -----------------------------------------------------------------------------
-- Audit triggers
-- -----------------------------------------------------------------------------

create trigger patients_audit after insert or update or delete on public.patients
  for each row execute function app.audit_row();
create trigger patient_conditions_audit after insert or update or delete on public.patient_conditions
  for each row execute function app.audit_row();
create trigger sessions_audit after insert or update or delete on public.sessions
  for each row execute function app.audit_row();
create trigger session_templates_audit after insert or update or delete on public.session_templates
  for each row execute function app.audit_row();
create trigger activity_runs_audit after insert or delete on public.activity_runs
  for each row execute function app.audit_row();
create trigger patient_ability_audit after update of locked, locked_difficulty on public.patient_ability
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS: organization members only, second factor required, no admin bypass.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'patient_conditions', 'session_templates', 'sessions', 'session_items',
    'activity_runs', 'activity_run_events', 'patient_ability'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy mfa_required on public.%I as restrictive for all to authenticated '
      'using ((select app.mfa_ok())) with check ((select app.mfa_ok()))', t);
    execute format(
      'create policy member_read on public.%I for select to authenticated '
      'using (org_id = any ((select app.my_org_ids())::uuid[]))', t);
    execute format(
      'create policy member_insert on public.%I for insert to authenticated '
      'with check (org_id = any ((select app.my_org_ids())::uuid[]))', t);
    execute format(
      'create policy member_update on public.%I for update to authenticated '
      'using (org_id = any ((select app.my_org_ids())::uuid[])) '
      'with check (org_id = any ((select app.my_org_ids())::uuid[]))', t);
  end loop;
end $$;

-- Deleting a patient or a result is irreversible: owners only.
create policy owner_delete on public.patients for delete to authenticated
  using (org_id = any ((select app.my_owned_org_ids())::uuid[]));
create policy owner_delete on public.activity_runs for delete to authenticated
  using (org_id = any ((select app.my_owned_org_ids())::uuid[]));
-- Other clinical rows can be removed by any member of the organization.
create policy member_delete on public.patient_conditions for delete to authenticated
  using (org_id = any ((select app.my_org_ids())::uuid[]));
create policy member_delete on public.session_templates for delete to authenticated
  using (org_id = any ((select app.my_org_ids())::uuid[]));
create policy member_delete on public.sessions for delete to authenticated
  using (org_id = any ((select app.my_org_ids())::uuid[]));
create policy member_delete on public.session_items for delete to authenticated
  using (org_id = any ((select app.my_org_ids())::uuid[]));

-- -----------------------------------------------------------------------------
-- RPCs (security invoker: RLS applies to everything they touch)
-- -----------------------------------------------------------------------------

-- Saves a finished run, its compressed raw events and the updated ability
-- rating in a single transaction.
create function public.record_activity_run(
  p_run jsonb,
  p_events bytea default null,
  p_ability jsonb default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  r public.activity_runs;
begin
  r := jsonb_populate_record(null::public.activity_runs, p_run);

  insert into public.activity_runs (
    patient_id, session_id, session_item_id, activity_id, activity_version, scoring_version,
    difficulty, seed, config, device, mode, started_at, duration_ms, score, performance,
    metrics, quality_flags, rating_before, rating_after, rd_after
  ) values (
    r.patient_id, r.session_id, r.session_item_id, r.activity_id, r.activity_version,
    r.scoring_version, r.difficulty, r.seed, coalesce(r.config, '{}'::jsonb),
    coalesce(r.device, '{}'::jsonb), coalesce(r.mode, 'clinic'), r.started_at, r.duration_ms,
    r.score, r.performance, coalesce(r.metrics, '{}'::jsonb), coalesce(r.quality_flags, '{}'),
    r.rating_before, r.rating_after, r.rd_after
  ) returning id into v_id;

  if p_events is not null then
    insert into public.activity_run_events (run_id, payload) values (v_id, p_events);
  end if;

  if p_ability is not null then
    insert into public.patient_ability as pa (patient_id, activity_id, rating, rd, n_runs, last_run_at)
    values (
      r.patient_id, r.activity_id, (p_ability ->> 'rating')::numeric, (p_ability ->> 'rd')::numeric,
      1, now()
    )
    on conflict (patient_id, activity_id) do update
      set rating = excluded.rating,
          rd = excluded.rd,
          n_runs = pa.n_runs + 1,
          last_run_at = excluded.last_run_at,
          updated_at = now();
  end if;

  return v_id;
end $$;

-- Creates a session and its ordered items atomically.
create function public.create_session(
  p_patient uuid,
  p_items jsonb,
  p_title text default null,
  p_mode public.session_mode default 'clinic',
  p_date date default current_date,
  p_template uuid default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'a session needs at least one activity' using errcode = '22023';
  end if;

  insert into public.sessions (patient_id, title, mode, scheduled_for, template_id)
  values (p_patient, p_title, p_mode, p_date, p_template)
  returning id into v_id;

  insert into public.session_items (session_id, position, activity_id, difficulty, locked, config)
  select v_id,
         (t.ord - 1)::integer,
         t.e ->> 'activity_id',
         nullif(t.e ->> 'difficulty', '')::numeric,
         coalesce((t.e ->> 'locked')::boolean, false),
         coalesce(t.e -> 'config', '{}'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as t (e, ord);

  return v_id;
end $$;

-- Replaces the activities of a session that has not started yet.
create function public.replace_session_items(p_session uuid, p_items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_status public.session_status;
begin
  select s.status into v_status from public.sessions s where s.id = p_session;
  if v_status is null then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if v_status <> 'planned' then
    raise exception 'only planned sessions can be edited' using errcode = '22023';
  end if;
  delete from public.session_items where session_id = p_session;
  insert into public.session_items (session_id, position, activity_id, difficulty, locked, config)
  select p_session,
         (t.ord - 1)::integer,
         t.e ->> 'activity_id',
         nullif(t.e ->> 'difficulty', '')::numeric,
         coalesce((t.e ->> 'locked')::boolean, false),
         coalesce(t.e -> 'config', '{}'::jsonb)
  from jsonb_array_elements(p_items) with ordinality as t (e, ord);
end $$;

-- Hard delete (GDPR art. 17). The caller must retype the patient code.
create function public.delete_patient(p_patient uuid, p_confirm_code text) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_code text;
begin
  select p.code into v_code from public.patients p where p.id = p_patient;
  if v_code is null then
    raise exception 'patient not found' using errcode = 'P0002';
  end if;
  if v_code <> upper(btrim(p_confirm_code)) then
    raise exception 'confirmation code does not match' using errcode = '22023';
  end if;
  delete from public.patients where id = p_patient;
  if not found then
    raise exception 'only organization owners can delete patients' using errcode = '42501';
  end if;
end $$;

-- Explicit audit entries for actions that do not modify rows (exports, backups).
create function public.log_event(
  p_org uuid,
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (app.mfa_ok() and app.is_org_member(p_org)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_action not in ('export', 'backup_export', 'backup_restore', 'print_report', 'csv_export') then
    raise exception 'invalid audit action' using errcode = '22023';
  end if;
  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, details)
  values (p_org, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- -----------------------------------------------------------------------------
-- Retention of raw event logs (summary metrics are never purged automatically)
-- -----------------------------------------------------------------------------

create function app.purge_expired_run_events() returns integer
language sql security definer set search_path = '' as $$
  with d as (
    delete from public.activity_run_events
    where not pinned and expires_at < now()
    returning 1
  )
  select count(*)::integer from d
$$;

create extension if not exists pg_cron;

select cron.schedule(
  'sinapsi-purge-run-events',
  '23 3 * * *',
  $$select app.purge_expired_run_events()$$
);
