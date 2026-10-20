import test from 'node:test'
import assert from 'node:assert/strict'
import { tableCells, tableHeader } from '../src/components/markdownTable.ts'
import { matchSavedFixture, safeTeamLogo, savedFixtureRows } from '../src/design/sportsPresentation.ts'
import { parseGame } from '../server/sports.mjs'

test('Markdown tables preserve escaped pipes, inline code and column alignment', () => {
 assert.deepEqual(tableCells('| Um \\| dois | `a|b` |'), ['Um | dois', '`a|b`'])
 assert.deepEqual(tableHeader(['Nome | Valor', ':--- | ---:'], 0)?.align, ['left', 'right'])
 assert.equal(tableHeader(['prosa | solta', 'sem separador'], 0), null)
 assert.equal(tableHeader(['| A | B |', '|---|'], 0), null)
})
test('saved fixture cards retain their time and names; aliases are exact and ambiguous matches fail closed', () => {
 const rows = savedFixtureRows(['Horário', 'Jogo'], [['16h', '**Porto x PSV**']])
 assert.deepEqual(rows, [{ time: '16h', first: 'Porto', second: 'PSV' }])
 assert.equal(savedFixtureRows(['Horário', 'Jogo'], [['16h', 'texto livre']]), null)
 const event = { id: '123', date: '2026-10-20T19:00Z', status: { type: { state: 'pre' } }, competitions: [{ competitors: [
  { homeAway: 'home', team: { displayName: 'FC Porto', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1.png' } },
  { homeAway: 'away', team: { displayName: 'PSV Eindhoven', shortDisplayName: 'PSV', logo: 'https://evil.example/badge.png' } },
 ] }] }
 const game = parseGame(event, 'soccer/all', '2026-10-20', 1000)
 assert.equal(game.home.logo, event.competitions[0].competitors[0].team.logo)
 assert.equal(game.away.logo, undefined)
 assert.equal(game.home.score, null)
 assert.equal(matchSavedFixture([game], 'Porto', 'PSV').first.logo, game.home.logo)
 assert.equal(matchSavedFixture([game], 'PSV', 'Porto').second.logo, game.home.logo)
 assert.equal(matchSavedFixture([game, game], 'Porto', 'PSV'), undefined)
 assert.equal(matchSavedFixture([game], 'Porto', 'Liverpool'), undefined)
 for (const value of ['javascript:alert(1)', 'https://espncdn.com.evil.example/i/teamlogos/1.png', 'http://a.espncdn.com/i/teamlogos/1.png']) assert.equal(safeTeamLogo(value), undefined)
})
