/* eslint-disable playwright/no-wait-for-timeout -- the exercise has real timing (card flips, long press to exit) */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { THERAPIST, login, watchCsp } from './helpers'

test.describe.configure({ mode: 'serial' })

let page: Page
let secret: string
let patientCode: string
let csp: string[]

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ locale: 'it-IT' })
  page = await context.newPage()
  csp = watchCsp(page)
})

test.afterAll(async () => {
  await page.close()
})

test('first login forces TOTP enrollment', async () => {
  secret = await login(page, THERAPIST)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Buon|Good/)
})

test('creates a pseudonymous patient with a generated code', async () => {
  await page.goto('/patients')
  await page.getByTestId('new-patient').click()
  await page.getByTestId('birth-year').fill('1952')
  await page.getByTestId('save-patient').click()
  await page.waitForURL(/\/patients\/[0-9a-f-]{36}$/)
  patientCode = (await page.getByTestId('patient-code').textContent())!.trim()
  expect(patientCode).toMatch(/^PZ-[A-Z0-9]{4}$/)
})

test('builds a session and runs it in locked patient mode', async () => {
  await page.getByTestId('new-session').click()
  await page.waitForURL(/\/sessions\/new/)
  await page.getByTestId('add-activity').click()
  await page.locator('[data-activity="memory-pairs"]').getByTestId('pick-activity').click()
  await expect(page.getByTestId('session-item')).toHaveCount(1)
  // Fixed difficulty, level 1 (3 pairs with preview).
  await page.getByTestId('session-item').getByRole('button', { name: 'Fissa' }).click()
  await page.getByTestId('session-item').getByRole('slider').focus()
  await page.keyboard.press('Home')
  await page.getByTestId('save-and-run').click()
  await page.waitForURL(/\/sessions\/[0-9a-f-]+\/run/)

  await page.getByTestId('start-patient-mode').click()
  // First time on this device: set the patient-mode PIN.
  await page.getByTestId('pin-input').fill('2468')
  await page.getByTestId('pin-input-2').fill('2468')
  await page.getByTestId('pin-submit').click()

  await page.getByTestId('start-activity').click()
  const cards = page.getByTestId('pair-card')
  await expect(cards).toHaveCount(6, { timeout: 15_000 })
  // Wait for the preview to end (cards face down show "?") and for the board to unlock.
  await expect(cards.first()).toHaveAttribute('aria-label', '?', { timeout: 15_000 })
  await page.waitForTimeout(700)
  const ids = [
    ...new Set(await cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-stimulus')!))),
  ]
  for (const id of ids) {
    const pair = page.locator(`[data-testid="pair-card"][data-stimulus="${id}"]`)
    await pair.nth(0).dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true })
    await page.waitForTimeout(250)
    await pair.nth(1).dispatchEvent('pointerdown', { pointerType: 'mouse', isPrimary: true })
    await page.waitForTimeout(250)
  }
  await page.getByTestId('next-activity').click()
  await expect(page.getByText(/Seduta completata|Session complete/)).toBeVisible()

  // Leaving patient mode needs a long press + PIN.
  const lock = page.getByTestId('exit-patient-mode')
  await lock.dispatchEvent('pointerdown')
  await page.waitForTimeout(1700)
  await lock.dispatchEvent('pointerup')
  await page.getByTestId('pin-input').fill('2468')
  await page.getByTestId('pin-submit').click()
  await page.waitForURL(/\/patients\/[0-9a-f-]+\?tab=results/)
})

test('shows the run in results and its detail page', async () => {
  await expect(page.getByTestId('activity-results')).toHaveCount(1)
  await expect(page.getByTestId('run-row')).toHaveCount(1)
  await page.getByTestId('run-row').first().click()
  await page.waitForURL(/\/runs\//)
  await expect(page.getByText(/Efficienza mnestica|Memory efficiency/).first()).toBeVisible()
})

test('main screens have no serious or critical accessibility violations (axe)', async () => {
  const report: string[] = []
  for (const path of ['/', '/patients', '/sessions', '/activities', '/settings/profile']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    for (const v of res.violations.filter(
      (x) => x.impact === 'serious' || x.impact === 'critical',
    )) {
      report.push(
        `${path}: ${v.id} (${v.impact}) × ${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`,
      )
    }
  }
  expect(report).toEqual([])
})

test('switches the interface to English and back', async () => {
  await page.goto('/patients')
  await page.getByTestId('language-switcher').selectOption('en')
  await expect(page.getByRole('heading', { level: 1, name: 'Patients' })).toBeVisible()
  await page.getByTestId('language-switcher').selectOption('it')
  await expect(page.getByRole('heading', { level: 1, name: 'Pazienti' })).toBeVisible()
})

test('exports an encrypted backup and restores it', async () => {
  await page.goto('/settings/privacy')
  await page.getByTestId('backup-pass').fill('una frase segreta lunga')
  await page.getByTestId('backup-pass2').fill('una frase segreta lunga')
  const download = page.waitForEvent('download')
  await page.getByTestId('backup-export').click()
  const file = await download
  const path = await file.path()
  expect(file.suggestedFilename()).toMatch(/\.sinapsi$/)
  await page.getByTestId('restore-file').setInputFiles(path!)
  await page.getByTestId('restore-pass').fill('una frase segreta lunga')
  await page.getByTestId('restore-submit').click()
  await expect(page.getByText(/Ripristino completato/)).toBeVisible()
})

test('the second login asks for the code, not a new enrollment', async () => {
  await page.getByTestId('sign-out').click()
  await page.waitForURL(/\/login/)
  await login(page, THERAPIST, secret)
  await expect(page).toHaveURL(/\/$/)
})

test('hard-deletes the patient after retyping the code', async () => {
  await page.goto('/patients')
  await page.getByTestId('patient-row').filter({ hasText: patientCode }).click()
  await page.getByRole('tab', { name: 'Privacy' }).click()
  await page.getByTestId('delete-patient').click()
  await page.getByTestId('confirm-input').fill(patientCode)
  await page.getByTestId('confirm-button').click()
  await page.waitForURL(/\/patients$/)
  await expect(page.getByText(patientCode)).toHaveCount(0)
})

test('no Content-Security-Policy violations happened', async () => {
  expect(csp).toEqual([])
})
