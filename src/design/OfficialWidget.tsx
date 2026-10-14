import { useEffect, useState } from 'react'
import { CanvasScene, replaceCanvasMascot, type CanvasBinding } from './CanvasScene'
import { agentById } from './workspace'
import { runtimeJson } from '../runtime'
import { decorateTravel, type JourneyCard } from './travelDecoration'

type WidgetAction={target:string;label:string;kind:'set'|'request'|'link';patch?:Record<string,string>;toggle?:boolean;prompt?:string;url?:string}
export type OfficialWidgetData={id:string;screen:string;region:string;width:number;height:number;bindings:Record<string,string>;actions:WidgetAction[];charts:{target:string;values:number[];min?:number;max?:number}[];notes:string;active:string[];revision:number;roots?:number[];formula?:{a:number;b:number;c:number};journey?:JourneyCard}
export function OfficialWidget({data,agentId,onRequest}:{data:OfficialWidgetData;agentId:string;onRequest:(prompt:string)=>void}) {
  const [value,setValue]=useState(data),[busy,setBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{const controller=new AbortController();void runtimeJson<OfficialWidgetData>('widgets/canvas/'+data.id,undefined,{signal:controller.signal}).then(setValue).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[data.id])
  const bindings:Record<string,CanvasBinding>=Object.fromEntries(Object.entries(value.bindings).map(([name,text])=>[name,{text,style:{'white-space':'pre-line'}}]))
  bindings['Agente da resposta']={text:agentById(agentId).name}
  if(value.journey?.kind==='bus'){
    const city=(name:string)=>name.split(/,|\s+-\s+/)[0].trim(),origin=city(value.journey.origin),destination=city(value.journey.destination)
    bindings['Origem e destino']={text:[origin,destination].filter(Boolean).join(' → '),style:{'white-space':'nowrap','overflow':'hidden','text-overflow':'ellipsis'}}
    for(const name of ['Partida','Chegada'])if(!/\d/.test(value.bindings[name]||''))bindings[name]={text:'—'}
    bindings['Origem — mapa']={text:origin.toUpperCase().slice(0,4),style:{'white-space':'nowrap'}}
    bindings['Destino — mapa']={text:destination.toUpperCase().slice(0,3),style:{'white-space':'nowrap'}}
    if(!value.bindings['Data e tipo'])bindings['Data e tipo']={text:'Data a definir'}
  }
  if(value.journey?.kind==='cinema'){
    if(!value.bindings['Data da sessão'])bindings['Data da sessão']={text:'Data e sessão a definir'}
    if(!value.journey.sessions.length)bindings['Sessão 18:30 — texto']={text:'Sessões a consultar',style:{'white-space':'nowrap'}}
  }
  for(const action of value.actions)bindings[action.target]={...bindings[action.target],action:action.label,disabled:busy}
  const act=async(target:string)=>{
    if(value.formula&&target.startsWith('math:')){setBusy(true);try{setValue(await runtimeJson<OfficialWidgetData>('widgets/canvas/'+value.id,{target}));setError('')}catch(e){setError(e instanceof Error?e.message:'Não foi possível calcular.')}finally{setBusy(false)}return}
    if(target==='palette:copy'){try{await navigator.clipboard.writeText(Object.entries(value.bindings).filter(([name,text])=>/^Código da amostra /.test(name)&&/^#[a-f\d]{6}$/i.test(text)).map(([,text])=>text).join(' '));setError('Paleta copiada.')}catch{setError('Não foi possível copiar a paleta.')}return}
    const action=value.actions.find(a=>a.target===target)
    if(!action||busy)return
    if(action.kind==='request'){onRequest(action.prompt!+(value.formula?' Coeficientes atuais: '+JSON.stringify(value.formula)+'.':''));return}
    if(action.kind==='link'){window.open(action.url,'_blank','noopener,noreferrer');return}
    setBusy(true);try{setValue(await runtimeJson<OfficialWidgetData>('widgets/canvas/'+value.id,{target}));setError('')}catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar o card.')}finally{setBusy(false)}
  }
  return <section className="official-widget official-widget--canvas" style={{width:value.width,maxWidth:'100%'}} aria-label={value.region.replace(/ — widget.*$/,'')} aria-busy={busy}>
    <CanvasScene id={value.screen} fragment region={value.region} autoActions={false} bindings={bindings} decorationKey={String(value.revision)} decorate={root=>{
      for(const node of root.querySelectorAll<HTMLElement>('[data-pencil-name]')){
        const name=node.dataset.pencilName||''
        if(node.textContent?.trim()&&[...node.children].every(child=>child.tagName==='BR')&&!Object.hasOwn(value.bindings,name))node.textContent=''
        if(/— mascote$/.test(name))replaceCanvasMascot(node,agentId)
        if(/(?:gráfico.*(?:curva|linha|barra)|barra.*(?:preench|progresso)|progresso.*preench)/i.test(name)){node.style.background='transparent';node.style.clipPath='none';node.replaceChildren()}
        const vote=name.match(/^Barra de votos (\d+)$/)
        if(vote){const fields=['Percentual Viagem','Percentual Estudos','Percentual Receitas'];const percent=Math.max(0,Math.min(100,parseFloat(value.bindings[fields[Number(vote[1])]])||0));const track=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].find(n=>n.dataset.pencilName==='Trilho de votos '+vote[1]);node.style.width=((parseFloat(track?.style.width||'0')||0)*percent/100)+'px'}
        // Explicit actions preserve the original geometry and avoid inert prototype controls.
        const action=value.actions.find(a=>a.target===name)
        if(action){node.dataset.label=action.label;node.dataset.actionName=name;node.setAttribute('role','button');node.setAttribute('aria-label',action.label);node.setAttribute('aria-pressed',String(value.active.includes(name)));node.tabIndex=0;node.style.cursor='pointer'}
        const rootPoint=name.match(/^(Primeira|Segunda) raiz — ponto$/);if(value.formula&&rootPoint){const r=value.roots?.[rootPoint[1]==='Primeira'?0:1];const curve=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].find(n=>n.dataset.pencilName==='Curva da função quadrática');if(r===undefined||r<-.5||r>4.5||!curve)node.style.visibility='hidden';else{node.style.left=(parseFloat(curve.style.left)+(r+.5)/5*parseFloat(curve.style.width)-parseFloat(node.style.width)/2)+'px';node.style.top=(parseFloat(curve.style.top)+7/12*parseFloat(curve.style.height)-parseFloat(node.style.height)/2)+'px'}}
        const coefficient=name.match(/^(Aumentar|Diminuir) ([abc])$/)
        if(value.formula&&coefficient){const target='math:'+(coefficient[1]==='Aumentar'?'increase':'decrease')+':'+coefficient[2];node.dataset.label=name;node.dataset.actionName=target;node.setAttribute('role','button');node.setAttribute('aria-label',name);node.tabIndex=0;node.style.cursor='pointer'}
        if(value.formula&&name==='Testar outro valor — texto'){node.dataset.label='Testar c = 0';node.dataset.actionName='math:set:c:0';node.setAttribute('role','button');node.setAttribute('aria-label','Testar c = 0');node.tabIndex=0;node.style.cursor='pointer'}
        if(value.formula&&/^Slider c — (preenchimento|controle)$/.test(name))node.style.visibility='hidden'
        if(value.formula&&name==='Slider c — trilho'){const input=document.createElement('input');input.type='range';input.min=String(Math.min(-6,value.formula.c));input.max=String(Math.max(6,value.formula.c));input.step='0.1';input.value=String(value.formula.c);input.setAttribute('aria-label','Coeficiente c');input.style.cssText=node.style.cssText;input.style.height='14px';input.style.top=(parseFloat(node.style.top)-5)+'px';input.style.margin='0';input.style.accentColor='#E8D92F';input.addEventListener('change',()=>void act('math:set:c:'+input.value));node.replaceWith(input)}
        if(value.screen==='zTs3M'&&/^Amostra #/.test(name)){const index=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].filter(n=>/^Amostra #/.test(n.dataset.pencilName||'')).indexOf(node);const color=value.bindings['Código da amostra '+index];node.style.background=/^#[a-f\d]{6}$/i.test(color)?color:'transparent'}
        if(value.screen==='zTs3M'&&name==='Destaque na prévia'){const color=value.bindings['Código da amostra 0'];node.style.background=/^#[a-f\d]{6}$/i.test(color)?color:'transparent'}
        if(value.screen==='zTs3M'&&name==='Ação do card'){node.dataset.label='Copiar paleta';node.dataset.actionName='palette:copy';node.setAttribute('role','button');node.setAttribute('aria-label','Copiar paleta');node.tabIndex=0;node.style.cursor='pointer'}
        const habit=name.match(/^Marca do hábito (\d+)$/)
        if(habit){const text=value.bindings['Estado diário '+habit[1]]||'';node.style.background=/^(?:✓|feito|concluído|sim)$/i.test(text)?'#E8D92F':'#3A3A40'}
      }
      if(value.journey)decorateTravel(root,value.journey,onRequest)
      for(const chart of value.charts){const node=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].find(n=>n.dataset.pencilName===chart.target);if(!node)continue;const min=chart.min??Math.min(...chart.values),range=(chart.max??Math.max(...chart.values))-min||1;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 40');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-label','Gráfico dos dados da resposta');svg.style.cssText='width:100%;height:100%';const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d',chart.values.map((v,i)=>(i?'L':'M')+(i/(chart.values.length-1)*100)+' '+(40-(v-min)/range*40)).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#E8D92F');line.setAttribute('stroke-width','1');svg.append(line);node.style.background='transparent';node.style.clipPath='none';node.replaceChildren(svg)}
    }} onAction={event=>void act(event.name)}/>
    {value.journey&&<div className="travel-source"><span>{value.journey.sourceUnavailable?'Fonte indisponível · tentativa às ':'Consultado às '}{new Date(value.journey.checkedAt).toLocaleTimeString('pt-BR')}{Date.now()-value.journey.checkedAt>300000?' · confira novamente':''}</span><a href={value.journey.source} target="_blank" rel="noreferrer">Ver fonte</a></div>}
    {value.notes&&<details className="official-widget-details"><summary>Conteúdo completo</summary><p>{value.notes}</p></details>}
    {error&&<p role="alert">{error}</p>}
  </section>
}
