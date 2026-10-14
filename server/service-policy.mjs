import path from 'node:path';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export class ServicePolicy{
 constructor(dataDir){this.file=path.join(dataDir,'service-policy.json');this.queue=Promise.resolve()}
 async read(){try{return JSON.parse(await readFile(this.file,'utf8'))}catch(error){if(error.code==='ENOENT')return {grants:[]};throw error}}
 async save(input){const origin=new URL(input.origin);if(origin.protocol!=='https:'||origin.origin!==input.origin||!/^(?:\*|[a-z][a-z0-9-]*)$/.test(input.agentId)||typeof input.enabled!=='boolean')throw Error('Informe origem HTTPS, agente e autorização válidos.');const task=this.queue.catch(()=>{}).then(async()=>{const data=await this.read();data.grants=data.grants.filter(g=>!(g.origin===input.origin&&g.agentId===input.agentId));if(input.enabled)data.grants.push({origin:input.origin,agentId:input.agentId,scope:'routine-browser',updatedAt:new Date().toISOString()});await mkdir(path.dirname(this.file),{recursive:true});const tmp=this.file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(data),{mode:0o600});await rename(tmp,this.file);return data});this.queue=task;return task}
 async allows(review,agentId){if(review.routine!==true)return false;const origin=new URL(review.details.url).origin;return (await this.read()).grants.some(g=>g.origin===origin&&(g.agentId===agentId||g.agentId==='*'))}
}
