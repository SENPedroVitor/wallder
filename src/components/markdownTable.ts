export function tableCells(line: string): string[] {
 const value = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
 const cells: string[] = []; let cell = '', code = false
 for (let i = 0; i < value.length; i++) {
  const char = value[i]
  if (char === '\\' && value[i + 1] === '|') { cell += '|'; i++; continue }
  if (char === '`') code = !code
  if (char === '|' && !code) { cells.push(cell.trim()); cell = '' } else cell += char
 }
 cells.push(cell.trim()); return cells
}
export function tableHeader(lines: string[], index: number) {
 if (!lines[index]?.includes('|') || !lines[index + 1]?.includes('-')) return null
 const headers = tableCells(lines[index]), separators = tableCells(lines[index + 1])
 if (headers.length < 2 || headers.length !== separators.length || !separators.every(cell => /^:?-{3,}:?$/.test(cell))) return null
 return { headers, align: separators.map(cell => cell.startsWith(':') && cell.endsWith(':') ? 'center' as const : cell.endsWith(':') ? 'right' as const : 'left' as const) }
}
