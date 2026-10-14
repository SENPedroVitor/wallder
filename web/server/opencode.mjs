import path from 'node:path'
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises'
import {createHmac} from 'node:crypto'

export const lightModels=['openai/gpt-6-luna','openai/gpt-5.6-luna'];
export function isLightWeather(input){return input.mode!=='work'&&!input.attachment&&typeof input.message==='string'&&input.message.length<=300&&/\b(clima|temperatura|previs[aã]o do tempo|vai chover)\b/i.test(input.message)&&!/(senha|token|chave|cpf|cart[aã]o|conta|banco|arquivo|projeto|endere[cç]o|c[oó]digo|pix|compr|@|https?:|\d{6,})/i.test(input.message)}
export function weatherIntent(text,message){let value;try{value=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''))}catch{throw Error('O OpenCode não retornou uma consulta de clima válida.')}
 const fold=v=>v.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 if(value.city===null)return {city:null};
 if(typeof value.city!=='string'||!value.city.trim()||value.city.length>100||!fold(message).includes(fold(value.city)))throw Error('Não consegui confirmar a cidade informada.');
 return {city:value.city.trim()};
}
export class OpenCodeService{
 constructor({dataDir,fetcher=fetch,keyFile=process.env.WENDLER_VAULT_KEY_FILE,base=process.env.WENDLER_OPENCODE_URL}={}){this.file=path.join(dataDir,'opencode-settings.json');this.fetcher=fetcher;this.keyFile=keyFile;this.base=base;this.pendingAuth=null;this.queue=Promise.resolve()}
 async settings(){try{return JSON.parse(await readFile(this.file,'utf8'))}catch(e){if(e.code==='ENOENT')return {enabled:false,model:lightModels[0]};throw e}}
 async request(resource,{method='GET',body,timeout=20000,signal}={}){
  if(!this.base||!/^http:\/\/127\.0\.0\.1:\d+$/.test(this.base))throw Error('OpenCode não está configurado neste servidor.');
  const key=await readFile(this.keyFile);let password;try{password=createHmac('sha256',key).update('wendler-opencode-control-v1').digest('hex')}finally{key.fill(0)}
  const response=await this.fetcher(this.base+resource,{method,headers:{Authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
  if(!response.ok)throw Error('OpenCode respondeu com erro HTTP '+response.status+'.');return response.json();
 }
 async status(){const settings=await this.settings();if(!this.base)return {...settings,installed:false,connected:false,available:false};try{const health=await this.request('/global/health');const providers=await this.request('/provider');const provider=settings.model.split('/')[0];return {...settings,installed:health.healthy===true,version:health.version,connected:providers.connected?.includes(provider)||false,available:health.healthy===true&&providers.connected?.includes(provider),purpose:'weather'}}catch{return {...settings,installed:false,connected:false,available:false,error:'OpenCode indisponível ou iniciando.'}}}
 async save(input){if(typeof input.enabled!=='boolean'||!lightModels.includes(input.model))throw Error('Configuração do OpenCode inválida.');if(input.enabled&&!(await this.status()).available)throw Error('Conecte o provedor de IA no OpenCode antes de ativar.');const work=this.queue.catch(()=>{}).then(async()=>{await mkdir(path.dirname(this.file),{recursive:true});await writeFile(this.file+'.tmp',JSON.stringify(input),{mode:0o600});await rename(this.file+'.tmp',this.file)});this.queue=work;await work;return this.status()}
 async authorize(){const methods=(await this.request('/provider/auth')).openai||[];const method=methods.findIndex(v=>v.type==='oauth'&&/headless|device/i.test(v.label));if(method<0)throw Error('O OpenCode não oferece login ChatGPT por dispositivo nesta instalação.');const auth=await this.request('/provider/openai/oauth/authorize',{method:'POST',body:{method}});this.pendingAuth=method;return auth}
 async completeAuth(){if(this.pendingAuth===null)throw Error('Inicie o login do OpenCode primeiro.');await this.request('/provider/openai/oauth/callback',{method:'POST',body:{method:this.pendingAuth},timeout:120000});this.pendingAuth=null;return this.status()}
 async interpretWeather(message,signal){const settings=await this.settings();const session=await this.request('/session',{method:'POST',body:{title:'Consulta pública de clima'},signal});const [providerID,modelID]=settings.model.split('/');
  try{const reply=await this.request('/session/'+encodeURIComponent(session.id)+'/message',{method:'POST',body:{model:{providerID,modelID},agent:'wendler',system:'Retorne apenas JSON {"city":"cidade explicitamente escrita na pergunta"} ou {"city":null} quando faltar cidade ou houver apenas estado/país. Não invente cidade nem clima. Não use ferramentas.',parts:[{type:'text',text:message}]},timeout:45000,signal});if(reply.info?.error)throw Error('O provedor do OpenCode recusou a consulta.');const text=(reply.parts||[]).filter(p=>p.type==='text').map(p=>p.text).join('');return weatherIntent(text,message)}finally{if(signal?.aborted)await this.request('/session/'+encodeURIComponent(session.id)+'/abort',{method:'POST',timeout:5000}).catch(()=>{});await this.request('/session/'+encodeURIComponent(session.id),{method:'DELETE',timeout:5000}).catch(()=>{})}
 }
}

