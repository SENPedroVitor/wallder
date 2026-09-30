import { useRef } from 'react'
import AdditionalBody, { additionalAgentNames, type AdditionalCharacter } from './characterBodies'
import { useMascotMotion } from './mascotMotion'
import './mascot.css'
import './character-colors.css'

export type MascotState = 'idle' | 'thinking' | 'searching' | 'writing' | 'reviewing' | 'waiting' | 'success' | 'error' | 'surprised' | 'sleeping'
export const mascotStates: { id: MascotState; label: string }[] = [
  { id: 'idle', label: 'Disponível' }, { id: 'thinking', label: 'Pensando' },
  { id: 'searching', label: 'Pesquisando' }, { id: 'writing', label: 'Escrevendo' },
  { id: 'reviewing', label: 'Revisando' }, { id: 'waiting', label: 'Aguardando' },
  { id: 'success', label: 'Concluído' }, { id: 'error', label: 'Precisa de ajuda' },
  { id: 'surprised', label: 'Surpreso' }, { id: 'sleeping', label: 'Descansando' },
]
export type MascotAgent = 'west' | 'ted' | 'indy' | 'livro' | 'figma' | 'pam' | 'kyle' | 'sheldon' | 'dumbledore' | AdditionalCharacter
export interface MascotProps { agent: MascotAgent; state?: MascotState; size?: number; accessory?: boolean; className?: string; animated?: boolean }
const agentNames: Record<MascotAgent, string> = {
  ...additionalAgentNames, west: 'Ash', ted: 'Ted', indy: 'Indy', livro: 'Livro', figma: 'Figma',
  pam: 'Pam', kyle: 'Kyle', sheldon: 'Sheldon', dumbledore: 'Dumbledore',
}
const stateLabels = Object.fromEntries(mascotStates.map(({ id, label }) => [id, label])) as Record<MascotState, string>

function Body({ agent, accessory }: { agent: MascotAgent; accessory: boolean }) {
  switch (agent) {
    case 'west': return <path className="mascot__body" d="M12 60C14 45 29 36 49 35c21-1 38 9 40 25 2 13-11 18-39 18-27 0-40-5-38-18Z" />
    case 'pam': return <path className="mascot__body" d="M16 20q0-6 6-4l28 12 28-12q6-2 6 4v55q0 6-6 6H22q-6 0-6-6Z" />
    case 'kyle': return <path className="mascot__body" d="M51 13c22 0 38 16 38 36 0 22-17 38-39 38-23 0-39-15-39-38 0-20 17-36 40-36Z" />
    case 'sheldon': return <path className="mascot__body" d="M50 8c3 0 5 4 8 8 12 15 30 37 33 55 2 10-10 13-41 13S7 81 9 71c3-18 21-40 33-55 3-4 5-8 8-8Z" />
    case 'dumbledore': return <><path className="mascot__body" d="M10 60c0-22 16-36 40-36s40 14 40 36c0 12-14 19-40 19S10 72 10 60Z" /><path className="mascot__beard" d="M13 62c7-3 11-1 15 2 6-1 10 2 14 5 7-3 12-2 17 2 6-3 11-2 15-6 7 0 11-5 16-3 0 10-9 11-17 14-4 6-15 4-22 9-8-5-15-1-21-6-11 0-16-7-17-17Z" /></>
    case 'ted': return <><path className="mascot__body" fillRule="evenodd" d="M45 31c-21 0-32 13-32 30s12 28 30 28c21 0 32-15 30-35l-2-17 17-18 3 30-14-7 1 16c1 24-14 37-35 37C20 95 7 80 7 62S20 26 43 26h13v5Zm-2 8c-14 0-23 9-23 23s9 21 23 21 23-10 23-23-9-21-23-21Z" /><path className="mascot__body" d="M28 39h34v28H28Z" />{accessory && <path className="mascot__detail" d="M30 73v7m9-8v8m9-8v8" />}</>
    case 'indy': return <><path className="mascot__body" d="M13 61c0-20 14-33 37-33s37 13 37 33c0 17-15 25-37 25S13 78 13 61Z" />{accessory && <g className="mascot__hat"><path d="M28 36 32 17q18-8 36 0l4 19Z" /><path d="M13 36q37 7 74 0l-2 8q-35 6-70 0Z" /></g>}</>
    case 'livro': return <><path className="mascot__body" d="M26 15q24 5 48 0l11 21-9 8 5 28q-10 13-31 13T19 72l5-28-9-8Z" /></>
    case 'figma': return <><path className="mascot__body" d="M26 15h43c13 0 19 8 19 18 0 8-5 14-11 17 6 4 10 10 10 18 0 11-8 18-20 18H34c-13 0-20-7-20-18 0-8 4-14 10-18-6-3-10-9-10-17 0-10 5-18 12-18Z" />{accessory && <g className="mascot__figma-mark"><path d="M58 20h12v14H58Z" /><circle cx="77" cy="27" r="7" /></g>}</>
    default: return <AdditionalBody agent={agent} accessory={accessory} />
  }
}

function Face({ state }: { state: MascotState }) {
  const eyes: Record<MascotState, [string, string]> = {
    idle: ['M42 44v16', 'M59 44v16'], thinking: ['', ''],
    searching: ['m43 46-6 14', 'm62 46-6 14'], writing: ['m40 50 6 12', 'm57 50 6 12'],
    reviewing: ['m39 58 7-13', 'm57 58 7-13'], waiting: ['M41 47v12', 'M59 47v12'],
    success: ['m36 55 8-8', 'm57 47 8 8'], error: ['m37 47 8 11', 'm64 47-8 11'],
    surprised: ['', ''], sleeping: ['M35 56h11', 'M56 56h11'],
  }
  return <g className="mascot__face"><path className="mascot__eye mascot__eye--left" d={eyes[state][0]} /><path className="mascot__eye mascot__eye--right" d={eyes[state][1]} /></g>
}

function ThinkingBody() {
  return <g className="mascot__thinking-body">
    <path d="M5 67c1-8 8-13 17-13s16 5 17 13c1 7-7 9-17 9S4 74 5 67Z" />
    <path d="M37 65c1-8 8-13 17-13s16 5 17 13c1 7-7 9-17 9s-18-2-17-9Z" />
    <path d="M69 67c1-8 8-13 17-13s16 5 17 13c1 7-7 9-17 9s-18-2-17-9Z" />
  </g>
}

function SurprisedBody() {
  return <g className="mascot__surprised-body"><path d="M45 9h10l-2 59H47Z" /><ellipse cx="50" cy="83" rx="14" ry="6" /></g>
}

export default function Mascot({ agent, state = 'idle', size = 88, accessory = true, className = '', animated = false }: MascotProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  useMascotMotion(rootRef, animated)
  return <span ref={rootRef} className={`mascot mascot--${agent} mascot--${state}${className ? ` ${className}` : ''}`}
    style={{ width: size, height: size }} role="img" aria-label={`${agentNames[agent]} — ${stateLabels[state]}`}
    data-agent={agent} data-state={state} data-animated={animated}>
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      <g className="mascot__presence"><g className="mascot__tracking"><g className="mascot__figure">{state === 'thinking' ? <ThinkingBody /> : state === 'surprised' ? <SurprisedBody /> : <><Body agent={agent} accessory={accessory} /><Face state={state} /></>}</g></g></g>
    </svg>
  </span>
}
