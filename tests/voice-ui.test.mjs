import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import puppeteer from 'puppeteer-core'
test('recording inserts reviewed text, cancel and chat change release the microphone, errors preserve the draft', {timeout:60000}, async()=>{
  const server=await createServer({configFile:false,plugins:[react()],optimizeDeps:{entries:['tests/fixtures/voice.html']},server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen()
  const browser=await puppeteer.launch({executablePath:process.env.WENDLER_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']})
  let calls=0,fail=false
  try{
    const page=await browser.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(10000);await page.setViewport({width:800,height:600});const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Voice fixture:',error.message)})
    await page.evaluateOnNewDocument(()=>{const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);window.voiceTracks=stream.getTracks();return stream}})
    await page.setRequestInterception(true);page.on('request',request=>{if(request.url().endsWith('/api/audio/transcribe')){calls++;void request.respond({status:fail?429:200,contentType:'application/json',body:JSON.stringify(fail?{error:'Serviço ocupado no teste.'}:{text:'Texto transcrito no teste.'})})}else void request.continue()})
    await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/tests/fixtures/voice.html')
    await page.click('[aria-label="Áudio e transcrição"]');await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Gravar áudio')).click());await page.waitForSelector('[role="timer"]');await new Promise(resolve=>setTimeout(resolve,1100));await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Parar e transcrever')).click())
    await page.waitForFunction(()=>document.querySelector('[aria-label="Mensagem de teste"]').value.includes('Texto transcrito no teste.'));assert.equal(calls,1);assert.equal(await page.evaluate(()=>window.submissions||0),0);assert.ok(await page.evaluate(()=>window.voiceTracks.every(track=>track.readyState==='ended')))
    await page.click('[aria-label="Áudio e transcrição"]');await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Gravar áudio')).click());await page.waitForSelector('[role="timer"]');await page.click('[aria-label="Cancelar áudio"]');assert.equal(calls,1);assert.ok(await page.evaluate(()=>window.voiceTracks.every(track=>track.readyState==='ended')))
    await page.click('[aria-label="Áudio e transcrição"]');await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Gravar áudio')).click());await page.waitForSelector('[role="timer"]');await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='Trocar conversa de teste').click());assert.ok(await page.evaluate(()=>window.voiceTracks.every(track=>track.readyState==='ended')));assert.equal(calls,1)
    fail=true;await page.click('[aria-label="Áudio e transcrição"]');await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Gravar áudio')).click());await page.waitForSelector('[role="timer"]');await new Promise(resolve=>setTimeout(resolve,1100));await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Parar e transcrever')).click());await page.waitForSelector('[role="alert"]');assert.equal(await page.$eval('[aria-label="Mensagem de teste"]',node=>node.value),'Outra conversa');assert.deepEqual(errors,[])
  }finally{await browser.close();server.httpServer.closeAllConnections();await server.close()}
})
