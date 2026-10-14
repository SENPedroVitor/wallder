import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { SportsService, parseGame } from './sports.mjs'
const event = (state='in',score='2')=>({id:'12345',date:'2026-10-14T16:45Z',status:{displayClock:"36'",period:1,type:{state,name:'STATUS_IN_PROGRESS'}},competitions:[{competitors:[{homeAway:'home',score:'0',team:{displayName:'LASK Linz',abbreviation:'LAS'}},{homeAway:'away',score,team:{displayName:'Liverpool',abbreviation:'LIV'}}]}]})
test('scheduled fixtures do not pretend to be 0–0 live; clock and game date come from source',()=>{
  const game=parseGame(event('pre'),'soccer/all','2026-10-14',1000)
  assert.equal(game.home.score,null);assert.equal(game.away.score,null);assert.equal(game.clock,'');assert.equal(game.state,'pre')
  const live=parseGame(event(),'soccer/all','2026-10-14',2000);assert.equal(live.away.score,2);assert.equal(live.clock,"36'");assert.equal(live.checkedAt,2000)
})
test('fresh scores refresh, outage marks last reading stale, following persists, private chats cannot broadcast',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'wendler-sports-'));let clock=Date.parse('2026-10-14T17:00:00Z'),score='2',failed=false,calls=0
  const fetcher=async url=>{calls++;assert.ok(url.includes('dates=20261014'));if(failed)throw Error('offline');return {ok:true,json:async()=>({events:[event('in',score)]})}}
  const service=new SportsService({dataDir,fetcher,now:()=>clock})
  try{
    const args={action:'follow',league:'soccer/all',eventId:'12345'}
    await assert.rejects(()=>service.execute(args,{privateHistory:true}),/compartilhado/)
    const followed=await service.execute(args,{conversationId:'chat-real'});assert.equal(followed.game.away.score,2)
    await service.snapshot();assert.equal(calls,1)
    score='3';clock+=16000;let game=(await service.snapshot())[0];assert.equal(game.away.score,3);assert.equal(game.stale,false)
    failed=true;clock+=16000;game=(await service.snapshot())[0];assert.equal(game.away.score,3);assert.equal(game.stale,true);assert.equal(game.checkedAt,clock-16000)
    const restarted=new SportsService({dataDir,fetcher,now:()=>clock});assert.equal((await restarted.snapshot())[0].id,'12345')
    await service.execute({action:'unfollow',eventId:'12345'});assert.deepEqual(await service.snapshot(),[])
  }finally{await rm(dataDir,{recursive:true,force:true})}
})
test('wrong date or competition returns no game rather than an older result',async()=>{
  const service=new SportsService({dataDir:'.artifacts/unused',fetcher:async()=>({ok:true,json:async()=>({events:[]})})})
  assert.deepEqual((await service.scores({query:'Liverpool'})).games,[])
  await assert.rejects(()=>service.scores({league:'https://arbitrary-host'}),/inválidos/)
})
