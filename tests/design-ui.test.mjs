import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { chromium } from 'playwright-core'
test('design preview is visible in chat, enlarges, closes with Escape and downloads code without the editor',{timeout:60000},async()=>{
 const server=await createServer({configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen()
 const browser=await chromium.launch({executablePath:process.env.WENDLER_TEST_CHROME,headless:true,args:['--no-sandbox']})
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000)
  await page.route('**/api/design/asset?**',async route=>{const url=new URL(route.request().url());assert.equal(url.searchParams.get('revision'),'2');assert.equal(url.searchParams.get('conversation'),'test-chat');const png=url.searchParams.get('format')==='png';await route.fulfill({contentType:png?'image/png':'text/html',headers:png?{}:{'Content-Disposition':'attachment; filename="imhotep.html"'},body:png?Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+X8AAAAASUVORK5CYII=','base64'):'<html><h1>Exportação de teste</h1></html>'})})
  await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/tests/fixtures/design.html')
  await page.getByRole('button',{name:'Ampliar tela',exact:true}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0)
  const download=page.waitForEvent('download');await page.getByRole('link',{name:'HTML',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.html'))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[])
 }finally{await browser.close();server.httpServer.closeAllConnections();await server.close()}
})
