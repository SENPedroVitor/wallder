import test from 'node:test'
import assert from 'node:assert/strict'
import { agentPersonalities, personalityInstructions } from '../server/personas.mjs'

test('every supported agent has durable instructions and unknown identities are rejected', () => {
  assert.equal(new Set(agentPersonalities.map(agent => agent.id)).size, 20)
  for (const agent of agentPersonalities) {
    const instructions = personalityInstructions(agent.id)
    assert.ok(instructions.length > 300)
    assert.match(instructions, /especialidade/)
  }
  assert.throws(() => personalityInstructions('unknown'), /Agente desconhecido/)
})

test('Ted preserves acervo records and Kyle keeps the design role when replaying old examples', () => {
  const ted = personalityInstructions('ted')
  for (const tool of ['search_acervo', 'get_acervo_item', 'add_acervo_item', 'edit_acervo_item']) assert.ok(ted.includes(tool))
  assert.match(ted, /antes de cadastrar para evitar duplicatas/)
  assert.match(ted, /Não invente nota, resenha/)
  assert.match(ted, /Não assuma matemática, finanças ou programação/)
  assert.match(personalityInstructions('kyle'), /interface, identidade visual e animação/)
  assert.match(personalityInstructions('kyle'), /Não abra com gastos ou finanças/)
})
