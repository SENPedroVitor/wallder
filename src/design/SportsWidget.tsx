import { useEffect, useState } from 'react'
import { ExternalLink, Radio } from 'lucide-react'
export type SportsGame={id:string;league:string;leagueName:string;date:string;startsAt:string;state:string;detail:string;clock:string;checkedAt:number;source:string;url:string;home:{name:string;abbreviation:string;score:number|null};away:{name:string;abbreviation:string;score:number|null}}
export function SportsWidget({data}:{data:SportsGame}) {
  const [game,setGame]=useState(data),[stale,setStale]=useState(Date.now()-data.checkedAt>45000)
  useEffect(()=>{
    let stopped=false,timer:ReturnType<typeof setTimeout>
    const controller=new AbortController()
    const refresh=async()=>{try{const query=new URLSearchParams({league:data.league,date:data.date,event:data.id});const response=await fetch('/api/sports/score?'+query,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});if(!response.ok)throw Error();const next=await response.json() as SportsGame;if(!stopped){setGame(next);setStale(Date.now()-next.checkedAt>45000)}}catch{if(!stopped)setStale(true)}finally{if(!stopped)timer=setTimeout(refresh,20000)}}
    void refresh();return()=>{stopped=true;controller.abort();clearTimeout(timer)}
  },[data.id,data.league,data.date])
  return <section className="sports-widget" aria-label="Placar da partida"><header><Radio size={14}/><span>{stale?'Atualização indisponível':game.state==='in'?'Em andamento':game.detail}</span><small>{game.leagueName}</small></header><div className="sports-widget-score"><span>{game.home.name}</span><strong>{game.home.score??'—'} : {game.away.score??'—'}</strong><span>{game.away.name}</span></div><p>{game.state==='pre'?new Date(game.startsAt).toLocaleString('pt-BR'):game.detail}</p><div className="sports-widget-footer"><span>Consultado às {new Date(game.checkedAt).toLocaleTimeString('pt-BR')}{stale?' · última leitura':''}</span><a href={game.url} target="_blank" rel="noreferrer">ESPN <ExternalLink size={12}/></a></div></section>
}
