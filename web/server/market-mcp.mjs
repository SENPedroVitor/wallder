import readline from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWidgetService } from './widgets.mjs'
const service=createWidgetService({dataDir:path.join(path.dirname(fileURLToPath(import.meta.url)),'../.wendler')})
const send=value=>process.stdout.write(JSON.stringify(value)+'\n')
readline.createInterface({input:process.stdin}).on('line',line=>{void (async()=>{
  let message
  try{
    message=JSON.parse(line);if(message.id===undefined)return
    let result
    if(message.method==='initialize')result={protocolVersion:message.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'wendler-market',version:'1.0.0'}}
    else if(message.method==='ping')result={}
    else if(message.method==='tools/list')result={tools:[{name:'market_quotes',description:'Read stock/index quotes and daily history from Yahoo Finance. Reports actual quote timestamps and errors. Brazilian symbols such as PETR4 are mapped to PETR4.SA. No trading operations.',inputSchema:{type:'object',properties:{symbols:{type:'array',items:{type:'string'},maxItems:6}},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}}]}
    else if(message.method==='tools/call'&&message.params?.name==='market_quotes'){try{result={content:[{type:'text',text:JSON.stringify(await service.market(message.params.arguments?.symbols))}]}}catch(e){result={isError:true,content:[{type:'text',text:e.message}]}}}
    else {send({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}});return}
    send({jsonrpc:'2.0',id:message.id,result})
  }catch(e){send({jsonrpc:'2.0',id:message?.id??null,error:{code:-32603,message:e.message}})}
})()})
