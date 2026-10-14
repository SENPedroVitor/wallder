import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createSteamPolicy} from './steam-policy.mjs';
test('persistent Steam preparation permission is revocable and excludes other operations',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'wendler-policy-'));try{const policy=createSteamPolicy(dir);assert.equal(await policy.allows({title:'Preparar Pix da Steam'}),false);await policy.save({enabled:true});assert.equal(await createSteamPolicy(dir).allows({title:'Preparar Pix da Steam'}),true);assert.equal(await policy.allows({title:'Preencher dados protegidos do pedido Steam / PagSeguro'}),true);assert.equal(await policy.allows({title:'Pagar Pix'}),false);assert.equal(await policy.allows({title:'Preencher dados Amazon'}),false);await policy.save({enabled:false});assert.equal(await policy.allows({title:'Preparar Pix da Steam'}),false)}finally{await rm(dir,{recursive:true,force:true})}
});
