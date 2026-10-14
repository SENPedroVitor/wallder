import assert from 'node:assert/strict'
import { mentionedAgents, transitionTask, loadTasks, taskStorageKey, taskTitle } from '../src/chatWork.ts'
const agents = [{ id:'indy', name:'Indiana' }, { id:'songbird', name:'Songbird' }, { id:'tony', name:'Tony Stark' }]
assert.deepEqual(mentionedAgents('@Indiana, passe a pesquisa para @Songbird.',agents).map(a=>a.id), ['indy','songbird'])
assert.deepEqual(mentionedAgents('@Tony Stark: revise. @Tony Stark',agents).map(a=>a.id), ['tony'])
assert.deepEqual(mentionedAgents('Indiana e @Indianapolis',agents), [])
assert.equal(taskTitle('@Indiana, organize as referências. Este é um estudo.'), 'Organize as referências')
assert.equal(taskTitle('@C-3PO, analise este arquivo'), 'Analise este arquivo')
const task = { id:'task',chatId:'individual:west',agent:'indy',title:'Pesquisa',instruction:'Pesquisar referências',status:'thinking',created:1,updated:1,history:[{status:'thinking',at:1}],context:[{speaker:'Você',text:'Um projeto local'}] }
const blocked = transitionTask(task,'blocked',2)
assert.equal(task.status,'thinking')
assert.equal(blocked.history.length,2)
assert.equal(transitionTask(blocked,'blocked',3),blocked)
const done = transitionTask(blocked,'done',4)
assert.match(done.result,/Um projeto local/)
assert.match(done.result,/Nenhuma ferramenta externa/)
globalThis.localStorage = { getItem:key=>key===taskStorageKey?JSON.stringify([done,{...done,id:'bad',status:'inventado'}]):null }
assert.equal(loadTasks(['indy']).length,1)
assert.equal(loadTasks(['west']).length,0)
console.log('PASS: mention boundaries, unique recipients, immutable transitions, task context, persisted status validation')
