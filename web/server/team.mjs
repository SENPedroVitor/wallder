import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
export const teamTools=[{type:'function',name:'wendler_team',description:'Communicate with real Wendler agents. list returns agent IDs and roles. send delivers only the supplied message to the target agent and waits for its actual reply; use this for delegation or relaying a user-requested message. inbox reads messages addressed to you, scoped to the current project when present. Never claim contact without a successful tool result. Delegation inherits existing permissions and sensitive-action approvals; it cannot authorize extra access.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['list','send','inbox']},agentId:{type:'string'},message:{type:'string',maxLength:8000}},required:['action'],additionalProperties:false}}];
export class TeamService{
 constructor({dataDir,agents,invoke}){this.file=path.join(dataDir,'team-messages.json');this.agents=agents;this.invoke=invoke;this.queue=Promise.resolve()}
 async records(){await this.queue;return readFile(this.file,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return [];throw e})}
 async store(record){const next=this.queue.catch(()=>{}).then(async()=>{const rows=await readFile(this.file,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return [];throw e});const i=rows.findIndex(v=>v.id===record.id);if(i<0)rows.push(record);else rows[i]=record;await mkdir(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';await writeFile(temp,JSON.stringify(rows.slice(-200)),{mode:0o600});await rename(temp,this.file)});this.queue=next;await next}
 async execute(args,run){
  if(run.cancelled||run.finished)throw Error('Conversa interrompida.');
  if(args.action==='list')return {agents:this.agents.map(({id,name,role})=>({id,name,role}))};
  if(args.action==='inbox')return {messages:(await this.records()).filter(v=>v.to===run.agentId&&(!run.projectId||v.projectId===run.projectId)).slice(-20)};
  if(args.action!=='send')throw Error('Ação de equipe inválida.');
  const agent=this.agents.find(v=>v.id===args.agentId);if(!agent)throw Error('Agente destinatário desconhecido. Consulte a equipe.');
  if(typeof args.message!=='string'||!args.message.trim()||args.message.length>8000)throw Error('Mensagem vazia ou longa demais.');
  const chain=run.delegationPath||[run.agentId];if(chain.includes(agent.id)||chain.length>=3)throw Error('Delegação circular ou profunda demais. Responda ao agente que chamou você.');
  const record={id:randomUUID(),from:run.agentId,to:agent.id,conversationId:run.conversationId,projectId:run.projectId,message:args.message.trim(),status:'running',at:new Date().toISOString()};
  if(!run.privateHistory)await this.store(record);
  try{const reply=await this.invoke(agent,record.message,run,[...chain,agent.id]);record.status='completed';record.reply=reply;if(!run.privateHistory)await this.store(record);return {delivered:true,id:record.id,agent:{id:agent.id,name:agent.name},reply}}
  catch(e){record.status='failed';record.error=e.message;if(!run.privateHistory)await this.store(record);throw e}
 }
}
export function delegationResponse(onEvent){
 const response=new EventEmitter();let resolve,reject,done;
 const result=new Promise((yes,no)=>{resolve=yes;reject=no});
 response.destroyed=false;response.writableEnded=false;response.status=200;
 response.writeHead=status=>{response.status=status};
 response.write=line=>{if(response.writableEnded)return;let event;try{event=JSON.parse(line)}catch{return};if(response.status>=400){done={status:'failed',text:event.error};return}if(event.type==='done')done=event;else if(event.type==='error')done={status:'failed',text:event.message};else if(['approval','widget','activity'].includes(event.type))onEvent(event)};
 response.end=value=>{if(response.writableEnded)return;if(value)response.write(value);response.writableEnded=true;if(done?.status==='completed')resolve(done.text||'');else reject(Error(done?.text||'O agente não concluiu a resposta.'))};
 response.cancel=()=>{if(response.writableEnded)return;response.destroyed=true;response.emit('close');response.end()};
 return {response,result};
}
