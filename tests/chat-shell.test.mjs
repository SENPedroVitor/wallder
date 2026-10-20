import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright-core'
import { claimBrowserPreview, conversationBrowserPreview } from '../server/browser-monitor.mjs'

test('chat layout stays stable, grouped navigation works, composer grows, and browser stays in its conversation', { timeout: 60000 }, async () => {
 const server = await createServer({ configFile: false, plugins: [react()], server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' })
 await server.listen()
 const browser = await chromium.launch({ executablePath: process.env.WENDLER_TEST_CHROME, headless: true, args: ['--no-sandbox'] })
 try {
  const page = await browser.newPage({ viewport: { width: 810, height: 626 } }), errors = [], monitors = []
  page.setDefaultTimeout(8000)
  page.on('pageerror', error => errors.push(error.message))
  const ids = ['west', 'ted', 'kyle', 'songbird', 'sheldon', 'pam', 'homer', 'indy', 'livro', 'figma']
  const chats = ids.map((agent, index) => ({ id: 'chat-' + agent, agent, title: 'Nova conversa', updated: 1000 + index, messages: agent === 'indy' ? [] : [{ id: 'message-' + agent, sender: agent, text: 'Conversa de teste', at: 1000 }] }))
  chats.find(c => c.agent === 'kyle').messages[0].widget = { type: 'tasks', data: { tasks: [] } }
  const records = { 'wendler:frontend:v1': { revision: 1, value: { profile: { name: 'Conta de teste', nickname: '', avatar: '' }, onboarded: true, canvasRevision: 2, theme: 'light', prefs: {}, chats, sidebarAgents: ids, selected: 'chat-ted' } } }
  const source = { page: {}, async preview() { return { active: true, title: 'Página do Ash', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+X8AAAAASUVORK5CYII=' } } }
  claimBrowserPreview(source, 'chat-west')
  let delayAsh = false
  await page.route('**/api/**', async route => {
   const request = route.request(), url = new URL(request.url()); let body = {}
   if (url.pathname === '/api/storage') {
    if (request.method() === 'POST') { const input = request.postDataJSON(); records[input.key] = { value: input.value, revision: (records[input.key]?.revision || 0) + 1 }; body = records[input.key] }
    else body = { records: url.searchParams.has('key') ? { [url.searchParams.get('key')]: records[url.searchParams.get('key')] } : records }
   } else if (url.pathname === '/api/status') body = { ready: true, authenticated: true, model: 'test', workspace: 'test' }
   else if (url.pathname === '/api/routines') body = { routines: [] }
   else if (url.pathname === '/api/routines/results') body = { results: [] }
   else if (url.pathname === '/api/browser/monitor') {
    const id = url.searchParams.get('conversationId'); monitors.push(id); body = await conversationBrowserPreview([source], id)
    if (delayAsh && id === 'chat-west') await new Promise(resolve => setTimeout(resolve, 600))
   }
   await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {})
  })
  await page.goto('http://127.0.0.1:' + server.httpServer.address().port)
  await page.getByRole('textbox', { name: 'Mensagem para Ted Mosby' }).waitFor()
  assert.equal(await page.locator('.pencil-agent-panel').count(), 0, 'panel should open only on request')
  const layout = async () => page.evaluate(() => {
   const side = document.querySelector('.pencil-sidebar').getBoundingClientRect(), list = document.querySelector('.pencil-sidebar-agents'), field = document.querySelector('.waddle-composer textarea'), box = field.getBoundingClientRect()
   return { sideWidth: side.width, listHeight: list.clientHeight, overflow: list.scrollHeight - list.clientHeight, fieldHeight: box.height, font: parseFloat(getComputedStyle(field).fontSize), x: box.x }
  })
  const initial = await layout(); assert.ok(initial.listHeight > 400); assert.ok(initial.overflow <= 2, 'ten agents use full height without a short inner scroll'); assert.ok(initial.fieldHeight >= 42); assert.ok(initial.font >= 14)
  const choose = name => page.locator('.pencil-sidebar-agents button').filter({ hasText: name }).click()
  for (const name of ['Indiana Jones', 'Kyle Rayner', 'Ted Mosby']) {
   await choose(name); const current = await layout()
   assert.equal(current.sideWidth, initial.sideWidth); assert.equal(current.listHeight, initial.listHeight); assert.equal(current.fieldHeight, initial.fieldHeight)
   assert.equal(await page.locator('.pencil-sidebar-links').count(), 0)
  }
  await page.getByRole('textbox', { name: 'Buscar agentes' }).fill('Indiana')
  assert.equal(await page.locator('.pencil-sidebar-agents button').count(), 1)
  await page.getByRole('textbox', { name: 'Buscar agentes' }).fill('')
  await page.getByRole('button', { name: 'Menu da conta', exact: true }).click()
  const menu = page.getByRole('menu', { name: 'Menu da conta', exact: true })
  assert.equal(await menu.getByRole('menuitem').count(), 6); assert.ok((await menu.boundingBox()).height < 300)
  await mkdir('.artifacts', { recursive: true }); await page.screenshot({ path: '.artifacts/chat-menu-810.png' })
  await menu.getByRole('menuitem', { name: 'Configurações' }).click()
  assert.equal(await page.getByRole('menuitem', { name: 'Privacidade', exact: true }).count(), 1)
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('menu').count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Menu da conta', exact: true }).evaluate(el => el === document.activeElement), true)
  await page.getByRole('button', { name: 'Menu da conta', exact: true }).click(); await page.locator('.waddle-header').click(); assert.equal(await page.getByRole('menu').count(), 0)
  const input = page.getByRole('textbox', { name: 'Mensagem para Ted Mosby' })
  await input.fill('Uma linha\nSegunda linha\nTerceira linha\nQuarta linha')
  assert.ok((await input.boundingBox()).height > initial.fieldHeight + 30)
  await input.fill(''); assert.equal((await input.boundingBox()).height, initial.fieldHeight)
  await choose('Ash'); await page.getByRole('button', { name: 'Computador e serviços locais' }).click()
  await page.waitForFunction(() => document.querySelector('[data-pencil-name="Prévia da tela do agente"]')?.style.backgroundImage.includes('data:image/png'))
  assert.equal(monitors.at(-1), 'chat-west')
  await choose('Ted Mosby'); assert.equal(await page.locator('.pencil-agent-panel').count(), 0)
  await page.getByRole('button', { name: 'Computador e serviços locais' }).click()
  await page.waitForFunction(() => document.querySelector('[data-pencil-name="Legenda da tela"]')?.textContent.includes('Nenhuma tela nesta conversa'))
  assert.equal(monitors.at(-1), 'chat-ted')
  assert.equal(await page.locator('[data-pencil-name="Prévia da tela do agente"]').evaluate(el => el.style.backgroundImage), 'none')
  // Switch before a delayed Ash capture completes; it must not resurrect in Ted's panel.
  delayAsh = true; await choose('Ash'); const delayedRequest = page.waitForRequest(r => r.url().includes('browser/monitor?conversationId=chat-west')); await page.getByRole('button', { name: 'Computador e serviços locais' }).click()
  await delayedRequest
  await choose('Ted Mosby'); await page.getByRole('button', { name: 'Computador e serviços locais' }).click()
  await page.waitForTimeout(750)
  assert.equal(await page.locator('[data-pencil-name="Prévia da tela do agente"]').evaluate(el => el.style.backgroundImage), 'none')
  await page.locator('.pencil-agent-panel').getByRole('button', { name: 'Fechar painel', exact: true }).first().click()
  await mkdir('.artifacts', { recursive: true }); await page.screenshot({ path: '.artifacts/chat-shell-810.png' })
  await choose('Indiana Jones'); await page.screenshot({ path: '.artifacts/chat-empty-810.png' })
  await page.setViewportSize({ width: 1366, height: 768 }); assert.ok((await layout()).font >= 14)
  await page.screenshot({ path: '.artifacts/chat-shell-1366.png' })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' }); await page.screenshot({ path: '.artifacts/chat-shell-dark.png' })
  assert.deepEqual(errors, [])
 } finally { await browser.close(); server.httpServer.closeAllConnections(); await server.close() }
})
