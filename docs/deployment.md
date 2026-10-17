# Deployment (Supabase Free in Frankfurt + Cloudflare)

Cost: €0/month on the free tiers. All accounts below are owned by the **platform admin**, who is
the GDPR *processor* for each practice (see `docs/gdpr/`). Turn on 2FA on **every** account.

## 1. Supabase (database, auth, edge function)

1. Create an account (2FA on) and a project on the **Free** plan, region **Central EU (Frankfurt)**
   — `eu-central-1`, *not* the generic "Europe" option, which may place it in London or Zurich.
2. Download the DPA: supabase.com/legal/dpa (it is part of the Terms; keep a signed copy).
3. **Authentication → Sign In / Providers**
   - *Allow new users to sign up*: **off** (Sinapsi is invite-only).
   - Email provider: **on** (needed for sign-in); *Confirm email*: on.
4. **Authentication → Multi-Factor**: TOTP (app authenticator) enabled. It is free on every plan.
5. **Authentication → Policies / Passwords**: minimum length 12, *lowercase, uppercase and digits*.
6. **Authentication → URL Configuration**
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/confirm`
7. **Authentication → Email Templates**: paste `supabase/templates/invite.html` into *Invite user*
   and `supabase/templates/recovery.html` into *Reset password* (they use `token_hash` links).
8. **Authentication → SMTP**: the built-in sender only delivers to your own team members and is
   limited to a couple of e-mails per hour, so invitations need a custom SMTP. Free option:
   **Brevo** (EU company, 300 e-mails/day, DPA in its terms). E-mails contain only the address and a
   one-time link, never health data. Add Brevo to the sub-processor list.
9. Apply the schema (tables, access rules, grants, nightly cleanup job) and deploy the invite function from your computer:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push
   pnpm exec supabase functions deploy admin-invite
   pnpm exec supabase secrets set ALLOWED_ORIGINS=https://<your-domain>
   ```

10. **Database → Advisors**: run the Security Advisor; it should report no exposed tables.
11. **Bootstrap the platform admin** (once): *Authentication → Users → Add user* (your e-mail,
    with a password), then in the SQL editor:

    ```sql
    insert into public.platform_admins (user_id)
    select id from auth.users where email = 'you@example.com';
    ```

    Sign in to Sinapsi, enroll TOTP, open **Amministrazione → Nuovo studio**, create the practice
    and invite its owner. She receives the e-mail, chooses a password and enrolls TOTP.

## 2. Cloudflare (static hosting)

1. Create an account (2FA on). **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
2. Build settings: framework *None*, build command `pnpm build-only`, output directory `dist`.
3. Environment variables (Production): `VITE_SUPABASE_URL=https://<ref>.supabase.co`,
   `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`, `NODE_VERSION=24`.
4. The build emits `dist/_headers` (CSP restricted to your Supabase URL, HSTS, no referrer…).
   Single-page routing works out of the box (no `404.html` → Pages serves `index.html`).
5. Add your custom domain, then set the same domain in Supabase (step 1.6) and `ALLOWED_ORIGINS`.
6. Do **not** enable Web Analytics or other Cloudflare add-ons that inject scripts.

> Vercel works too (Pro plan, because the Hobby plan is non-commercial and its DPA only covers Pro):
> translate `_headers` into `vercel.json` headers and add an SPA rewrite to `/index.html`.

## 3. GitHub

- Repository secrets (*Settings → Secrets and variables → Actions*): `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY` — used only by the keep-alive workflow (`ping()` touches no data).
- *Settings → Code security*: enable **secret scanning** and **push protection** (public repo).
- Run **Actions → Keep Supabase awake → Run workflow** once; the ping should print a timestamp and
  the enable call should succeed. The job runs every 3 days and re-enables itself, because GitHub
  disables scheduled workflows in public repositories after 60 days without commits. GitHub also
  e-mails you if a scheduled workflow is ever disabled.

## 4. Backups (the Free plan has none)

- **Per practice (owner):** *Impostazioni → Privacy e backup → Scarica il backup cifrato* —
  AES-256-GCM in the browser, passphrase known only to her. The dashboard reminds her after 7 days.
- **Whole platform (admin):** `scripts/admin-backup.sh` on your own Mac (FileVault on) with
  `SUPABASE_DB_URL` from *Connect → Session pooler*. Encrypts with `age` (or openssl). Never run it
  in CI: health data must not pass through GitHub.
- Test a restore at least once (into a local stack: `pg_restore` after decrypting).

## 5. Monitoring the free tier

- **Amministrazione** shows the database size against the 500 MB Free limit. Raw event logs are the
  largest part; lower *Conservazione delle registrazioni dettagliate* if needed, or move to Pro.
- If the project is paused anyway (e.g. the workflow was off), *Supabase dashboard → Restore project*.

## Go-live checklist

- [ ] Supabase project in **eu-central-1**, DPA downloaded; Cloudflare and Brevo DPAs accepted.
- [ ] 2FA on Supabase, Cloudflare, GitHub, Brevo and on every Sinapsi account.
- [ ] Sign-ups disabled, password policy set, TOTP enabled, templates and redirect URL configured.
- [ ] `supabase db push` done; Security Advisor clean; `admin-invite` deployed with `ALLOWED_ORIGINS`.
- [ ] Production site served with the security headers (check with the browser dev tools).
- [ ] Keep-alive workflow ran successfully once.
- [ ] Art. 28 agreement signed with the practice owner; `docs/gdpr/` templates reviewed by a DPO or
      lawyer; privacy notice handed to patients (and parents of minors).
- [ ] First encrypted backup downloaded and a test restore done.
- [ ] No real patient data entered before all of the above.
