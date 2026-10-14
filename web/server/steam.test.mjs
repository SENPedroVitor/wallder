import test from 'node:test'
import assert from 'node:assert/strict'
import { SteamService, steamPayment, redactNativeFrame } from './steam.mjs'
import { ComputerBridge } from './computer.mjs'
import { EventEmitter } from 'node:events'
import { runInNewContext } from 'node:vm'

const url='https://cdn.safecharge.com/safecharge_resources/v1/checkout/collectApmFields.html?merchantId=4626141330879790125&merchantSiteId=237088&paymentMethod=apmgw_PIX&currency=BRL&amount=154.70'
const frame={window:{id:1,app:'steamwebhelper.exe',title:'APM Adapter'},accessibility:{tree:`1 document APM Adapter Value: ${url}\n22 edit (settable, string) CPF Value: 52998224725 ID: personal_id`,document_text:'529.982.247-25'},screenshots:[{url:'data:image/png;base64,test'}],image:'data:image/png;base64,test'}
test('protected Steam filling accepts only the verified Steam Pix merchant and amount',()=>{
  assert.deepEqual(steamPayment(frame),{amount:154.7,index:22,origin:'https://cdn.safecharge.com'})
  for(const changed of [url.replace('cdn.safecharge.com','evil.example'),url.replace('237088','999'),url.replace('apmgw_PIX','card'),url.replace('154.70','-1')])assert.throws(()=>steamPayment({...frame,accessibility:{tree:frame.accessibility.tree.replace(url,changed)}}))
})
test('CPF observations hide screenshots, plaintext and sensitive query strings',()=>{
  const redacted=redactNativeFrame(frame),text=JSON.stringify(redacted)
  assert.equal(redacted.image,null);assert.deepEqual(redacted.screenshots,[])
  assert.ok(!text.includes('52998224725'));assert.ok(!text.includes('529.982.247-25'));assert.ok(!text.includes('merchantId='));assert.ok(text.includes('***.***.***-**'))
})
test('native capture never requests screenshots on a CPF page',async()=>{
  const bridge=new ComputerBridge({client:new EventEmitter()}),captures=[]
  const code=bridge.captureCode('captured')
  const context={globalThis:null,wendlerWindow:frame.window,sky:{async get_window_state(args){captures.push(args);return frame}},helper:{redactNativeFrame,steamPayment}}
  context.globalThis=context
  await runInNewContext('(async()=>{'+code.replace(/await import\([^)]*\)/,'globalThis.helper')+'})()',context)
  assert.equal(captures.length,1);assert.equal(captures[0].include_screenshot,false);assert.equal(context.captured.screenshots.length,0)
})
function fixture(){const calls=[];const computer={generation:1,observationId:'fresh',latestFrame:{...frame,payment:steamPayment(frame)},window:frame.window,async apps(){calls.push('apps');return {apps:[{windows:[{id:2,app:'steamwebhelper.exe',title:'Steam'}]}]}},async select({window}){this.window=window;this.generation++},async frame(){return frame},serialized:operation=>operation(),guardCode:()=>'',async execute(code){calls.push(code)},releaseObservation(){}};const protectedData={async status(){return {saved:true,masked:'***.***.***-**'}}};const service=new SteamService({computer,protectedData,dataDir:'C:/private-test'});const run={requestId:'one',agentId:'pam',steamGeneration:1};service.owner='one';return {calls,computer,service,run}}
test('Steam rejects wrong agents, stale observations, refusal and changed window during approval',async()=>{
  const {calls,service,run,computer}=fixture(),args={action:'fill_cpf',observationId:'fresh',purchase:{merchant:'Steam',item:'Dark Souls II',total:154.9,budget:154.9}}
  await assert.rejects(service.execute(args,{...run,agentId:'ted'},async()=>true))
  await assert.rejects(service.execute({...args,observationId:'old'},run,async()=>true))
  await assert.rejects(service.execute(args,run,async()=>false));assert.equal(calls.length,0)
  await assert.rejects(service.execute(args,run,async()=>{computer.generation++;return true}));assert.equal(calls.length,0)
})
test('approved protected fill sends only local code and a masked result, never CPF arguments',async()=>{
  const {calls,service,run}=fixture()
  const result=await service.execute({action:'fill_cpf',observationId:'fresh',purchase:{merchant:'Steam',item:'Dark Souls II',total:154.9,budget:154.9}},run,async review=>{assert.equal(review.details.cpf,'***.***.***-**');assert.equal(review.details.pix,154.7);return true})
  assert.equal(result.filled,true);assert.ok(calls[0].includes('vault.withCpf'));assert.ok(!calls[0].includes('52998224725'));assert.ok(!JSON.stringify(result).includes('52998224725'))
})
test('Steam connection is scoped to a task and never changes windows after refusal',async()=>{
  const {service,run,calls}=fixture();service.owner=null
  await assert.rejects(service.execute({action:'connect'},run,async()=>false));assert.equal(calls.length,0)
  await service.execute({action:'connect'},run,async()=>true)
  await assert.rejects(service.execute({action:'observe'},{...run,requestId:'other'},async()=>true))
  service.release(run);assert.equal(service.owner,null)
})
test('native checkout cannot proceed without an approved item and budget or by typing the CPF',async()=>{
  const {service,run}=fixture();let approvals=0;const authorize=async()=>{approvals++;return true}
  await assert.rejects(service.execute({action:'act',input:{action:'press_key',key:'Return',observationId:'fresh'}},run,authorize),/orçamento/)
  await assert.rejects(service.execute({action:'act',input:{action:'type_text',text:'private',observationId:'fresh'}},run,authorize),/fill_cpf/)
  assert.equal(approvals,0)
})
test('automatic Steam mode skips common navigation approvals and preserves sensitive reviews',async()=>{
  const {service,run,computer}=fixture();run.automation='automatic';computer.window={id:2,app:'steamwebhelper.exe',title:'Steam'};computer.latestFrame={accessibility:{tree:'5 button Wishlist\n6 button Remove game\n7 button Continue to Processor'}};computer.action=async()=>({done:true});let approvals=0;const authorize=async()=>{approvals++;return true}
  await service.execute({action:'act',input:{action:'click',element_index:5,observationId:'fresh'}},run,authorize);assert.equal(approvals,0)
  await service.execute({action:'act',input:{action:'click',element_index:6,observationId:'fresh'}},run,authorize);assert.equal(approvals,1)
  await service.execute({action:'act',input:{action:'click',element_index:7,observationId:'fresh'},purchase:{merchant:'Steam',item:'game',total:10,budget:10}},run,authorize);assert.equal(approvals,2)
  const generation=computer.generation
  await service.execute({action:'connect'},run,authorize);assert.equal(approvals,2);assert.equal(computer.generation,generation)
})
