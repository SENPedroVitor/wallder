import { useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, RefreshCw, Shield } from 'lucide-react'
import type { SportsGame } from './SportsWidget'
import { matchSavedFixture, safeTeamLogo, savedFixtureRows } from './sportsPresentation'
import './sports-fixtures.css'

export type SportsSchedule = { league: string; date: string; checkedAt: number; source: string; games: SportsGame[] }
export function TeamBadge({ name, logo }: { name: string; logo?: string }) {
 const src = safeTeamLogo(logo), [failed, setFailed] = useState<string>()
 return <span className="sports-team-badge" aria-hidden="true">{src && failed !== src ? <img src={src} alt="" title={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(src)}/> : <Shield size={20}/>}</span>
}
function TeamLine({ name, logo, score }: { name: string; logo?: string; score?: number | null }) {
 return <div className="fixture-team"><TeamBadge name={name} logo={logo}/><span>{name}</span>{score !== undefined && score !== null ? <strong>{score}</strong> : null}</div>
}
const time = (value: string) => new Date(value).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
export function SportsScheduleWidget({ data }: { data: SportsSchedule }) {
 const [schedule, setSchedule] = useState(data), [expanded, setExpanded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
 async function refresh() {
  if (busy) return
  setBusy(true); setError('')
  try {
   const query = new URLSearchParams({ league: data.league, date: data.date })
   const response = await fetch('/api/sports/scores?' + query, { signal: AbortSignal.timeout(12000) })
   if (!response.ok) throw Error()
   const value = await response.json() as SportsSchedule
   if (!Array.isArray(value.games)) throw Error()
   setSchedule(value)
  } catch { setError('Não foi possível atualizar. Última consulta mantida.') } finally { setBusy(false) }
 }
 const games = expanded ? schedule.games : schedule.games.slice(0, 8)
 return <section className="sports-fixtures" aria-label="Jogos consultados"><header><CalendarDays size={18}/><div><strong>Jogos · {new Date(schedule.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' })}</strong><small>Horários de Brasília</small></div><button type="button" aria-label="Atualizar jogos" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16}/></button></header>
  <ol>{games.map(game => <li key={game.league + ':' + game.id}><div className="fixture-meta"><time dateTime={game.startsAt}>{time(game.startsAt)}</time><span>{game.state === 'in' ? 'Em andamento na consulta' : game.detail}</span></div><div className="fixture-teams"><TeamLine {...game.home}/><TeamLine {...game.away}/></div><a className="fixture-source" href={game.url} target="_blank" rel="noreferrer" aria-label={'Fonte: ' + game.home.name + ' e ' + game.away.name}><ExternalLink size={14}/></a></li>)}</ol>
  {!schedule.games.length && <p>Nenhuma partida encontrada nesta consulta.</p>}
  {schedule.games.length > 8 && <button type="button" className="fixtures-more" onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostrar menos' : 'Ver mais ' + (schedule.games.length - 8) + (schedule.games.length === 9 ? ' jogo' : ' jogos')}</button>}
  <footer>ESPN · Consulta às {time(new Date(schedule.checkedAt).toISOString())} · A fonte pode ter atraso.</footer>{error && <p role="status">{error}</p>}
 </section>
}
export function SavedSportsTable({ headers, rows, date }: { headers: string[]; rows: string[][]; date?: string }) {
 const fixtures = savedFixtureRows(headers, rows), [games, setGames] = useState<SportsGame[]>([]), [expanded, setExpanded] = useState(false)
 useEffect(() => {
  setGames([])
  if (!date) return
  const controller = new AbortController()
  void fetch('/api/sports/scores?' + new URLSearchParams({ league: 'soccer/all', date }), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }).then(async response => {
   if (!response.ok) return
   const data = await response.json() as SportsSchedule
   if (!controller.signal.aborted && Array.isArray(data.games)) setGames(data.games)
  }).catch(() => {})
  return () => controller.abort()
 }, [date])
 if (!fixtures) return null
 return <section className="sports-fixtures sports-fixtures--saved" aria-label="Jogos da mensagem"><header><CalendarDays size={18}/><div><strong>Jogos de futebol</strong><small>Horários informados na mensagem</small></div></header><ol>{(expanded ? fixtures : fixtures.slice(0, 6)).map((fixture, index) => {
  const match = matchSavedFixture(games, fixture.first, fixture.second)
  return <li key={index}><div className="fixture-meta"><span>{fixture.time}</span></div><div className="fixture-teams"><TeamLine name={fixture.first} logo={match?.first.logo}/><TeamLine name={fixture.second} logo={match?.second.logo}/></div></li>
 })}</ol>{fixtures.length > 6 && <button type="button" className="fixtures-more" onClick={() => setExpanded(value => !value)}>{expanded ? 'Mostrar menos' : 'Ver mais ' + (fixtures.length - 6) + (fixtures.length === 7 ? ' jogo' : ' jogos')}</button>}</section>
}
