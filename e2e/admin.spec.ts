import { expect, test } from '@playwright/test'
import { ADMIN, accessToken, confirmLink, latestMailTo, localEnv, login, totp } from './helpers'

test('platform admin creates a practice, the invited owner activates the account, the admin sees no patients', async ({
  page,
  baseURL,
}) => {
  await login(page, ADMIN)
  await page.waitForURL(/\/admin$/)
  await expect(page.getByText('Studio Demo')).toBeVisible()

  await page.getByTestId('new-org').click()
  await page.getByTestId('new-org-name').fill('Studio Nuovo')
  await page.getByTestId('new-org-email').fill('nuova@sinapsi.test')
  await page.getByTestId('new-org-submit').click()
  await expect(page.getByText(/Studio «Studio Nuovo» creato/)).toBeVisible()

  // The admin has no clinical access, even calling the API directly with an aal2 token.
  const { url, key } = localEnv()
  const res = await fetch(`${url}/rest/v1/patients?select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${await accessToken(page)}` },
  })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual([])

  // Invited owner: follow the e-mail link, set a password, enroll 2FA.
  const ctx = await page.context().browser()!.newContext({ locale: 'it-IT' })
  const owner = await ctx.newPage()
  const html = await latestMailTo('nuova@sinapsi.test')
  await owner.goto(confirmLink(html, baseURL!))
  await owner.waitForURL(/\/auth\/set-password/)
  await owner.getByLabel('Nuova password').fill('Password-Nuova-2026')
  await owner.getByLabel('Ripeti la password').fill('Password-Nuova-2026')
  await owner.getByRole('button', { name: 'Salva la password' }).click()
  await owner.waitForURL(/\/mfa\/enroll/)
  const secret = (await owner.getByTestId('totp-secret').getAttribute('data-secret'))!
  await owner.getByTestId('totp-input').fill(totp(secret))
  await owner.getByTestId('totp-submit').click()
  await owner.waitForURL((u) => u.pathname === '/')
  await expect(owner.getByText('Studio Nuovo')).toBeVisible()
  await ctx.close()
})
