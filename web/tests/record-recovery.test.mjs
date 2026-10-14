import { test } from 'node:test'
import assert from 'node:assert/strict'
import { recoverRecords } from '../src/recordRecovery.ts'
test('disconnected records retain newer server tasks, local additions and archives', () => {
  const project = (updated, tasks) => ({id:'p',kind:'projeto',updated,fields:{'wendler:project:v1':JSON.stringify({tasks})}})
  const remote=[project(20,[{id:'a',status:'done'},{id:'b',status:'todo'}]),{id:'archived',updated:30,archived:true}]
  const local=[project(10,[{id:'a',status:'todo'}]),{id:'local',updated:15},{id:'archived',updated:10}]
  const recovered=recoverRecords(remote,local)
  assert.deepEqual(JSON.parse(recovered[0].fields['wendler:project:v1']).tasks,[{id:'a',status:'done'},{id:'b',status:'todo'}])
  assert.equal(recovered.find(r=>r.id==='archived').archived,true)
  assert.ok(recovered.find(r=>r.id==='local'))
  const newer=recoverRecords(remote,[project(40,[{id:'a',status:'doing'}])])
  assert.equal(JSON.parse(newer[0].fields['wendler:project:v1']).tasks.length,2)
  assert.equal(local[0].updated,10)
})
