import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {dpapi} from './protected-data.mjs';
export function createPurchaseProfile({dataDir,protection=dpapi}){
 const file=path.join(dataDir,'protected-purchase-profile.json');
 async function read(){let stored;try{stored=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return {configured:false};throw e}const bytes=(await protection()).unprotect(Buffer.from(stored.ciphertext,'base64'));try{return {configured:true,...JSON.parse(bytes.toString('utf8'))}}finally{bytes.fill(0)}}
 async function save({fullName,receiptEmail}){if(typeof fullName!=='string'||fullName.trim().length<3||fullName.length>200||typeof receiptEmail!=='string'||receiptEmail.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail))throw Error('Nome ou e-mail de recibo inválido.');const bytes=Buffer.from(JSON.stringify({fullName:fullName.trim(),receiptEmail:receiptEmail.trim()}));try{const ciphertext=(await protection()).protect(bytes);await mkdir(dataDir,{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({version:1,ciphertext:ciphertext.toString('base64')}),{mode:0o600});await rename(temp,file);return {saved:true}}finally{bytes.fill(0)}}
 return {read,save};
}
