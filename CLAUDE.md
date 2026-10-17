# Sinapsi — notes for coding agents

Cognitive-rehabilitation SPA (Vue 3 + Vite + TS) on Supabase (eu-central-1). Health data under
GDPR: read `docs/architecture.md` (security model) before touching data access.

## Commands
- `pnpm dev` (needs `pnpm exec supabase start` + `.env.local`), `pnpm build`, `pnpm preview`
- Checks: `pnpm typecheck && pnpm lint && pnpm test && pnpm i18n:check`
- DB: migrations in `supabase/migrations`, security tests `pnpm test:db`, types `pnpm db:types`
- E2E: `pnpm test:e2e` (resets the local DB; runs on `vite preview` with production headers)
- Demo data (local only): `pnpm demo:seed`

## Rules that must not be broken
- Never add patient-identifying columns (names, tax code, full date of birth).
- Every new table: RLS + the restrictive `mfa_required` policy + explicit grants in the grants
  migration; platform admins get no policy on clinical tables. Add pgTAP tests.
- No third-party network calls from the browser (CSP `connect-src` = self + Supabase). No analytics.
- Metrics and trends compare a patient only with their own history — no norms, no diagnoses.
- Activities are pure (`logic.ts`, seeded RNG) with unit tests; bump `scoringVersion` when scoring
  changes; `performance` is calibrated so the level's expected standard ≈ 0.75.
- UI strings go in `locales/it.json` + `en.json` (Italian is the reference); run `pnpm i18n:check`.
- Charts: follow the dataviz rules (one axis, table view, fixed palette order in `results/charts/theme.ts`).
