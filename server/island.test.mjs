import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createIslandActivity} from './island.mjs'
const agents=[{id:'west',name:'Ash',role:'Coordenação'},{id:'pam',name:'Pam',role:'Organização'}]
test('travel activity carries route context only for non-private real runs',()=>{
 const service=createIslandActivity(),journey={kind:'bus',origin:'Unaí',destination:'Brasília',stage:'researching'}
 service.observe({requestId:'bus',agentId:'pam'},{type:'activity',text:'Conferindo a página…',journey})
 service.observe({requestId:'private-bus',agentId:'pam',privateHistory:true},{type:'activity',text:'Conferindo a página…',journey})
 const tasks=service.snapshot({agents,ready:true}).tasks
 assert.equal(tasks.find(task=>task.id==='bus').journey.destination,'Brasília');assert.equal(tasks.find(task=>task.id==='private-bus').journey,undefined)
})
test('island reports actual activity and unknown progress stays unknown',()=>{
 let clock=1000;const service=createIslandActivity({now:()=>clock}),run={requestId:'run',agentId:'pam',conversationId:'chat',requestedAt:900}
 service.observe(run,{type:'activity',text:'Pesquisando…',phase:'researching'})
 let task=service.snapshot({agents,ready:true}).tasks[0]
 assert.equal(task.agentId,'pam');assert.equal(task.agentName,'Pam');assert.equal(task.startedAt,900);assert.equal(task.status,'running');assert.equal(task.progress,undefined)
 clock=3000;service.observe(run,{type:'done',status:'completed',text:'Resposta real'})
 task=service.snapshot({agents,ready:true}).tasks[0];assert.equal(task.status,'completed');assert.equal(task.summary,'Resposta real');assert.equal(task.finishedAt,3000);assert.equal(task.activity,'Resposta concluída')
})
test('private responses and their Pix contents never enter island history',()=>{
 const service=createIslandActivity(),run={requestId:'private',agentId:'pam',conversationId:'secret-chat',privateHistory:true}
 service.observe(run,{type:'widget',widget:{type:'pix',data:{image:'data:image/png;base64,AAAA',total:1,code:'000201private'}}})
 service.observe(run,{type:'done',status:'completed',text:'sensitive text'})
 const task=service.snapshot({agents,ready:true}).tasks[0]
 assert.equal(task.summary,undefined);assert.equal(task.pix,undefined);assert.equal(task.conversationId,undefined)
})
test('approval from another interface disappears and no QR is fabricated',()=>{
 const service=createIslandActivity(),run={requestId:'run',agentId:'west'}
 service.observe(run,{type:'approval',id:'approval',title:'Autorizar ação',details:{reason:'Motivo real'}})
 assert.equal(service.snapshot({agents,ready:true,approvals:new Map([['approval',{}]])}).tasks[0].approval.id,'approval')
 assert.equal(service.snapshot({agents,ready:true}).tasks[0].approval,undefined)
 service.observe(run,{type:'widget',widget:{type:'pix',data:{image:'https://untrusted.example/qr',total:1}}})
 assert.equal(service.snapshot({agents,ready:true}).tasks[0].pix,undefined)
})

test('completed notices expire on reads and explicit dismissal without hiding active work',()=>{
 let clock=1000;const service=createIslandActivity({now:()=>clock}),run={requestId:'reply',agentId:'pam',conversationId:'chat'};
 service.observe(run,{type:'done',status:'completed',text:'done'});service.observe({...run,requestId:'active'},{type:'activity',text:'working'});
 service.acknowledge({conversationId:'chat',through:999});assert.equal(service.snapshot({agents,ready:true}).tasks.length,2);
 service.acknowledge({conversationId:'chat',through:1000});assert.deepEqual(service.snapshot({agents,ready:true}).tasks.map(task=>task.id),['active']);
 service.acknowledge({id:'active'});assert.equal(service.snapshot({agents,ready:true}).tasks.length,1);
 service.observe({...run,requestId:'second'},{type:'done',status:'completed'});clock=61001;assert.deepEqual(service.snapshot({agents,ready:true}).tasks.map(task=>task.id),['active']);
 service.observe({...run,requestId:'third'},{type:'done',status:'completed'});service.acknowledge({id:'third'});assert.deepEqual(service.snapshot({agents,ready:true}).tasks.map(task=>task.id),['active']);
 const snapshot=service.snapshot({agents,ready:true,prefs:{pam:{color:'blue',name:'Pam nova'}}});assert.equal(snapshot.agents.find(agent=>agent.id==='pam').color,'blue');assert.equal(snapshot.tasks[0].agentName,'Pam nova');assert.equal(snapshot.agents.find(agent=>agent.id==='west').color,undefined);
})
