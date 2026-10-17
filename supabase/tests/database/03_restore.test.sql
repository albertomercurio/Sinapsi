-- =============================================================================
-- Backup restore: codes and ids preserved, no cross-organization injection.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, aud, role) values
  ('e0000000-0000-4000-8000-000000000001', 'owner-e@test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000001', 'owner-f@test', 'authenticated', 'authenticated'),
  ('e0000000-0000-4000-8000-000000000002', 'ther-e@test', 'authenticated', 'authenticated');
insert into public.organizations (id, name) values
  ('e1000000-0000-4000-8000-000000000000', 'Org E'),
  ('f1000000-0000-4000-8000-000000000000', 'Org F');
insert into public.memberships (org_id, user_id, role) values
  ('e1000000-0000-4000-8000-000000000000', 'e0000000-0000-4000-8000-000000000001', 'owner'),
  ('e1000000-0000-4000-8000-000000000000', 'e0000000-0000-4000-8000-000000000002', 'therapist'),
  ('f1000000-0000-4000-8000-000000000000', 'f0000000-0000-4000-8000-000000000001', 'owner');
-- A patient that belongs to org F (the "victim").
insert into public.patients (id, org_id, birth_year) values
  ('f2000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000000', 1940);

set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';

select is(
  public.restore_rows('e1000000-0000-4000-8000-000000000000', 'patients',
    '[{"id":"e2000000-0000-4000-8000-000000000001","code":"PZ-ABCD","birth_year":1950}]'::jsonb),
  1, 'owner restores a patient');
select is((select code from public.patients where id = 'e2000000-0000-4000-8000-000000000001'), 'PZ-ABCD',
  'restored patient keeps its original code');
select is(
  public.restore_rows('e1000000-0000-4000-8000-000000000000', 'patients',
    '[{"id":"e2000000-0000-4000-8000-000000000001","code":"PZ-ABCD","birth_year":1950}]'::jsonb),
  0, 'restoring twice skips existing rows');
select is(
  public.restore_rows('e1000000-0000-4000-8000-000000000000', 'patient_conditions',
    '[{"id":"e3000000-0000-4000-8000-000000000001","patient_id":"f2000000-0000-4000-8000-000000000001","category":"other"}]'::jsonb),
  0, 'a backup cannot attach rows to another organization''s patient');
select throws_ok(
  $$select public.restore_rows('f1000000-0000-4000-8000-000000000000', 'patients', '[]'::jsonb)$$,
  '42501', null, 'cannot restore into an organization you do not own');

set local request.jwt.claims to '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}';
select throws_ok(
  $$select public.restore_rows('e1000000-0000-4000-8000-000000000000', 'patients', '[]'::jsonb)$$,
  '42501', null, 'therapists cannot restore backups');

reset role;
select is((select count(*) from public.audit_log where entity = 'patients' and details ->> 'code' = 'PZ-ABCD'), 0::bigint,
  'row-level audit is suspended during restore');

select * from finish();
rollback;
