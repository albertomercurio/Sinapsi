-- =============================================================================
-- Sinapsi · New objects are never exposed by default.
--
-- Supabase can give the Data API roles access to every new table ("Automatically
-- expose new tables" when the project is created). Sinapsi grants access
-- explicitly instead (20261017000004_grants.sql), so remove those defaults: a
-- future table or function stays unreachable from the API until a migration
-- grants it, whatever the dashboard setting.
-- =============================================================================

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- EXECUTE for PUBLIC is a global default and cannot be revoked per schema.
alter default privileges for role postgres
  revoke execute on functions from public;
