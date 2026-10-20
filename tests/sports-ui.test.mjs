import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright-core'

test('saved sports tables and schedule cards show badges, correct times, safe fallback and accessible Markdown tables', { timeout: 60000 }, async () => {
 const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' }); await server.listen()
 const browser = await chromium.launch({ executablePath: process.env.WENDLER_TEST_CHROME, headless: true, args: ['--no-sandbox'] })
 try {
  const page = await browser.newPage({ viewport: { width: 810, height: 900 } }), errors = [], calls = []
  page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message))
  let offline = false
  await page.route('https://a.espncdn.com/**', route => route.request().url().endsWith('/102.png') ? route.fulfill({ status: 404 }) : route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+X8AAAAASUVORK5CYII=', 'base64') }))
  await page.route('**/api/sports/scores?**', async route => {
   calls.push(new URL(route.request().url()).searchParams.get('date'))
   if (offline) return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
   const games = await page.evaluate(() => window.fixtureGames)
   await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ games, league: 'soccer/all', date: '2026-10-20', checkedAt: Date.parse('2026-10-20T19:00Z'), source: 'ESPN' }) })
  })
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/tests/fixtures/sports.html')
  const saved = page.getByRole('region', { name: 'Jogos da mensagem' })
  await saved.locator('img').first().waitFor()
  assert.equal(await saved.locator('li').count(), 3)
  assert.equal(await saved.getByText('19h30', { exact: true }).count(), 1)
  assert.equal(await saved.getByText('Porto', { exact: true }).count(), 1)
  assert.equal(await saved.getByText('PSV', { exact: true }).count(), 1)
  await page.waitForFunction(() => !document.querySelector('[aria-label="Jogos da mensagem"] img[src$="/102.png"]'))
  assert.ok(await saved.locator('.sports-team-badge svg').count() >= 1, 'missing logo uses a neutral shield')
  assert.ok(calls.every(date => date === '2026-10-20'), 'old messages must never use today for enrichment')
  const schedule = page.getByRole('region', { name: 'Jogos consultados' })
  assert.equal(await schedule.locator('li').count(), 8)
  assert.equal(await schedule.locator('.fixture-team>strong').count(), 2, 'scheduled games have no invented 0–0 score')
  await schedule.getByRole('button', { name: 'Ver mais 1 jogo' }).click(); assert.equal(await schedule.locator('li').count(), 9)
  await schedule.getByRole('button', { name: 'Atualizar jogos' }).click()
  await page.waitForFunction(() => document.querySelector('#schedule footer').textContent.includes('16:00'))
  offline = true; await schedule.getByRole('button', { name: 'Atualizar jogos' }).click(); await schedule.getByRole('status').waitFor()
  assert.equal(await schedule.locator('li').count(), 9)
  const table = page.locator('#generic table')
  assert.equal(await table.getByRole('columnheader').count(), 2)
  assert.equal(await table.locator('strong').innerText(), 'Plano A')
  assert.equal(await table.locator('img').count(), 0)
  assert.equal(await table.locator('td code').innerText(), 'a|b')
  assert.ok((await page.locator('#generic pre').innerText()).includes('| código | literal |'))
  await mkdir('.artifacts', { recursive: true }); await page.screenshot({ path: '.artifacts/sports-cards-810.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'cards must fit a narrow screen')
  await page.screenshot({ path: '.artifacts/sports-cards-390.png', fullPage: true })
  assert.deepEqual(errors, [])
 } finally { await browser.close(); server.httpServer.closeAllConnections(); await server.close() }
})
