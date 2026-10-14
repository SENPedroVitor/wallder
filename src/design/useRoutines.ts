import { useCallback, useEffect, useRef, useState } from 'react'
import { routineStorageKey } from '../routines'
import { runtimeJson, type RuntimeInput } from '../runtime'
export type BackendRoutine = {id:string;chatId:string;name:string;instruction:string;frequency:string;time:string;active:boolean;agent:RuntimeInput['agent'];context:RuntimeInput['context'];lastRunDay?:string}
export type RoutineResult = {id:string;routineId:string;chatId:string;agentId:string;text:string;at:string;status:'completed'|'failed';error?:string}
export function useRoutines(){
 const [routines,setRoutines]=useState<BackendRoutine[]>([]),[results,setResults]=useState<RoutineResult[]>([]),[error,setError]=useState(''),[pending,setPending]=useState<string|null>(null)
 const mounted=useRef(false),refreshing=useRef(false),mutation=useRef(false)
 const refresh=useCallback(async()=>{if(refreshing.current)return;refreshing.current=true;try{const [list,history]=await Promise.all([runtimeJson<{routines:BackendRoutine[]}>('routines'),runtimeJson<{results:RoutineResult[]}>('routines/results')]);if(mounted.current){setRoutines(list.routines);setResults(history.results);setError('');try{localStorage.setItem(routineStorageKey,JSON.stringify(list.routines.map(r=>({...r,runs:history.results.filter(item=>item.routineId===r.id&&item.status==='completed').map(item=>Date.parse(item.at))}))));}catch{setError('As rotinas estão salvas no servidor, mas a cópia para backup local não pôde ser atualizada.')}}}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Não foi possível carregar as rotinas.')}finally{refreshing.current=false}},[])
 useEffect(()=>{mounted.current=true;void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{mounted.current=false;clearInterval(timer)}},[refresh])
 async function perform<T>(id:string,job:()=>Promise<T>){if(mutation.current)throw Error('Aguarde a operação anterior.');mutation.current=true;setPending(id);setError('');try{const result=await job();await refresh();return result}catch(e){setError(e instanceof Error?e.message:'Não foi possível completar.');throw e}finally{mutation.current=false;if(mounted.current)setPending(null)}}
 return {routines,results,error,pending,refresh,save:(r:BackendRoutine)=>perform(r.id,()=>runtimeJson<{routine:BackendRoutine}>('routines',r)),toggle:(r:BackendRoutine)=>perform(r.id,()=>runtimeJson('routines',{...r,active:!r.active})),remove:(id:string)=>perform(id,()=>runtimeJson('routines/delete',{id})),run:(id:string)=>perform(id,()=>runtimeJson('routines/run',{id}))}
}
