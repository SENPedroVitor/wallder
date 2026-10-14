import assert from 'node:assert/strict'
import { permanentChats, rememberContact } from '../src/permanentChats.ts'
import { migrateLinkedThreads } from '../src/sharedThreads.ts'
const agents = [{id:'tony',name:'Tony Stark'},{id:'ted',name:'Ted'}]
const old = [
  {id:'a',title:'Primeira',agent:'tony',updated:10,messages:[{id:'m1',at:1},{id:'m3',at:3}]},
  {id:'b',title:'Segunda',agent:'tony',updated:20,messages:[{id:'m2',at:2}]},
  {id:'group',title:'Projeto',agent:'tony',members:['tony','ted'],updated:30,messages:[{id:'g1',at:1}]},
]
const result=permanentChats(old,agents)
assert.equal(result.chats.filter(c=>!c.members&&c.agent==='tony').length,1)
assert.deepEqual(result.chats.find(c=>c.id==='a').messages.map(m=>m.id),['m1','m2','m3'])
assert.equal(result.mapping.b,'a')
assert.equal(result.chats.find(c=>c.agent==='ted'&&!c.members).id,'individual:ted')
assert.deepEqual(result.chats.find(c=>c.id==='group'),old[2])
assert.deepEqual(permanentChats(result.chats,agents).chats,result.chats)
const linked=migrateLinkedThreads({a:{ted:{draft:'',messages:[{sender:'you',text:'one'}]}},b:{ted:{draft:'draft',messages:[{sender:'agent',text:'two'}]}},group:{ted:{draft:'',messages:[]}}},result.mapping)
assert.deepEqual(linked.a.ted.messages.map(m=>m.text),['one','two'])
assert.equal(linked.a.ted.draft,'draft')
assert.ok(linked.group)
assert.deepEqual(rememberContact(['west'],'indy',false),['west','indy'])
assert.deepEqual(rememberContact(['west','indy'],'indy',false),['west','indy'])
assert.deepEqual(rememberContact(['west'],'indy',true),['west'])
console.log('PASS: merge, chronology, identity, empty contacts, group isolation, idempotence, mini-chat preservation')
