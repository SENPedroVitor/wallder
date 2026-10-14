import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(await readFile(path.join(root, 'src/design/catalog.json'), 'utf8'))
const decode = value => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
// The exports are trusted local design assets; parse their nested elements without executing HTML.
function parse(source) {
  const document = { children: [], text: '' }, stack = [document]
  for (const token of source.match(/<[^>]*>|[^<]+/g) || []) {
    if (token.startsWith('</')) { if (stack.length > 1) stack.pop(); continue }
    if (token.startsWith('<')) {
      if (/^<!/.test(token)) continue
      const node = { tag: token.match(/^<(\w+)/)?.[1], name: decode(token.match(/data-pencil-name="([^"]*)"/)?.[1] || ''), style: token.match(/style="([^"]*)"/)?.[1] || '', children: [], text: '' }
      stack.at(-1).children.push(node)
      if (!/\/>$/.test(token) && !/^(?:img|br|hr|input|meta|link)$/.test(node.tag)) stack.push(node)
    } else stack.at(-1).text += decode(token)
  }
  return document
}
function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]) }
const result = []
for (const screen of catalog.filter(s => /^10\./.test(s.name) || /^(?:11|12|13)\..*Chat/.test(s.name))) {
  const tree = parse(await readFile(path.join(root, 'public/design/screens', screen.id + '.html'), 'utf8'))
  const region = descendants(tree).find(node => /widget.*(?:resposta|chat)|(?:clima|gastos|progresso|tarefas|agenda).*widget|versão compacta/i.test(node.name) && /width: (?:[1-5]\d\d|60[0-9])(?:\.\d+)?px/.test(node.style) && Number(node.style.match(/height: ([\d.]+)/)?.[1]) > 60)
  if (!region) continue
  const nodes = descendants(region)
  const slots = nodes.filter(node => node.text.trim() && node.children.every(child=>child.tag==='br')).map(node => {
    const lines=node.children.length+1
    const characters=Math.floor(Number(node.style.match(/width: ([\d.]+)/)?.[1] || 160) / (Number(node.style.match(/font-size: ([\d.]+)/)?.[1] || 10) * .48))
    return { name:node.name,maxLength:Math.max(12,Math.min(600,characters*lines)),lines,label:node.text.trim().replace(/\s+/g,' ') }
  })
  result.push({ id: screen.id, name: screen.name.replace(/^\d+\.\d+ — /, ''), region: region.name, width: Number(region.style.match(/width: ([\d.]+)/)?.[1]), height: Number(region.style.match(/height: ([\d.]+)/)?.[1]), slots, targets: [...new Set(nodes.map(n => n.name).filter(Boolean))] })
}
await writeFile(path.join(root, 'src/design/widget-catalog.json'), JSON.stringify(result, null, 2) + '\n')
await writeFile(path.join(root, 'src/design/widget-menu.json'), JSON.stringify(result.map(({id,name})=>({id,name})), null, 2) + '\n')
console.log('Catálogo de widgets:', result.length)
