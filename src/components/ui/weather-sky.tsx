import { useEffect, useRef, useState } from 'react'
import { moonAge, weatherKind, weatherScene, WEATHER_SKIES, WEATHER_SKY_LAYERS, type WeatherSkyLayer } from './weather-scene'

const paint:Record<WeatherSkyLayer,string>={off:'#27272B',glow:'#E8D92F',star:'#C2CCDF',moonDark:'#515565',moon:'#DCE1EE',sun:'#E8D92F',ray:'#E8D92F',heat:'#E8D92F',bird:'#73737C',snow:'#D6E0EE',rain:'#719BD0',bolt:'#F5E683',cloud:'#777780',cloudDark:'#53535D',fog:'#777780',wind:'#62626E',hill:'#393940',hz:'#484850'}

/** Animate only this SVG, at the supplied component's 166 ms cadence. */
export function WeatherSkyEffect({code,wind,hour,date,width,height}:{code:number;wind:number;hour:number;date:string;width:number;height:number}){
  const host=useRef<SVGSVGElement>(null),[tick,setTick]=useState(0)
  useEffect(()=>{
    const element=host.current;if(!element)return
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,timer:ReturnType<typeof setInterval>|undefined
    const update=()=>{clearInterval(timer);timer=undefined;if(reduced.matches||document.documentElement.dataset.motion==='reduced'){setTick(0);return}if(visible&&!document.hidden)timer=setInterval(()=>setTick(value=>(value+1)%3600),166)}
    const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;update()});observer.observe(element)
    const preferences=new MutationObserver(update);preferences.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']})
    reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update)
    return()=>{clearInterval(timer);observer.disconnect();preferences.disconnect();reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update)}
  },[])
  const kind=weatherKind(code),cols=Math.max(21,Math.round(width/6)),rows=Math.max(14,Math.round(height/6)),phaseDate=new Date(date)
  const sky={...WEATHER_SKIES[kind],wind:Math.max(WEATHER_SKIES[kind].wind??0,Math.min(1,Math.max(0,(wind-5)/55))),moonPhase:Number.isFinite(phaseDate.getTime())?moonAge(phaseDate):.5}
  const paths=weatherScene({cols,rows,horizon:rows-1,hour,sky,tick})
  return <svg ref={host} className="weather-sky-effect" viewBox={`0 0 ${cols*8} ${rows*8}`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true" data-weather-kind={kind} data-weather-tick={tick} style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>{WEATHER_SKY_LAYERS.map(layer=><path key={layer} data-layer={layer} d={paths[layer]} fill={paint[layer]} opacity={layer==='glow'?.25:layer==='moonDark'?.45:layer==='fog'?.65:layer==='heat'?.5:1}/>)}</svg>
}
