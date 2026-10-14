import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { frontendStore } from '../server/frontend-store.mjs'
const key='waddle:records:v1'
const url=new URL('http://127.0.0.1:5174/api/storage?key='+encodeURIComponent(key))
const request=(input)=>Object.assign(Readable.from(input?[Buffer.from(JSON.stringify(input))]:[]),{method:input?'POST':'GET'})
test('registros locais sobrevivem à recarga e rejeitam gravações concorrentes obsoletas',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wendler-records-'))
 try{
  const first={id:'teste-a',kind:'gasto',title:'Registro A',fields:{Valor:'12,50'},updated:1}
  const second={...first,id:'teste-b',title:'Registro B'}
  const writes=await Promise.all([frontendStore(request({key,value:[first],revision:0}),url,dir),frontendStore(request({key,value:[second],revision:0}),url,dir)])
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409])
  const stored=await frontendStore(request(),url,dir)
  const record=stored.value.records[key]
  assert.equal(record.revision,1)
  assert.equal(record.value.length,1)
  assert.deepEqual(JSON.parse(await readFile(path.join(dir,'frontend.json'),'utf8'))[key],record)
  const next=await frontendStore(request({key,value:[...record.value,{...first,id:'teste-c'}],revision:1}),url,dir)
  assert.equal(next.status,200)
  assert.equal(next.value.revision,2)
  assert.equal((await frontendStore(request(),url,dir)).value.records[key].value.length,2)
 }finally{assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));assert.ok(path.basename(dir).startsWith('wendler-records-'));await rm(dir,{recursive:true,force:true})}
})
