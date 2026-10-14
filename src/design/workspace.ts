import type { ChatMessage } from '../chatWork'
import type { MascotAgent } from '../components/Mascot'
import catalog from './catalog.json'
import personalities from './agent-personalities.json'
import { createId } from '../ids.ts'
export { catalog }
export type Screen = { id: string; name: string }
export const agents = personalities as { id: MascotAgent; name: string; role: string; personality: string; suggestion: string }[]
export type Message = ChatMessage & { widget?: { screen?: string; sample?: boolean; type?: "shopping"|"pix"|"weather"|"spending"|"focus"|"market"|"tasks"|"canvas"; data?: unknown } }
export type Chat = {id:string;title:string;agent:MascotAgent;messages:Message[];updated:number;members?:MascotAgent[];archived?:boolean;pinned?:boolean;private?:boolean;projectId?:string}
export type Workspace = {pagePrefs?:Record<string,Record<string,unknown>>;profile:{name:string;nickname:string;avatar:string;bio?:string;language?:string;timezone?:string};theme:'light'|'dark';prefs:Record<string,Record<string,unknown>>;chats:Chat[];sidebarAgents:MascotAgent[];selected:string|null;onboarded:boolean;contextEpoch?:string;[key:string]:unknown}
export type RecordEntry = {id:string;kind:string;title:string;fields:Record<string,string>;updated:number;archived?:boolean}
export const frontendKey = 'wendler:frontend:v1'
export const recordsKey = 'waddle:records:v1'
export const makeId = createId
export const normalize = (s:string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
export const agentById = (id:string) => agents.find(a=>a.id===id)??agents[0]
export function loadWorkspace():Workspace {
  let saved:Partial<Workspace> = {}
  try {saved=JSON.parse(localStorage.getItem(frontendKey)||'{}')||{}} catch { /* The existing store remains recoverable. */ }
  const allowed=new Set(agents.map(a=>a.id))
  return {...saved,profile:{name:'',nickname:'',avatar:'',...saved.profile},theme:saved.theme==='dark'?'dark':'light',prefs:Object.fromEntries(agents.map(a=>[a.id,{accessory:true,tone:'Claro',humor:'Equilibrado',...saved.prefs?.[a.id]}])),chats:Array.isArray(saved.chats)?saved.chats.filter(c=>c&&typeof c.id==='string'&&allowed.has(c.agent)&&Array.isArray(c.messages)):[],sidebarAgents:Array.isArray(saved.sidebarAgents)?saved.sidebarAgents.filter(a=>allowed.has(a)):['west','songbird','batman','pam'],selected:saved.selected??null,onboarded:saved.onboarded===true}
}
export function loadRecords():RecordEntry[] {
  try {const v:unknown=JSON.parse(localStorage.getItem(recordsKey)||'[]');return Array.isArray(v)?v.filter((r):r is RecordEntry=>!!r&&typeof r.id==='string'&&typeof r.kind==='string'&&typeof r.title==='string'&&!!r.fields):[]} catch{return []}
}
export function screenByCode(code:string):Screen|undefined {return catalog.find(s=>s.name.startsWith(code+' '))}
export function screenCode(id:string):string {return catalog.find(s=>s.id===id)?.name.split(' ')[0]??''}
export const groups=[['01','Conversas'],['02','Projetos'],['03','Agentes'],['04','Rotinas'],['05','Conexões'],['06','Permissões'],['07','Configurações'],['09','Componentes'],['10','Widgets no chat'],['11','Finanças'],['12','Organização financeira'],['13','Vida pessoal'],['14','Encontrar e personalizar'],['15','Registros e manutenção'],['16','Estados e resultados']]
