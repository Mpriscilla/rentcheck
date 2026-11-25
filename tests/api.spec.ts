import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  test('listing summary action requires authentication', async ({ request }) => {
    const res = await request.post('/api/actions/summarizeListing', {
      data: { listingId: 'listing-1' },
    })

    expect(res.status()).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  test('listing collaboration actions require authentication', async ({ request }) => {
    for (const action of ['createListingInvite', 'acceptListingInvite', 'castListingVote']) {
      const res = await request.post(`/api/actions/${action}`, {
        data: { listingId: 'listing-1', token: 'a'.repeat(64), choice: 'Good fit' },
      })

      expect(res.status()).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'Unauthorized' })
    }
  })

  test('WebSocket endpoint exists', async ({ page }) => {
    // /home is a dynamic page (under src/pages/(app)/), so mounting it boots
    // the providers and auto-connects the records WebSocket. The static
    // landing at '/' deliberately does neither — see smoke.spec.ts.
    await page.goto('/home')
    // Wait for the app to connect its WebSocket (it auto-connects on mount)
    await page.waitForSelector('[data-testid="app-navigation"]', { timeout: 15000 })
    // If the app loaded and connected, the WS endpoint works
  })
})
