import { CanvasScene, replaceCanvasMascot, type CanvasBinding } from './CanvasScene'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { weatherKind } from '../components/ui/weather-scene'
import { WeatherSkyEffect } from '../components/ui/weather-sky'
export type WeatherData={city:string;updated:string;current:{temperature:number;apparent:number;wind:number;code:number};hourly:{time:string;temperature:number;rain:number;code:number}[];daily:{time:string;min:number;max:number;code:number}[]}
export function condition(code:number,hour=12){const kind=weatherKind(code);if(kind==='clear')return hour<7.5||hour>19.5?'Céu limpo':code===0?'Ensolarado':'Predominantemente limpo';return {partly:'Parcialmente nublado',cloud:'Nublado',rain:'Chuva',drizzle:'Garoa',storm:'Tempestade',snow:'Neve',sleet:'Chuva congelante',mist:'Neblina',windy:'Ventoso',heat:'Calor'}[kind]}
const hours=['AGORA','12H','15H','18H','21H','00H'],days=['Hoje','Qui','Sex','Sáb','Dom','Seg','Ter']
export function WeatherWidget({data}:{data:WeatherData}){
 const [skyTarget,setSkyTarget]=useState<HTMLElement|null>(null)
 const localTime=data.hourly[0]?.time.slice(11,16),hour=localTime?Number(localTime.slice(0,2))+Number(localTime.slice(3,5))/60:12
 const bindings:Record<string,CanvasBinding>={
  'Cidade — nome':{text:data.city},'Condição — atual':{text:condition(data.current.code,hour)+' agora'},'Atualização — horário':{text:new Date(data.updated).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})},'Temperatura — atual':{text:Math.round(data.current.temperature)+'°'},'Condição — principal':{text:condition(data.current.code,hour)},'Sensação, chuva e vento':{text:'Sensação '+Math.round(data.current.apparent)+'° · Chuva '+(data.hourly[0]?.rain??0)+'% · '+Math.round(data.current.wind)+' km/h'},
 }
 data.hourly.slice(0,6).forEach((h,i)=>{bindings['Horário — '+hours[i]]={text:i===0?'AGORA':h.time.slice(11,13)+'H'};bindings['Temperatura por hora — '+hours[i]]={text:Math.round(h.temperature)+'°'}})
 const low=Math.floor(Math.min(...data.daily.map(d=>d.min))/10)*10,high=Math.ceil(Math.max(...data.daily.map(d=>d.max))/10)*10,range=Math.max(10,high-low)
 bindings['Escala — 10 graus']={text:low+'°'};bindings['Escala — 20 graus']={text:Math.round(low+range/2)+'°'};bindings['Escala — 30 graus']={text:high+'°'}
 data.daily.slice(0,7).forEach((d,i)=>{bindings['Dia — '+days[i]]={text:i===0?'Hoje':new Date(d.time+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')};bindings['Mínima — '+days[i]]={text:Math.round(d.min)+'°'};bindings['Máxima — '+days[i]]={text:Math.round(d.max)+'°'};const min=Math.round((d.min-low)/range*240),max=Math.round((d.max-low)/range*240);bindings['Faixa de temperatura — '+days[i]]={path:Array.from({length:48},(_,j)=>j*5>=min&&j*5<max?'M'+(j*5)+' 0h3v5h-3z':'').join(' ')} })
 return <section className="official-widget official-widget--weather" aria-label={'Clima em '+data.city}><CanvasScene id="nARBK" fragment bindings={bindings} decorate={root=>{const target=root.querySelector<HTMLElement>('[data-pencil-name="Clima — cenário em pixels"]');if(target){target.replaceChildren();setSkyTarget(target)}}}/>{skyTarget&&createPortal(<WeatherSkyEffect code={data.current.code} wind={data.current.wind} hour={hour} date={data.updated} width={parseFloat(skyTarget.style.width)||340} height={parseFloat(skyTarget.style.height)||92}/>,skyTarget)}<a className="official-widget-source" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></section>
}
export type SpendingData={month:string;total:number;months:{label:string;total:number}[];count:number}
export const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export function SpendingWidget({data,onExpand,agentId='pam',agentName='Pam'}:{data:SpendingData;onExpand:()=>void;agentId?:string;agentName?:string}){
 const bindings:Record<string,CanvasBinding>={'Agente da resposta':{text:agentName},'Período dos gastos':{text:data.month.toUpperCase()},'Total de gastos':{text:money(data.total)},'Escala do gráfico':{text:money(Math.max(...data.months.map(m=>m.total),1))}}
 const months=data.months.slice(-6),keys=['MAI','JUN','JUL','AGO','SET','OUT'],max=Math.max(...months.map(m=>m.total),1)
 months.forEach((m,i)=>{bindings['Mês '+keys[i]]={text:m.label.toUpperCase()};const height=m.total/max*69;bindings['Gasto de '+keys[i]]={style:{top:(148-height)+'px',height:height+'px'}}})
 const previous=months.at(-2)?.total??0;bindings['Variação mensal']={text:previous?Math.round((data.total/previous-1)*100)+'% em relação ao mês anterior':data.count?'Gastos registrados por você':'Nenhum gasto registrado'}
 return <section className="official-widget official-widget--spending" aria-label="Gastos do mês"><CanvasScene id="c5Iuyf" fragment bindings={bindings} decorate={root=>replaceCanvasMascot(root.querySelector('[data-pencil-name="West — mascote"]'),agentId)} onAction={onExpand}/></section>
}
