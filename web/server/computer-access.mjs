import { readFile,writeFile,mkdir,rename } from 'node:fs/promises'
import path from 'node:path'
export function createComputerAccess(dataDir){
  let apps=new Set(),queue=Promise.resolve();const file=dataDir?path.join(dataDir,'computer-access.json'):null;
  const ready=file?readFile(file,'utf8').then(source=>{const value=JSON.parse(source);if(!Array.isArray(value.apps)||value.apps.some(app=>typeof app!=='string'))throw Error('Autorizações do computador inválidas.');apps=new Set(value.apps)}).catch(error=>{if(error.code!=='ENOENT')throw error}):Promise.resolve();
  function save(app,allow){const result=queue.catch(()=>{}).then(async()=>{await ready;const next=new Set(apps);if(allow)next.add(app);else next.delete(app);if(file){await mkdir(dataDir,{recursive:true});await writeFile(file+'.tmp',JSON.stringify({apps:[...next]}));await rename(file+'.tmp',file)}apps=next;return [...apps]});queue=result;return result}
  return {ready,has:app=>apps.has(app),list:()=>[...apps],save};
}
