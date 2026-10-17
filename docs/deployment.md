# Deployment (Supabase Free in Frankfurt + Cloudflare)

Cost: €0/month on the free tiers. All accounts below are owned by the **platform admin**, who is
the GDPR *processor* for each practice (see `docs/gdpr/`). Turn on 2FA on **every** account.
After go-live, see [maintenance.md](maintenance.md) for updates, accounts, backups and incidents.

## 0. A preview first (fake patients only)

There is no separate "demo" hosting: a preview **is** the production setup, used with invented
patients until the go-live checklist at the end is complete.

1. Do sections 1–3 below (about an hour). You can skip SMTP (§1.8) and leave backups (§4) for later.
2. Create her practice and send her the activation link (§1.11).
3. Before she starts, she needs an authenticator app on her phone (Google Authenticator, Microsoft
   Authenticator, 2FAS, Aegis…). Ask her to use only invented patients (write "paziente di prova" in the
   notes field) and no real names.
4. When the GDPR items of the checklist are done, delete the test patients (or keep them) and start
   with real ones. Nothing needs to be reinstalled.

To show it on your own laptop instead, with three months of simulated history for six fake patients:

```bash
pnpm exec supabase start
```

```bash
pnpm demo:seed
```

```bash
pnpm dev
```

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
8. **Authentication → Providers → Email → Email OTP Expiration**: `86400` (24 h), so links sent
   by hand stay valid long enough.
   **E-mail is optional.** By default you create accounts from *Amministrazione* and get a one-time
   link to copy and send yourself, however you like; password-reset links work the same way. If you
   prefer automatic e-mails, configure *Authentication → SMTP* (the built-in sender only reaches your
   own team): **Brevo** is free (300 e-mails/day, EU company, DPA in its terms). E-mails contain only
   the address and a one-time link.
9. Apply the schema (tables, access rules, grants, nightly cleanup job) and deploy the invite function from your computer:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push
   pnpm exec supabase functions deploy admin-accounts
   pnpm exec supabase secrets set ALLOWED_ORIGINS=https://<your-domain> SITE_URL=https://<your-domain>
   ```

10. **Database → Advisors**: run the Security Advisor; it should report no exposed tables.
11. **Bootstrap the platform admin** (once): *Authentication → Users → Add user* (your e-mail,
    with a password), then in the SQL editor:

    ```sql
    insert into public.platform_admins (user_id)
    select id from auth.users where email = 'you@example.com';
    ```

    Sign in to Sinapsi, enroll TOTP, open **Amministrazione → Nuovo studio**, create the practice
    with *Link da inviare io*, and send her the one-time link yourself. She opens it,
    chooses a password and enrolls TOTP. If she later forgets the password or loses her phone, use
    the key / shield buttons next to her name (*Gestisci*) to create a new-password link or reset 2FA.
12. She sets the **practice passphrase** for encrypted patient names in *Impostazioni → Studio*.

## 2. Cloudflare (static hosting)

1. Create an account (2FA on). **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
   The project name becomes the free address `https://<name>.pages.dev`.
2. Build settings: production branch `main`, framework *None*, build command `pnpm build-only`,
   output directory `dist`. Under *Settings → Builds → Branch control*, turn off automatic preview
   deployments for other branches: each one would be another public address that Supabase does not
   allow.
3. Environment variables (Production): `VITE_SUPABASE_URL=https://<ref>.supabase.co`,
   `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`, `NODE_VERSION=24`.
4. The build emits `dist/_headers` (CSP restricted to your Supabase URL, HSTS, no referrer…).
   Single-page routing works out of the box (no `404.html` → Pages serves `index.html`).
5. Use `https://<name>.pages.dev` as `<your-domain>` in Supabase (step 1.6) and in `ALLOWED_ORIGINS` /
   `SITE_URL`. A custom domain is optional (about €10/year); if you add one later, update those three
   places.
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

**Main protection — automatic daily backup on your Mac (admin):**

```bash
brew install libpq age
```

```bash
brew link --force libpq
```

```bash
scripts/backup-schedule.sh setup
```

The setup creates an **age key pair** (the public key stays on the Mac and encrypts backups without
any secret; the **private key** is saved on the Desktop: print it or move it to a USB stick kept
safely, then delete it from the Mac), stores the *Session pooler* connection string in the macOS
Keychain, and installs a launchd job that runs `scripts/admin-backup.sh` **every day at 20:30**
(if the Mac is asleep it runs when it wakes). The newest 30 backups are kept in `~/Sinapsi-backups`
(FileVault on). Check with `scripts/backup-schedule.sh status`. Failures show a macOS notification.

Never run backups in CI: health data must not pass through GitHub.

**Extra copy — per practice (owner):** *Impostazioni → Privacy e backup → Scarica il backup cifrato*
(AES-256-GCM in the browser, passphrase known only to her). The dashboard suggests it once a month.

**Restore test** (do it once): decrypt with `age -d -i <private-key> <file> > dump`, then
`pg_restore --no-owner -d <target-db-url> dump` (e.g. into a local stack).

## 5. Monitoring the free tier

- **Amministrazione** shows the database size against the 500 MB Free limit. Raw event logs are the
  largest part; lower *Conservazione delle registrazioni dettagliate* if needed, or move to Pro.
- If the project is paused anyway (e.g. the workflow was off), *Supabase dashboard → Restore project*.

## Go-live checklist

- [ ] Supabase project in **eu-central-1**, DPA downloaded; Cloudflare DPA accepted (Brevo too, if used).
- [ ] 2FA on Supabase, Cloudflare, GitHub (and Brevo, if used) and on every Sinapsi account.
- [ ] Sign-ups disabled, password policy set, TOTP enabled, templates and redirect URL configured.
- [ ] `supabase db push` done; Security Advisor clean; `admin-accounts` deployed with `ALLOWED_ORIGINS` and `SITE_URL`.
- [ ] Production site served with the security headers (check with the browser dev tools).
- [ ] Keep-alive workflow ran successfully once.
- [ ] Art. 28 agreement signed with the practice owner; `docs/gdpr/` templates reviewed by a DPO or
      lawyer; privacy notice handed to patients (and parents of minors).
- [ ] Daily admin backup scheduled (`scripts/backup-schedule.sh status`), private key stored offline, test restore done.
- [ ] Practice passphrase for encrypted names chosen and stored safely by the owner.
- [ ] No real patient data entered before all of the above.
