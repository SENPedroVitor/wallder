import { test } from 'node:test'
import assert from 'node:assert/strict'
import { travelAddress,travelText,readTravelSource } from './travel-source.mjs'
test('public travel reader cannot reach arbitrary hosts, credentials, checkout or redirect destinations',async()=>{
  for(const url of ['http://cinearaujo.com.br/','https://evil.example/','https://user:secret@cinearaujo.com.br/','https://cinearaujo.com.br/checkout','https://cinearaujo.com.br/?token=secret'])assert.throws(()=>travelAddress(url))
  await assert.rejects(()=>readTravelSource('https://cinearaujo.com.br/',async()=>({status:302,headers:new Headers({location:'https://evil.example/'}),body:{cancel:async()=>{}}})),/página pública/)
})
test('reader strips executable content and returns observed public text only',async()=>{
  const html='<html><title>Cine Araújo Lago Sul</title><script>fake secret</script><style>hidden</style><body>DUNA - PARTE TRÊS&nbsp; programação pública do cinema em Brasília, com informações de filmes e sessões para consulta. <button>Ver horários</button></body></html>'
  assert.ok(!travelText(html).includes('fake secret'))
  const result=await readTravelSource('https://cinearaujo.com.br/cine-lago-sul',async()=>new Response(html,{headers:{'content-type':'text/html'}}))
  assert.ok(result.text.includes('DUNA - PARTE TRÊS'));assert.ok(result.checkedAt);assert.deepEqual(result.targets,[])
})

