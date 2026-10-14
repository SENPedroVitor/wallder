import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { mathContent } from './math-widget.mjs'

const catalog = JSON.parse(await readFile(new URL('../src/design/widget-catalog.json', import.meta.url), 'utf8'))
const dedicated = new Set(['nARBK', 'c5Iuyf', 'P4yvSf', 'msI7t', 'w3HtWh'])
const invalid = message => Object.assign(new Error(message), { status: 400 })
export function widgetCatalog(id) {
  if (!id) return catalog.filter(s => !dedicated.has(s.id)).map(({id,name}) => ({id,name}))
  const definition = catalog.find(s => s.id === id && !dedicated.has(id))
  if (!definition) throw invalid('Use um widget do catálogo ou a ferramenta específica de clima, gastos, foco, tarefas ou bolsa.')
  return { ...definition, slots: definition.slots.map(({name,maxLength,lines}) => ({name,maxLength,lines})), instructions: 'Preencha TODOS os slots com dados reais do usuário, resultados de ferramentas ou conteúdo solicitado. Use texto vazio para linhas ausentes. Não invente saldos, reservas, ingressos comprados, fontes, conexões, placares ou execução de agentes. Dados atuais exigem consulta real. Registros pessoais exigem contexto autorizado. Ações de set atualizam apenas o card; para executar trabalho use request. Cada controle deve ter ação ou ficar sem rótulo de ação. Preserve o limite visual de caracteres e linhas (use nova linha nos campos multilinha) e coloque o conteúdo integral em notes.' }
}
export function validateCanvas(args) {
  const definition = widgetCatalog(args.screen)
  const bindings = args.bindings
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) throw invalid('Preencha os campos do widget.')
  const allowed = new Set(definition.slots.map(s => s.name))
  for (const slot of definition.slots) if (typeof bindings[slot.name] !== 'string' || bindings[slot.name].length > slot.maxLength) throw invalid('Campo ausente ou longo demais: ' + slot.name + ' (máximo ' + slot.maxLength + ').')
  if (Object.keys(bindings).some(name => !allowed.has(name))) throw invalid('Campo desconhecido no desenho.')
  const actions = args.actions || []
  if (!Array.isArray(actions) || actions.length > 24) throw invalid('Use até 24 ações.')
  const seen = new Set()
  for (const action of actions) {
    if (!action || !definition.targets.includes(action.target) || seen.has(action.target) || typeof action.label !== 'string' || !action.label || action.label.length > 100) throw invalid('Controle inválido ou duplicado.')
    seen.add(action.target)
    if (!['set','request','link'].includes(action.kind)) throw invalid('Tipo de ação inválido.')
    if (action.kind === 'link') { let url;try{url=new URL(action.url)}catch{throw invalid('Link inválido.')}if(!['https:','http:'].includes(url.protocol) || url.username || url.password)throw invalid('Use um link web sem credenciais.') }
    if (action.kind === 'request' && (typeof action.prompt !== 'string' || !action.prompt.trim() || action.prompt.length > 2000)) throw invalid('Pedido inválido.')
    if (action.kind === 'set') {
      if (!action.patch || typeof action.patch !== 'object' || Array.isArray(action.patch) || !Object.keys(action.patch).length) throw invalid('A ação precisa atualizar um campo.')
      for (const [name,text] of Object.entries(action.patch)) if(!allowed.has(name)||typeof text!=='string'||text.length>definition.slots.find(s=>s.name===name).maxLength)throw invalid('Resposta interativa inválida: '+name)
    }
  }
  const charts = args.charts || []
  if (!Array.isArray(charts)||charts.length>6)throw invalid('Gráficos inválidos.')
  for(const chart of charts)if(!definition.targets.includes(chart.target)||!Array.isArray(chart.values)||chart.values.length<2||chart.values.length>200||chart.values.some(v=>!Number.isFinite(v)))throw invalid('Use uma série numérica real para o gráfico.')
  if(args.notes!==undefined&&(typeof args.notes!=='string'||args.notes.length>12000))throw invalid('Conteúdo integral muito longo.')
  return { screen:definition.id, region:definition.region, width:definition.width, height:definition.height, bindings:{...bindings}, initialBindings:{...bindings}, actions:structuredClone(actions), charts:structuredClone(charts), notes:args.notes||'', active:[], revision:0 }
}
export function createCanvasWidgets(dataDir) {
  const file = path.join(dataDir, 'widgets.json'), privateWidgets = new Map()
  let queue = Promise.resolve()
  const load = async () => JSON.parse(await readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e}))
  const save = callback => {const operation=queue.then(async()=>{const stored=await load();const result=callback(stored);await mkdir(dataDir,{recursive:true});const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(stored),{mode:0o600});await rename(temporary,file);return result});queue=operation.then(()=>{},()=>{});return operation}
  const get = async id => {await queue;const value=privateWidgets.get(id)||(await load())[id];if(!value)throw Object.assign(new Error('Widget não encontrado.'),{status:404});return structuredClone({...value,active:['GxcxF','f7dKo'].includes(value.screen)?value.active.slice(-1):value.active})}
  const math = input => {const result=mathContent(input);const definition=widgetCatalog('Dba0J');const bindings=Object.fromEntries(definition.slots.map(slot=>[slot.name,(result.bindings[slot.name]||'').slice(0,slot.maxLength)]));return {...validateCanvas({screen:'Dba0J',bindings,notes:result.notes,charts:[{target:'Curva da função quadrática',values:result.values,min:-5,max:7}],actions:[{target:'Ação do card',label:'Entender a resolução',kind:'request',prompt:'Explique a resolução da equação com os coeficientes exibidos no card de matemática.'}]}),formula:result.formula,roots:result.roots}}
  return {
    get,
    async math(input,scope){const value={...math(input),id:randomUUID(),conversationId:scope.conversationId};if(scope.privateHistory)privateWidgets.set(value.id,value);else await save(stored=>{stored[value.id]=value});return value},
    async create(args,scope){const value={...validateCanvas(args),id:randomUUID(),conversationId:scope.conversationId};if(scope.privateHistory)privateWidgets.set(value.id,value);else await save(stored=>{stored[value.id]=value});return value},
    async action(id,target){
      const update=value=>{const control=typeof target==='string'&&target.match(/^math:(increase|decrease|set):([abc])(?::(-?\d+(?:\.\d+)?))?$/);if(control&&value.formula){const [,action,key,amount]=control,formula={...value.formula};formula[key]=action==='set'?Number(amount):formula[key]+(action==='increase'?1:-1);if(action==='set'&&amount===undefined)throw invalid('Coeficiente ausente.');const next=math(formula);Object.assign(value,next,{revision:value.revision+1});return value}const action=value.actions.find(a=>a.target===target&&a.kind==='set');if(!action)throw invalid('Ação local não encontrada.');const active=['GxcxF','f7dKo'].includes(value.screen)?value.active.at(-1)===target:value.active.includes(target);if(active&&!action.toggle)return value;value.bindings=active?{...value.bindings,...Object.fromEntries(Object.keys(action.patch).map(name=>[name,value.initialBindings[name]]))}:{...value.bindings,...action.patch};value.active=active?value.active.filter(t=>t!==target):['GxcxF','f7dKo'].includes(value.screen)?[target]:[...value.active,target];value.revision++;return value}
      if(privateWidgets.has(id))update(privateWidgets.get(id));else await save(stored=>{if(!stored[id])throw Object.assign(new Error('Widget não encontrado.'),{status:404});update(stored[id])})
      return get(id)
    }
  }
}
