import { useEffect, useRef } from 'react'
import { createLiveGaze } from '../../src/components/ui/live-orb'
const sources = import.meta.glob('../../public/design/agents/*.html', { eager: true, query: '?raw', import: 'default' })
export function Mascot({ id = 'west', size = 38, active = false, name = id }) {
  const host = useRef(null)
  useEffect(() => {
    const source = Object.entries(sources).find(([key]) => key.endsWith('/' + id + '.html'))?.[1]
    if (!source || !host.current) return
    const document = new DOMParser().parseFromString(source, 'text/html')
    document.querySelectorAll('script,iframe,link,style').forEach(node => node.remove())
    const root = document.body.firstElementChild
    if (!root) return
    const width = parseFloat(root.style.width) || 128, height = parseFloat(root.style.height) || 128
    root.style.left = '0'; root.style.top = '0'; root.style.transformOrigin = 'top left'; root.style.transform = `scale(${Math.min(size / width, size / height)})`
    host.current.replaceChildren(root)
    return createLiveGaze(root)
  }, [id, size])
  return <span ref={host} role="img" aria-label={'Mascote de ' + name} className={'island-mascot' + (active ? ' island-mascot--active' : '')} style={{ width: size, height: size }} />
}
