import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { createLiveGaze } from '../components/ui/live-orb'
import '../components/ui/live-orb.css'
const sourceCache=new Map<string,Promise<string>>()
type Identity={name:string;avatar?:string}
const identityContext=createContext<Identity|null>(null)
export function CanvasIdentityProvider({profile,children}:{profile:Identity;children:ReactNode}){return <identityContext.Provider value={profile}>{children}</identityContext.Provider>}
function sourceFor(url:string) {
  let source=sourceCache.get(url)
  if(!source){source=fetch(url).then(r=>{if(!r.ok)throw Error('Não foi possível carregar este desenho.');return r.text()}).catch(e=>{sourceCache.delete(url);throw e});sourceCache.set(url,source)}
  return source
}
function parseSource(source:string) {
  const doc=new DOMParser().parseFromString(source,'text/html')
  doc.querySelectorAll('script,iframe,link,style').forEach(n=>n.remove())
  for(const node of doc.querySelectorAll<HTMLElement>('[style]'))node.style.backgroundImage=node.style.backgroundImage.replace(/(?:untitled-assets\/)?(waddle-tela-projeto\.png|sign-in-screen\.jpg|screenshot-(?:amazon\.com\.br|mercadolivre\.com\.br|magazineluiza\.com\.br)\.png)/g,'/design/assets/$1')
  for(const node of doc.querySelectorAll<HTMLElement>('[style]'))node.style.backgroundImage=node.style.backgroundImage.replace('images/global.jbl.com/2052a191708488c1.png','/design/assets/g2iED.png')
  const root=doc.body.firstElementChild as HTMLElement|null
  if(!root)throw Error('Desenho vazio.')
  for(const frame of root.querySelectorAll<HTMLElement>('[data-pencil-name]'))if(/^West — (conjunto de formas|destaque da conversa)$/.test(frame.dataset.pencilName||'')){let eye=0;for(const node of [...frame.children] as HTMLElement[]){if(node.dataset.pencilName)continue;if(node.tagName.toLowerCase()==='svg')node.dataset.pencilName='West — Corpo 1';else if(dimension(node,'width')<=5&&dimension(node,'height')>=8)node.dataset.pencilName='West — Olhos '+(++eye)}}
  return root
}
function dimension(n:HTMLElement,key:'left'|'top'|'width'|'height'){return parseFloat(n.style[key])||0}
function text(n:Element){return (n.textContent??'').replace(/\s+/g,' ').trim()}
function baseName(n:HTMLElement){return (n.dataset.pencilName??'').split(' — ')[0]}
function inside(a:HTMLElement,b:HTMLElement) {
  return a.parentElement===b.parentElement&&dimension(a,'left')>=dimension(b,'left')&&dimension(a,'left')<=dimension(b,'left')+dimension(b,'width')&&dimension(a,'top')>=dimension(b,'top')&&dimension(a,'top')<=dimension(b,'top')+dimension(b,'height')
}
export type SceneAction = {label:string;name:string;fields:Record<string,string>;context?:string}
export type CanvasBinding={checked?:boolean;text?:string;style?:Record<string,string>;path?:string;action?:string;disabled?:boolean}
export type FieldOption={value:string;label:string}
type Props={autoActions?:boolean;fieldOptions?:Record<string,FieldOption[]>;id:string;onAction?:(action:SceneAction)=>void;values?:Record<string,string>;fragment?:boolean;region?:string;clip?:{left:number;top:number;width:number;height:number};decorate?:(root:HTMLElement)=>void;decorationKey?:string;crop?:boolean;bindings?:Record<string,CanvasBinding>}
export function CanvasScene({autoActions=true,id,onAction,values,fragment=false,region,clip,decorate,decorationKey='',crop=true,bindings,fieldOptions}:Props) {
  const identity=useContext(identityContext),identityRef=useRef(identity);identityRef.current=identity
  const host=useRef<HTMLDivElement>(null),outer=useRef<HTMLDivElement>(null)
  const actionRef=useRef(onAction);actionRef.current=onAction
  const valueRef=useRef(values);valueRef.current=values
  const decorateRef=useRef(decorate);decorateRef.current=decorate
  const bindingKey=JSON.stringify(bindings??{}),valueKey=JSON.stringify(values??{}),optionKey=JSON.stringify(fieldOptions??{})
  const formDraft=useRef<Record<string,string>>({}),previousForm=useRef({id,valueKey})
  const [error,setError]=useState(''),[reload,setReload]=useState(0)
  useEffect(()=>{
    let stopped=false,observer:ResizeObserver|undefined,mascotObserver:MutationObserver|undefined
    const gaze=new Map<HTMLElement,{dispose:()=>void;eyes:HTMLElement[]}>()
    if(previousForm.current.id===id&&previousForm.current.valueKey===valueKey&&host.current)formDraft.current=Object.fromEntries([...host.current.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-field]')].map(n=>[n.dataset.field!,n.value]));else formDraft.current={}
    previousForm.current={id,valueKey}
    setError('')
    sourceFor('/design/screens/'+id+'.html').then(source=>{
      if(stopped||!host.current||!outer.current)return
      let root=parseSource(source)
      let cropLeft=0
      if(clip){
        for(const child of [...root.children])if(child instanceof HTMLElement||child instanceof SVGElement){const node=child as HTMLElement;const x=dimension(node,'left'),y=dimension(node,'top');if(x<clip.left||x>=clip.left+clip.width||y<clip.top||y>=clip.top+clip.height)child.remove();else{child.style.left=(x-clip.left)+'px';child.style.top=(y-clip.top)+'px'}}
        root.style.width=clip.width+'px';root.style.height=clip.height+'px'
      }else if(region){
        const candidate=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].find(n=>n.dataset.pencilName===region)
        if(!candidate)throw Error('Componente original não encontrado.')
        root=candidate.cloneNode(true) as HTMLElement
      }else if(fragment){
        const candidate=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')].find(n=>/widget.*(?:resposta|chat)|(?:clima|gastos|progresso|tarefas|agenda).*widget|versão compacta/i.test(n.dataset.pencilName??'')&&dimension(n,'width')>120&&dimension(n,'width')<620&&dimension(n,'height')>60)
        if(candidate)root=candidate.cloneNode(true) as HTMLElement
      }else if(crop){
        const sidebar=[...root.children].find(n=>n instanceof HTMLElement&&dimension(n,'left')===0&&dimension(n,'width')>70&&dimension(n,'width')<=210&&dimension(n,'height')>=580) as HTMLElement|undefined
        if(sidebar)cropLeft=dimension(sidebar,'width')
      }
      const w=dimension(root,'width')||800,h=dimension(root,'height')||600
      root.style.setProperty('--native-radius',root.style.borderRadius||'0px');root.style.left='0';root.style.top='0'
      if(cropLeft){for(const n of [...root.children])if(n instanceof HTMLElement&&dimension(n,'left')<cropLeft&&dimension(n,'width')<=cropLeft)n.remove()}
      decorateRef.current?.(root)
      if(!fragment&&(!region||['Catálogo de plugins','Diálogo — recortar foto','Menu — criar agente ou canal'].includes(region))){for(const node of [root,...root.querySelectorAll<HTMLElement>('[style]')]){
        const name=node.dataset.pencilName||''
        if(name==='Área circular de recorte'||/— (?:Corpo|Detalhe|Olhos?)\b/i.test(name)||/^(Claro|Escuro|Sistema) — prévia/.test(name))continue
        const background=node.style.backgroundColor,color=node.style.color
        if(node.style.outlineColor&&/^rgb\((\d+), \1, \1\)$/.test(node.style.outlineColor))node.style.outlineColor=`light-dark(${node.style.outlineColor}, var(--w-line))`
        if(/divisor|separador|linha do cabeçalho/i.test(name)&&background)node.style.backgroundColor=`light-dark(${background}, var(--w-line))`
        else
        if(['rgb(255, 255, 255)','rgb(252, 252, 252)','rgb(250, 250, 250)'].includes(background))node.style.backgroundColor=`light-dark(${background}, var(--w-bg))`
        else if(['rgb(247, 247, 247)','rgb(245, 245, 245)','rgb(244, 244, 244)'].includes(background))node.style.backgroundColor=`light-dark(${background}, var(--w-side))`
        else if(['rgb(239, 239, 239)','rgb(238, 238, 238)','rgb(226, 226, 226)','rgb(229, 229, 229)'].includes(background))node.style.backgroundColor=`light-dark(${background}, var(--w-hover))`
        if(/^rgb\((\d+), \1, \1\)$/.test(color)&&parseInt(color.slice(4))<170)node.style.color=`light-dark(${color}, ${parseInt(color.slice(4))<100?'var(--w-text)':'var(--w-muted)'})`
      }}
      const nodes=[...root.querySelectorAll<HTMLElement>('[data-pencil-id]')]
      const bound=JSON.parse(bindingKey) as Record<string,CanvasBinding>
      for(const n of nodes){const binding=bound[n.dataset.pencilName??''];if(!binding)continue;if(binding.text!==undefined)n.textContent=binding.text;for(const [key,value] of Object.entries(binding.style??{}))n.style.setProperty(key,value);if(binding.path!==undefined)n.querySelector('path')?.setAttribute('d',binding.path);if(binding.disabled)n.setAttribute('aria-disabled','true');if(binding.action){n.dataset.label=binding.action;n.dataset.actionName=n.dataset.pencilName;n.setAttribute('role','button');n.setAttribute('aria-label',binding.action);n.tabIndex=0;n.style.cursor='pointer'}}
      const profile=identityRef.current
      if(profile){const initials=profile.name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();for(const node of root.querySelectorAll<HTMLElement>('[data-pencil-name]')){const name=node.dataset.pencilName||'';if(['Pedro — nome','Pedro — nome na navegação','Nome do usuário','Nome de Pedro','Nome do perfil'].includes(name))node.textContent=profile.name;if(['Pedro — iniciais','Pedro — iniciais na navegação','Iniciais de Pedro','Inicial do perfil'].includes(name))node.textContent=profile.avatar?'':initials;if(profile.avatar&&['Avatar de Pedro','Pedro — avatar','Pedro — avatar na navegação','Avatar do perfil','Foto de perfil — avatar atual'].includes(name)){node.style.backgroundImage='url("'+profile.avatar+'")';node.style.backgroundSize='cover';node.style.backgroundPosition='center'}}}
      // Exported drawing layers are siblings. Put transparent hit areas above
      // illustration layers so cards stay clickable without covering their art.
      for(const node of nodes){const binding=bound[node.dataset.pencilName??''];if(!binding?.action||binding.checked!==undefined||node.textContent?.trim()||!dimension(node,'height')||node.tagName.toLowerCase()==='svg')continue;const hit=document.createElement('button');hit.type='button';hit.className='canvas-hit';hit.style.cssText=node.style.cssText;hit.style.background='transparent';hit.style.border='0';hit.style.outline='0';hit.style.boxShadow='none';hit.style.zIndex='850';hit.dataset.label=binding.action;hit.dataset.actionName=node.dataset.pencilName;hit.setAttribute('aria-label',binding.action);if(binding.disabled)hit.disabled=true;node.removeAttribute('role');node.removeAttribute('tabindex');node.removeAttribute('aria-label');root.append(hit)}
      for(const field of nodes.filter(n=>/— campo(?: de texto)?$/.test(n.dataset.pencilName??''))){
        const key=baseName(field),parts=nodes.filter(n=>inside(n,field)&&n!==field)
        const copy=parts.filter(n=>/— (?:valor|conteúdo|placeholder)$/.test(n.dataset.pencilName??''))
        const initial=text(copy[0]??field)
        const multiline=/tarefa|descri|sobre|instru|memória/i.test(key)||dimension(field,'height')>50
        const options=(JSON.parse(optionKey) as Record<string,FieldOption[]>)[key]
        const input=document.createElement(options?'select':multiline?'textarea':'input')
        if(input instanceof HTMLSelectElement&&options){for(const option of options){const item=document.createElement('option');item.value=option.value;item.textContent=option.label;input.append(item)}}
        input.className='canvas-field';input.dataset.field=key;input.setAttribute('aria-label',key)
        input.style.cssText=field.style.cssText;input.style.zIndex='500';input.style.padding='0 '+Math.max(8,copy[0]?dimension(copy[0],'left')-dimension(field,'left'):12)+'px';input.style.fontSize=copy[0]?.style.fontSize||'12px';input.style.lineHeight=copy[0]?.style.lineHeight||'normal';input.style.fontWeight=copy[0]?.style.fontWeight||'400';input.style.color='#454545';input.style.border='0';input.style.fontFamily='inherit';input.style.resize='none';if(multiline&&!options)input.style.paddingTop=Math.max(8,copy[0]?dimension(copy[0],'top')-dimension(field,'top'):10)+'px'
        input.value=formDraft.current[key]??valueRef.current?.[key]??(options?.[0]?.value??'');if(!(input instanceof HTMLSelectElement))input.placeholder=initial
        if(input instanceof HTMLInputElement){if(/^data$/i.test(key))input.type='date';if(/^(Início|Fim)$/.test(key))input.type='time';if(/horário/i.test(key))input.type='time';if(/email|e-mail/i.test(key))input.type='email';if(/senha|token|segredo/i.test(key))input.type='password'}
        if(!(input instanceof HTMLSelectElement))input.maxLength=/sobre/i.test(key)?160:8000
        if(input instanceof HTMLInputElement&&/busca|procura/i.test(key))input.type='search'
        for(const n of copy)n.remove()
        field.replaceWith(input)
        if(key==='Sobre você')input.addEventListener('input',()=>{const counter=root.querySelector<HTMLElement>('[data-pencil-name="Contador da descrição"]');if(counter)counter.textContent=input.value.length+' / 160'})
      }
      for(const n of nodes){
        if(!root.contains(n)||n.style.display==='none'||n.dataset.label||n.querySelector('svg')||n.tagName.toLowerCase()==='svg')continue
        const name=n.dataset.pencilName??'',label=text(n)
        if(!label||label.length>110||n.children.length||n.dataset.field)continue
        const buttonFrame=nodes.find(b=>b!==n&&root.contains(b)&&inside(n,b)&&/botão|filtro|sugestão/i.test(b.dataset.pencilName??'')&&dimension(b,'height')<130)
        const actionable=!!buttonFrame||/ver detalhes|ver todos/i.test(label)||/— (?:ação|navegação|opção)$|— botão|ver todos|escolher outros|abrir|restaurar/i.test(name)||/^(?:Vamos começar|Voltar|Salvar|Cancelar|Criar|Adicionar|Editar|Excluir|Apagar|Arquivar|Desfazer|Continuar|Confirmar|Conectar|Testar|Tentar|Abrir|Ver |Mostrar mais|Permitir|Recusar|Autorizar|Pausar|Retomar|Marcar|Revisar|Recarregar|Atualizar|Aplicar|Buscar|Hoje|Semana|Agenda|Histórico|Fixados|Recentes|Tudo|Conversas|Arquivos|Gastos|Perfil|Conta|Aparência|Notificações|Conexões|Privacidade|Mascote|Foto|Próximo)/i.test(label)
        if(!autoActions||!actionable||/descrição|nota|próxima etapa|função|legenda|título|subtítulo|cabeçalho|contagem/i.test(name))continue
        const button=document.createElement('button');button.type='button';button.className='canvas-action';button.style.cssText=n.style.cssText;button.style.fontFamily='inherit';button.style.display='block';button.style.lineHeight=n.style.lineHeight;button.style.minHeight='0';button.style.margin='0';button.style.zIndex='600';button.dataset.pencilName=name;button.dataset.pencilId=n.dataset.pencilId;button.dataset.label=label;button.dataset.actionName=name;button.textContent=label;button.setAttribute('aria-label',label);n.replaceWith(button)
        const background=buttonFrame
        if(background){background.dataset.label=label;background.dataset.actionName=name;background.style.cursor='pointer'}
      }
      for(const icon of autoActions?root.querySelectorAll<HTMLElement>('svg[data-icon-name]'):[]){if(icon.dataset.label)continue;const name=icon.dataset.pencilName??'';if(/^(?:Fechar|Voltar|Nova conversa|Semana anterior|Próxima semana|Mês anterior|Próximo mês|Ver plugins instalados|Alterar tipo)/i.test(name)){icon.dataset.label=/^Fechar/.test(name)?'Fechar':name;icon.dataset.actionName=name;icon.setAttribute('role','button');icon.setAttribute('aria-label',name);icon.tabIndex=0;icon.style.cursor='pointer'}}
      for(const card of nodes.filter(n=>root.contains(n)&&/— cartão selecionado$/.test(n.dataset.pencilName??''))){const hit=document.createElement('button');hit.type='button';hit.className='canvas-hit';hit.style.cssText=card.style.cssText;hit.style.background='transparent';hit.style.outline='0';hit.style.border='0';hit.style.zIndex='850';hit.setAttribute('role','checkbox');hit.setAttribute('aria-label',baseName(card));hit.setAttribute('aria-checked',String(bound[card.dataset.pencilName??'']?.checked??true));hit.dataset.label=baseName(card);hit.dataset.actionName='project-agent';card.removeAttribute('role');card.removeAttribute('tabindex');root.append(hit)}
      for(const toggle of nodes.filter(n=>root.contains(n)&&!/— cartão selecionado$/.test(n.dataset.pencilName??'')&&(/toggle|alternância|interruptor/i.test(n.dataset.pencilName??'')||bound[n.dataset.pencilName??'']?.checked!==undefined))){const binding=bound[toggle.dataset.pencilName??''];toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(binding?.checked??false));toggle.setAttribute('aria-label',binding?.action??baseName(toggle));toggle.tabIndex=0;toggle.classList.add('canvas-toggle');toggle.classList.toggle('is-on',binding?.checked??false);toggle.dataset.label=binding?.action??baseName(toggle);toggle.dataset.actionName='toggle'}
      const fields=()=>Object.fromEntries([...root.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('[data-field]')].map(n=>[n.dataset.field!,n.value]))
      const click=(e:Event)=>{const n=(e.target as Element).closest<HTMLElement>('[data-label]');if(!n||n.getAttribute('aria-disabled')==='true')return;if(n.getAttribute('role')==='switch'){n.setAttribute('aria-checked',String(n.getAttribute('aria-checked')!=='true'));n.classList.toggle('is-on')}actionRef.current?.({label:n.dataset.label??'',name:n.dataset.actionName??'',fields:fields(),context:n.parentElement?.textContent??''})}
      root.addEventListener('click',click)
      root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&['switch','checkbox','button'].includes((e.target as HTMLElement).getAttribute('role')??'')){e.preventDefault();(e.target as Element).dispatchEvent(new MouseEvent('click',{bubbles:true}))}})
      host.current.replaceChildren(root)
      const animateMascots=()=>{
        for(const [node,state] of gaze)if(!root.contains(node)||state.eyes.some(eye=>!node.contains(eye))){state.dispose();gaze.delete(node)}
        for(const eye of root.querySelectorAll<HTMLElement>('[data-pencil-name]')){
          if(!/(?:^|— )olhos?\b/i.test(eye.dataset.pencilName||''))continue
          const body=eye.closest<HTMLElement>('[data-live-gaze-root]')||eye.closest<HTMLElement>('[data-pencil-name*="mascote"]')||eye.parentElement
          if(body&&!gaze.has(body)){const eyes=[...body.querySelectorAll<HTMLElement>('[data-pencil-name]')].filter(node=>/(?:^|— )olhos?\b/i.test(node.dataset.pencilName||''));gaze.set(body,{dispose:createLiveGaze(body),eyes})}
        }
      }
      animateMascots();mascotObserver=new MutationObserver(animateMascots);mascotObserver.observe(root,{childList:true,subtree:true})
      host.current.style.width=(w-cropLeft)+'px';host.current.style.height=h+'px';root.style.transform=cropLeft?'translateX(-'+cropLeft+'px)':''
      const resize=()=>{if(!outer.current||!host.current)return;const scale=Math.min(outer.current.clientWidth/(w-cropLeft),fragment?1:Math.max(1,outer.current.clientHeight)/h);host.current.style.transform='scale('+scale+')';outer.current.style.setProperty('--scene-height',(h*scale)+'px')}
      observer=new ResizeObserver(resize);observer.observe(outer.current);resize()
    }).catch(e=>{if(!stopped)setError(e instanceof Error?e.message:'Falha ao carregar desenho.')})
    return()=>{stopped=true;observer?.disconnect();mascotObserver?.disconnect();for(const state of gaze.values())state.dispose()}
  },[id,reload,autoActions,fragment,crop,bindingKey,valueKey,optionKey,region,JSON.stringify(clip),decorationKey,identity?.name,identity?.avatar])
  return <div ref={outer} className={'canvas-viewport'+(fragment?' canvas-viewport--fragment':'')+(region?' canvas-viewport--region':'')} data-scene={id}>
    {error?<div className="canvas-load-error" role="alert"><p>{error}</p><button onClick={()=>setReload(n=>n+1)}><RefreshCw size={16}/> Tentar novamente</button></div>:<div ref={host} className="canvas-scene"/>}
  </div>
}
const mascotColors:Record<string,string>={yellow:'#EDE545',violet:'#8A69CB',green:'#28966F',blue:'#6689BD',sand:'#CBA787'}
export function paintCanvasMascotColor(target:HTMLElement,color?:string){const fill=color?mascotColors[color]:undefined;if(!fill)return;for(const node of target.querySelectorAll<HTMLElement>('[data-pencil-name]')){if(!/\bcorpo\b/i.test(node.dataset.pencilName||''))continue;if(node.tagName.toLowerCase()==='svg')node.querySelectorAll<SVGElement>('path,rect,ellipse,polygon').forEach(shape=>shape.style.fill=fill);else node.style.backgroundColor=fill}}
export function replaceCanvasMascot(target:HTMLElement|null,agent:string,appearance?:{photo?:string;color?:string}){
  if(!target)return
  if(appearance?.photo?.startsWith('data:image/')){target.replaceChildren();target.style.backgroundImage='url("'+appearance.photo+'")';target.style.backgroundSize='cover';target.style.backgroundPosition='center';target.style.borderRadius='50%';return}
  const size=dimension(target,'width')||16
  const request=String((Number(target.dataset.mascotRequest)||0)+1);target.dataset.mascotRequest=request
  void sourceFor('/design/agents/'+agent+'.html').then(source=>{if(target.dataset.mascotRequest!==request)return;const node=parseSource(source),w=dimension(node,'width')||128,h=dimension(node,'height')||128;paintCanvasMascotColor(node,appearance?.color);node.style.left='0';node.style.top='0';node.style.transform='scale('+Math.min(size/w,size/h)+')';node.style.transformOrigin='top left';target.replaceChildren(node)}).catch(()=>{})
}
export function CanvasMascot({agent,size=24,animated=false,photo,color}:{agent:string;size?:number;animated?:boolean;photo?:string;color?:string}){
  const host=useRef<HTMLSpanElement>(null)
  useEffect(()=>{let stopped=false,dispose=()=>{};sourceFor('/design/agents/'+agent+'.html').then(source=>{if(stopped||!host.current)return;const node=parseSource(source),w=dimension(node,'width')||128,h=dimension(node,'height')||128;paintCanvasMascotColor(node,color);node.style.left='0';node.style.top='0';node.style.transform='scale('+Math.min(size/w,size/h)+')';node.style.transformOrigin='top left';host.current.replaceChildren(node);dispose=createLiveGaze(node)}).catch(()=>{});return()=>{stopped=true;dispose()}},[agent,size,photo,color])
  if(photo?.startsWith('data:image/'))return <img className="canvas-mascot-photo" src={photo} alt={'Foto de '+agent} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover'}}/>
  return <span ref={host} className={'canvas-mascot'+(animated?' canvas-mascot--moving':'')} style={{width:size,height:size}} role="img" aria-label={'Mascote de '+agent}/>
}
