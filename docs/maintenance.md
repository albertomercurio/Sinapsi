# Maintenance (platform admin)

What to do after go-live ([deployment.md](deployment.md)), so the platform stays up, current and
backed up. Most of it is automatic; the manual part is about 15 minutes a month.

## At a glance

| When | What | How you notice problems |
|---|---|---|
| Every day, 20:30 (automatic) | Encrypted database backup on your Mac | macOS notification on failure; `scripts/backup-schedule.sh status` |
| Every 3 days (automatic) | Keep-alive ping, so Supabase never pauses the free project | GitHub e-mails you if the workflow fails or is disabled |
| On every push to `main` (automatic) | Cloudflare builds and publishes the site | Cloudflare e-mails you if a build fails |
| Monthly (~15 min) | Merge the Dependabot pull requests; read Supabase/Cloudflare e-mails; glance at **Amministrazione** (database size) and the backup status | — |
| Every 6 months | Test-restore a backup; review accounts (remove people who left) | — |
| Yearly | Review the GDPR documents (record of processing, DPIA, sub-processors) with the practice owner | — |

## How a change goes live

1. Start from an up-to-date `main` on a new branch: `git switch main && git pull && git switch -c fix/short-name`.
2. Work locally against the local stack (never against production):
   - `pnpm exec supabase start` (Docker Desktop running)
   - `pnpm demo:seed` for realistic fake data
   - `pnpm dev`
3. Run the checks:
   - `pnpm typecheck && pnpm lint && pnpm test && pnpm i18n:check`
   - `pnpm test:db`
   - `pnpm test:e2e` (resets the local database; set `E2E_PORT=4174` if port 4173 is busy)
4. Push the branch and open a pull request. CI runs the same checks; wait for green.
5. **If the pull request adds a file in `supabase/migrations/`**, apply it to production *before*
   merging:

   ```bash
   pnpm exec supabase db push
   ```

   It lists the pending migrations and asks for confirmation. Write migrations so the version
   currently online keeps working: add tables and columns first, and remove old ones only in a later
   release. Take a backup first (`scripts/backup-schedule.sh run-now`).
6. **If `supabase/functions/admin-accounts/` changed**:

   ```bash
   pnpm exec supabase functions deploy admin-accounts
   ```

7. Merge the pull request. Cloudflare publishes `main` in about a minute. Open tabs pick up the new
   version on the next page change (the app reloads itself once if a page of the old version is
   gone).
8. Open the site and check the changed screen.

**Something broke?** In Cloudflare, open *Workers & Pages → sinapsi → Deployments* and roll back to
the previous version; it is instant. Database migrations are not undone by a rollback. Fix forward
with a new migration, or restore from a backup (below).

**Production auth settings live in the Supabase dashboard**, not in `supabase/config.toml`; that
file only configures the local stack. If you change sign-in settings locally, repeat the change in
the dashboard (see deployment.md §1).

## Dependency updates

- Dependabot (`.github/dependabot.yml`) opens grouped pull requests once a month: one for npm
  minor and patch updates, one for GitHub Actions. If CI is green, merge.
- Major versions arrive as separate pull requests. Read the changelog, run the app locally and click
  through the main screens (`pnpm demo:seed`, then `pnpm dev`). Merge only if everything works.
- Security alerts appear under *GitHub → Security*. Enable *Dependabot security updates* in
  *Settings → Code security*.
- The Node.js version is set in three places: `engines` in `package.json`, CI
  (`.github/workflows/ci.yml`) and Cloudflare (`NODE_VERSION`). Change all three together.

## Supabase

- **Free-plan limits:**
  - 500 MB database: *Amministrazione* shows the usage. Detailed recordings are the largest part;
    shorten their retention per practice in *Impostazioni → Studio* if needed.
  - 50,000 monthly active users and 500,000 Edge Function calls, far above what is needed here.
- **Upgrades:** Supabase occasionally e-mails about Postgres upgrades or deprecations.
  1. Take a backup (`scripts/backup-schedule.sh run-now`).
  2. Apply the upgrade from the dashboard, ideally in the evening. On Free it causes a few minutes of
     downtime.
- **Paused project:** if the keep-alive ever stops, Supabase pauses the project after a week without
  activity. Fix: *Dashboard → Restore project*, then re-run *Actions → Keep Supabase awake*. Data is
  kept.
- **Security Advisor:** after each new migration, open *Database → Advisors → Security Advisor*. It
  should report no exposed tables.

## Accounts

All from **Amministrazione** in Sinapsi (as platform admin, after your own 2FA). Every action is
recorded in the practice's activity log.

- **New colleague in the same practice:** *Gestisci → Invita*. Choose *Link da inviare io* and send
  the one-time link (valid 24 h) personally. The practice owner can also do this herself.
- **Colleague with their own practice:** *Nuovo studio*. They are a separate data controller, so
  first sign a separate art. 28 agreement with them (`docs/gdpr/accordo-art28.md`).
- **Forgotten password:** the key button next to the person → new-password link. They still need
  their 2FA code to use it.
- **Lost or changed phone (2FA):** the shield button → reset 2FA. They enroll a new authenticator at
  the next sign-in. Confirm the request by phone or in person first.
- **Someone leaves:** the trash button removes them from the practice. To delete the login entirely:
  *Supabase → Authentication → Users*.
- **Forgotten passphrase for patient names:** nobody can recover it, by design: names are encrypted
  in the browser. The owner can reset names (*Impostazioni → Studio*) and re-enter them; codes and
  results are not affected.

## Backups

- Check `scripts/backup-schedule.sh status` once a month. It shows the last backup and the next
  run.
- **Restore test, every 6 months:**
  1. Decrypt a backup with the private key you keep offline:
     `age -d -i <private-key> <file> > dump`.
  2. Load it into the local stack: `pg_restore --no-owner -d postgresql://postgres:postgres@127.0.0.1:54322/postgres dump`.
  3. Sign in locally and check that the data is there.
- **Real restore in production** (data lost or corrupted):
  1. Put the site in a known state: roll back Cloudflare if a deployment caused the problem.
  2. Restore the latest good dump with `pg_restore --clean --no-owner -d <production session-pooler URL> dump`.
  3. Practices can also restore their own copy: *Impostazioni → Privacy e backup*.
  4. Tell the practice owner what was lost between the backup and the incident.

## Incidents

- **Site unreachable:** check the Cloudflare and Supabase status pages, then the last Cloudflare
  deployment (roll back if needed), then whether the Supabase project is paused.
- **Suspected account compromise** (stolen laptop, leaked password):
  1. Reset that person's 2FA and send a new-password link.
  2. In *Supabase → Authentication → Users*, sign the user out of all sessions.
  3. Tell the practice owner **immediately**. As the controller she must assess the breach and, if
     needed, notify the Garante within 72 hours. Follow `docs/gdpr/violazione-dati.md`; as processor
     you must inform her without undue delay.
- **Leaked secret in the repository:** GitHub push protection should block it. If one gets through,
  revoke and replace it first (Supabase → *Settings → API keys*), then remove it from the history.

## If someone else takes over

Transfer ownership of the Supabase organization, the Cloudflare account and the GitHub repository.
Move the backup schedule and the offline private key to the new admin's machine. Update the
sub-processor list and the art. 28 agreements with each practice, because the processor changes.
