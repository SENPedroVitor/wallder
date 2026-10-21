import { createContext,useContext,useEffect, useRef } from 'react'
import { createLiveGaze } from '../../src/components/ui/live-orb'
const sources = import.meta.glob('../../public/design/agents/*.html', { eager: true, query: '?raw', import: 'default' })
export const MascotAppearanceContext=createContext([])
export function Mascot({ id = 'west', size = 38, active = false, name = id }) {
  const host = useRef(null),appearance=useContext(MascotAppearanceContext).find(agent=>agent.id===id),color=appearance?.color
  useEffect(() => {
    const source = Object.entries(sources).find(([key]) => key.endsWith('/' + id + '.html'))?.[1]
    if (!source || !host.current) return
    const document = new DOMParser().parseFromString(source, 'text/html')
    document.querySelectorAll('script,iframe,link,style').forEach(node => node.remove())
    const root = document.body.firstElementChild
    if (!root) return
    const width = parseFloat(root.style.width) || 128, height = parseFloat(root.style.height) || 128
    root.style.left = '0'; root.style.top = '0'; root.style.transformOrigin = 'top left'; root.style.transform = `scale(${Math.min(size / width, size / height)})`
    const fill=({yellow:'#EDE545',violet:'#8A69CB',green:'#28966F',blue:'#6689BD',sand:'#CBA787'})[color];if(fill)for(const node of root.querySelectorAll('[data-pencil-name]'))if(/\bcorpo\b/i.test(node.dataset.pencilName||'')){if(node.tagName.toLowerCase()==='svg')node.querySelectorAll('path,rect,ellipse,polygon').forEach(shape=>shape.style.fill=fill);else node.style.backgroundColor=fill}
    host.current.replaceChildren(root)
    return createLiveGaze(root)
  }, [id, size,color])
  return <span ref={host} role="img" aria-label={'Mascote de ' + name} className={'island-mascot' + (active ? ' island-mascot--active' : '')} style={{ width: size, height: size }} />
}
