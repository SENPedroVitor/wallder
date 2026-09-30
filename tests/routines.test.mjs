import assert from 'node:assert/strict'
import { parseSchedule } from '../src/routines.ts'
assert.deepEqual(parseSchedule('Me mande um briefing todos os dias às 9'), { frequency: 'Todos os dias', time: '09:00' })
assert.deepEqual(parseSchedule('Me avise nos dias úteis às 08:30.'), { frequency: 'Dias úteis', time: '08:30' })
assert.deepEqual(parseSchedule('Toda segunda-feira às 19h15'), { frequency: 'Toda segunda-feira', time: '19:15' })
assert.equal(parseSchedule('Todo dia às 25:00'), null)
assert.equal(parseSchedule('Todo dia às 12:67'), null)
assert.equal(parseSchedule('Converse comigo às 9'), null)
console.log('Schedule parsing checks passed.')
