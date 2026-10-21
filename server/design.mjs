import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID, createHash } from 'node:crypto'

export class DesignService {
 constructor({dataDir,base=process.env.WENDLER_IMHOTEP_URL||'http://127.0.0.1:4173',fetcher=fetch}) {
  const origin=new URL(base);if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname)||origin.username||origin.password||origin.pathname!=='/')throw Error('Imhotep deve usar uma origem HTTP local.')
  this.previewDir=path.join(dataDir,'design-previews');this.base=origin.origin;this.fetcher=fetcher;this.file=path.join(dataDir,'design-conversations.json');this.queue=Promise.resolve()
 }
 async bindings(){try{return JSON.parse(await readFile(this.file,'utf8'))}catch(error){if(error.code==='ENOENT')return {};throw error}}
 async request(route,body){const response=await this.fetcher(this.base+route,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});const value=await response.json();if(!response.ok)throw Error(value.error||'O Imhotep não respondeu.');return value}
 async execute(args,run){
  if(run.agentId!=='kendrick')throw Error('Esta ferramenta pertence ao Kendrick.')
  if(!run.conversationId||run.cancelled)throw Error('Conversa ausente ou interrompida.')
  if(run.privateHistory)throw Error('Telas são salvas no Imhotep. Use uma conversa com histórico para criar ou editar projetos.')
  const task=this.queue.catch(()=>{}).then(async()=>{
   const bindings=await this.bindings();let projectId=bindings[run.conversationId]
   if(args.action==='create'){
    if(projectId)return {notice:'Esta conversa já tem um projeto. Continue editando-o ou use outra conversa para outro projeto.',...await this.request('/api/projects/'+projectId)}
    if(typeof args.name!=='string'||!args.name.trim())throw Error('Informe o nome do projeto.')
    const project=await this.request('/api/projects',{name:args.name,document:args.document});projectId=project.id;bindings[run.conversationId]=projectId
    await mkdir(path.dirname(this.file),{recursive:true});const tmp=this.file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(bindings),{mode:0o600});await rename(tmp,this.file);return project
   }
   if(!projectId)throw Error('Esta conversa ainda não tem projeto. Crie-o primeiro.')
   const route='/api/projects/'+encodeURIComponent(projectId)
   if(args.action==='read')return this.request(route)
   if(args.action==='apply'){
    if(!Number.isSafeInteger(args.baseRevision)||!Array.isArray(args.operations)||!args.operations.length)throw Error('Informe a revisão lida e as operações.')
    const event=await this.request(route+'/operations',{baseRevision:args.baseRevision,operations:args.operations,author:'wendler:kendrick',operationId:createHash('sha256').update(run.requestId+':'+(args.operationId||randomUUID())).digest('hex')});return event
   }
   if(args.action==='present'){
    const project=await this.request(route),frames=project.document.nodes.filter(node=>node.type==='frame'&&!node.parentId)
    const frame=args.frameId?frames.find(frame=>frame.id===args.frameId):frames[0];if(!frame)throw Error('Crie um frame raiz antes de mostrar a tela.')
    // Rendering verifies the actual persisted frame before claiming completion.
    const query=new URLSearchParams({format:'png',frame:frame.id});const response=await this.fetcher(this.base+route+'/render?'+query,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Não foi possível renderizar a tela salva.');const bytes=Buffer.from(await response.arrayBuffer());const current=await this.request(route);if(current.revision!==project.revision)throw Error('O projeto mudou durante a renderização. Leia novamente e apresente a revisão atual.');await mkdir(this.previewDir,{recursive:true});await writeFile(path.join(this.previewDir,projectId+'-'+project.revision+'-'+frame.id+'.png'),bytes)
    return {projectId,revision:project.revision,name:project.name||project.document.name,frameId:frame.id,frameName:frame.name,conversationId:run.conversationId}
   }
   throw Error('Ação de design desconhecida.')
  });this.queue=task.catch(()=>{});return task
 }
 async asset(url){
  const projectId=url.searchParams.get('project'),conversationId=url.searchParams.get('conversation'),bindings=await this.bindings()
  if(!conversationId||!projectId||bindings[conversationId]!==projectId)throw Error('Projeto não vinculado a esta conversa.')
  const format=url.searchParams.get('format')||'png',frame=url.searchParams.get('frame')
  if(!['png','html','react','tailwind'].includes(format))throw Error('Formato inválido.')
  if(format==='png'){const revision=url.searchParams.get('revision');if(!/^[0-9]{1,10}$/.test(revision||'')||!/^[-\w]{1,100}$/.test(frame||''))throw Error('Prévia inválida.');return {bytes:await readFile(path.join(this.previewDir,projectId+'-'+revision+'-'+frame+'.png')),type:'image/png',extension:'png'}}
  const query=new URLSearchParams({format});if(frame)query.set('frame',frame)
  const response=await this.fetcher(this.base+'/api/projects/'+encodeURIComponent(projectId)+(format==='png'?'/render?':'/code?')+query,{signal:AbortSignal.timeout(30000)})
  if(!response.ok)throw Error('Não foi possível carregar a exportação do projeto.')
  return {bytes:Buffer.from(await response.arrayBuffer()),type:format==='png'?'image/png':format==='html'?'text/html; charset=utf-8':'text/plain; charset=utf-8',extension:format==='png'?'png':format==='html'?'html':'tsx'}
 }
}
export const designTools=[{type:'function',name:'wendler_design',description:'Create and edit real Imhotep screens headlessly for the user, persist a project per conversation, render a verified preview directly in chat and provide HTML/React/Tailwind downloads. No editor window is required. Actions: create(name, optional document), read, apply(baseRevision,operations,operationId), present(optional frameId). Always read before edits, use the returned revision, and present after completion. create is idempotent per conversation. Document schemaVersion=1,name,nodes; each node needs id,type,name,x,y,width,height,fill; root frame omits parentId, children parentId=frame ID. Text nodes also text,fontSize,fontFamily(sans-serif),fontWeight. Supported node types: frame,rectangle,ellipse,text,path,icon,image. Prefer auto layout on frames (layout horizontal|vertical,gap,padding,wrap) and semanticTag for native HTML. Example create document: {schemaVersion:1,name:"Screen",nodes:[{id:"screen",type:"frame",name:"Desktop",x:0,y:0,width:1000,height:700,fill:"#ffffff"},{id:"title",type:"text",name:"Heading",parentId:"screen",x:40,y:40,width:800,height:60,fill:"#111111",text:"Welcome",fontSize:40,fontFamily:"sans-serif",fontWeight:700}]}. apply operations: {type:"create_node",node:{...}}, {type:"update_node",id,changes:{...}}, {type:"delete_node",id}; boolean_nodes and normalize_path are also supported. Do not return pretend screenshots or HTML as if saved. The present action emits the actual preview card automatically. Private chats cannot persist designs.',inputSchema:{type:'object',additionalProperties:false,required:['action'],properties:{action:{type:'string',enum:['create','read','apply','present']},name:{type:'string',maxLength:160},document:{type:'object'},baseRevision:{type:'integer',minimum:0},operations:{type:'array',items:{type:'object'},minItems:1,maxItems:100},operationId:{type:'string',maxLength:100},frameId:{type:'string',maxLength:100}}}}]
