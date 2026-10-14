import { useEffect, useRef, type ReactNode } from 'react'
import './pencil-viewport.css'
import { desktopCanvasSize } from './desktopCanvas'

/** Keep the canvas coordinate system intact while fitting a desktop window. */
export function PencilViewport({children}:{children:ReactNode}) {
 const host=useRef<HTMLDivElement>(null)
 useEffect(()=>{const element=host.current;if(!element)return;const resize=()=>{const size=desktopCanvasSize(element.clientWidth,element.clientHeight);element.style.setProperty('--pencil-scale',String(size.scale));element.style.setProperty('--pencil-width',size.width+'px');element.style.setProperty('--pencil-height',size.height+'px')};const observer=new ResizeObserver(resize);observer.observe(element);resize();return()=>observer.disconnect()},[])
 return <div ref={host} className="pencil-app-viewport"><div className="pencil-app-frame">{children}</div></div>
}
