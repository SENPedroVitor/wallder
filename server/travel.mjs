import { widgetCatalog } from './canvas-widgets.mjs'

const compact = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
const safe = (value,max=160) => typeof value==='string'?value.trim().slice(0,max):''
const city = value => safe(value).split(/,|\s+-\s+/)[0].trim()
export function travelContext(args) {
  if(!['bus','cinema'].includes(args.kind))throw Error('Escolha ônibus ou cinema.')
  return {kind:args.kind,origin:safe(args.origin,80),destination:safe(args.destination,80),date:safe(args.date,40),movie:safe(args.movie,100),stage:'preparing'}
}
export function observedSeats(input,proof) {
  if(!Array.isArray(input)||input.length>120)throw Error('Informe até 120 poltronas observadas.')
  const seen=new Set()
  return input.map(item=>{
    if(!/^[A-Z]{1,3}\d{1,3}$/.test(item.label)||!Number.isInteger(item.target))throw Error('Poltrona inválida.')
    const target=proof.targets?.find(target=>target.target===item.target),name=compact(target?.name)
    if(!target||!new RegExp('(^|[^a-z0-9])'+item.label.toLowerCase()+'([^a-z0-9]|$)').test(name)||seen.has(item.label))throw Error('A poltrona precisa aparecer nos controles da página observada.')
    seen.add(item.label)
    const status=/ocupad|indisponivel|reservad|vendid/.test(name)?'occupied':/selecionad/.test(name)?'selected':/livre|disponivel/.test(name)?'available':'unknown'
    return {label:item.label,status}
  })
}
export function travelCard(args,proof,now=Date.now()) {
  const context=travelContext(args)
  if(!proof?.url || (!proof.text&&!proof.unavailable) || now-proof.checkedAt>5*60000)throw Error('Consulte a página novamente antes de montar o card. A observação precisa ter menos de cinco minutos.')
  const url=new URL(proof.url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Fonte inválida.')
  const text=compact(proof.text+' '+(proof.targets||[]).map(target=>target.name).join(' '))
  const check=(value,label,max=160)=>{const result=safe(value,max);if(result&&(proof.unavailable||!text.includes(compact(result))))throw Error(label+' não aparece na leitura da página. Use o texto exato ou deixe o campo vazio.');return result}
  const price=check(args.price,'Preço',18),departure=check(args.departure,'Partida',12),arrival=check(args.arrival,'Chegada',12),duration=check(args.duration,'Duração',50),availability=check(args.availability,'Disponibilidade',75),venue=check(args.venue,'Local',68),format=check(args.format,'Formato',68)
  if(price&&!/\d/.test(price))throw Error('Preço sem valor. Deixe vazio quando ainda não publicado.')
  const sessions=Array.isArray(args.sessions)?args.sessions.map(value=>check(value,'Sessão',18)).filter(Boolean).slice(0,3):[]
  const seats=observedSeats(args.seats||[],proof)
  const anchor=context.kind==='bus'?context.destination:context.movie
  const movieVerified=context.kind==='cinema'&&!!context.movie&&text.includes(compact(context.movie))
  const venueVerified=context.kind==='cinema'&&[venue,context.destination].some(value=>value&&text.includes(compact(value)))
  if(!anchor || (!proof.unavailable&&!(text.includes(compact(anchor))||venueVerified)))throw Error('A página consultada precisa mencionar o destino, cinema ou filme do pedido.')
  if(context.kind==='cinema'&&!movieVerified&&(price||sessions.length||seats.length))throw Error('O filme não apareceu na fonte. Não associe sessões, preço ou poltronas de outro filme.')
  if((price||sessions.length||departure)&&(!context.date||!text.includes(compact(context.date))))throw Error('A data da opção precisa aparecer na página. Copie a data exata da sessão ou viagem, ou omita preço e horários enquanto não houver uma data consultada.')
  const screen=context.kind==='bus'?'DAoP0':'lk4e2',definition=widgetCatalog(screen)
  const bindings=Object.fromEntries(definition.slots.map(slot=>[slot.name,'']))
  const put=(key,value)=>{const slot=definition.slots.find(slot=>slot.name===key);if(slot){const full=safe(value,1000);bindings[key]=full.length>slot.maxLength?full.slice(0,slot.maxLength-1).trimEnd()+'…':full}}
  const actions=[]
  if(context.kind==='bus'){
    put('Origem e destino',[context.origin,context.destination].filter(Boolean).join(' → '));put('Estado da passagem',price?'CONSULTADA':'A CONSULTAR');put('Data e tipo',[context.date,format].filter(Boolean).join(' · '));put('Partida',departure||'A consultar');put('Chegada',arrival||'A consultar');put('Separador de horários','→');put('Duração da viagem',duration);put('Valor da passagem',price||'A consultar');put('Disponibilidade',availability||'Poltronas não consultadas');put('Local de saída',venue);put('Origem — mapa',context.origin);put('Destino — mapa',context.destination);put('Mapa — indicação da rota','ESQUEMA DA ROTA');put('Ação do card','Conferir na viação');actions.push({target:'Ação do card',label:'Conferir na viação',kind:'link',url:url.href})
  }else{
    put('Filme para assistir',context.movie);put('Cinema e sala',venue||context.destination);put('Data da sessão',[context.date,format].filter(Boolean).join(' · '));put('Título da escolha de assentos',seats.length?'Poltronas consultadas · conferir no site':'Mapa ainda não consultado');put('Legenda da tela','TELA');put('Valor do ingresso',price||'A consultar');put('Tipo e poltrona','Nenhuma reserva');put('Texto da legenda 0','Livre');put('Texto da legenda 1','Ocupada');put('Texto da legenda 2','Na página');put('Continuar compra — texto','Conferir no cinema');put('Ação do card',sessions.length?'Ver sessões no site':'Consultar programação')
    const times=['18:30','21:00','23:15'];times.forEach((time,index)=>{put('Sessão '+time+' — texto',sessions[index]);if(sessions[index])actions.push({target:'Sessão '+time+' — base',label:sessions[index],kind:'request',prompt:'Confira novamente a sessão '+sessions[index]+' de '+context.movie+' em '+(venue||context.destination)+' na data '+context.date+' pela fonte '+url.href+'. Mostre o preço e as poltronas atuais, sem reservar nem comprar.'})})
    actions.push({target:'Continuar compra — base',label:'Conferir no cinema',kind:'link',url:url.href},{target:'Ação do card',label:bindings['Ação do card'],kind:'link',url:url.href})
  }
  put('Agente da resposta','')
  if(context.kind==='bus'){
    put('Origem e destino',[city(context.origin),city(context.destination)].filter(Boolean).join(' → '))
    if(!context.date)put('Data e tipo','Data a definir')
    if(duration&&!departure)put('Duração da viagem','Duração na fonte: '+duration)
  }else if(!context.date)put('Data da sessão','Data e sessão a definir')
  if(proof.unavailable){put('Estado da passagem','NÃO VERIFICADA');put('Título da escolha de assentos','Não foi possível consultar a fonte')}
  if(context.kind==='bus'&&context.origin&&context.destination)actions.push({target:'Mini mapa da rota',label:'Abrir rota no mapa',kind:'link',url:'https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(context.origin)+'&destination='+encodeURIComponent(context.destination)+'&travelmode=driving'})
  return {args:{screen,bindings,actions,notes:'Fonte: '+url.href+'\n'+(proof.unavailable?'Não foi possível ler a fonte. Tentativa em ':'Consultado em ')+new Date(proof.checkedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'.\nPreço, horários e disponibilidade podem mudar. Campo não consultado não representa indisponibilidade. O mapa da rota é esquemático. Nenhuma reserva ou compra foi feita.'},journey:{...context,source:url.href,checkedAt:proof.checkedAt,sourceUnavailable:!!proof.unavailable,seats,sessions}}
}
export const travelTools=[{type:'function',name:'wendler_travel',description:'Use for EVERY bus/trip or cinema/session request to show the ORIGINAL Pencil cards automatically in the conversation. action=research sets a real preparation activity in the Windows island, then prefer action=read with url for a public Cine Araújo, ClickBus or BuscaOnibus page. This is faster and avoids unrelated advertising tabs. read returns sourceId and real page text; use that sourceId in present. Use wendler_browser for seat maps, interactive searches and other providers. Ask only missing origin, destination, date, city/cinema before searching. action=present creates the official bus or cinema card with a sourceId returned by read or observationId by an actual browser call in this request, less than five minutes old. Copy facts EXACTLY from the observed text; omit unpublished prices, times and seats. Present a card even when only part of the information is available. Never fill drawing examples. No ticket is purchased by this tool. For Dune and future releases, show unpublished programming as unqueried, never invent sessions. Seats must reference real visible browser target indices; their status is derived from accessible labels, never supplied by you. Supported kinds bus and cinema. Do not show a purchased-ticket card without a real receipt.',inputSchema:{type:'object',additionalProperties:false,required:['action','kind'],properties:{action:{type:'string',enum:['research','read','present']},kind:{type:'string',enum:['bus','cinema']},origin:{type:'string',maxLength:80},destination:{type:'string',maxLength:80},date:{type:'string',maxLength:40},movie:{type:'string',maxLength:100},url:{type:'string',maxLength:2000},sourceId:{type:'string',maxLength:100},price:{type:'string',maxLength:18},departure:{type:'string',maxLength:12},arrival:{type:'string',maxLength:12},duration:{type:'string',maxLength:50},availability:{type:'string',maxLength:75},venue:{type:'string',maxLength:68},format:{type:'string',maxLength:68},sessions:{type:'array',maxItems:3,items:{type:'string',maxLength:18}},seats:{type:'array',maxItems:120,items:{type:'object',additionalProperties:false,required:['label','target'],properties:{label:{type:'string',pattern:'^[A-Z]{1,3}\\d{1,3}$'},target:{type:'integer',minimum:0,maximum:119}}}}}}}]
