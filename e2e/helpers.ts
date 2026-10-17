import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { TOTP } from 'otpauth'

export const THERAPIST = { email: 'terapista@sinapsi.test', password: 'Sinapsi-Demo-2026' }
export const ADMIN = { email: 'admin@sinapsi.test', password: 'Sinapsi-Admin-2026' }

export function totp(secret: string): string {
  return new TOTP({ secret, digits: 6, period: 30 }).generate()
}

/** Signs in; enrolls TOTP on first login and returns the secret for later logins. */
export async function login(
  page: Page,
  user: { email: string; password: string },
  secret?: string,
): Promise<string> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByTestId('login-submit').click()
  await page.waitForURL(/\/mfa\/(enroll|verify)/)
  if (page.url().includes('/mfa/enroll')) {
    const el = page.getByTestId('totp-secret')
    await expect(el).toBeVisible()
    secret = (await el.getAttribute('data-secret'))!
  }
  await page.getByTestId('totp-input').fill(totp(secret!))
  await page.getByTestId('totp-submit').click()
  await page.waitForURL((u) => !u.pathname.startsWith('/mfa'))
  return secret!
}

/** Latest e-mail to `to` from the local mail catcher (Mailpit). */
export async function latestMailTo(to: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json()
    const msg = list.messages?.find((m: { To: { Address: string }[] }) =>
      m.To.some((t) => t.Address === to),
    )
    if (msg) {
      const full = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`)).json()
      return full.HTML as string
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`no mail to ${to}`)
}

export function confirmLink(html: string, baseURL: string): string {
  const href = html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1]
  if (!href) throw new Error('no confirm link in mail')
  const url = new URL(href.replace(/&amp;/g, '&'))
  return `${baseURL}${url.pathname}${url.search}`
}

/** Fails the test on any Content-Security-Policy violation reported by the page. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = []
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text())
  })
  return violations
}

/** Local Supabase API settings, read from .env.local (written from `supabase status`). */
export function localEnv(): { url: string; key: string } {
  const env = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  )
  return { url: env.VITE_SUPABASE_URL!, key: env.VITE_SUPABASE_PUBLISHABLE_KEY! }
}

/** The signed-in user's access token, as stored by supabase-js. */
export async function accessToken(page: Page): Promise<string> {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token'),
    )!
    return JSON.parse(localStorage.getItem(key)!).access_token as string
  })
}
