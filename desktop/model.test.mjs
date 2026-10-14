import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chooseTask,islandState,validateAction,elapsed} from './model.mjs'
import {pointInSurface} from './geometry.cjs'
test('decisions take priority, dismissed or old completions do not reappear',()=>{
 const tasks=[{id:'done',status:'completed',finishedAt:1000},{id:'run',status:'running'},{id:'approval',status:'running',approval:{id:'yes'}}]
 assert.equal(chooseTask(tasks,null,[],2000).id,'approval')
 assert.equal(chooseTask(tasks,null,['approval'],2000).id,'run')
 assert.equal(chooseTask([tasks[0]],null,[],30000),null)
 assert.equal(islandState({online:true,ready:true,task:tasks[1],expanded:false,activeCount:2}),'parallel')
 assert.equal(islandState({online:false,ready:true,task:tasks[1],expanded:false,activeCount:1}),'offline')
 assert.equal(elapsed(1000,63000),'1:02')
})
test('native actions expose only cancellation and explicit approval decisions',()=>{
 assert.deepEqual(validateAction({type:'cancel',id:'real-id'}),{path:'/api/cancel',body:{requestId:'real-id'}})
 assert.equal(validateAction({type:'approval',id:'review',decision:'accept'}).body.decision,'accept')
 assert.throws(()=>validateAction({type:'shell',id:'run'}))
 assert.throws(()=>validateAction({type:'approval',id:'review',decision:'bypass'}))
 assert.throws(()=>validateAction({type:'cancel',id:'../elsewhere'}))
})
test('transparent margins and rounded corners pass clicks to Windows while the island receives them',()=>{
 const window={x:600,y:12},surface={x:260,y:22,width:200,height:44,radius:22}
 assert.equal(pointInSurface({x:960,y:56},window,surface),true)
 assert.equal(pointInSurface({x:861,y:35},window,surface),false)
 assert.equal(pointInSurface({x:710,y:120},window,surface),false)
 assert.equal(pointInSurface({x:960,y:200},window,surface),false)
})
