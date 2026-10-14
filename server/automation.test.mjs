import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createAutomationSettings, automaticMcpPermission } from './automation.mjs'
import { BrowserBridge } from './browser.mjs'

test('team autonomy survives restart, can be revoked and rejects unsupported settings', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'wendler-automation-'))
  try {
    const settings = createAutomationSettings(dir)
    assert.equal((await settings.read()).mode,'manual')
    await settings.save({mode:'automatic'})
    assert.equal((await createAutomationSettings(dir).read()).mode,'automatic')
    await assert.rejects(settings.save({mode:'anything'}))
    await settings.save({mode:'manual'})
    assert.equal((await settings.read()).mode,'manual')
  } finally { await rm(dir,{recursive:true,force:true}) }
})

test('common connector permission forms are automatic without fabricating form input', () => {
  const params={mode:'form',requestedSchema:{type:'object',properties:{}},_meta:{tool_name:'search_acervo',riskLevel:'low'}}
  assert.deepEqual(automaticMcpPermission(params),{})
  assert.equal(automaticMcpPermission({...params,_meta:{riskLevel:'high'}}),null)
  assert.equal(automaticMcpPermission({...params,_meta:{tool_name:'send_email'}}),null)
  assert.equal(automaticMcpPermission({...params,requestedSchema:{properties:{password:{type:'string'}},required:['password']}}),null)
  assert.equal(automaticMcpPermission({...params,mode:'url'}),null)
})

test('automatic navigation keeps stale observations and sensitive actions under review', () => {
  const browser=new BrowserBridge('test');browser.context={};browser.page={url:()=> 'https://example.com/'};browser.generation=1
  browser.observation={id:'fresh',generation:1,url:browser.page.url(),targets:[{name:'Abrir detalhes',type:'button',autocomplete:''}]}
  const action={action:'click',target:0,observationId:'fresh'}
  assert.equal(browser.review(action,{automation:'automatic'}).confirmation,false)
  assert.equal(browser.review(action).confirmation,true)
  assert.throws(()=>browser.review({...action,observationId:'old'},{automation:'automatic'}))
  browser.observation.targets[0].name='Publicar'
  assert.equal(browser.review(action,{automation:'automatic'}).confirmation,true)
  browser.observation.targets[0]={name:'E-mail',type:'email',autocomplete:'email'}
  assert.equal(browser.review({...action,action:'fill',text:'test@example.com'},{automation:'automatic'}).confirmation,true)
})
