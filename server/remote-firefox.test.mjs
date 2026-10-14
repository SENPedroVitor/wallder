import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {remoteFirefoxConfig,acquireRemoteBrowser,claimRemoteControl,releaseRemoteControl} from './remote-firefox.mjs'
import {EventEmitter} from 'node:events'

test('shared remote clients reuse one session, reject competing tasks and disconnect only after the last consumer',async()=>{
 let connects=0,disconnects=0;
 const browser=new EventEmitter();browser.disconnect=async()=>{disconnects++;browser.emit('disconnected')};
 const connect=async()=>{connects++;return browser};
 const options={browserWSEndpoint:'ws://test-shared-session/session'};
 const [a,b]=await Promise.all([acquireRemoteBrowser(connect,options,{}),acquireRemoteBrowser(connect,options,{})]);
 assert.equal(connects,1);assert.equal(a.control,b.control);
 const context={remoteControl:a.control};claimRemoteControl(context,'pam-task');
 assert.throws(()=>claimRemoteControl(context,'other-task'),/outra tarefa/);
 releaseRemoteControl(context,'other-task');assert.equal(a.control.lease,'pam-task');
 releaseRemoteControl(context,'pam-task');claimRemoteControl(context,'other-task');releaseRemoteControl(context,'other-task');
 await a.release();assert.equal(disconnects,0);await b.release();assert.equal(disconnects,1);await b.release();assert.equal(disconnects,1);
});

test('remote Firefox uses the same configured server but separates Steam profile scope',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wendler-remote-'));
 try{assert.equal(await remoteFirefoxConfig(root),null);await mkdir(path.join(root,'steam-web'));
 await writeFile(path.join(root,'remote-browser.json'),JSON.stringify({enabled:true,host:'100.110.182.64',user:'faux',identityFile:path.join(root,'test-key')}));
 assert.equal((await remoteFirefoxConfig(root)).steam,false);
 assert.equal((await remoteFirefoxConfig(path.join(root,'steam-web'))).steam,true);
 }finally{await rm(root,{recursive:true,force:true})}
});
test('remote Firefox rejects shell syntax and non-Tailscale destinations before starting SSH',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wendler-remote-'));
 try{for(const invalid of [{host:'example.com',user:'faux'},{host:'100.110.182.64',user:'faux;id'}]){
 await writeFile(path.join(root,'remote-browser.json'),JSON.stringify({enabled:true,identityFile:path.join(root,'test-key'),...invalid}));
 await assert.rejects(remoteFirefoxConfig(root),/Configuração SSH inválida/);
 }}finally{await rm(root,{recursive:true,force:true})}
});
