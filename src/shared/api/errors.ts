/**
 * Maps Supabase/PostgREST/Auth errors to translation keys under `errors.*`.
 * Keeps raw server messages out of the UI.
 */
export function errorKey(error: unknown): string {
  const e = error as { code?: string; status?: number; message?: string } | null
  const code = e?.code ?? ''
  switch (code) {
    case 'invalid_credentials':
      return 'errors.invalidCredentials'
    case 'mfa_verification_failed':
    case 'mfa_challenge_expired':
      return 'errors.invalidTotp'
    case 'weak_password':
      return 'errors.weakPassword'
    case 'same_password':
      return 'errors.samePassword'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'errors.rateLimited'
    case 'otp_expired':
      return 'errors.linkExpired'
    case 'reauthentication_needed':
      return 'errors.reauthNeeded'
    case '42501':
      return 'errors.forbidden'
    case '22023':
      return 'errors.invalidInput'
    case 'P0002':
      return 'errors.notFound'
    case '23505':
      return 'errors.duplicate'
  }
  if (e?.status === 0 || e?.message?.includes('Failed to fetch')) return 'errors.offline'
  return 'errors.generic'
}

/** Throws the error of a Supabase response, returns its data otherwise. */
export function unwrap<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error
  return res.data as NonNullable<T>
}
