import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DesignService } from './design.mjs'

test('Kendrick binds a real project per conversation, preserves revisions, snapshots previews and scopes exports',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'wendler-design-'));let creates=0,revision=0
 const project=()=>({id:'project-1',name:'Tela',revision,document:{nodes:[{id:'screen',type:'frame',name:'Tela principal',parentId:null}]}})
 const fetcher=async(url,init={})=>{
  if(url.endsWith('/api/projects')){creates++;return Response.json(project())}
  if(url.includes('/operations')){const input=JSON.parse(init.body);assert.match(input.operationId,/^[a-zA-Z0-9_-]{1,100}$/);if(input.baseRevision!==revision)return Response.json({error:'Revisão desatualizada'},{status:409});revision++;return Response.json({revision})}
  if(url.includes('/render?'))return new Response('PNG-'+revision)
  if(url.includes('/code?'))return new Response('<html>exportado</html>')
  return Response.json(project())
 }
 const run={agentId:'kendrick',conversationId:'chat-1',requestId:'request-1'}
 try{
  const service=new DesignService({dataDir,fetcher})
  await assert.rejects(service.execute({action:'create',name:'Tela'},{...run,agentId:'kyle'}),/Kendrick/)
  await service.execute({action:'create',name:'Tela'},run);await service.execute({action:'create',name:'Tela'},run);assert.equal(creates,1)
  const shown=await service.execute({action:'present'},run);assert.equal(shown.revision,0)
  await service.execute({action:'apply',baseRevision:0,operations:[{type:'create_node'}]},run)
  await assert.rejects(service.execute({action:'apply',baseRevision:0,operations:[{}]},run),/desatualizada/)
  const url=new URL('http://localhost/api/design/asset?project=project-1&conversation=chat-1&frame=screen&revision=0&format=png')
  assert.equal((await service.asset(url)).bytes.toString(),'PNG-0','past preview must not silently change after an edit')
  const restarted=new DesignService({dataDir,fetcher});assert.equal((await restarted.execute({action:'read'},run)).revision,1)
  url.searchParams.set('conversation','other-chat');await assert.rejects(service.asset(url),/vinculado/)
  await assert.rejects(service.execute({action:'read'},{...run,conversationId:'other-chat'}),/não tem projeto/)
  await assert.rejects(service.execute({action:'read'},{...run,privateHistory:true}),/histórico/)
 }finally{await rm(dataDir,{recursive:true,force:true})}
})
