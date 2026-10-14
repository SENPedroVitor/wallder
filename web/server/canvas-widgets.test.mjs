import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createCanvasWidgets, widgetCatalog, validateCanvas } from './canvas-widgets.mjs'
import { mathContent } from './math-widget.mjs'

function flashcard(){const definition=widgetCatalog('y57ZsF');return {screen:definition.id,bindings:Object.fromEntries(definition.slots.map(s=>[s.name,s.name==='Flashcard — pergunta'?'O que é CSS?':''])),actions:[{target:'Ação do card',label:'Revelar resposta',kind:'set',toggle:true,patch:{'Flashcard — pergunta':'Folhas de estilo em cascata.'}}]}}
test('official designs require every slot, bound length, valid actions and real chart values',()=>{
  assert.ok(widgetCatalog().length>60)
  const recipe=widgetCatalog('uxJpe');assert.ok(recipe.slots.some(s=>s.name==='Ingredientes — lista'&&s.lines===3));assert.ok(recipe.slots.some(s=>s.name==='Preparo — passos'&&s.lines===3))
  const args=flashcard();assert.equal(validateCanvas(args).region,'Estudos · flashcard — widget na resposta')
  delete args.bindings['Flashcard — pergunta'];assert.throws(()=>validateCanvas(args),/ausente/)
  assert.throws(()=>validateCanvas({...flashcard(),screen:'../../x'}),/catálogo/)
  assert.throws(()=>validateCanvas({...flashcard(),actions:[{target:'Ação do card',label:'Abrir',kind:'link',url:'javascript:alert(1)'}]}),/link web/)
  assert.throws(()=>validateCanvas({...flashcard(),actions:[{target:'Ação do card',label:'Resposta',kind:'set',patch:{unknown:'fake'}}]}),/inválida/)
  assert.throws(()=>validateCanvas({...flashcard(),charts:[{target:'Flashcard — superfície',values:[1,NaN]}]}),/série numérica/)
})
test('interactive answer persists across restart, toggles back, and private answers stay off disk',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'wendler-official-'))
  try{
    const service=createCanvasWidgets(dir),value=await service.create(flashcard(),{conversationId:'study'})
    const answer=await service.action(value.id,'Ação do card');assert.equal(answer.bindings['Flashcard — pergunta'],'Folhas de estilo em cascata.')
    const restarted=createCanvasWidgets(dir);assert.equal((await restarted.get(value.id)).revision,1)
    assert.equal((await restarted.action(value.id,'Ação do card')).bindings['Flashcard — pergunta'],'O que é CSS?')
    const secret=await service.create(flashcard(),{conversationId:'private',privateHistory:true});await service.action(secret.id,'Ação do card')
    assert.ok(!(await readFile(path.join(dir,'widgets.json'),'utf8')).includes(secret.id))
    await assert.rejects(()=>service.action(value.id,'missing'),/não encontrada/)
  }finally{await rm(dir,{recursive:true,force:true})}
})
test('quadratic controls recompute actual roots and graph; linear and invalid coefficients are handled',async()=>{
  assert.equal(mathContent({a:0,b:0,c:0}).bindings['Primeira raiz — resultado'],'Todos os reais')
  assert.equal(mathContent({a:0,b:0,c:1}).bindings['Primeira raiz — resultado'],'Sem solução')
  const graph=mathContent({a:1,b:-4,c:3});assert.equal(graph.values[8],3);assert.equal(graph.values[24],0);assert.equal(graph.values[56],0)
  const dir=await mkdtemp(path.join(tmpdir(),'wendler-math-'))
  try{const service=createCanvasWidgets(dir),value=await service.math({a:1,b:-4,c:3},{conversationId:'math'});assert.equal(value.bindings['Primeira raiz — resultado'],'x₁ = 1');assert.equal(value.bindings['Segunda raiz — resultado'],'x₂ = 3');const changed=await service.action(value.id,'math:set:c:0');assert.equal(changed.bindings['Primeira raiz — resultado'],'x₁ = 0');assert.equal(changed.bindings['Segunda raiz — resultado'],'x₂ = 4');assert.equal(changed.charts[0].values.length,81);const linear=await service.action(value.id,'math:decrease:a');assert.equal(linear.formula.a,0);assert.equal(linear.bindings['Título da matemática'],'Equação linear');await assert.rejects(()=>service.action(value.id,'math:set:a:101'),/coeficientes/)}finally{await rm(dir,{recursive:true,force:true})}
})
