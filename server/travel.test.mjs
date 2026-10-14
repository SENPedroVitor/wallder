import { test } from 'node:test'
import assert from 'node:assert/strict'
import { travelCard, observedSeats } from './travel.mjs'
import { validateCanvas } from './canvas-widgets.mjs'
const now=Date.parse('2026-10-14T18:00:00Z')
const proof={url:'https://provider.example/viagens',checkedAt:now,text:'Unaí Brasília 18/12/2026 08:00 11:30 3h 30min R$ 89,90 12 poltronas livres Rodoviária de Unaí Executivo',targets:[]}
test('bus uses original Pencil card, observed facts and a schematic route without claiming purchase',()=>{
  const result=travelCard({kind:'bus',origin:'Unaí',destination:'Brasília',date:'18/12/2026',price:'R$ 89,90',departure:'08:00',arrival:'11:30',duration:'3h 30min',availability:'12 poltronas livres',venue:'Rodoviária de Unaí',format:'Executivo'},proof,now)
  const card=validateCanvas(result.args);assert.equal(card.screen,'DAoP0');assert.equal(card.bindings['Valor da passagem'],'R$ 89,90');assert.equal(card.bindings['Estado da passagem'],'CONSULTADA');assert.equal(card.bindings['Mapa — indicação da rota'],'ESQUEMA DA ROTA');assert.equal(card.actions[0].kind,'link')
})
test('missing future fares and programming stay unknown, no design sample survives',()=>{
  const bus=travelCard({kind:'bus',origin:'Unaí',destination:'Brasília',date:'Dezembro · a definir'},proof,now)
  assert.equal(bus.args.bindings['Valor da passagem'],'A consultar');assert.equal(bus.args.bindings.Partida,'A consultar');assert.equal(bus.args.bindings['Disponibilidade'],'Poltronas não consultadas')
  const cinema=travelCard({kind:'cinema',destination:'Cine Araújo',movie:'Duna 3',date:'Dezembro · a definir'},{...proof,text:'Cine Araújo Brasília Programação'},now)
  validateCanvas(cinema.args);assert.equal(cinema.args.screen,'lk4e2');assert.equal(cinema.args.bindings['Sessão 21:00 — texto'],'');assert.deepEqual(cinema.journey.seats,[]);assert.equal(cinema.args.bindings['Valor do ingresso'],'A consultar')
})
test('rejects stale sources, invented facts, another date and prices from another movie',()=>{
  assert.throws(()=>travelCard({kind:'bus',destination:'Brasília',price:'R$ 1,00'},proof,now),/não aparece/)
  assert.throws(()=>travelCard({kind:'bus',destination:'Brasília'},proof,now+300001),/cinco minutos/)
  assert.throws(()=>travelCard({kind:'bus',destination:'Brasília',date:'19/12/2026',price:'R$ 89,90'},proof,now),/data da opção/)
  assert.throws(()=>travelCard({kind:'cinema',destination:'Brasília',movie:'Duna 3',price:'R$ 89,90'},proof,now),/outro filme/)
})
test('seat state comes from observed controls, not the model or disabled alone',()=>{
  const source={targets:[{target:0,name:'Poltrona A1 disponível',disabled:false},{target:1,name:'Poltrona A2 ocupada',disabled:true},{target:2,name:'B3',disabled:false}]}
  const seats=observedSeats([{target:0,label:'A1'},{target:1,label:'A2'},{target:2,label:'B3'}],source)
  assert.deepEqual(seats.map(seat=>seat.status),['available','occupied','unknown']);assert.throws(()=>observedSeats([{target:0,label:'C4'}],source),/controles/)
})
test('an unavailable source produces an explicitly unverified card and cannot supply a price',()=>{
  const source={url:proof.url,checkedAt:now,text:'',targets:[],unavailable:true}
  const args={kind:'bus',origin:'Unaí',destination:'Brasília'}
  const content=travelCard(args,source,now);assert.equal(content.args.bindings['Estado da passagem'],'NÃO VERIFICADA');assert.equal(content.journey.sourceUnavailable,true);assert.equal(content.args.bindings['Valor da passagem'],'A consultar');assert.throws(()=>travelCard({...args,price:'R$ 89,90'},source,now),/não aparece/)
})
