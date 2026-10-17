-- =============================================================================
-- RPC behaviour: record_activity_run, create_session, delete_patient, retention.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, aud, role) values
  ('d0000000-0000-4000-8000-000000000001', 'owner-d@test', 'authenticated', 'authenticated');
insert into public.organizations (id, name, raw_retention_months) values
  ('d1000000-0000-4000-8000-000000000000', 'Org D', 1);
insert into public.memberships (org_id, user_id, role) values
  ('d1000000-0000-4000-8000-000000000000', 'd0000000-0000-4000-8000-000000000001', 'owner');
insert into public.patients (id, org_id, birth_year) values
  ('d2000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000000', 1955);

set local role authenticated;
set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';

select lives_ok($$
  select public.create_session(
    'd2000000-0000-4000-8000-000000000001',
    '[{"activity_id":"go-no-go"},{"activity_id":"memory-pairs","difficulty":2,"locked":true}]'::jsonb,
    'Seduta 1')
$$, 'create_session works');
select is((select count(*) from public.session_items), 2::bigint, 'create_session inserts ordered items');
select is((select difficulty from public.session_items where position = 1), 2.00::numeric(4,2), 'item difficulty kept');
select throws_ok($$
  select public.create_session('d2000000-0000-4000-8000-000000000001', '[]'::jsonb)
$$, '22023', null, 'empty sessions are rejected');

select lives_ok($$
  select public.record_activity_run(
    jsonb_build_object(
      'patient_id', 'd2000000-0000-4000-8000-000000000001',
      'activity_id', 'go-no-go', 'activity_version', 1, 'scoring_version', 1,
      'difficulty', 2.4, 'seed', 99, 'started_at', now(), 'duration_ms', 90000,
      'score', 72.5, 'performance', 0.725, 'metrics', '{"dprime": 2.1}'::jsonb,
      'quality_flags', '{}'::text[]),
    '\x00ff'::bytea,
    '{"rating": 1520.5, "rd": 180}'::jsonb)
$$, 'record_activity_run stores run, events and ability');
select is((select rating from public.patient_ability), 1520.50::numeric(7,2), 'ability inserted');
select lives_ok($$
  select public.record_activity_run(
    jsonb_build_object(
      'patient_id', 'd2000000-0000-4000-8000-000000000001',
      'activity_id', 'go-no-go', 'activity_version', 1, 'scoring_version', 1,
      'difficulty', 2.6, 'seed', 100, 'started_at', now(), 'duration_ms', 90000, 'score', 80),
    null, '{"rating": 1560, "rd": 150}'::jsonb)
$$, 'second run updates ability');
select is((select n_runs from public.patient_ability), 2, 'n_runs incremented on conflict');

select throws_ok($$
  select public.delete_patient('d2000000-0000-4000-8000-000000000001', 'WRONG-CODE')
$$, '22023', null, 'delete_patient requires the exact code');

reset role;
-- Expire the raw events and purge.
-- Only this test's rows expire, so other data in the database (e.g. demo seed) does not matter.
update public.activity_run_events set expires_at = now() - interval '1 day'
  where run_id in (select id from public.activity_runs
                   where patient_id = 'd2000000-0000-4000-8000-000000000001');
select is(app.purge_expired_run_events(), 1, 'retention job purges expired raw events');
select is((select count(*) from public.activity_runs
           where patient_id = 'd2000000-0000-4000-8000-000000000001'),
          2::bigint, 'summary runs survive the purge');

set local role authenticated;
set local request.jwt.claims to '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select lives_ok($$
  select public.delete_patient('d2000000-0000-4000-8000-000000000001',
    (select code from public.patients where id = 'd2000000-0000-4000-8000-000000000001'))
$$, 'owner hard-deletes a patient after retyping the code');

select * from finish();
rollback;
