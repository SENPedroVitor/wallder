import path from 'node:path';
import os from 'node:os';
import {mkdir,readdir,readFile,writeFile,rename,statfs,unlink} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
export class MaintenanceService{
 constructor(dataDir,keyFile){this.dataDir=dataDir;this.keyFile=keyFile;this.root=path.join(dataDir,'backups');this.running=null;this.last=null}
 async health(){const disk=await statfs(this.dataDir);if(!this.last)this.last=await readFile(path.join(this.dataDir,'maintenance-status.json'),'utf8').then(JSON.parse).catch(()=>null);return {ok:true,uptimeSeconds:Math.floor(process.uptime()),memory:{processBytes:process.memoryUsage().rss,availableBytes:os.freemem()},diskAvailableBytes:Number(disk.bavail)*Number(disk.bsize),backup:this.last}}
 async backup(){if(this.running)return this.running;this.running=this.createBackup();try{return await this.running}finally{this.running=null}}
 async createBackup(){
  const key=await readFile(this.keyFile);if(key.length!==32)throw Error('Chave de backup indisponível.');
  try{
  const files=[];let total=0;
  // Configuration and conversations only. Browser profiles, downloaded files and the vault key are excluded.
  for(const folder of ['', 'steam-web']){
   const root=path.join(this.dataDir,folder);const entries=await readdir(root,{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error});
   for(const entry of entries){if(!entry.isFile()||!entry.name.endsWith('.json'))continue;const data=await readFile(path.join(root,entry.name));total+=data.length;if(total>64*1024*1024)throw Error('Backup excedeu o limite de 64 MB.');files.push({name:path.posix.join(folder,entry.name),hash:createHash('sha256').update(data).digest('hex'),data:data.toString('base64')})}
  }
  const createdAt=new Date().toISOString();const plain=Buffer.from(JSON.stringify({version:1,createdAt,files}));const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);plain.fill(0);
  const record=Buffer.concat([Buffer.from('WDB1'),iv,cipher.getAuthTag(),encrypted]);
  const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(record.subarray(16,32));const verified=Buffer.concat([decipher.update(record.subarray(32)),decipher.final()]);key.fill(0);
  const restored=JSON.parse(verified.toString());verified.fill(0);
  if(restored.files.length!==files.length||restored.files.some(file=>createHash('sha256').update(Buffer.from(file.data,'base64')).digest('hex')!==file.hash))throw Error('Verificação do backup falhou.');
  await mkdir(this.root,{recursive:true,mode:0o700});const name=createdAt.replace(/[:.]/g,'-')+'.wdb';await writeFile(path.join(this.root,name+'.tmp'),record,{mode:0o600});await rename(path.join(this.root,name+'.tmp'),path.join(this.root,name));
  const old=(await readdir(this.root)).filter(name=>/^\d{4}-.*\.wdb$/.test(name)).sort().reverse().slice(8);for(const name of old)await unlink(path.join(this.root,name));
  this.last={createdAt,files:files.length,bytes:record.length,verified:true};await writeFile(path.join(this.dataDir,'maintenance-status.json.tmp'),JSON.stringify(this.last),{mode:0o600});await rename(path.join(this.dataDir,'maintenance-status.json.tmp'),path.join(this.dataDir,'maintenance-status.json'));return this.last;
  }finally{key.fill(0)}
 }
 start(){const timer=setInterval(()=>{void this.backup().catch(()=>{this.last={verified:false,error:'Falha ao criar backup; confira espaço e chave do cofre.'}})},6*60*60*1000);timer.unref();return ()=>clearInterval(timer)}
}
