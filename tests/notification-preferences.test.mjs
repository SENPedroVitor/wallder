import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationAllowed } from '../src/design/notificationPreferences.ts'
test('notification categories and an overnight quiet period respect Sao Paulo time',()=>{
 const prefs={enabled:true,quiet:true,quietStart:'22:00',quietEnd:'08:00',tasks:false}
 assert.equal(notificationAllowed(prefs,'task',new Date('2026-10-11T15:00:00Z')),false)
 assert.equal(notificationAllowed(prefs,'message',new Date('2026-10-11T15:00:00Z')),true)
 assert.equal(notificationAllowed(prefs,'approval',new Date('2026-10-12T01:00:00Z')),false)
 assert.equal(notificationAllowed(prefs,'routine',new Date('2026-10-12T10:59:00Z')),false)
 assert.equal(notificationAllowed(prefs,'routine',new Date('2026-10-12T11:00:00Z')),true)
 assert.equal(notificationAllowed({...prefs,enabled:false},'message'),false)
})
