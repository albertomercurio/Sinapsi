// Sinapsi · admin-accounts Edge Function (Deno).
//
// Account administration that needs the service-role key, which never leaves
// the server. Every caller must have completed the second factor (aal2).
//
//   invite         create an account (and optionally a practice) and either
//                  e-mail the invitation (needs SMTP) or return a one-time link
//                  the admin copies and delivers personally
//   password_link  one-time link to choose a new password (the user still
//                  needs their 2FA code to complete it)
//   reset_mfa      remove all 2FA devices: the user enrolls a new one at the
//                  next sign-in (lost phone)
//
// Permissions: platform admins can do everything; practice owners can act on
// therapists of their own practice. Every action is written to the audit log of
// each practice the target belongs to, so owners see what admins did.
//
// The app invokes it pinned to the project's region (VITE_SUPABASE_REGION), so it runs in the EU.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Role = 'owner' | 'therapist'
type Body =
  | {
      action?: 'invite'
      email: string
      orgId?: string
      newOrgName?: string
      role?: Role
      delivery?: 'link' | 'email'
    }
  | { action: 'password_link'; userId: string }
  | { action: 'reset_mfa'; userId: string }

const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? '*').split(',').map((s) => s.trim())

function cors(origin: string | null) {
  const allow = allowed.includes('*')
    ? '*'
    : origin && allowed.includes(origin)
      ? origin
      : allowed[0]!
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  })
}

/** Reads the (already verified) JWT payload to check the assurance level. */
function claims(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? ''
  const pad = part
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(part.length / 4) * 4, '=')
  return JSON.parse(atob(pad))
}

/** Base URL for links: the calling app's origin when allowed, else SITE_URL. */
function siteUrl(origin: string | null): string {
  if (origin && (allowed.includes('*') || allowed.includes(origin))) return origin
  return Deno.env.get('SITE_URL') ?? allowed.find((a) => a !== '*') ?? 'http://localhost:5173'
}

async function audit(
  admin: SupabaseClient,
  orgIds: string[],
  actor: string,
  action: string,
  details: Record<string, unknown>,
) {
  if (!orgIds.length) return
  await admin
    .from('audit_log')
    .insert(
      orgIds.map((org_id) => ({ org_id, actor_id: actor, action, entity: 'accounts', details })),
    )
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'unauthorized' }, origin)

  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userError } = await asUser.auth.getUser(token)
  if (userError || !userData.user) return json(401, { error: 'unauthorized' }, origin)
  if (claims(token).aal !== 'aal2') return json(403, { error: 'mfa_required' }, origin)
  const caller = userData.user.id

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_body' }, origin)
  }

  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: pa } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', caller)
    .maybeSingle()
  const isPlatformAdmin = !!pa
  const ownedOrgs = async (userId: string) =>
    (
      (await admin.from('memberships').select('org_id').eq('user_id', userId).eq('role', 'owner'))
        .data ?? []
    ).map((m) => m.org_id as string)
  const membershipsOf = async (userId: string) =>
    ((await admin.from('memberships').select('org_id, role').eq('user_id', userId)).data ?? []) as {
      org_id: string
      role: Role
    }[]
  const link = (hashedToken: string, type: 'invite' | 'recovery') =>
    `${siteUrl(origin)}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=${type}`

  // ---------------------------------------------------------------- invite --
  if (!body.action || body.action === 'invite') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return json(400, { error: 'invalid_email' }, origin)
    const role: Role = body.role === 'owner' ? 'owner' : 'therapist'
    const delivery = body.delivery === 'email' ? 'email' : 'link'

    let orgId = body.orgId ?? null
    if (body.newOrgName) {
      if (!isPlatformAdmin) return json(403, { error: 'forbidden' }, origin)
      const name = String(body.newOrgName).trim().slice(0, 120)
      if (!name) return json(400, { error: 'invalid_org_name' }, origin)
      const { data: org, error } = await admin
        .from('organizations')
        .insert({ name })
        .select('id')
        .single()
      if (error) return json(500, { error: 'org_create_failed' }, origin)
      orgId = org.id
    }
    if (!orgId) return json(400, { error: 'org_required' }, origin)
    if (!isPlatformAdmin && (!(await ownedOrgs(caller)).includes(orgId) || role !== 'therapist')) {
      return json(403, { error: 'forbidden' }, origin)
    }

    let userId: string | null = null
    let existing = false
    let actionLink: string | null = null
    const { data: found } = await admin.rpc('admin_user_id_by_email', { p_email: email })
    if (found) {
      userId = found as string
      existing = true
    } else if (delivery === 'email') {
      const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email)
      if (error || !invited.user)
        return json(502, { error: 'invite_failed', detail: error?.code ?? null }, origin)
      userId = invited.user.id
    } else {
      const { data: gen, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
      if (error || !gen.user)
        return json(502, { error: 'invite_failed', detail: error?.code ?? null }, origin)
      userId = gen.user.id
      actionLink = link(gen.properties.hashed_token, 'invite')
    }

    const { error: memberError } = await admin
      .from('memberships')
      .upsert({ org_id: orgId, user_id: userId, role }, { onConflict: 'org_id,user_id' })
    if (memberError) return json(500, { error: 'membership_failed' }, origin)

    await audit(
      admin,
      [orgId],
      caller,
      existing ? 'member_added' : delivery === 'link' ? 'invite_link' : 'invite',
      { user_id: userId, role },
    )
    return json(200, { ok: true, orgId, userId, existing, link: actionLink }, origin)
  }

  // ---------------------------------------- actions on an existing account --
  const userId = String((body as { userId?: string }).userId ?? '')
  if (!/^[0-9a-f-]{36}$/.test(userId)) return json(400, { error: 'invalid_user' }, origin)
  const { data: target } = await admin.auth.admin.getUserById(userId)
  if (!target.user?.email) return json(404, { error: 'not_found' }, origin)
  const targetMemberships = await membershipsOf(userId)
  const targetOrgs = targetMemberships.map((m) => m.org_id)

  if (!isPlatformAdmin) {
    // Owners may act on therapists of their own practice (never on other owners or admins).
    const mine = await ownedOrgs(caller)
    const { data: targetIsAdmin } = await admin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    const allowedHere = targetMemberships.some(
      (m) => mine.includes(m.org_id) && m.role === 'therapist',
    )
    if (!allowedHere || targetIsAdmin || userId === caller)
      return json(403, { error: 'forbidden' }, origin)
  }

  if (body.action === 'password_link') {
    const { data: gen, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: target.user.email,
    })
    if (error) return json(502, { error: 'link_failed', detail: error.code ?? null }, origin)
    await audit(admin, targetOrgs, caller, 'password_link', { user_id: userId })
    return json(200, { ok: true, link: link(gen.properties.hashed_token, 'recovery') }, origin)
  }

  if (body.action === 'reset_mfa') {
    const { data: list, error } = await admin.auth.admin.mfa.listFactors({ userId })
    if (error) return json(502, { error: 'mfa_failed' }, origin)
    for (const f of list.factors) await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId })
    await audit(admin, targetOrgs, caller, 'mfa_reset', {
      user_id: userId,
      factors: list.factors.length,
    })
    return json(200, { ok: true, removed: list.factors.length }, origin)
  }

  return json(400, { error: 'unknown_action' }, origin)
})
