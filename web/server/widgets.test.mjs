import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createWidgetService, normalizeSymbol, parseQuote } from './widgets.mjs'

test('focus uses wall-clock time, pauses, resumes and survives service restart; private sessions never persist',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'wendler-widgets-'));let now=100000
  try{
    const service=createWidgetService({dataDir:dir,clock:()=>now})
    const {data}=await service.call({kind:'focus',minutes:1,title:'Ler'},{conversationId:'chat'})
    now+=12500;assert.equal((await service.getFocus(data.id)).remaining,48)
    const paused=await service.actionFocus(data.id,'pause');now+=600000;assert.equal((await service.getFocus(data.id)).remaining,paused.remaining)
    await service.actionFocus(data.id,'resume');now+=3000;assert.equal((await service.getFocus(data.id)).remaining,45)
    const restarted=createWidgetService({dataDir:dir,clock:()=>now});assert.equal((await restarted.getFocus(data.id)).remaining,45)
    await restarted.actionFocus(data.id,'restart');assert.equal((await restarted.getFocus(data.id)).remaining,60)
    const secret=await service.call({kind:'focus',minutes:2,title:'Privado'},{conversationId:'private',privateHistory:true})
    assert.ok(!(await readFile(path.join(dir,'focus.json'),'utf8')).includes(secret.data.id))
    now+=61000;assert.equal((await restarted.getFocus(data.id)).status,'completed')
    await restarted.actionFocus(data.id,'duration',2);assert.equal((await restarted.getFocus(data.id)).remaining,120)
    await assert.rejects(()=>service.actionFocus(data.id,'invalid'),/inválida/)
  }finally{await rm(dir,{recursive:true,force:true})}
})
test('quotes validate tickers and compute daily variation using prior daily close, not month opening',()=>{
  assert.equal(normalizeSymbol('petr4'),'PETR4.SA');assert.equal(normalizeSymbol('^BVSP'),'^BVSP');assert.throws(()=>normalizeSymbol('../file'),/inválido/)
  const quote=parseQuote({meta:{symbol:'AAPL',currency:'USD',regularMarketPrice:110,regularMarketTime:123,chartPreviousClose:80},timestamp:[1,2,3],indicators:{quote:[{close:[80,100,110]}]}})
  assert.ok(Math.abs(quote.change-10)<.0001);assert.equal(quote.history.length,3)
  assert.throws(()=>parseQuote({meta:{symbol:'FAKE'}}),/válida/)
})
test('task widget reads only the requested conversation/project and never creates sample rows',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'wendler-tasks-'))
  try{
    await writeFile(path.join(dir,'frontend.json'),JSON.stringify({'wendler:frontend:v1':{value:{chats:[{id:'chat',projectId:'p'}]}},'waddle:records:v1':{value:[{id:'p',kind:'projeto',title:'Leitura',fields:{'wendler:project:v1':JSON.stringify({tasks:[{id:'t',title:'Ler',status:'todo'}]})}}]}}))
    const service=createWidgetService({dataDir:dir});assert.equal((await service.call({kind:'tasks'},{conversationId:'chat'})).data.tasks[0].title,'Ler');assert.deepEqual((await service.call({kind:'tasks'},{conversationId:'other'})).data.tasks,[])
  }finally{await rm(dir,{recursive:true,force:true})}
})
test('record widgets use saved categories, exclude archived records and scope projects to the conversation',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'wendler-record-widgets-'))
  try{await writeFile(path.join(dir,'frontend.json'),JSON.stringify({'waddle:records:v1':{value:[{id:'bill',kind:'conta',title:'Internet',fields:{Valor:'100'},updated:1},{id:'archived',kind:'conta',title:'Antiga',fields:{},archived:true},{id:'other',kind:'projeto',title:'Outro projeto',fields:{}}]}}));const service=createWidgetService({dataDir:dir});const result=await service.call({kind:'records',category:'conta'},{conversationId:'chat'});assert.equal(result.type,'records');assert.deepEqual(result.data.records.map(r=>r.id),['bill']);assert.deepEqual((await service.call({kind:'records',category:'projeto'},{conversationId:'chat'})).data.records,[]);await assert.rejects(()=>service.call({kind:'records',category:'token'},{conversationId:'chat'}),/categoria/)}finally{await rm(dir,{recursive:true,force:true})}
})

test('monthly spending uses actual saved records and never substitutes sample amounts',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'wendler-spending-'));try{await writeFile(path.join(dir,'frontend.json'),JSON.stringify({'waddle:records:v1':{value:[{id:'real',kind:'gasto',title:'Compra',updated:Date.now(),fields:{Data:'2026-10-10',Valor:'R$ 123,45'}},{id:'archived',archived:true,kind:'gasto',fields:{Data:'2026-10-10',Valor:'500,00'}}]}}));const service=createWidgetService({dataDir:dir,clock:()=>Date.parse('2026-10-11T12:00:00Z')});const widget=await service.call({kind:'spending'},{conversationId:'chat'});assert.equal(widget.type,'spending');assert.equal(widget.data.total,123.45);assert.equal(widget.data.count,1)}finally{await rm(dir,{recursive:true,force:true})}})
