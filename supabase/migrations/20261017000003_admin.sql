-- =============================================================================
-- Sinapsi · platform-admin RPCs. They return aggregates only (counts, sizes),
-- never clinical content.
-- =============================================================================

create function public.admin_overview()
returns table (
  org_id uuid,
  name text,
  created_at timestamptz,
  members bigint,
  patients bigint,
  runs bigint,
  raw_event_bytes bigint,
  last_run_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.mfa_ok() and app.is_platform_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select o.id, o.name, o.created_at,
      (select count(*) from public.memberships m where m.org_id = o.id),
      (select count(*) from public.patients p where p.org_id = o.id),
      (select count(*) from public.activity_runs r where r.org_id = o.id),
      (select coalesce(sum(octet_length(e.payload)), 0)::bigint
         from public.activity_run_events e where e.org_id = o.id),
      (select max(r.created_at) from public.activity_runs r where r.org_id = o.id)
    from public.organizations o
    order by o.name;
end $$;

-- Database size, to keep an eye on the Free-plan limit (500 MB).
create function public.admin_storage()
returns table (database_bytes bigint, raw_event_bytes bigint, runs bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.mfa_ok() and app.is_platform_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select pg_database_size(current_database()),
      (select coalesce(sum(octet_length(e.payload)), 0)::bigint from public.activity_run_events e),
      (select count(*) from public.activity_runs);
end $$;
