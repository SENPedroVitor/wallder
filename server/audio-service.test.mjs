import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFile,access } from 'node:fs/promises'
import path from 'node:path'
import { createAudioServer,audioFormat,wavSpeech,maxAudioBytes } from './audio-service.mjs'
function wav(seconds=1,sound=true){const samples=Math.floor(seconds*16000),buffer=Buffer.alloc(44+samples*2);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVE',8);buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(16000,24);buffer.writeUInt32LE(32000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples*2,40);if(sound)for(let i=0;i<samples;i++)buffer.writeInt16LE(Math.round(Math.sin(i*.1)*4000),44+i*2);return buffer}
test('audio validation accepts recorder formats and rejects silence, excessive duration and non-audio',()=>{
  assert.equal(audioFormat('audio/webm;codecs=opus'),'matroska');assert.equal(audioFormat('audio/x-m4a'),'mov');assert.throws(()=>audioFormat('application/json'),/Use áudio/);assert.equal(wavSpeech(wav()),1);assert.throws(()=>wavSpeech(wav(1,false)),/fala/);assert.throws(()=>wavSpeech(wav(121)),/2 minutos/)
})
test('transcription handles a single job, cleans temporary files and never invents a response on invalid input',async()=>{
  let unblock,entered;const started=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>unblock=resolve);let folder
  const runner=async(command,args,options)=>{if(command==='ffmpeg'){assert.ok(args.includes('pipe:0'));assert.ok(args.includes('matroska'));assert.ok(options.input.length);folder=path.dirname(args.at(-1));await writeFile(args.at(-1),wav())}else{entered();await gate;await writeFile(args[args.indexOf('-of')+1]+'.txt','Olá, Pam. Quero planejar uma viagem.')}return ''}
  const server=createAudioServer({runner});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port
  try{
    const request=fetch(base+'/transcribe',{method:'POST',headers:{'Content-Type':'audio/webm'},body:Buffer.alloc(100,1)});await started
    assert.equal((await fetch(base+'/transcribe',{method:'POST',headers:{'Content-Type':'audio/webm'},body:Buffer.alloc(100,1)})).status,429)
    unblock();const response=await request,result=await response.json();assert.equal(response.status,200);assert.equal(result.reviewRequired,true);assert.match(result.text,/viagem/)
    for(let i=0;i<20;i++){try{await access(folder);await new Promise(resolve=>setTimeout(resolve,10))}catch{break}}await assert.rejects(()=>access(folder))
    assert.equal((await fetch(base+'/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,415)
  }finally{unblock();await new Promise(resolve=>server.close(resolve))}
})
