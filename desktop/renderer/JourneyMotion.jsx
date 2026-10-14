import { BusFront, Clapperboard, MapPin } from 'lucide-react'
export function JourneyMotion({journey,compact=false,active=false}) {
  const bus=journey.kind==='bus'
  return <div className={'journey-motion'+(compact?' journey-motion--compact':'')+(active?' journey-motion--active':'')} aria-label={bus?'Pesquisa de viagem de ônibus':'Consulta ao cinema'}>
    {bus?<div className="journey-track"><MapPin className="journey-origin" size={compact?10:13}/><span className="journey-road"/><span className="journey-vehicle"><BusFront size={compact?22:26}/></span><MapPin className="journey-destination" size={compact?10:13}/></div>:<div className="journey-cinema"><Clapperboard size={compact?28:34}/></div>}
    {!compact&&<div className="journey-caption"><strong>{bus?[journey.origin,journey.destination].filter(Boolean).join(' → ')||'Viagem de ônibus':journey.movie||'Cinema'}</strong><span>{active?journey.stage==='preparing'?'Preparando a consulta':bus?'Consultando rotas e passagens':'Consultando programação':journey.price?journey.price:'Consulta concluída'}{journey.date?' · '+journey.date:''}</span>{!active&&(journey.departure||journey.arrival)&&<span>{journey.departure||'A consultar'} → {journey.arrival||'A consultar'}</span>}</div>}
  </div>
}
