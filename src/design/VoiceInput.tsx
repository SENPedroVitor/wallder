import { useEffect,useRef,useState } from 'react'
import { FileAudio,LoaderCircle,Mic,Square,X } from 'lucide-react'
type Phase='menu'|'starting'|'recording'|'transcribing'|'error'
type Recording={recorder:MediaRecorder;stream:MediaStream;parts:Blob[];size:number;cancelled:boolean}
const maxBytes=8*1024*1024
export function VoiceInput({onText,remaining}:{onText:(text:string)=>void;remaining:number}){
  const [open,setOpen]=useState(false),[phase,setPhase]=useState<Phase>('menu'),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[overflow,setOverflow]=useState('')
  const file=useRef<HTMLInputElement>(null),recording=useRef<Recording|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0),started=useRef(0),latest=useRef({onText,remaining})
  latest.current={onText,remaining}
  const release=()=>{const active=recording.current;if(active){active.cancelled=true;if(active.recorder.state!=='inactive')active.recorder.stop();active.stream.getTracks().forEach(track=>track.stop());recording.current=null}}
  const cancel=()=>{generation.current++;controller.current?.abort();release();setOpen(false);setPhase('menu');setError('');setOverflow('')}
  useEffect(()=>()=>{generation.current++;controller.current?.abort();release()},[])
  const transcribe=async(blob:Blob,ticket:number)=>{
    if(ticket!==generation.current)return
    if(blob.size>maxBytes||blob.size<32){setError('Use um áudio de até 8 MB e pelo menos um segundo.');setPhase('error');return}
    setPhase('transcribing');setError('');controller.current=new AbortController()
    try{
      const response=await fetch('/api/audio/transcribe',{method:'POST',headers:{'Content-Type':blob.type||'audio/webm'},body:blob,signal:controller.current.signal});const result=await response.json()
      if(!response.ok)throw Error(result.error||'Não foi possível transcrever o áudio.')
      if(ticket!==generation.current)return
      if(typeof result.text!=='string'||!result.text.trim())throw Error('Não identifiquei fala no áudio.')
      if(result.text.length>latest.current.remaining){setOverflow(result.text);throw Error('O texto não cabe na mensagem atual. Copie a transcrição abaixo ou reduza o texto da mensagem.')}
      latest.current.onText(result.text.trim());setOpen(false);setPhase('menu')
    }catch(problem){if(ticket===generation.current){setError(problem instanceof Error?problem.message:'Não foi possível transcrever.');setPhase('error')}}
  }
  const stop=()=>{const active=recording.current;if(active&&active.recorder.state!=='inactive'){setPhase('transcribing');active.recorder.stop()}}
  const start=async()=>{
    const ticket=++generation.current;setError('');setOverflow('');setPhase('starting')
    let acquired:MediaStream|undefined
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Este navegador não permite gravar aqui. Use HTTPS ou importe um arquivo de áudio.')
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});acquired=stream
      if(ticket!==generation.current){stream.getTracks().forEach(track=>track.stop());return}
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type))
      const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),active:Recording={recorder,stream,parts:[],size:0,cancelled:false};recording.current=active
      recorder.ondataavailable=event=>{if(active.cancelled||!event.data.size)return;active.size+=event.data.size;if(active.size>maxBytes){active.cancelled=true;recorder.stop();stream.getTracks().forEach(track=>track.stop());setError('O áudio atingiu o limite de 8 MB. Grave uma mensagem mais curta.');setPhase('error')}else active.parts.push(event.data)}
      recorder.onerror=()=>{active.cancelled=true;stream.getTracks().forEach(track=>track.stop());if(ticket===generation.current){setError('Não foi possível continuar a gravação.');setPhase('error')}}
      recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());if(recording.current===active)recording.current=null;if(!active.cancelled&&ticket===generation.current)void transcribe(new Blob(active.parts,{type:recorder.mimeType}),ticket)}
      started.current=Date.now();setSeconds(0);recorder.start(500);setPhase('recording')
    }catch(problem){acquired?.getTracks().forEach(track=>track.stop());if(ticket===generation.current){const name=problem instanceof DOMException?problem.name:'';setError(name==='NotAllowedError'?'Autorize o microfone no navegador para gravar, ou importe um arquivo.':name==='NotFoundError'?'Nenhum microfone foi encontrado.':problem instanceof Error?problem.message:'Não foi possível iniciar a gravação.');setPhase('error')}}
  }
  useEffect(()=>{if(phase!=='recording')return;const timer=setInterval(()=>{const elapsed=Math.floor((Date.now()-started.current)/1000);setSeconds(Math.min(120,elapsed));if(elapsed>=120)stop()},250);return()=>clearInterval(timer)},[phase])
  return <div className="voice-input">
    <button type="button" className="voice-trigger" aria-label="Áudio e transcrição" aria-expanded={open} title="Gravar ou transcrever áudio" onClick={()=>open?cancel():setOpen(true)}><Mic size={16}/></button>
    <input ref={file} type="file" accept="audio/*,.webm,.ogg,.m4a,.mp3,.wav,.flac" hidden aria-label="Arquivo de áudio para transcrever" onChange={event=>{const audio=event.target.files?.[0];event.target.value='';if(audio){const ticket=++generation.current;const extension=audio.name.split('.').pop()?.toLowerCase(),mime=audio.type||({webm:'audio/webm',ogg:'audio/ogg',m4a:'audio/mp4',mp3:'audio/mpeg',wav:'audio/wav',flac:'audio/flac'} as Record<string,string>)[extension||''];if(!mime){setError('Formato de áudio não reconhecido.');setPhase('error');return}void transcribe(new Blob([audio],{type:mime}),ticket)}}}/>
    {open&&<section className="voice-panel" aria-label="Transcrição de áudio" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();cancel()}}}>
      <div className="voice-heading"><strong>Áudio para texto</strong><button type="button" aria-label="Cancelar áudio" onClick={cancel}><X size={15}/></button></div>
      <p>Até 2 minutos · 8 MB. Transcrição no seu servidor. Revise o texto antes de enviar.</p>
      {phase==='recording'?<div className="voice-recording"><span className="voice-recording-dot"/><span role="timer">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</span><button type="button" onClick={stop}><Square size={13}/> Parar e transcrever</button></div>:phase==='transcribing'||phase==='starting'?<div className="voice-progress" role="status"><LoaderCircle size={15}/>{phase==='starting'?'Abrindo o microfone…':'Transcrevendo…'}</div>:<div className="voice-actions"><button type="button" onClick={()=>void start()}><Mic size={15}/> Gravar áudio</button><button type="button" onClick={()=>file.current?.click()}><FileAudio size={15}/> Importar áudio</button></div>}
      {error&&<p className="voice-error" role="alert">{error}</p>}{overflow&&<textarea aria-label="Transcrição para copiar" readOnly value={overflow} rows={4}/>}
    </section>}
  </div>
}
