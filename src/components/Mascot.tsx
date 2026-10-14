import { useEffect, useId, useRef, useState } from 'react'
import { dotslabAgents, type MascotAgent } from './dotslabAgents'
import './mascot.css'

export type { MascotAgent } from './dotslabAgents'

export type DotslabState = 'idle' | 'listening' | 'thinking' | 'writing' | 'success' | 'alert' | 'error' | 'asleep' | 'searching' | 'reviewing' | 'waiting'
export type MascotState = DotslabState | 'working' | 'surprised' | 'sleeping' | 'blocked' | 'curious' | 'focused' | 'skeptical' | 'happy' | 'angry' | 'confused' | 'wink'
export type EyeExpression = 'bars' | 'soft' | 'narrow' | 'dashes' | 'slashes' | 'happy' | 'worried' | 'skeptical' | 'angry' | 'wink' | 'dots' | 'rings' | 'plus' | 'inward' | 'outward' | 'closed' | 'wide' | 'asymmetric'
export type DotslabEye = 'toon' | 'pill' | 'dot' | 'ring' | 'happy' | 'plus' | 'dash' | 'slash' | 'squint' | 'wink'

export const dotslabEyes: { id: DotslabEye; label: string }[] = [
  { id: 'toon', label: 'Cartoon' }, { id: 'pill', label: 'Pílulas' },
  { id: 'dot', label: 'Pontos' }, { id: 'ring', label: 'Anéis' },
  { id: 'happy', label: 'Felizes' }, { id: 'plus', label: 'Cruzes' },
  { id: 'dash', label: 'Horizontais' }, { id: 'slash', label: 'Inclinados' },
  { id: 'squint', label: 'Semicerrados' }, { id: 'wink', label: 'Piscadela' },
]

export const mascotStates: { id: DotslabState; label: string }[] = [
  { id: 'idle', label: 'Disponível' },
  { id: 'listening', label: 'Ouvindo' },
  { id: 'thinking', label: 'Pensando' },
  { id: 'searching', label: 'Pesquisando' },
  { id: 'reviewing', label: 'Revisando' },
  { id: 'waiting', label: 'Aguardando' },
  { id: 'writing', label: 'Escrevendo' },
  { id: 'success', label: 'Concluído' },
  { id: 'alert', label: 'Alerta' },
  { id: 'error', label: 'Precisa de ajuda' },
  { id: 'asleep', label: 'Descansando' },
]

const stateMap: Record<MascotState, DotslabState> = {
  idle: 'idle', listening: 'listening', thinking: 'thinking', writing: 'writing', working: 'writing',
  success: 'success', alert: 'alert', error: 'error', asleep: 'asleep',
  searching: 'searching', reviewing: 'reviewing', waiting: 'waiting', surprised: 'alert',
  sleeping: 'asleep', blocked: 'error', curious: 'listening', focused: 'thinking',
  skeptical: 'thinking', happy: 'success', angry: 'alert', confused: 'error', wink: 'success',
}

export interface MascotProps {
  agent: MascotAgent
  state?: MascotState
  size?: number
  accessory?: boolean
  className?: string
  animated?: boolean
  expression?: EyeExpression
  eyes?: DotslabEye
}

function useVisibleAnimation(animated: boolean) {
  const ref = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!animated) { setActive(false); return }
    const node = ref.current
    if (!node) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => setActive(visible && !document.hidden && !motion.matches)
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false
      sync()
    })
    observer.observe(node)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
    }
  }, [animated])

  return { ref, active }
}

const svgCache = new Map<string, Promise<string>>()

// Keep the exported silhouettes and choreography, but expose eyes for live gaze.
function loadSvg(src: string) {
  let pending = svgCache.get(src)
  if (!pending) {
    pending = fetch(src).then(response => {
      if (!response.ok) throw new Error('Mascot asset unavailable')
      return response.text()
    }).then(source => {
      const document = new DOMParser().parseFromString(source, 'image/svg+xml')
      const svg = document.documentElement
      if (svg.localName !== 'svg') throw new Error('Invalid mascot asset')
      const frames = [...svg.children].filter(child => child.localName === 'g' && child.hasAttribute('opacity'))
      for (const frame of frames.length ? frames : [svg]) {
        const body = [...frame.children].filter(child => child.localName === 'use').at(-1)
        const first = body?.nextElementSibling
        if (!first || !first.nextElementSibling) continue
        const eyeCount = src.includes('/eyes/toon') ? 4 : src.includes('/eyes/wink') ? 3 : 2
        const eyeParts: Element[] = []
        let part: Element | null = first
        for (let index = 0; part && index < eyeCount; index++) { eyeParts.push(part); part = part.nextElementSibling }
        const gaze = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        gaze.setAttribute('class', 'mascot__gaze')
        frame.insertBefore(gaze, first)
        gaze.append(...eyeParts)
      }
      svg.setAttribute('aria-hidden', 'true')
      return new XMLSerializer().serializeToString(svg)
    }).catch(error => { svgCache.delete(src); throw error })
    svgCache.set(src, pending)
  }
  return pending
}

export default function Mascot({ agent, state = 'idle', size = 88, className = '', animated = false, eyes, expression }: MascotProps) {
  const { ref, active } = useVisibleAnimation(animated)
  const instance = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [inline, setInline] = useState<{ src: string; markup: string } | null>(null)
  const expressionEyes: Partial<Record<EyeExpression, DotslabEye>> = { bars: 'pill', soft: 'toon', narrow: 'squint', dashes: 'dash', slashes: 'slash', happy: 'happy', skeptical: 'squint', angry: 'slash', wink: 'wink', dots: 'dot', rings: 'ring', plus: 'plus', closed: 'dash', wide: 'ring' }
  const selectedEyes = eyes ?? (expression ? expressionEyes[expression] : undefined)
  const selectedState = stateMap[state]
  const label = eyes
    ? `Olhos ${dotslabEyes.find(item => item.id === eyes)?.label.toLowerCase() ?? eyes}`
    : mascotStates.find(item => item.id === selectedState)?.label ?? selectedState
  const suffix = active ? '' : '-static'
  const specialEyes = selectedState === 'searching' ? 'squint' : selectedState === 'reviewing' ? 'slash' : selectedState === 'waiting' ? 'dash' : undefined
  const sourceEyes = selectedEyes ?? specialEyes
  const src = sourceEyes
    ? `/dotslab/agents/${agent}/eyes/${sourceEyes}${suffix}.svg`
    : `/dotslab/agents/${agent}/${selectedState}${suffix}.svg`

  useEffect(() => {
    let cancelled = false
    loadSvg(src).then(markup => {
      if (!cancelled) setInline({ src, markup: markup.replace(/id="([^"]+)"/g, `id="${instance}-$1"`).replace(/href="#([^"]+)"/g, `href="#${instance}-$1"`).replace(/url\(#([^\)]+)\)/g, `url(#${instance}-$1)`) })
    }).catch(() => { if (!cancelled) setInline(null) })
    return () => { cancelled = true }
  }, [src, instance])

  useEffect(() => {
    const node = ref.current
    if (!node || !active || selectedState === 'asleep') return
    let frame = 0
    let x = 0
    let y = 0
    let idleTimer = window.setTimeout(() => node.setAttribute('data-looking', 'true'), 8000)
    const update = () => {
      frame = 0
      const bounds = node.getBoundingClientRect()
      const dx = Math.max(-1, Math.min(1, (x - bounds.left - bounds.width / 2) / 180))
      const dy = Math.max(-1, Math.min(1, (y - bounds.top - bounds.height / 2) / 180))
      node.style.setProperty('--gaze-x', `${dx * 18}px`)
      node.style.setProperty('--gaze-y', `${dy * 12}px`)
      node.style.setProperty('--lean', `${dx * 5}deg`)
      node.style.setProperty('--follow-x', `${dx * 2}px`)
      node.style.setProperty('--follow-y', `${dy * 1.5}px`)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      node.removeAttribute('data-looking')
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => node.setAttribute('data-looking', 'true'), 8000)
      x = event.clientX; y = event.clientY
      if (!frame) frame = requestAnimationFrame(update)
    }
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0
      for (const property of ['--gaze-x', '--gaze-y', '--lean', '--follow-x', '--follow-y']) node.style.removeProperty(property)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      window.clearTimeout(idleTimer)
      node.removeAttribute('data-looking')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
    }
  }, [active, selectedState, ref])

  return <span ref={ref} className={`mascot${className ? ` ${className}` : ''}`}
    style={{ width: size, height: size }} role="img" aria-label={`${dotslabAgents[agent].name} — ${label}`}
    data-agent={agent} data-state={selectedState} data-eyes={eyes} data-animated={active}>
    {inline?.src === src ? <span className="mascot__art" dangerouslySetInnerHTML={{ __html: inline.markup }} /> : <img src={src} width={size} height={size} alt="" draggable={false} aria-hidden="true" />}
  </span>
}
