import { expect, test, type Browser, type Page } from '@playwright/test'
import { ADMIN, accessToken, confirmLink, latestMailTo, localEnv, login, totp } from './helpers'

test.describe.configure({ mode: 'serial' })

let admin: Page
let adminSecret: string

test.beforeAll(async ({ browser }) => {
  admin = await (await browser.newContext({ locale: 'it-IT' })).newPage()
})

test.afterAll(async () => {
  await admin.close()
})

/** Opens an account link in a fresh browser, sets a password and enrolls TOTP. Returns the TOTP secret. */
async function activate(browser: Browser, link: string, password: string): Promise<string> {
  const owner = await (await browser.newContext({ locale: 'it-IT' })).newPage()
  await owner.goto(link)
  await owner.waitForURL(/\/auth\/set-password/)
  await owner.getByLabel('Nuova password').fill(password)
  await owner.getByLabel('Ripeti la password').fill(password)
  await owner.getByRole('button', { name: 'Salva la password' }).click()
  await owner.waitForURL(/\/mfa\/enroll/)
  const secret = (await owner.getByTestId('totp-secret').getAttribute('data-secret'))!
  await owner.getByTestId('totp-input').fill(totp(secret))
  await owner.getByTestId('totp-submit').click()
  await owner.waitForURL((u) => u.pathname === '/')
  await owner.context().close()
  return secret
}

test('the platform admin sees practices but no patient data', async () => {
  adminSecret = await login(admin, ADMIN)
  await admin.waitForURL(/\/admin$/)
  await expect(admin.getByText('Studio Demo')).toBeVisible()
  const { url, key } = localEnv()
  const res = await fetch(`${url}/rest/v1/patients?select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${await accessToken(admin)}` },
  })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual([])
  expect(adminSecret).toBeTruthy()
})

test('invitation by e-mail: the owner activates the account from the e-mail link', async ({
  browser,
  baseURL,
}) => {
  await admin.getByTestId('new-org').click()
  await admin.getByTestId('new-org-name').fill('Studio Email')
  await admin.getByTestId('new-org-email').fill('nuova@sinapsi.test')
  await admin.getByRole('radio', { name: 'Email automatica' }).click()
  await admin.getByTestId('new-org-submit').click()
  await expect(admin.getByText(/Studio «Studio Email» creato/)).toBeVisible()
  const html = await latestMailTo('nuova@sinapsi.test')
  await activate(browser, confirmLink(html, baseURL!), 'Password-Nuova-2026')
})

test('invitation by link (no e-mail), new-password link and 2FA reset', async ({ browser }) => {
  await admin.getByTestId('new-org').click()
  await admin.getByTestId('new-org-name').fill('Studio Link')
  await admin.getByTestId('new-org-email').fill('link@sinapsi.test')
  await admin.getByRole('radio', { name: 'Link da inviare io' }).click()
  await admin.getByTestId('new-org-submit').click()
  const link = await admin.getByTestId('account-link').inputValue()
  expect(link).toMatch(/\/auth\/confirm\?token_hash=.+&type=invite$/)
  await admin.keyboard.press('Escape')
  const secret = await activate(browser, link, 'Password-Link-2026')

  // Password link: the user still needs their 2FA code before choosing a new password.
  await admin.reload()
  await admin
    .getByRole('row', { name: /Studio Link/ })
    .getByRole('button', { name: 'Gestisci' })
    .click()
  const row = admin.locator('[data-testid="member-row"][data-email="link@sinapsi.test"]')
  await row.getByTestId('password-link').click()
  const recovery = await admin.getByTestId('account-link').inputValue()
  expect(recovery).toMatch(/type=recovery$/)
  await admin.keyboard.press('Escape')

  const user = await (await browser.newContext({ locale: 'it-IT' })).newPage()
  await user.goto(recovery)
  await user.waitForURL(/\/mfa\/verify/)
  await user.getByTestId('totp-input').fill(totp(secret))
  await user.getByTestId('totp-submit').click()
  await user.waitForURL(/\/auth\/set-password/)
  await user.getByLabel('Nuova password').fill('Password-Cambiata-2026')
  await user.getByLabel('Ripeti la password').fill('Password-Cambiata-2026')
  await user.getByRole('button', { name: 'Salva la password' }).click()
  await user.waitForURL((u) => u.pathname === '/')
  await user.context().close()

  // 2FA reset (lost phone): the next sign-in asks to enroll a new device.
  await row.getByTestId('reset-mfa').click()
  await admin.getByTestId('confirm-button').click()
  await expect(admin.getByText(/Autenticazione a due fattori reimpostata/)).toBeVisible()
  const again = await (await browser.newContext({ locale: 'it-IT' })).newPage()
  await again.goto('/login')
  await again.getByLabel('Email').fill('link@sinapsi.test')
  await again.getByLabel('Password', { exact: true }).fill('Password-Cambiata-2026')
  await again.getByTestId('login-submit').click()
  await again.waitForURL(/\/mfa\/enroll/)
  await again.context().close()
})
