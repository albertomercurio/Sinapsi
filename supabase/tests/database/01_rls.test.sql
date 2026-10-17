-- =============================================================================
-- Security tests for the access rules (RLS + grants). Run: pnpm test:db
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(32);

-- ---------------------------------------------------------------- fixtures --
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 'owner-a@test', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'therapist-a@test', 'authenticated', 'authenticated'),
  ('b0000000-0000-4000-8000-000000000001', 'owner-b@test', 'authenticated', 'authenticated'),
  ('c0000000-0000-4000-8000-000000000001', 'admin@test', 'authenticated', 'authenticated');

insert into public.organizations (id, name, patient_code_prefix) values
  ('a1000000-0000-4000-8000-000000000000', 'Org A', 'AA'),
  ('b1000000-0000-4000-8000-000000000000', 'Org B', 'BB');

insert into public.memberships (org_id, user_id, role) values
  ('a1000000-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-000000000001', 'owner'),
  ('a1000000-0000-4000-8000-000000000000', 'a0000000-0000-4000-8000-000000000002', 'therapist'),
  ('b1000000-0000-4000-8000-000000000000', 'b0000000-0000-4000-8000-000000000001', 'owner');

insert into public.platform_admins (user_id) values ('c0000000-0000-4000-8000-000000000001');

insert into public.patients (id, org_id, birth_year) values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000000', 1950),
  ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000000', 1960);

insert into public.activity_runs (id, patient_id, activity_id, activity_version, scoring_version,
  difficulty, seed, started_at, duration_ms, score)
values ('a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001',
  'go-no-go', 1, 1, 2.5, 42, now(), 60000, 70);

insert into public.activity_run_events (run_id, payload)
values ('a3000000-0000-4000-8000-000000000001', '\x0102'::bytea);

-- ------------------------------------------------------------ schema rules --
select matches(
  (select code from public.patients where id = 'a2000000-0000-4000-8000-000000000001'),
  '^AA-[A-Z0-9]{4}$',
  'patient code is generated server-side with the organization prefix'
);
select is(
  (select org_id from public.activity_runs where id = 'a3000000-0000-4000-8000-000000000001'),
  'a1000000-0000-4000-8000-000000000000'::uuid,
  'child rows inherit org_id from the patient'
);
select ok(
  (select expires_at > now() + interval '23 months' from public.activity_run_events
    where run_id = 'a3000000-0000-4000-8000-000000000001'),
  'raw events get an expiry from the organization retention setting'
);
select hasnt_column('public', 'patients', 'name', 'patients table has no name column');
select hasnt_column('public', 'patients', 'birth_date', 'patients table has no date of birth');

-- ------------------------------------------------------------------- anon --
set local role anon;
select throws_ok('select count(*) from public.patients', '42501', null, 'anon cannot read patients');
select throws_ok('select count(*) from public.organizations', '42501', null, 'anon cannot read organizations');
select lives_ok('select public.ping()', 'anon can call ping()');
select throws_ok('select public.my_context()', '42501', null, 'anon cannot call my_context()');
reset role;

-- ------------------------------------------------- owner A without 2FA --
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
select is((select count(*) from public.patients), 0::bigint, 'aal1 session sees zero patients');
select is((select count(*) from public.activity_runs), 0::bigint, 'aal1 session sees zero runs');
select is((select count(*) from public.organizations), 0::bigint, 'aal1 session sees zero organizations');
select is(public.my_context(), null, 'my_context() is null without the second factor');
select throws_ok(
  $$insert into public.patients (org_id, birth_year) values ('a1000000-0000-4000-8000-000000000000', 1990)$$,
  '42501', null, 'aal1 session cannot create patients'
);

-- ---------------------------------------------------- owner A with 2FA --
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.patients), 1::bigint, 'owner A sees exactly their own patient');
select is((select count(*) from public.patients where org_id = 'b1000000-0000-4000-8000-000000000000'), 0::bigint,
  'owner A cannot see organization B patients');
select is((select count(*) from public.activity_run_events), 1::bigint, 'owner A sees own raw events');
select throws_ok(
  $$insert into public.patients (org_id, code, birth_year) values ('a1000000-0000-4000-8000-000000000000', 'MARIO-ROSSI', 1990)$$,
  '42501', null, 'client cannot choose the patient code'
);
select throws_ok(
  $$insert into public.patients (org_id, birth_year) values ('b1000000-0000-4000-8000-000000000000', 1990)$$,
  '42501', null, 'owner A cannot create patients in organization B'
);
select throws_ok(
  $$update public.activity_runs set score = 100 where id = 'a3000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'runs are immutable'
);
select throws_ok(
  $$insert into public.audit_log (action, entity) values ('x', 'y')$$,
  '42501', null, 'audit log cannot be written directly'
);
select throws_ok(
  $$delete from public.audit_log$$, '42501', null, 'audit log cannot be deleted'
);
select ok((select count(*) from public.audit_log) > 0, 'owner reads the audit trail of their organization');
select ok(
  (public.my_context() -> 'memberships' -> 0 ->> 'role') = 'owner',
  'my_context() reports the owner role'
);

-- ----------------------------------------------- therapist A with 2FA --
set local request.jwt.claims to '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.patients), 1::bigint, 'therapist A sees organization patients');
select throws_ok(
  $$select public.delete_patient('a2000000-0000-4000-8000-000000000001', (select code from public.patients limit 1))$$,
  '42501', null, 'therapists cannot hard-delete patients'
);
select is((select count(*) from public.audit_log), 0::bigint, 'therapists do not read the audit trail');

-- ------------------------------------------------ platform admin with 2FA --
set local request.jwt.claims to '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.organizations where id in ('a1000000-0000-4000-8000-000000000000', 'b1000000-0000-4000-8000-000000000000')), 2::bigint, 'platform admin sees all organizations');
select is((select count(*) from public.patients), 0::bigint, 'platform admin sees ZERO patients');
select is((select count(*) from public.activity_runs), 0::bigint, 'platform admin sees ZERO runs');
select is((select patients from public.admin_overview() where org_id = 'a1000000-0000-4000-8000-000000000000'), 1::bigint, 'admin_overview() returns aggregates only');

-- ----------------------------------------------- owner B deletes nothing of A --
set local request.jwt.claims to '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
delete from public.patients where id = 'a2000000-0000-4000-8000-000000000001';
reset role;
select is((select count(*) from public.patients where id = 'a2000000-0000-4000-8000-000000000001'), 1::bigint,
  'owner B cannot delete organization A patients');

select * from finish();
rollback;
