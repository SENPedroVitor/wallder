import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')
test('island renders and its real controls dispatch the intended actions across states', { timeout: 60000 }, async () => {
  const server = http.createServer(async (req, res) => {
    try { const target = path.join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]); if (!target.startsWith(root + path.sep)) throw Error(); res.setHeader('Content-Type', target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : 'text/html'); res.end(await readFile(target)) } catch { res.writeHead(404); res.end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const browser = await puppeteer.launch({ executablePath: process.env.WENDLER_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu'] })
  try {
    const page = await browser.newPage(); await page.setViewport({ width: 720, height: 500 })
    const errors = []; page.on('pageerror', error => errors.push(error.message))
    await page.evaluateOnNewDocument(() => {
      window.fixture = { online: true, ready: true, tasks: [], agents: [{ id: 'west', name: 'Ash' }, { id: 'pam', name: 'Pam' }] }
      window.actions = []
      window.wendlerIsland = { snapshot: async () => window.fixture, pointer: () => {}, onToggle: () => () => {}, hide: () => window.actions.push({ type: 'hide' }), open: value => window.actions.push({ type: 'open', ...value }), action: async value => { window.actions.push(value); return { ok: true } }, onCollapse: callback => { window.collapseIsland=callback;return ()=>{} }, unfollow: async id => {window.fixture.sports=window.fixture.sports.filter(game=>game.id!==id)}, copyPix: async () => {} }
    })
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[data-state="idle"]')
    await page.click('[aria-label="Expandir ilha"]'); await page.waitForSelector('[data-state="expanded"]')
    assert.ok(await page.$eval('.island', node => node.textContent.includes('Equipe conectada')))
    await page.click('[aria-label="Recolher ilha"]'); await page.mouse.move(0, 0)
    await page.evaluate(() => { window.fixture.tasks = [{ id: 'test-run', agentId: 'pam', agentName: 'Pam', conversationId: 'test-chat', status: 'running', startedAt: Date.now(), activity: 'Pesquisando fontes reais' }] })
    await page.waitForSelector('[data-state="working"]'); await new Promise(resolve => setTimeout(resolve, 500))
    await page.click('[aria-label="Interromper resposta"]')
    assert.ok(await page.evaluate(() => window.actions.some(action => action.type === 'cancel' && action.id === 'test-run')))
    await page.mouse.move(0, 0)
    await page.evaluate(() => { window.fixture.tasks[0].approval = { id: 'test-approval', title: 'Revisar alteração', details: { reason: 'Motivo exato da ação' } } })
    await page.waitForSelector('[data-state="approval"]'); await new Promise(resolve => setTimeout(resolve, 500))
    await page.evaluate(() => [...document.querySelectorAll('button')].find(node => node.textContent === 'Revisar').click())
    await page.waitForSelector('.approval-details'); assert.ok(await page.$eval('.approval-details', node => node.textContent.includes('Motivo exato')))
    await page.evaluate(() => [...document.querySelectorAll('button')].find(node => node.textContent === 'Autorizar').click())
    await page.waitForFunction(() => window.actions.some(action => action.type === 'approval' && action.decision === 'accept' && action.id === 'test-approval'))
    await page.evaluate(() => { window.fixture.online = false })
    await page.waitForFunction(() => [...document.querySelectorAll('button')].find(node => node.textContent === 'Autorizar')?.disabled)
    await page.click('[aria-label="Recolher ilha"]'); await page.mouse.move(0, 0); await page.waitForSelector('[data-state="offline"]')
    await page.evaluate(()=>{window.fixture.online=true;window.fixture.tasks=[];window.fixture.sports=[{id:'12345',league:'soccer/all',leagueName:'Futebol',state:'in',detail:"36'",checkedAt:Date.now(),home:{name:'LASK Linz',abbreviation:'LAS',score:0},away:{name:'Liverpool',abbreviation:'LIV',score:2}}]})
    await page.waitForSelector('[data-state="sports"]')
    assert.equal(await page.$eval('.compact-sports strong',node=>node.textContent),'0 : 2')
    await page.click('[aria-label="Expandir placar"]');await page.waitForSelector('.island-score');await new Promise(resolve=>setTimeout(resolve,500))
    await page.evaluate(()=>window.collapseIsland());await page.mouse.move(0,0);await page.waitForSelector('[data-state="sports"]')
    await page.evaluate(()=>{window.fixture.sports[0].away.score=3;window.fixture.sports[0].stale=true})
    await page.waitForFunction(()=>document.querySelector('.compact-sports strong')?.textContent==='0 : 3')
    assert.ok(await page.$eval('.compact-sports',node=>node.textContent.includes('Sem atualização')))
    await page.click('[aria-label="Expandir placar"]');await page.waitForSelector('.island-score');await new Promise(resolve=>setTimeout(resolve,500))
    await page.click('[aria-label="Parar de acompanhar LASK Linz e Liverpool"]');await page.waitForFunction(()=>!document.querySelector('.island-score'))
    assert.equal(errors.length, 0, errors.join('\n'))
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }
})
