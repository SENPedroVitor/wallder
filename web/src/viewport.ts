/** Keep the app inside the visible area when mobile browsers open or pan the keyboard. */
export function installAppViewport(target: Window = window) {
  const root = target.document.documentElement
  const viewport = target.visualViewport
  let frame = 0
  const update = () => {
    frame = 0
    // Let the browser handle pinch zoom without resizing the entire application beneath it.
    const zoomed = viewport && Math.abs(viewport.scale - 1) > 0.01
    const height = zoomed ? target.innerHeight : viewport?.height ?? target.innerHeight
    const layoutHeight = Math.max(root.clientHeight, target.innerHeight, height)
    const offset = zoomed ? 0 : Math.min(Math.max(viewport?.offsetTop ?? 0, 0), Math.max(0, layoutHeight - height))
    root.style.setProperty('--app-height', `${height}px`)
    root.style.setProperty('--app-offset-top', `${offset}px`)
    const focused = target.document.activeElement
    const editing = focused?.matches('input, textarea, [contenteditable="true"]') ?? false
    root.dataset.keyboard = !zoomed && editing && layoutHeight - height > 120 ? 'open' : 'closed'
  }
  const schedule = () => { if (!frame) frame = target.requestAnimationFrame(update) }
  update()
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  target.addEventListener('resize', schedule)
  target.document.addEventListener('focusin', schedule)
  target.document.addEventListener('focusout', schedule)
  return () => {
    if (frame) target.cancelAnimationFrame(frame)
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
    target.removeEventListener('resize', schedule)
    target.document.removeEventListener('focusin', schedule)
    target.document.removeEventListener('focusout', schedule)
    root.style.removeProperty('--app-height')
    root.style.removeProperty('--app-offset-top')
    delete root.dataset.keyboard
  }
}
