import type { SportsGame } from './SportsWidget'
export function teamKey(name: string) {
 return name.replace(/\*\*|`/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\b(fc|cf|as|vfb|de)\b/g, '').replace(/[^a-z0-9]/g, '')
}
export function safeTeamLogo(value?: string) {
 try { const url = new URL(value || ''); return url.protocol === 'https:' && /(^|\.)espncdn\.com$/.test(url.hostname) && url.pathname.startsWith('/i/teamlogos/') ? url.href : undefined } catch { return undefined }
}
export function matchSavedFixture(games: SportsGame[], first: string, second: string) {
 const matches = (team: SportsGame['home'], name: string) => [team.name, team.abbreviation, ...(team.aliases || [])].some(alias => teamKey(alias) === teamKey(name))
 const matching = games.flatMap(game => matches(game.home, first) && matches(game.away, second) ? [{ first: game.home, second: game.away }] : matches(game.away, first) && matches(game.home, second) ? [{ first: game.away, second: game.home }] : [])
 return matching.length === 1 ? matching[0] : undefined
}
export function savedFixtureRows(headers: string[], rows: string[][]) {
 const time = headers.findIndex(header => /^(horario|hora)$/.test(teamKey(header))), game = headers.findIndex(header => /^(jogo|partida|confronto)$/.test(teamKey(header)))
 if (headers.length !== 2 || time < 0 || game < 0) return null
 const fixtures = rows.map(row => {
  const names = row[game]?.replace(/\*\*|`/g, '').split(/\s+(?:x|×|vs\.?|versus)\s+/i), clock = row[time]?.replace(/\*\*/g, '')
  return names?.length === 2 && names.every(name => name.trim()) && /^\d{1,2}(?:h\d{0,2}|:\d{2})$/.test(clock) ? { time: clock, first: names[0].trim(), second: names[1].trim() } : null
 })
 return fixtures.length && fixtures.every(row => row !== null) ? fixtures : null
}
