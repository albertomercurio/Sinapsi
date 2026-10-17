/** Mirrors supabase/config.toml: ≥12 chars, lower + upper case letters, digits. */
export function passwordOk(p: string): boolean {
  return p.length >= 12 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)
}
