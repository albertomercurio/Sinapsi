-- =============================================================================
-- New tables and functions are not exposed to the Data API until granted.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;

select plan(5);

create table public.zz_probe (id int);
create function public.zz_probe_fn() returns int language sql as 'select 1';

select ok(not has_table_privilege('anon', 'public.zz_probe', 'select'),
  'anon gets no access to a new table');
select ok(not has_table_privilege('authenticated', 'public.zz_probe', 'select'),
  'authenticated cannot read a new table');
select ok(not has_table_privilege('authenticated', 'public.zz_probe', 'insert'),
  'authenticated cannot write a new table');
select ok(not has_function_privilege('anon', 'public.zz_probe_fn()', 'execute'),
  'anon cannot call a new function');
select ok(not has_function_privilege('authenticated', 'public.zz_probe_fn()', 'execute'),
  'authenticated cannot call a new function');

select * from finish();
rollback;
