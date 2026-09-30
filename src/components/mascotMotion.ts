import { useEffect, type RefObject } from 'react'

// One page-level pointer listener for the entire cast; movement never renders React.
const residents = new Set<HTMLElement>()
let lastActivity = 0
let frame = 0
let pointer: { x: number; y: number } | null = null
let stop: (() => void) | undefined

function update() {
  frame = 0
  if (document.hidden) return
  for (const node of residents) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const inactive = performance.now() - lastActivity > 8000
    node.dataset.motion = reduced ? 'still' : inactive ? 'seeking' : 'following'
    if (reduced || inactive || !pointer) {
      node.style.setProperty('--gaze-x', '0px')
      node.style.setProperty('--gaze-y', '0px')
      node.style.setProperty('--turn', '0deg')
      continue
    }
    const rect = node.getBoundingClientRect()
    if (rect.bottom < 0 || rect.top > innerHeight) continue
    const dx = pointer.x - rect.left - rect.width / 2
    const dy = pointer.y - rect.top - rect.height / 2
    const distance = Math.hypot(dx, dy)
    const reach = Math.min(1, distance / 180)
    node.style.setProperty('--gaze-x', `${dx / Math.max(distance, 1) * reach * 6}px`)
    node.style.setProperty('--gaze-y', `${dy / Math.max(distance, 1) * reach * 4}px`)
    node.style.setProperty('--turn', `${Math.max(-12, Math.min(12, dx / 35))}deg`)
  }
}

export function useMascotMotion(ref: RefObject<HTMLSpanElement | null>, animated: boolean) {
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!animated) {
      node.dataset.motion = 'still'
      node.style.setProperty('--gaze-x', '0px')
      node.style.setProperty('--gaze-y', '0px')
      node.style.setProperty('--turn', '0deg')
      return
    }
    residents.add(node)
    node.style.setProperty('--blink-delay', `${-(residents.size * 1.37)}s`)
    node.style.setProperty('--life-delay', `${-(residents.size * .71)}s`)
    if (!stop) {
      lastActivity = performance.now()
      const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        pointer = { x: event.clientX, y: event.clientY }
        lastActivity = performance.now()
        schedule()
      }
      const activity = () => { lastActivity = performance.now(); schedule() }
      const visibility = () => {
        for (const resident of residents) resident.dataset.paused = String(document.hidden)
        if (!document.hidden) schedule()
      }
      window.addEventListener('pointermove', move, { passive: true })
      window.addEventListener('keydown', activity)
      window.addEventListener('scroll', schedule, { passive: true })
      document.addEventListener('visibilitychange', visibility)
      const timer = window.setInterval(schedule, 1000)
      stop = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('keydown', activity)
        window.removeEventListener('scroll', schedule)
        document.removeEventListener('visibilitychange', visibility)
        clearInterval(timer)
        cancelAnimationFrame(frame)
        frame = 0
        stop = undefined
      }
    }
    update()
    return () => { residents.delete(node); if (!residents.size) stop?.() }
  }, [ref, animated])
}
