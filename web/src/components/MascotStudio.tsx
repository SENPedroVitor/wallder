import { useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import Mascot, { dotslabEyes, mascotStates, type DotslabEye, type DotslabState, type MascotAgent } from './Mascot'
import './mascot-studio.css'

export default function MascotStudio({ agent, accessory }: { agent: MascotAgent; accessory: boolean }) {
  const [state, setState] = useState<DotslabState>('idle')
  const [eyes, setEyes] = useState<DotslabEye | null>(null)
  const [playing, setPlaying] = useState(true)
  const [replay, setReplay] = useState(0)
  const preview = useRef<HTMLDivElement>(null)
  const showPreview = () => { if (window.innerWidth <= 640) preview.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }

  return <div className="mascot-studio">
    <div ref={preview} className="mascot-studio__preview">
      <Mascot key={`${agent}-${state}-${eyes}-${replay}`} agent={agent} state={state} eyes={eyes ?? undefined} animated={playing} size={180} accessory={accessory} />
      <div>
        <span className="eyebrow">PRÉVIA DE MOVIMENTO</span>
        <h2>{eyes ? `Olhos ${dotslabEyes.find(item => item.id === eyes)?.label.toLowerCase()}` : mascotStates.find(item => item.id === state)?.label}</h2>
        <p>{eyes ? 'Os olhos escolhidos acompanham seu cursor durante a prévia.' : 'Explore as expressões e os movimentos deste personagem. Mova o cursor para ver seu olhar acompanhar.'}</p>
        <div className="mascot-studio__actions">
          <button className="outline-button" onClick={() => setPlaying(value => !value)}>
            {playing ? <Pause size={15} /> : <Play size={15} />} {playing ? 'Pausar prévia' : 'Animar prévia'}
          </button>
          <button className="outline-button" onClick={() => { setPlaying(true); setReplay(value => value + 1) }}>
            <RotateCcw size={15} /> Repetir movimento
          </button>
        </div>
        <small>Estudo visual. Os estados não indicam trabalho de IA conectado.</small>
      </div>
    </div>
    <div className="mascot-studio__section">
      <h3>Expressões e movimentos</h3>
      <div className="mascot-studio__states">
        {mascotStates.map(item => <button key={item.id} aria-pressed={!eyes && state === item.id} onClick={() => { setState(item.id); setEyes(null); showPreview() }}>
          <Mascot agent={agent} state={item.id} size={47} accessory={accessory} />
          <span>{item.label}</span>
        </button>)}
      </div>
    </div>
    <div className="mascot-studio__section">
      <h3>10 opções de olhos da biblioteca</h3>
      <p>Escolha uma opção para vê-la no movimento Disponível. Ao escolher outro estado, os olhos próprios daquele estado voltam.</p>
      <div className="mascot-studio__eyes">
        {dotslabEyes.map(item => <button key={item.id} aria-pressed={eyes === item.id} onClick={() => { setState('idle'); setEyes(item.id); showPreview() }}>
          <Mascot agent={agent} eyes={item.id} size={47} accessory={accessory} />
          <span>{item.label}</span>
        </button>)}
      </div>
    </div>
  </div>
}
