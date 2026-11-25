/**
 * Multi-user collaboration spec — verifies two users sign in into
 * separate browser contexts and the app distinguishes them.
 *
 * `users(2)` takes any two accounts from your pool, so this spec passes on a
 * fresh app with no setup beyond having two test accounts:
 *   npx deepspace test accounts list
 *   npx deepspace test accounts create --email a@deepspace.test --name "A" --password-stdin
 *
 * Ask for accounts *by name* (`users(['Alice', 'Bob'])`) only when the
 * behaviour under test depends on which identity acts — otherwise naming them
 * couples the spec to one machine's pool.
 *
 * The `users` fixture handles sign-in caching (per-account storageState
 * persisted to `~/.deepspace/playwright-states/`), context creation, and
 * cleanup. No need to manage browser contexts manually.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

// A machine that has never created test accounts is the normal state of a
// fresh checkout, and there `users()` throws — turning "you have no pool yet"
// into three red tests about the app, which it is not. Skip the file instead
// and say what creates the pool. The count is of accounts usable HERE: the
// pool is global per developer, but passwords live only on the machine that
// created the account.
const usableTestAccounts = loadAllTestAccounts().length
test.skip(
  usableTestAccounts < 2,
  `Needs 2 usable test accounts, found ${usableTestAccounts}. Create them with ` +
    '`npx deepspace test accounts create --email <name>@deepspace.test --name "<name>" ' +
    '--password-stdin`, or fetch existing pool accounts with `npx deepspace test accounts recover --all`.',
)

test('each browser renders its own signed-in account', async ({ users }) => {
  const [a, b] = await users(2)

  // /home is dynamic (under src/pages/(app)/), so it mounts the nav shell;
  // '/' is the static landing and has no navigation.
  await Promise.all([a.page.goto('/home'), b.page.goto('/home')])

  // Email, not name. The page renders the *session's* `name || email`, while
  // `user.name` here comes from the LOCAL account registry — and the two are
  // not the same fact: a display name is optional, and an account recovered on
  // another machine has none stored locally at all. The email is the credential
  // the context signed in with, so it is the one identity both sides agree on,
  // and asserting it proves the page is showing THIS browser's account.
  // The two accounts are distinct, so two exact matches is also the proof that
  // the contexts are not sharing one session.
  for (const user of [a, b]) {
    await expect(user.page.getByTestId('app-navigation')).toBeVisible({ timeout: 15_000 })

    // The identity chip shows `name || email`. Its text is not predictable, but
    // its presence is: something must be there once the profile has loaded.
    // (It is `hidden sm:inline` in some templates, so assert text, not
    // visibility.)
    await expect(user.page.getByTestId('nav-user-name')).toHaveText(/\S/, { timeout: 15_000 })

    await user.page.getByRole('button', { name: 'Account menu' }).click()
    await expect(user.page.getByTestId('nav-user-email')).toHaveText(user.email, {
      timeout: 15_000,
    })
  }
})

test('invitees join, vote changes sync live, and removal deletes their vote', async ({ users, page }) => {
  const [creator, roommate] = await users(2)
  const title = `__test-${Date.now()}__ Shared rental`
  let listingId: string | null = null

  try {
    await creator.page.goto('/listings/new')
    await creator.page.locator('#listing-title').fill(title)
    await creator.page.locator('#listing-text').fill('A bright apartment with two bedrooms.')
    await creator.page.getByRole('button', { name: 'Save listing' }).click()
    await expect(creator.page.getByRole('heading', { name: title })).toBeVisible()

    listingId = new URL(creator.page.url()).pathname.split('/').at(-1) ?? null
    expect(listingId).toBeTruthy()

    await creator.page.getByRole('button', { name: 'Create invite link' }).click()
    const firstInvite = creator.page.getByTestId('invite-url')
    await expect(firstInvite).toBeVisible()
    const revokedUrl = await firstInvite.inputValue()
    await creator.page.getByRole('button', { name: 'Turn off link' }).click()

    await roommate.page.goto(revokedUrl)
    await expect(roommate.page.getByRole('heading', { name: 'Listing not found' })).toBeVisible()

    await creator.page.getByRole('button', { name: 'Create invite link' }).click()
    const inviteUrl = await creator.page.getByTestId('invite-url').inputValue()
    await page.goto(inviteUrl)
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible()

    await roommate.page.goto(inviteUrl)
    await expect(roommate.page.getByRole('heading', { name: title })).toBeVisible()
    await expect(creator.page.getByText(roommate.name, { exact: false })).toBeVisible()

    await expect(roommate.page.getByRole('link', { name: 'Edit listing' })).toHaveCount(0)
    await expect(roommate.page.getByRole('button', { name: 'Delete listing' })).toHaveCount(0)
    await expect(roommate.page.getByRole('button', { name: /summarize|regenerate/i })).toHaveCount(0)
    await expect(roommate.page.getByRole('button', { name: /invite/i })).toHaveCount(0)

    await creator.page.getByTestId('vote-choice').selectOption('Good fit')
    await creator.page.getByRole('button', { name: 'Save my vote' }).click()
    await roommate.page.getByTestId('vote-choice').selectOption('Good fit')
    await roommate.page.getByRole('button', { name: 'Save my vote' }).click()
    await expect(creator.page.getByTestId('listing-decision')).toHaveText('Go for it')

    await roommate.page.getByTestId('vote-choice').selectOption('Reject')
    await roommate.page.getByTestId('vote-comment').fill('Too noisy at night')
    await roommate.page.getByRole('button', { name: 'Update my vote' }).click()
    await expect(creator.page.getByTestId('listing-decision')).toHaveText('Pass')
    await expect(creator.page.getByText('Too noisy at night')).toBeVisible()

    await creator.page.getByRole('button', { name: `Remove ${roommate.name}` }).click()
    await expect(roommate.page.getByRole('heading', { name: 'Listing not found' })).toBeVisible()
    await expect(creator.page.getByTestId('listing-decision')).toHaveText('Go for it')
    await expect(creator.page.getByText('Too noisy at night')).toHaveCount(0)
  } finally {
    if (listingId) {
      await creator.page.goto(`/listings/${listingId}`)
      const deleteButton = creator.page.getByRole('button', { name: 'Delete listing', exact: true })
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click()
        const dialog = creator.page.getByRole('dialog', { name: 'Delete this listing?' })
        await dialog.getByRole('button', { name: 'Delete listing' }).click()
      }
    }
  }
})

test('API status page renders loading success and error states', async ({ users }) => {
  const [user] = await users(1)
  let shouldFail = false
  let requestCount = 0

  await user.page.route('**/api/integrations', async (route) => {
    requestCount += 1
    if (shouldFail) {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Catalog unavailable' }),
      })
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { integrations: { openai: {}, wikipedia: {} } } }),
    })
  })

  await user.page.goto('/api-status')
  await expect(user.page.getByText('Loading integration catalog...')).toBeVisible()
  await expect(user.page.getByText('Integration catalog ready')).toBeVisible()
  await expect(user.page.getByText('2 integrations available.')).toBeVisible()

  shouldFail = true
  await user.page.getByRole('button', { name: 'Refresh' }).click()
  await expect(user.page.getByText('Catalog unavailable')).toBeVisible()
  await expect(user.page.getByText('Showing the last loaded catalog')).toBeVisible()
  await expect(user.page.getByText('Integration catalog ready')).toBeVisible()

  const urlAfterFailure = user.page.url()
  const requestsAfterFailure = requestCount
  await user.page.getByRole('button', { name: 'Refresh' }).click()
  await expect.poll(() => requestCount).toBeGreaterThan(requestsAfterFailure)
  expect(user.page.url()).toBe(urlAfterFailure)
})

test('API status page shows local retry after first-load API failure', async ({ users }) => {
  const [user] = await users(1)
  let requestCount = 0

  await user.page.route('**/api/integrations', async (route) => {
    requestCount += 1
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Catalog unavailable' }),
    })
  })

  await user.page.goto('/api-status')
  await expect(user.page.getByText('Loading integration catalog...')).toBeVisible()
  await expect(user.page.getByText('Could not load API data')).toBeVisible()
  await expect(user.page.getByText('Retried 1 time automatically.')).toBeVisible()

  const retryButton = user.page.getByRole('button', { name: 'Retry' })
  await expect(retryButton).toBeVisible()

  const urlAfterFailure = user.page.url()
  const requestsAfterFailure = requestCount
  await retryButton.click()
  await expect.poll(() => requestCount).toBeGreaterThan(requestsAfterFailure)
  expect(user.page.url()).toBe(urlAfterFailure)
})
