import type { RecordEntry } from './workspace'

export function memoryForAgent(preference:unknown,records:RecordEntry[],agentId:string):string {
 const saved=records.filter(record=>record.kind==='memoria'&&!record.archived&&(record.fields.Agente===agentId||record.fields.Agente==='Todos')).sort((a,b)=>b.updated-a.updated).map(record=>record.fields.Conteúdo??'')
 return [typeof preference==='string'?preference:'',...saved].map(text=>text.trim()).filter(Boolean).join('\n\n').slice(0,8000)
}

export function memoryRevision(memory:string):string {
 let hash=2166136261
 for(let index=0;index<memory.length;index++)hash=Math.imul(hash^memory.charCodeAt(index),16777619)
 return (hash>>>0).toString(16)
}
