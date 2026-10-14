import path from 'node:path';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export function createSteamPolicy(dataDir){
 const file=path.join(dataDir,'steam-preparation-policy.json');
 return {
  async read(){try{const saved=JSON.parse(await readFile(file,'utf8'));return {enabled:saved.enabled===true,scope:'steam-unpaid-pix',updatedAt:saved.updatedAt}}catch(error){if(error.code==='ENOENT')return {enabled:false,scope:'steam-unpaid-pix'};throw error}},
  async save(input){if(typeof input.enabled!=='boolean')throw Error('Informe enabled como booleano.');const value={enabled:input.enabled,scope:'steam-unpaid-pix',updatedAt:new Date().toISOString()};await mkdir(dataDir,{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,file);return value},
  async allows(review){const saved=await this.read();return saved.enabled&&['Preparar Pix da Steam','Preencher dados protegidos do pedido Steam / PagSeguro'].includes(review.title)}
 };
}
