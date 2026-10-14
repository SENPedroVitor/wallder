import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {EventEmitter} from 'node:events'
import {createComputerAccess} from './computer-access.mjs'
import {ComputerBridge} from './computer.mjs'
test('common app permissions persist and revocation survives a restart',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'wendler-access-'));try{const first=createComputerAccess(root);await first.save('process:calculator.exe',true);const next=createComputerAccess(root);await next.ready;assert.equal(next.has('process:calculator.exe'),true);await next.save('process:calculator.exe',false);const final=createComputerAccess(root);await final.ready;assert.equal(final.has('process:calculator.exe'),false)}finally{await rm(root,{recursive:true,force:true})}
})
test('common actions require saved app scope, fresh observation and known safe controls',async()=>{
 const bridge=new ComputerBridge({client:new EventEmitter()});bridge.window={id:1,app:'process:calculator.exe',title:'Calculator'};bridge.observationId='one';bridge.latestFrame={accessibility:{tree:'1 button Add\n2 button Pay now\n3 edit Search'}};await bridge.authorizeCommon({mode:'common'});
 assert.equal(bridge.requiresConfirmation({action:'click',element_index:1,observationId:'one'}),false);
 for(const input of [{action:'click',element_index:2,observationId:'one'},{action:'click',x:3,y:4,observationId:'one'},{action:'click',element_index:1,observationId:'old'}])assert.equal(bridge.requiresConfirmation(input),true);
 assert.equal(bridge.canReuseNativePermission({connector_id:'computer-use',riskLevel:'low',tool_params:{app:'calculator.exe'}}),true);
 assert.equal(bridge.canReuseNativePermission({connector_id:'computer-use',riskLevel:'high',tool_params:{app:'calculator.exe'}}),false);
 assert.equal(bridge.canReuseNativePermission({connector_id:'computer-use',riskLevel:'low',tool_params:{app:'other.exe'}}),false);
 await bridge.authorizeCommon({mode:'manual'});assert.equal(bridge.requiresConfirmation({action:'click',element_index:1,observationId:'one'}),true);
})
