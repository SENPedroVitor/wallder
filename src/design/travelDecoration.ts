export type JourneyCard={kind:'bus'|'cinema';origin:string;destination:string;date:string;movie:string;source:string;checkedAt:number;sourceUnavailable?:boolean;seats:{label:string;status:'available'|'occupied'|'selected'|'unknown'}[];sessions:string[]}
export function decorateTravel(root:HTMLElement,journey:JourneyCard,onRequest:(prompt:string)=>void) {
  if(journey.kind!=='cinema')return
  const nodes=[...root.querySelectorAll<HTMLElement>('[data-pencil-name]')]
  for(const node of nodes){
    const name=node.dataset.pencilName||''
    if(/^Poltrona [A-Z]+\d+$|^Número da poltrona |^Fila \d+$/.test(name))node.style.visibility='hidden'
    if(/^Sessão .+ — base$/.test(name))node.style.background='#37373D'
    if(!journey.sessions.length&&/^Sessão .+ — (base|texto)$/.test(name)){
      if(name.includes('18:30')){node.style.left='13.259px';node.style.width='238px'}else node.style.visibility='hidden'
    }
  }
  const map=document.createElement('div');map.className='travel-seat-map';map.style.cssText='position:absolute;left:13.259px;top:141.429px;width:238px;height:75px;overflow:auto;z-index:50;font-family:system-ui,sans-serif'
  map.setAttribute('aria-label','Poltronas consultadas, organizadas por fileira. Confira o mapa completo no cinema.')
  if(!journey.seats.length){const empty=document.createElement('p');empty.className='travel-seats-empty';empty.textContent='Consulte a sessão para ver as poltronas reais.';map.append(empty)}
  else{
    const rows=[...new Set(journey.seats.map(seat=>seat.label.match(/^[A-Z]+/)![0]))].sort()
    for(const row of rows){const line=document.createElement('div');line.className='travel-seat-row';const label=document.createElement('span');label.textContent=row;line.append(label)
      for(const seat of journey.seats.filter(seat=>seat.label.startsWith(row)&&seat.label.match(/^[A-Z]+/)![0]===row).sort((a,b)=>Number(a.label.replace(/\D/g,''))-Number(b.label.replace(/\D/g,'')))){
        const button=document.createElement('button');button.type='button';button.className='travel-seat travel-seat--'+seat.status;button.textContent=seat.label.replace(/^[A-Z]+/,'');button.disabled=seat.status!=='available';button.setAttribute('aria-label','Poltrona '+seat.label+' · '+({available:'livre na consulta',occupied:'ocupada',selected:'selecionada no site',unknown:'estado não informado'}[seat.status]));button.addEventListener('click',()=>onRequest('Confira novamente a disponibilidade da poltrona '+seat.label+' para '+journey.movie+' em '+journey.destination+' na data '+journey.date+' usando '+journey.source+'. Isso é uma preferência; ainda não reserve nem compre.'));line.append(button)
      }map.append(line)
    }
  }
  root.append(map)
}
