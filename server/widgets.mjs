import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getWeather } from './weather.mjs'
import { createCanvasWidgets, widgetCatalog } from './canvas-widgets.mjs'

export const widgetTools = [{ type: 'function', name: 'wendler_widget', description: 'Show a real interactive Wendler widget in the chat. Use focus to start a focus session, market for stock quotes, tasks for saved tasks, weather for weather, spending for monthly spending from saved records. Use kind=math with a,b,c for a quadratic/linear equation: actual computed roots, graph and coefficient controls. For all other official Pencil cards use kind=catalog to list screens, then catalog with screen to get exact required slots and targets, then kind=canvas with EVERY binding, actions and real chart series. Use kind=records with category ONLY when the user asks for their saved records, agenda, finances, birthdays or current project. It returns actual local records, never external account status. Catalog calls only return definitions and do not display a card. Never substitute example values. Do not call focus unless the user requests starting a session.', inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['focus','market','tasks','weather','catalog','canvas','records','math','spending'] }, minutes: { type: 'integer', minimum: 1, maximum: 180 }, title: { type: 'string', maxLength: 160 }, symbols: { type: 'array', items: { type: 'string' }, maxItems: 6 }, city: { type: 'string', maxLength: 100 }, a:{type:'number',minimum:-100,maximum:100},b:{type:'number',minimum:-100,maximum:100},c:{type:'number',minimum:-100,maximum:100},screen:{type:'string'}, category:{type:'string',enum:['gasto','cartao','pix','investimento','aniversario','evento','favorito','projeto','conta','assinatura','parcela','meta','divisao','recebivel','entrega','ingresso','passagem','habito']}, bindings:{type:'object',additionalProperties:{type:'string'}}, notes:{type:'string',maxLength:12000}, actions:{type:'array',maxItems:24,items:{type:'object',properties:{target:{type:'string'},label:{type:'string'},kind:{type:'string',enum:['set','request','link']},patch:{type:'object',additionalProperties:{type:'string'}},toggle:{type:'boolean'},prompt:{type:'string'},url:{type:'string'}},required:['target','label','kind'],additionalProperties:false}},charts:{type:'array',maxItems:6,items:{type:'object',properties:{target:{type:'string'},values:{type:'array',items:{type:'number'},minItems:2,maxItems:200}},required:['target','values'],additionalProperties:false}}  }, required: ['kind'], additionalProperties: false } }]
export function remaining(session, now = Date.now()) { return Math.max(0, session.status === 'running' ? Math.ceil((session.endsAt - now) / 1000) : session.remaining) }
export function changeFocus(session, action, now = Date.now(), minutes) {
  const seconds = remaining(session, now)
  if (action === 'pause') return { ...session, status: seconds ? 'paused' : 'completed', remaining: seconds, endsAt: null }
  if (action === 'resume') return { ...session, status: seconds ? 'running' : 'completed', remaining: seconds, endsAt: seconds ? now + seconds * 1000 : null }
  if (action === 'restart') return { ...session, status: 'running', remaining: session.duration, endsAt: now + session.duration * 1000 }
  if (action === 'duration' && Number.isInteger(minutes) && minutes >= 1 && minutes <= 180) return { ...session, duration: minutes*60, remaining: minutes*60, status:'running', endsAt: now+minutes*60000 }
  throw Object.assign(new Error('Ação de foco inválida.'), { status: 400 })
}
export function normalizeSymbol(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9^=.-]{1,20}$/.test(value)) throw Object.assign(new Error('Símbolo de bolsa inválido.'), { status: 400 })
  const symbol = value.toUpperCase()
  return /^[A-Z]{4}\d{1,2}$/.test(symbol) ? symbol + '.SA' : symbol
}
export function parseQuote(result) {
  const meta = result?.meta
  if (!meta || !Number.isFinite(meta.regularMarketPrice) || !Number.isFinite(meta.regularMarketTime)) throw new Error('A fonte não retornou cotação válida.')
  const history = (result.indicators?.quote?.[0]?.close || []).map((price,i) => ({ at: result.timestamp?.[i], price })).filter(p => Number.isFinite(p.price) && Number.isFinite(p.at))
  const price = meta.regularMarketPrice
  const previous = meta.previousClose ?? (history.length > 1 ? history.at(-2).price : meta.chartPreviousClose)
  return { symbol: meta.symbol, name: meta.shortName || meta.longName || meta.symbol, currency: meta.currency, price, change: Number.isFinite(meta.regularMarketChangePercent) ? meta.regularMarketChangePercent : Number.isFinite(previous) && previous > 0 ? (price/previous-1)*100 : null, at: new Date(meta.regularMarketTime*1000).toISOString(), history, url: 'https://finance.yahoo.com/quote/' + encodeURIComponent(meta.symbol) + '/' }
}
export function createWidgetService({ dataDir, fetcher = fetch, clock = Date.now }) {
  const canvas=createCanvasWidgets(dataDir)
  const file = path.join(dataDir, 'focus.json'), temporary = new Map(), cache = new Map()
  let queue = Promise.resolve()
  const load = async () => { try { return JSON.parse(await readFile(file,'utf8')) } catch(e) { if(e.code==='ENOENT')return {}; throw e } }
  const mutate = callback => { const operation = queue.catch(()=>{}).then(async()=>{ const sessions=await load();const result=await callback(sessions);await mkdir(dataDir,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(sessions),{mode:0o600});await rename(tmp,file);return result });queue=operation.then(()=>{},()=>{});return operation }
  const getFocus = async id => { await queue; const session=temporary.get(id) || (await load())[id];if(!session)throw Object.assign(new Error('Sessão de foco não encontrada.'),{status:404});return {...session,remaining:remaining(session,clock()),status:remaining(session,clock())===0?'completed':session.status,serverNow:clock()} }
  const startFocus = async ({conversationId,privateHistory},args) => {
    const minutes=args.minutes??25;if(!Number.isInteger(minutes)||minutes<1||minutes>180)throw new Error('Use de 1 a 180 minutos.')
    const session={id:randomUUID(),conversationId,title:typeof args.title==='string'?args.title.slice(0,160):'Sessão de foco',duration:minutes*60,remaining:minutes*60,status:'running',endsAt:clock()+minutes*60000}
    if(privateHistory)temporary.set(session.id,session);else await mutate(sessions=>{sessions[session.id]=session})
    return getFocus(session.id)
  }
  const actionFocus = async (id,action,minutes) => { if(temporary.has(id))temporary.set(id,changeFocus(temporary.get(id),action,clock(),minutes));else await mutate(sessions=>{if(!sessions[id])throw Object.assign(new Error('Sessão não encontrada.'),{status:404});sessions[id]=changeFocus(sessions[id],action,clock(),minutes)});return getFocus(id) }
  const market = async symbols => {
    const chosen=symbols?.length?symbols:['^BVSP','PETR4','VALE3','ITUB4'];if(!Array.isArray(chosen)||chosen.length>6)throw new Error('Informe até seis ativos.')
    const outcomes=await Promise.all(chosen.map(async value=>{const symbol=normalizeSymbol(value);try{const previous=cache.get(symbol);if(previous&&clock()-previous.fetchedAt<60000)return previous.quote;const response=await fetcher('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?interval=1d&range=1mo',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Fonte indisponível (HTTP '+response.status+').');const raw=await response.json();if(raw.chart?.error)throw new Error('Ativo não encontrado.');const quote=parseQuote(raw.chart?.result?.[0]);cache.set(symbol,{fetchedAt:clock(),quote});return quote}catch(e){return {symbol,error:e.message}}}))
    if(outcomes.every(q=>q.error))throw new Error('Não foi possível consultar a bolsa agora. Tente novamente.')
    return {source:'Yahoo Finance',fetchedAt:new Date(clock()).toISOString(),quotes:outcomes}
  }
  const records = async (category,scope,limit=100) => {
    if(!['gasto','cartao','pix','investimento','aniversario','evento','favorito','projeto','conta','assinatura','parcela','meta','divisao','recebivel','entrega','ingresso','passagem','habito'].includes(category))throw new Error('Informe uma categoria de registro válida.')
    const store=JSON.parse(await readFile(path.join(dataDir,'frontend.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e}))
    const found=(store['waddle:records:v1']?.value||[]).filter(r=>!r.archived&&r.kind===category&&(category!=='projeto'||r.id===scope.projectId||r.fields?.chatId===scope.conversationId)).slice(0,limit)
    return {category,records:found.map(r=>({id:r.id,title:r.title,updated:r.updated,fields:Object.fromEntries(Object.entries(r.fields||{}).filter(([key])=>!/^token|segredo|senha$/i.test(key)).map(([key,value])=>[key,String(value).slice(0,8000)]))})),source:'Registros locais do usuário. Não representam conexão bancária ou compra externa.'}
  }
  const tasks = async (conversationId,projectId) => {
    const store=JSON.parse(await readFile(path.join(dataDir,'frontend.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e}));const workspace=store['wendler:frontend:v1']?.value||{};const chat=workspace.chats?.find(c=>c.id===conversationId)
    const records=store['waddle:records:v1']?.value||[];const project=records.find(r=>r.kind==='projeto'&&!r.archived&&(r.id===(projectId||chat?.projectId)||r.fields.chatId===conversationId));let details={};try{details=JSON.parse(project?.fields?.['wendler:project:v1']||'{}')}catch{}
    return {projectId:project?.id,projectTitle:project?.title,tasks:project?(details.tasks||[]):(store['wendler:tasks:v1']?.value||[]).filter(t=>t.chatId===conversationId)}
  }
  return {getFocus,actionFocus,market,canvas,async call(args,scope){let data;if(args.kind==='math')return {type:'canvas',data:await canvas.math(args,scope)};if(args.kind==='records')return {type:'records',data:await records(args.category,scope)};if(args.kind==='catalog')return {type:'catalog',data:widgetCatalog(args.screen)};if(args.kind==='canvas')return {type:'canvas',data:await canvas.create(args,scope)};if(args.kind==='spending'){const saved=await records('gasto',scope,Infinity);const now=new Date(clock()),dateParts=date=>({year:Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric'}).format(date)),month:Number(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',month:'numeric'}).format(date))});const current=dateParts(now);const months=Array.from({length:7},(_,i)=>{const date=new Date(current.year,current.month-7+i,15);const entries=saved.records.filter(r=>{const p=dateParts(new Date(r.fields.Data?r.fields.Data+'T12:00:00':r.updated));return p.year===date.getFullYear()&&p.month===date.getMonth()+1});return {label:date.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),total:entries.reduce((sum,r)=>sum+(Number(String(r.fields.Valor||'0').replace(/R\$|\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'))||0),0),count:entries.length}});return {type:'spending',data:{month:now.toLocaleDateString('pt-BR',{month:'long',timeZone:'America/Sao_Paulo'}),total:months.at(-1).total,count:months.at(-1).count,months}}}if(args.kind==='focus')data=await startFocus(scope,args);else if(args.kind==='market')data=await market(args.symbols);else if(args.kind==='tasks')data=await tasks(scope.conversationId,scope.projectId);else if(args.kind==='weather')data=await getWeather(args.city||'São Paulo');else throw new Error('Widget inválido.');return {type:args.kind,data}}}
}
