import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createFigmaBridge } from './figma-local.mjs'
import { makeFigmaExecutor } from './figma-executor.mjs'
import { runInNewContext } from 'node:vm'

test('desktop plugin starts without randomUUID or clientStorage and accepts the Figma wrapper messages',async()=>{
  const sent=[];const controls=new Map();const parent={postMessage:message=>sent.push(message)}
  const context={crypto:{getRandomValues:bytes=>bytes.fill(7)},Uint8Array,parent,window:{},document:{getElementById:id=>{if(!controls.has(id))controls.set(id,{});return controls.get(id)}},setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},AbortSignal,fetch:()=>{throw Error('Unexpected request')}}
  const html=await readFile(new URL('../plugins/figma-local/ui.html',import.meta.url),'utf8')
  runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context)
  assert.equal(sent[0].pluginMessage.type,'ready')
  context.window.onmessage({source:{},origin:'https://evil.example',data:{pluginMessage:{type:'snapshot-error',error:'untrusted'}}})
  assert.notEqual(controls.get('status').textContent,'untrusted')
  context.window.onmessage({source:{},origin:'https://www.figma.com',data:{pluginMessage:{type:'snapshot-error',error:'trusted diagnostic'}}})
  assert.equal(controls.get('status').textContent,'trusted diagnostic')
  const messages=[];const plugin={ui:{postMessage:message=>messages.push(message)},showUI:()=>{},on:()=>{},clientStorage:{getAsync:()=>{throw Error('No plugin ID')},setAsync:()=>{throw Error('No plugin ID')}}}
  const boot=await readFile(new URL('../plugins/figma-local/boot.js',import.meta.url),'utf8')
  runInNewContext(boot,{figma:plugin,__html__:'',makeFigmaExecutor:()=>({document:()=>({name:'Real file'})})})
  plugin.ui.onmessage({type:'ready'});await new Promise(resolve=>setImmediate(resolve))
  assert.equal(messages.find(message=>message.type==='document').document.name,'Real file')
  plugin.ui.onmessage({type:'credentials',token:'test'});await new Promise(resolve=>setImmediate(resolve))
})

async function fixture(timeout=1000) {
  const dataDir=await mkdtemp(path.join(tmpdir(),'wendler-figma-'))
  let bridge
  const body=async req=>{const pieces=[];for await(const piece of req)pieces.push(piece);return JSON.parse(Buffer.concat(pieces).toString())}
  const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname.includes('/plugin/'))return bridge.handlePlugin(req,res,url,body);try{const result=await bridge.relay(req,body);res.end(JSON.stringify(result))}catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}))}})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  bridge=createFigmaBridge({dataDir,port:server.address().port,commandTimeout:timeout});await bridge.ready
  const base='http://127.0.0.1:'+server.address().port+'/api/figma-local'
  async function request(route,data,token){const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});return {code:response.status,value:await response.json()}}
  async function connect(instanceId='one'){const pairing=await bridge.issuePairing();const paired=await request('/plugin/pair',{code:pairing.code});const token=paired.value.token;await request('/plugin/poll',{instanceId,document:{name:'Test file',page:'Page 1'}},token);return token}
  return {dataDir,bridge,request,connect,async close(){bridge.close();await new Promise(resolve=>server.close(resolve));await rm(dataDir,{recursive:true,force:true})}}
}

test('local Figma pairing is single use, authenticated and scoped to the file session',async()=>{
  const f=await fixture()
  try {
    await assert.rejects(f.bridge.call('figma_local_document',{}),/Abra o plugin/)
    const pairing=await f.bridge.issuePairing();assert.equal((await f.request('/plugin/pair',{code:'000000'})).code,403)
    const token=(await f.request('/plugin/pair',{code:pairing.code})).value.token
    assert.equal((await f.request('/plugin/pair',{code:pairing.code})).code,403)
    assert.equal((await f.request('/plugin/poll',{instanceId:'one',document:{name:'File'}})).code,403)
    await f.request('/plugin/poll',{instanceId:'one',document:{name:'File',page:'Page'}},token)
    assert.equal(f.bridge.status().connected,true)
    assert.ok(!JSON.stringify(f.bridge.status()).includes(token))
    const response=f.bridge.call('figma_local_read',{nodeId:'0:1'})
    const command=(await f.request('/plugin/poll',{instanceId:'one',document:{name:'File'}},token)).value.command
    assert.equal(command.name,'figma_local_read')
    assert.equal((await f.request('/plugin/result',{instanceId:'wrong',id:command.id,result:{name:'fake'}},token)).code,403)
    await f.request('/plugin/result',{instanceId:'one',id:command.id,result:{name:'Actual file tree'}},token)
    assert.deepEqual(await response,{name:'Actual file tree'})
    await f.connect('two');await assert.rejects(f.bridge.call('figma_local_read',{}),/vários arquivos/)
    assert.equal((await f.request('/command',{name:'figma_local_status',args:{}})).code,400)
    await f.request('/plugin/disconnect',{instanceId:'one'},token)
    assert.equal(f.bridge.status().sessions.length,1)
  } finally {await f.close()}
})

test('expired edits are never delivered later or silently replayed',async()=>{
  const f=await fixture(30)
  try{const token=await f.connect();await assert.rejects(f.bridge.call('figma_local_update',{nodeId:'1:1',props:{name:'New'}}),/pode ter sido iniciada/);assert.equal((await f.request('/plugin/poll',{instanceId:'one',document:{name:'Test'}},token)).value.command,null)}finally{await f.close()}
})

test('real stdio MCP discovery and local status work without an open Figma plugin',async()=>{
  const f=await fixture();const child=spawn(process.execPath,[new URL('./figma-mcp.mjs',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),'--data-dir',f.dataDir],{stdio:['pipe','pipe','pipe'],windowsHide:true})
  const pending=new Map();let next=0
  const lines=createInterface({input:child.stdout});lines.on('line',line=>{const result=JSON.parse(line);pending.get(result.id)?.(result);pending.delete(result.id)})
  const rpc=(method,params={})=>new Promise(resolve=>{const id=++next;pending.set(id,resolve);child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n')})
  try{assert.equal((await rpc('initialize',{protocolVersion:'2025-06-18'})).result.serverInfo.name,'wendler-figma-local');assert.equal((await rpc('tools/list')).result.tools.length,10);const result=(await rpc('tools/call',{name:'figma_local_status',arguments:{}})).result;assert.equal(JSON.parse(result.content[0].text).connected,false);assert.equal((await rpc('tools/call',{name:'figma_local_read',arguments:{}})).result.isError,true);assert.equal((await rpc('tools/call',{name:'figma_local_update',arguments:{nodeId:'1:1',props:{},code:'evil'}})).result.isError,true);const config=JSON.parse(await readFile(path.join(f.dataDir,'figma-local-client.json'),'utf8'));assert.equal((await f.request('/command',{name:'figma_local_status',args:{}},config.key)).value.officialApiCalls,0)}finally{child.kill();lines.close();await new Promise(resolve=>child.once('exit',resolve));await f.close()}
})

function fakeFigma(){
  const nodes=new Map();let serial=0;const mixed=Symbol('mixed');const api={mixed,root:{name:'Real test document',children:[]},editorType:'figma',commitUndo(){},viewport:{scrollAndZoomIntoView(){}},async listAvailableFontsAsync(){return [{fontName:{family:'Arial',style:'Regular'}}]},async loadFontAsync(font){if(font.family!=='Arial')throw Error('Font missing')},async getNodeByIdAsync(id){return nodes.get(id)},async setCurrentPageAsync(page){api.currentPage=page}}
  function node(type){const value={id:'1:'+ ++serial,type,name:type,x:0,y:0,width:100,height:100,rotation:0,visible:true,opacity:1,fills:[],strokes:[],strokeWeight:1,cornerRadius:0,removed:false,resize(w,h){this.width=w;this.height=h},remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this)},async exportAsync({format}){return new TextEncoder().encode(format==='SVG'?'<svg>á</svg>':'PNG')}};if(['FRAME','COMPONENT','PAGE'].includes(type)){value.children=[];value.appendChild=child=>{if(child.parent)child.parent.children=child.parent.children.filter(item=>item!==child);child.parent=value;value.children.push(child)};value.layoutMode='NONE';value.itemSpacing=0;value.paddingTop=0;value.paddingBottom=0;value.paddingLeft=0;value.paddingRight=0;value.clipsContent=false}if(type==='TEXT'){value.characters='';value.fontName={family:'Arial',style:'Regular'};value.fontSize=12;value.textAlignHorizontal='LEFT'}nodes.set(value.id,value);return value}
  api.currentPage=node('PAGE');api.currentPage.selection=[];api.root.children=[api.currentPage];for(const [method,type] of Object.entries({createFrame:'FRAME',createRectangle:'RECTANGLE',createEllipse:'ELLIPSE',createText:'TEXT',createLine:'LINE',createComponent:'COMPONENT'}))api[method]=()=>node(type)
  return api
}

test('plugin executor creates editable layers, loads fonts, preserves unrelated fields and cleans failed creations',async()=>{
  const figma=fakeFigma(),engine=makeFigmaExecutor(figma)
  const created=await engine.execute('figma_local_create',{nodes:[{type:'FRAME',props:{name:'Dashboard',width:800,height:600,fill:'#112233'},children:[{type:'TEXT',props:{name:'Title',characters:'Olá',fontSize:24}}]}]})
  assert.equal(created.created.length,2)
  const frame=await figma.getNodeByIdAsync(created.roots[0]);assert.equal(frame.children[0].characters,'Olá')
  await engine.execute('figma_local_update',{nodeId:frame.id,props:{name:'Updated'}});assert.equal(frame.width,800);assert.equal(frame.fills[0].color.r,17/255)
  await assert.rejects(engine.execute('figma_local_create',{nodes:[{type:'TEXT',props:{fontFamily:'Unavailable'}}]}),/Font missing/);assert.equal(figma.currentPage.children.length,1)
  await assert.rejects(engine.execute('figma_local_update',{nodeId:frame.id,props:{arbitraryCode:'evil'}}),/não suportada/)
  const read=await engine.execute('figma_local_read',{nodeId:frame.id,depth:2,limit:1});assert.equal(read.truncated,true)
  assert.equal((await engine.execute('figma_local_export',{nodeId:frame.id,format:'SVG'})).svg,'<svg>á</svg>')
  await assert.rejects(engine.execute('figma_local_svg',{svg:'<svg><image href="https://outside.example/x"/></svg>'}),/recursos externos/)
})
