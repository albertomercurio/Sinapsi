// Sinapsi · admin-invite Edge Function (Deno).
//
// Invites a professional by e-mail and adds them to an organization, optionally
// creating the organization first. The service-role key never leaves the
// server. Callers must have completed the second factor (aal2) and be either
// a platform admin (any organization, any role, new organizations) or the owner
// of the target organization (therapists only).
//
// Always invoke with `region: 'eu-central-1'` from the client so the function
// runs in Frankfurt.
import { createClient } from 'npm:@supabase/supabase-js@2'

interface Body {
  email: string
  orgId?: string
  newOrgName?: string
  role?: 'owner' | 'therapist'
}

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
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return json(400, { error: 'invalid_email' }, origin)
  const role = body.role === 'owner' ? 'owner' : 'therapist'

  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: pa } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', caller)
    .maybeSingle()
  const isPlatformAdmin = !!pa

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

  if (!isPlatformAdmin) {
    const { data: m } = await admin
      .from('memberships')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', caller)
      .maybeSingle()
    if (m?.role !== 'owner' || role !== 'therapist')
      return json(403, { error: 'forbidden' }, origin)
  }

  // Existing account? Just add the membership. Otherwise send the invitation e-mail.
  let userId: string | null = null
  let existing = false
  const { data: found } = await admin.rpc('admin_user_id_by_email', { p_email: email })
  if (found) {
    userId = found as string
    existing = true
  } else {
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email)
    if (error || !invited.user)
      return json(502, { error: 'invite_failed', detail: error?.code ?? null }, origin)
    userId = invited.user.id
  }

  const { error: memberError } = await admin
    .from('memberships')
    .upsert({ org_id: orgId, user_id: userId, role }, { onConflict: 'org_id,user_id' })
  if (memberError) return json(500, { error: 'membership_failed' }, origin)

  await admin.from('audit_log').insert({
    org_id: orgId,
    actor_id: caller,
    action: existing ? 'member_added' : 'invite',
    entity: 'memberships',
    details: { user_id: userId, role },
  })

  return json(200, { ok: true, orgId, userId, existing }, origin)
})
