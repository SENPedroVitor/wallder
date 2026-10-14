import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryForAgent, memoryRevision } from '../src/design/agentMemory.ts'

test('agent memory preserves prior preferences and includes only authorized active records',()=>{
 const record=(id,agent,content,updated=1,archived=false)=>({id,kind:'memoria',title:id,fields:{Agente:agent,Conteúdo:content},updated,archived})
 const records=[record('pam','pam','Só Pam'),record('west','west','Só West',2),record('all','Todos','Equipe',3),record('archived','west','Arquivada',4,true)]
 const before=JSON.stringify(records)
 assert.equal(memoryForAgent('Preferência anterior',records,'west'),'Preferência anterior\n\nEquipe\n\nSó West')
 assert.equal(memoryForAgent('',records,'pam'),'Equipe\n\nSó Pam')
 assert.equal(memoryForAgent(undefined,records,'ted'),'Equipe')
 assert.equal(JSON.stringify(records),before)
 assert.equal(memoryForAgent('x'.repeat(9000),records,'west').length,8000)
 assert.equal(memoryRevision('memória'),memoryRevision('memória'))
 assert.notEqual(memoryRevision('memória antiga'),memoryRevision('memória corrigida'))
})
