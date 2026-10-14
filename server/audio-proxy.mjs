import { audioBytes,audioFormat } from './audio-service.mjs'
export function createAudioProxy({endpoint=process.env.WENDLER_AUDIO_ENDPOINT||'http://127.0.0.1:5275',fetcher=fetch}={}){
  return {
    async status(){try{const response=await fetcher(endpoint+'/health',{signal:AbortSignal.timeout(3000)});if(!response.ok)throw Error();const value=await response.json();return {ready:value.ready===true,busy:value.busy===true,engine:'whisper.cpp',language:'pt',maxSeconds:120,maxBytes:8*1024*1024}}catch{return {ready:false,error:'O serviço de transcrição está indisponível no servidor.'}}},
    async transcribe(req,res){
      audioFormat(req.headers['content-type']);const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()})
      const bytes=await audioBytes(req)
      let response
      try{response=await fetcher(endpoint+'/transcribe',{method:'POST',headers:{'Content-Type':req.headers['content-type']},body:bytes,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(180000)])})}catch{throw Object.assign(Error('A transcrição não foi concluída. Confira o serviço e tente novamente.'),{status:503})}
      const value=await response.json()
      if(!res.destroyed&&!res.writableEnded){res.writeHead(response.status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
    },
  }
}
