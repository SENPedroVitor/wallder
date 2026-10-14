import type { ReactNode } from 'react'
function InlineText({ text }: { text: string }) {
  return <>{text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1,-1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2,-2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (link) { try { const url = new URL(link[2]); if (url.protocol === 'https:' || url.protocol === 'http:') return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{link[1]}</a> } catch { /* Invalid URLs remain literal text. */ } }
    return part
  })}</>
}
export default function FormattedText({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let cursor = 0
  const isBlock = (line: string) => /^(?:\s*```|#{1,6}\s|\s*>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(line)
  while (cursor < lines.length) {
    const line = lines[cursor]
    const key = cursor
    if (!line.trim()) { cursor++; continue }
    const fence = line.match(/^\s*```\s*([^\s`]*)[^`]*$/)
    if (fence) {
      const code: string[] = []; cursor++
      while (cursor < lines.length && !/^\s*```\s*$/.test(lines[cursor])) code.push(lines[cursor++])
      if (cursor < lines.length) cursor++
      blocks.push(<div key={key} className="chat-code-block"><div className="chat-code-label">{fence[1] || 'Código'}</div><pre tabIndex={0} aria-label={`Bloco de código ${fence[1]}`}><code>{code.join('\n')}</code></pre></div>); continue
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) { const Heading = heading[1].length === 1 ? 'h3' : heading[1].length === 2 ? 'h4' : 'h5'; blocks.push(<Heading key={key}><InlineText text={heading[2]} /></Heading>); cursor++; continue }
    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (cursor < lines.length && /^\s*>/.test(lines[cursor])) quote.push(lines[cursor++].replace(/^\s*>\s?/, ''))
      blocks.push(<blockquote key={key}><InlineText text={quote.join('\n')} /></blockquote>); continue
    }
    const list = line.match(/^\s*([-*+]|\d+[.)])\s+(.*)$/)
    if (list) {
      const ordered = /^\d/.test(list[1]); const items: ReactNode[] = []
      while (cursor < lines.length) {
        const item = lines[cursor].match(/^\s*([-*+]|\d+[.)])\s+(.*)$/)
        if (!item || /^\d/.test(item[1]) !== ordered) break
        items.push(<li key={cursor}><InlineText text={item[2]} /></li>); cursor++
      }
      blocks.push(ordered ? <ol key={key} start={Number.parseInt(list[1])}>{items}</ol> : <ul key={key}>{items}</ul>); continue
    }
    const paragraph = [line]; cursor++
    while (cursor < lines.length && lines[cursor].trim() && !isBlock(lines[cursor])) paragraph.push(lines[cursor++])
    blocks.push(<p key={key}><InlineText text={paragraph.join('\n')} /></p>)
  }
  return <>{blocks}</>
}
