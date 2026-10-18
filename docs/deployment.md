# Deployment (Supabase Free in the EU + Cloudflare)

Cost: €0/month on the free tiers. All accounts below are owned by the **platform admin**, who is
the GDPR *processor* for each practice (see `docs/gdpr/`). Turn on 2FA on **every** account.
After go-live, see [maintenance.md](maintenance.md) for updates, accounts, backups and incidents.

Order: Supabase project (§1.1–1.2) → Cloudflare (§2) → back to Supabase for the site address and the
rest of §1. Each side needs something from the other.

## 0. A preview first (fake patients only)

There is no separate "demo" hosting: a preview **is** the production setup, used with invented
patients until the go-live checklist at the end is complete.

1. Do sections 1–3 below (about an hour). Leave backups (§4) for later.
2. Create her practice and send her the activation link (§1.10).
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

1. Create an account (2FA on) and a project on the **Free** plan:
   - **Region**: the data must stay in an **EU member state**. The general region *Europe* picks a
     region for you and can also land in London or Zurich, which are outside the EU; after creating
     the project, check the region on its home page. Ireland (`eu-west-1`), Frankfurt
     (`eu-central-1`), Paris (`eu-west-3`) and Stockholm (`eu-north-1`) are all fine. If it is
     not one of these, delete the project and create it again (or pick a specific region if the form
     offers one). If the region is not Ireland, set `VITE_SUPABASE_REGION` in §2.
   - **GitHub (optional)**: leave it empty. Migrations are applied by hand (`supabase db push`), so
     nothing reaches the production database without you deciding it.
   - **Security**: untick *Automatically expose new tables*; leave *Enable automatic RLS* off. (The
     migrations set every grant and RLS policy themselves, and also cancel the automatic exposure,
     so a project created with the defaults is safe too.)
   - Keep the database password in your password manager.
2. Note the **Project URL** and the **publishable key** (*Connect* button, or *Project settings →
   API keys*): Cloudflare needs them in §2.
3. Download the DPA: supabase.com/legal/dpa (it is part of the Terms; keep a signed copy).
4. **Authentication → Sign In / Providers**
   - *Allow new users to sign up*: **off** (Sinapsi is invite-only).
   - Email provider: **on** (it is the e-mail + password sign-in, not e-mail sending).
5. **Authentication → Multi-Factor**: TOTP (app authenticator) enabled. It is free on every plan.
6. **Authentication → Policies / Passwords**: minimum length 12, *lowercase, uppercase and digits*.
7. **Authentication → URL Configuration** (with the address from §2):
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/auth/confirm`
8. **Authentication → Providers → Email → Email OTP Expiration**: `86400` (24 h), so the links you
   send by hand stay valid long enough.
9. Apply the schema (tables, access rules, grants, nightly cleanup job) and deploy the account
   function from your computer:

   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push
   pnpm exec supabase functions deploy admin-accounts
   pnpm exec supabase secrets set ALLOWED_ORIGINS=https://<your-domain> SITE_URL=https://<your-domain>
   ```

   Then open **Database → Advisors → Security Advisor**: it should report no exposed tables.
10. **Bootstrap the platform admin** (once): *Authentication → Users → Add user* (your e-mail,
    with a password, *Auto Confirm User* ticked), then in the SQL editor:

    ```sql
    insert into public.platform_admins (user_id)
    select id from auth.users where email = 'you@example.com';
    ```

    Sign in to Sinapsi, enroll TOTP, open **Amministrazione → Nuovo studio**, create the practice
    and copy the one-time link; send it to her yourself. She opens it, chooses a password and
    enrolls TOTP. If she later forgets the password or loses her phone, use the key / shield
    buttons next to her name (*Gestisci*) to create a new-password link or reset 2FA.
11. She sets the **practice passphrase** for encrypted patient names in *Impostazioni → Studio*.

### E-mail (optional, not needed)

Sinapsi works without sending any e-mail: invitations and new-password links are copied by the
admin and delivered personally, and the *Password dimenticata?* page tells users to ask the admin.
Leave *Authentication → Emails* untouched; the built-in sender only reaches members of your
Supabase team, and its templates cannot be edited without custom SMTP.

To have Supabase send the e-mails instead:

1. Configure custom SMTP in *Authentication → Emails → SMTP Settings*. Brevo is free (300 e-mails a
   day, EU company, DPA in its terms) but needs a sender address you own. E-mails contain only the
   address and a one-time link. Add the provider to `docs/gdpr/sub-responsabili.md`.
2. Paste `supabase/templates/invite.html` into the *Invite user* template and
   `supabase/templates/recovery.html` into *Reset password* (they use `token_hash` links).
3. Add the build variable `VITE_EMAIL_ENABLED=true` in Cloudflare (§2) and redeploy. The invite
   dialogs then also offer *Email automatica*, and the *Password dimenticata?* page sends a link.

## 2. Cloudflare (static hosting)

Cloudflare serves only the built files; the browser talks directly to Supabase. The repository
contains `wrangler.jsonc`, which deploys `dist/` as a Worker with static assets only (no server
code) and single-page routing.

1. Create an account (2FA on). **Workers & Pages → Create**, choose to import a Git repository and
   pick `albertomercurio/Sinapsi`.
2. In *Set up your application*:
   - Project name: `sinapsi`. The site will be at `https://sinapsi.<your-subdomain>.workers.dev`.
   - Build command: `pnpm build-only`. (`pnpm run build` also works; it adds a type check that CI
     already does.)
   - Deploy command: `npx wrangler deploy` (the default).
   - **Enable Preview builds: off.** Each branch, including Dependabot's, would otherwise get its own
     public address, which Supabase does not allow anyway.
   - Protect with Cloudflare Access: off (Sinapsi has its own sign-in with 2FA).
   - **Advanced settings → Build variables**:
     - `VITE_SUPABASE_URL` = `https://<ref>.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_…`
     - `VITE_SUPABASE_REGION` only if the project is not in `eu-west-1`, e.g. `eu-central-1`.

   Without the two Supabase variables the build stops with an error instead of publishing a broken
   site. If you added them after the first attempt, use *Retry build*.
3. After the first deploy, in the Worker's **Settings → Domains & Routes**, disable *Preview URLs*.
   Keep the `workers.dev` route: it is the site's address.
4. Use `https://sinapsi.<your-subdomain>.workers.dev` as `<your-domain>` in Supabase (§1.7 and the
   secrets in §1.9). A custom domain is optional (about €10/year); if you add one later, update those
   places.
5. Do **not** enable Web Analytics or other add-ons that inject scripts. Node.js 24, the default of the
   build image, matches the project.
6. Check the security headers once:
   `curl -sI https://<your-domain>/patients | grep -i content-security-policy` must print the policy
   with your Supabase URL in `connect-src`.

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

- [ ] Supabase project in an **EU region** (e.g. `eu-west-1` Ireland), DPA downloaded; Cloudflare DPA accepted (SMTP provider too, if used).
- [ ] 2FA on Supabase, Cloudflare, GitHub (and the SMTP provider, if used) and on every Sinapsi account.
- [ ] Sign-ups disabled, password policy set, TOTP enabled, redirect URL and link expiry (24 h) configured.
- [ ] `supabase db push` done; Security Advisor clean; `admin-accounts` deployed with `ALLOWED_ORIGINS` and `SITE_URL`.
- [ ] Production site served with the security headers (check with the browser dev tools).
- [ ] Keep-alive workflow ran successfully once.
- [ ] Art. 28 agreement signed with the practice owner; `docs/gdpr/` templates reviewed by a DPO or
      lawyer; privacy notice handed to patients (and parents of minors).
- [ ] Daily admin backup scheduled (`scripts/backup-schedule.sh status`), private key stored offline, test restore done.
- [ ] Practice passphrase for encrypted names chosen and stored safely by the owner.
- [ ] No real patient data entered before all of the above.
