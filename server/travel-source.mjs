const hosts=new Set(['cinearaujo.com.br','www.cinearaujo.com.br','www.clickbus.com.br','www.buscaonibus.com.br'])
export function travelAddress(value) {
  const url=new URL(value)
  if(url.protocol!=='https:'||url.username||url.password||url.port||!hosts.has(url.hostname)||/checkout|payment|pagamento|account|login|conta|cancel|delete|remove|compra|carrinho/i.test(url.pathname)||[...url.searchParams.keys()].some(key=>/token|password|secret|auth|session|ticket/i.test(key)))throw Error('Use uma página pública do Cine Araújo, ClickBus ou BuscaOnibus. Checkout e páginas de conta ficam no navegador.')
  return url
}
export function travelText(html) {
  return html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,code)=>Number(code)<0x110000?String.fromCodePoint(Number(code)):' ').replace(/\s+/g,' ').trim().slice(0,35000)
}
export async function readTravelSource(value,fetcher=fetch) {
  let url=travelAddress(value);const signal=AbortSignal.timeout(12000)
  for(let redirects=0;redirects<4;redirects++){
    const response=await fetcher(url.href,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'Wendler/1.0 (public travel research)'}})
    if(response.status>=300&&response.status<400){const next=response.headers.get('location');await response.body?.cancel();if(!next)throw Error('Redirecionamento sem destino.');url=travelAddress(new URL(next,url).href);continue}
    if(!response.ok)throw Error('A fonte retornou HTTP '+response.status+'.')
    if(!/text\/html/i.test(response.headers.get('content-type')||''))throw Error('A fonte não retornou uma página pública HTML.')
    const reader=response.body.getReader();let size=0;const chunks=[]
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw Error('Página grande demais. Consulte no navegador.');chunks.push(Buffer.from(value))}}finally{await reader.cancel().catch(()=>{})}
    const text=travelText(Buffer.concat(chunks).toString('utf8'));if(text.length<80||/^(Just a moment|Access denied|Attention required)/i.test(text))throw Error('A fonte não retornou informações legíveis.')
    return {url:url.href,text,checkedAt:Date.now(),targets:[],source:'public-http'}
  }throw Error('Redirecionamentos demais.')
}
