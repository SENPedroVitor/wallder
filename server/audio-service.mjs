import http from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp,readFile,rm,access } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const maxAudioBytes=8*1024*1024
const formats={'audio/webm':'matroska','audio/ogg':'ogg','audio/mp4':'mov','audio/x-m4a':'mov','audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/flac':'flac','audio/x-flac':'flac'}
const invalid=(message,status=422)=>Object.assign(Error(message),{status})
export function audioFormat(contentType){const format=formats[String(contentType||'').split(';')[0].trim().toLowerCase()];if(!format)throw invalid('Use áudio WebM, Ogg, MP4, MP3, WAV ou FLAC.',415);return format}
export async function audioBytes(req){if(Number(req.headers['content-length'])>maxAudioBytes)throw invalid('O áudio deve ter até 8 MB.',413);let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>maxAudioBytes)throw invalid('O áudio deve ter até 8 MB.',413);parts.push(part)}if(size<32)throw invalid('O arquivo de áudio está vazio ou incompleto.');return Buffer.concat(parts)}
export function audioProcess(command,args,{input,signal,timeout=20000}={}){
  return new Promise((resolve,reject)=>{
    const process=spawn(command,args,{stdio:['pipe','pipe','pipe'],signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(timeout)])});let output='',size=0
    process.stdin.on('error',()=>{});process.stdout.on('data',chunk=>{size+=chunk.length;if(size<65536)output+=chunk.toString()});process.stderr.resume()
    process.on('error',reject);process.on('close',code=>code===0?resolve(output):reject(invalid('Não foi possível processar este áudio.')));process.stdin.end(input)
  })
}
export function wavSpeech(buffer){
  if(buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')throw invalid('Não foi possível converter o áudio.')
  let offset=12,pcm
  while(offset+8<=buffer.length){const id=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4);if(id==='data'){pcm=buffer.subarray(offset+8,Math.min(buffer.length,offset+8+size));break}offset+=8+size+(size%2)}
  if(!pcm||pcm.length<16000*.35*2)throw invalid('Grave pelo menos um segundo de fala.')
  const duration=pcm.length/32000;if(duration>120.1)throw invalid('O áudio deve ter até 2 minutos.',413)
  let sum=0;for(let i=0;i+1<pcm.length;i+=2)sum+=(pcm.readInt16LE(i)/32768)**2
  if(Math.sqrt(sum/(pcm.length/2))<.001)throw invalid('Não identifiquei fala no áudio. Tente gravar mais perto do microfone.')
  return duration
}
export function createAudioServer({model=process.env.WENDLER_WHISPER_MODEL||'/models/ggml-small.bin',binary=process.env.WENDLER_WHISPER_BIN||'/usr/local/bin/whisper-cli',runner=audioProcess}={}){
  let busy=false
  const reply=(res,status,data)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}}
  const server=http.createServer(async(req,res)=>{
    const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()});let folder,claimed=false
    try{
      if(req.url==='/health'&&req.method==='GET'){await Promise.all([access(model),access(binary)]);return reply(res,200,{ready:true,busy,engine:'whisper.cpp',model:'small',maxSeconds:120,maxBytes:maxAudioBytes})}
      if(req.url!=='/transcribe'||req.method!=='POST')return reply(res,404,{error:'Não encontrado.'})
      if(busy)return reply(res,429,{error:'Já estou transcrevendo outro áudio. Tente novamente em instantes.'})
      const format=audioFormat(req.headers['content-type']);busy=true;claimed=true
      const audio=await audioBytes(req);folder=await mkdtemp(path.join(os.tmpdir(),'wendler-audio-'));const wav=path.join(folder,'audio.wav'),prefix=path.join(folder,'result')
      await runner('ffmpeg',['-nostdin','-v','error','-protocol_whitelist','pipe','-f',format,'-i','pipe:0','-map','0:a:0','-vn','-sn','-dn','-t','121','-ac','1','-ar','16000','-c:a','pcm_s16le','-threads','1',wav],{input:audio,signal:controller.signal})
      const duration=wavSpeech(await readFile(wav))
      const context=1500
      await runner(binary,['-m',model,'-f',wav,'-l','pt','-t','2','-bo','1','-bs','1','-nf','-ac',String(context),'-nt','-otxt','-of',prefix],{signal:controller.signal,timeout:160000})
      const text=(await readFile(prefix+'.txt','utf8')).replace(/\[(?:BLANK_AUDIO|MUSIC|SILENCE)\]/gi,'').trim()
      if(text.length>20000)throw invalid('A transcrição ficou longa demais. Divida o áudio em mensagens menores.')
      if(!text)throw invalid('Não identifiquei fala no áudio. Tente gravar novamente.')
      reply(res,200,{text,duration,language:'pt',engine:'whisper.cpp',reviewRequired:true})
    }catch(error){reply(res,error.status||((error.name==='AbortError'||error.name==='TimeoutError')?408:503),{error:error.status?error.message:'A transcrição não foi concluída. Tente um áudio mais curto.'})}
    finally{if(folder)await rm(folder,{recursive:true,force:true}).catch(()=>{});if(claimed)busy=false}
  });server.requestTimeout=30000;server.headersTimeout=15000
  return server
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createAudioServer().listen(Number(process.env.WENDLER_AUDIO_PORT||5275),'127.0.0.1')


