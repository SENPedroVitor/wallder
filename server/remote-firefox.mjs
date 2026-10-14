import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import net from 'node:net'
const run=promisify(execFile)

let tunnel,starting;
const connections=new Map();
export async function closeRemoteBrowsers(){
 const records=[...connections.values()];connections.clear();
 await Promise.allSettled(records.map(async record=>{const browser=await record.promise;await browser.disconnect()}));
}
export async function acquireRemoteBrowser(connect,options,config){
 const key=options.browserWSEndpoint;
 let record=connections.get(key);
 if(!record){record={refs:0,lease:null,promise:connectRemoteBrowser(connect,options,config)};connections.set(key,record);record.promise.catch(()=>{if(connections.get(key)===record)connections.delete(key)});}
 const browser=await record.promise;record.refs++;
 browser.once('disconnected',()=>{if(connections.get(key)===record)connections.delete(key)});
 let released=false;
 return {browser,control:record,release:async()=>{if(released)return;released=true;if(--record.refs===0){connections.delete(key);await browser.disconnect()}}};
}
export function claimRemoteControl(context,id){if(!context?.remoteControl)return;const control=context.remoteControl;if(control.lease&&control.lease!==id)throw Error('O navegador remoto está em uso por outra tarefa. Aguarde ela terminar.');control.lease=id}
export function releaseRemoteControl(context,id){if(context?.remoteControl?.lease===id)context.remoteControl.lease=null}
export async function remoteFirefoxConfig(dataDir){
 const root=path.basename(dataDir)==='steam-web'?path.dirname(dataDir):dataDir;
 try{const config=JSON.parse(await readFile(path.join(root,'remote-browser.json'),'utf8'));if(!config.enabled)return null;
 if(!/^100\.\d+\.\d+\.\d+$/.test(config.host)||! /^[a-z_][a-z0-9_-]*$/i.test(config.user)||typeof config.identityFile!=='string'||!path.isAbsolute(config.identityFile))throw Error('Configuração SSH inválida.');
 return {...config,steam:path.basename(dataDir)==='steam-web'};
 }catch(error){if(error.code==='ENOENT')return null;throw error}
}
function reachable(port){return new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.setTimeout(500);socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false)})})}
export async function ensureRemoteTunnel(config){
 if(starting)return starting;
 if(tunnel&&tunnel.exitCode===null&&!tunnel.killed)return;
 starting=(async()=>{
 for(const port of [29223,29224,3012,3013])if(await reachable(port))throw Error('Uma porta do túnel privado já está em uso. Pare a conexão antiga antes de iniciar outra.');
 const child=spawn('ssh',['-N','-T','-i',config.identityFile,'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-o','ConnectTimeout=10',
 '-L','127.0.0.1:29223:127.0.0.1:9223','-L','127.0.0.1:29224:127.0.0.1:9224','-L','127.0.0.1:3012:127.0.0.1:3012','-L','127.0.0.1:3013:127.0.0.1:3013',config.user+'@'+config.host],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let failed=false;child.on('error',()=>{failed=true});child.stderr.on('data',()=>{});tunnel=child;
 for(let attempt=0;attempt<60;attempt++){if(failed||child.exitCode!==null)throw Error('Não foi possível abrir o túnel SSH privado do servidor.');if(await reachable(29223))return;await new Promise(resolve=>setTimeout(resolve,200))}
 child.kill();throw Error('O túnel SSH do servidor não respondeu.');
 })();try{await starting}finally{starting=null}
}
export function stopRemoteTunnel(){tunnel?.kill();tunnel=null}
export async function connectRemoteBrowser(connect,options,config){
 try{return await connect(options)}catch(error){
  if(!String(error.message).includes('Maximum number of active sessions'))throw Error('Não foi possível conectar ao Firefox do servidor.');
  if(config.localServer)throw Error('O Firefox ainda está controlado pelo computador anterior. Desconecte essa sessão antes de conectar o servidor.');
  const name=config.steam?'wendler-steam':'wendler-browser';
  await run('ssh',['-i',config.identityFile,'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10',config.user+'@'+config.host,'docker restart '+name+' '+name+'-wire'],{windowsHide:true,timeout:45000}).catch(()=>{throw Error('Não foi possível recuperar o controle do Firefox remoto. Nenhum perfil foi apagado.')});
  for(let i=0;i<15;i++){await new Promise(resolve=>setTimeout(resolve,1000));try{return await connect(options)}catch{}}
  throw Error('O Firefox remoto ainda está reiniciando. Tente conectar novamente.');
 }
}
process.once('exit',stopRemoteTunnel);
