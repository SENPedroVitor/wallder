import { CanvasScene, type SceneAction } from './CanvasScene'
import { normalize } from './workspace'
import { useEffect, useState } from 'react'
const available=[{name:'Gmail',groups:['Produtividade','Colaboração','Suporte','Vendas']},{name:'Google Calendar',groups:['Agenda','Produtividade','Colaboração']},{name:'Google Drive',groups:['Produtividade','Colaboração','Infraestrutura']},{name:'Granola',groups:['Produtividade','Colaboração']},{name:'Pesquisa de IA',groups:['Equipe','Pesquisa','Análise de dados','Orquestração','MCP']},{name:'Direção visual',groups:['Equipe','Design','Canvas']}]
export default function PluginCatalog({onAction}:{onAction:(a:SceneAction)=>void}){
 const [installed,setInstalled]=useState<number|null>(null),[tools,setTools]=useState<string[]>([])
 useEffect(()=>{const controller=new AbortController();void fetch('/api/plugins',{signal:controller.signal}).then(response=>response.json()).then(inventory=>{setInstalled((inventory.plugins??[]).filter((plugin:{enabled:boolean})=>plugin.enabled).length);setTools((inventory.servers??[]).flatMap((server:{tools:{name:string}[]})=>server.tools.map(tool=>tool.name)))}).catch(()=>{});return()=>controller.abort()},[])
 function decorate(root:HTMLElement){
  const elements=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')]
  const search=root.querySelector<HTMLElement>('[data-pencil-name="Campo de busca de plugins"]')
  const placeholder=root.querySelector<HTMLElement>('[data-pencil-name="Placeholder da busca"]')
  let query='',group='Todos'
  const filter=()=>{for(const plugin of available){const visible=normalize(plugin.name).includes(normalize(query))&&(group==='Todos'||group==='Destaques'&&!plugin.groups.includes('Equipe')||plugin.groups.includes(group));for(const el of [...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].filter(n=>(n.dataset.pencilName||'').endsWith(plugin.name)))el.style.display=visible?'':'none'}for(const el of elements.filter(n=>(n.dataset.pencilName||'').startsWith('Filtro — ')))el.style.backgroundColor=el.dataset.pencilName==='Filtro — '+group?'light-dark(#eee,var(--w-hover))':'light-dark(#fcfcfc,var(--w-bg))'}
  if(search&&placeholder){const input=document.createElement('input');input.type='search';input.setAttribute('aria-label','Buscar plugins');input.placeholder='Buscar plugins';input.style.cssText=search.style.cssText;input.style.padding='0 12px 0 33px';input.style.border='0';input.style.fontSize='13px';input.style.fontFamily='inherit';input.style.color='#383838';input.style.zIndex='500';input.className='native-plugin-search';input.addEventListener('input',()=>{query=input.value;filter()});search.replaceWith(input);placeholder.remove();root.querySelector('[data-pencil-name="Buscar plugins"]')?.setAttribute('style','position:absolute;left:43px;top:121px;width:15px;height:15px;z-index:501;pointer-events:none')}
  for(const label of elements.filter(n=>(n.dataset.pencilName||'').startsWith('Rótulo — '))){const name=(label.dataset.pencilName||'').slice(9);const button=document.createElement('button');button.type='button';button.textContent=label.textContent;button.style.cssText=label.style.cssText;button.style.padding='0';button.style.display='block';button.style.zIndex='600';button.style.fontFamily='inherit';button.addEventListener('click',e=>{e.stopPropagation();group=name;filter()});button.setAttribute('aria-label',name);label.replaceWith(button);const bg=elements.find(n=>n.dataset.pencilName==='Filtro — '+name);if(bg){bg.style.cursor='pointer';bg.addEventListener('click',e=>{e.stopPropagation();group=name;filter()})}}
 }
 const bindings={
  'Contagem de plugins':{text:installed===null?'Consultando…':installed+' instalados'},
  ...Object.fromEntries(available.map(plugin=>['Adicionar — '+plugin.name,{action:'Plugin: '+plugin.name,text:tools.some(tool=>normalize(tool).includes(normalize(plugin.name).replaceAll(' ','_')))?'Ver':'Configurar'}])),
 }
 return <CanvasScene id="V2cOB" region="Catálogo de plugins" crop={false} decorate={decorate} bindings={bindings} onAction={onAction}/>
}
