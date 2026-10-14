import http from 'node:http';
export function desktopAllowed(req,tailscaleHost){const host=req.headers.host||'';const local=/^((127\.0\.0\.1|localhost|\[::1\]):\d+)$/.test(host);const remote=tailscaleHost&&(host===tailscaleHost||host===tailscaleHost+':443');if(!local&&!remote)return false;const origin=req.headers.origin;return !origin||origin==='https://'+tailscaleHost||local&&origin==='http://'+host}
export function proxyDesktopRequest(req,res,port=3012){
 const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:'+port}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res)});
 upstream.setTimeout(3600000,()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('O Firefox remoto está iniciando. Tente novamente em instantes.')});req.pipe(upstream);res.on('close',()=>upstream.destroy());
}
export function proxyDesktopSocket(req,socket,head,port=3012){
 const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:'GET',headers:{...req.headers,host:'127.0.0.1:'+port}});
 upstream.on('upgrade',(response,peer,extra)=>{socket.write('HTTP/1.1 '+response.statusCode+' '+response.statusMessage+'\r\n'+Object.entries(response.headers).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(value=>key+': '+value+'\r\n')).join('')+'\r\n');if(head.length)peer.write(head);if(extra.length)socket.write(extra);peer.setTimeout(3600000,()=>peer.destroy());socket.setTimeout(3600000,()=>socket.destroy());peer.on('error',()=>socket.destroy());socket.on('error',()=>peer.destroy());socket.on('close',()=>peer.destroy());peer.on('close',()=>socket.destroy());socket.pipe(peer).pipe(socket)});
 upstream.on('response',()=>socket.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());upstream.end();
}
