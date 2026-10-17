-- =============================================================================
-- Encrypted patient names: only ciphertext accepted, passphrase parameters
-- owner-only, platform admin locked out.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('91000000-0000-4000-8000-000000000001', 'owner-n@test', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000002', 'ther-n@test', 'authenticated', 'authenticated'),
  ('91000000-0000-4000-8000-000000000003', 'admin-n@test', 'authenticated', 'authenticated');
insert into public.organizations (id, name) values ('92000000-0000-4000-8000-000000000000', 'Org N');
insert into public.memberships (org_id, user_id, role) values
  ('92000000-0000-4000-8000-000000000000', '91000000-0000-4000-8000-000000000001', 'owner'),
  ('92000000-0000-4000-8000-000000000000', '91000000-0000-4000-8000-000000000002', 'therapist');
insert into public.platform_admins (user_id) values ('91000000-0000-4000-8000-000000000003');

set local role authenticated;
set local request.jwt.claims to '{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}';
select throws_ok(
  $$insert into public.patients (org_id, name_enc) values ('92000000-0000-4000-8000-000000000000', 'Mario Rossi')$$,
  '23514', null, 'plaintext names are rejected: only v1 ciphertext is accepted');
select lives_ok(
  $$insert into public.patients (org_id, name_enc) values ('92000000-0000-4000-8000-000000000000', 'v1.AAAAAAAAAAAAAAAA.QUJDREVGR0g=')$$,
  'therapist stores an encrypted name');
update public.organizations set name_key = '{"salt":"x","check":"y"}' where id = '92000000-0000-4000-8000-000000000000';
select is((select name_key from public.organizations where id = '92000000-0000-4000-8000-000000000000'), null,
  'therapists cannot set the passphrase parameters (RLS filters the update)');
select throws_ok(
  $$select public.reset_patient_names('92000000-0000-4000-8000-000000000000')$$,
  '42501', null, 'therapists cannot erase the names');

set local request.jwt.claims to '{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}';
select lives_ok(
  $$update public.organizations set name_key = '{"v":1,"salt":"c2FsdA==","iterations":600000,"check":"v1.a.b"}' where id = '92000000-0000-4000-8000-000000000000'$$,
  'owner sets the passphrase parameters');
select ok(public.my_context() -> 'memberships' -> 0 -> 'name_key' ? 'salt', 'my_context() exposes the parameters to members');
select is(
  public.rekey_patient_names('92000000-0000-4000-8000-000000000000', '{"v":1,"salt":"bmV3","iterations":600000,"check":"v1.c.d"}',
    (select jsonb_agg(jsonb_build_object('id', id, 'name_enc', 'v1.BBBBBBBBBBBBBBBB.SUpLTA==')) from public.patients)),
  1, 'owner re-encrypts all names atomically');

set local request.jwt.claims to '{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}';
select is((select count(*) from public.patients where name_enc is not null), 0::bigint, 'platform admin cannot even see the ciphertext');
select throws_ok(
  $$update public.organizations set name_key = null where id = '92000000-0000-4000-8000-000000000000'$$,
  '42501', null, 'platform admin cannot change the passphrase parameters');

select * from finish();
rollback;
