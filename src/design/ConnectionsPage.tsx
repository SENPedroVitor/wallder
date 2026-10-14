import { PamEmailConnection } from './PamEmailConnection'
import { SteamConnection } from './SteamConnection'
import {OperationsConnection} from './OperationsConnection'
import { useEffect, useRef, useState } from 'react'
import { Cable, Plus, RefreshCw, X, Trash2, Play, Wrench, Plug, Power } from 'lucide-react'
import './connections.css'
import { CanvasScene, type CanvasBinding, type SceneAction } from './CanvasScene'
import { FigmaLocalConnection } from './FigmaLocalConnection'

type Server = { name: string; status: string; authStatus: string; tools: { name: string; description: string }[]; error?: string | null }
type Connection = { name: string; transport: string; enabled: boolean; command?: string; url?: string; argsCount: number; headerNames: string[]; test: Server | null }
type Inventory = { connections: Connection[]; servers: Server[]; plugins: { id: string; name: string; enabled: boolean }[]; errors: string[] }
const labels: Record<string, string> = { connected: 'Conectado', unknown: 'Sem estado confirmado', notStarted: 'Não iniciado', starting: 'Iniciando', failed: 'Falhou', authenticationRequired: 'Autenticação necessária', cancelled: 'Cancelado', disabled: 'Desativado' }
async function request(route = '', options?: RequestInit) {
  const response = await fetch(`/api/plugins${route}`, options)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação')
  return result
}

export function ConnectionsPage({ threadId,profileName='',onNavigate=()=>{} }: { threadId?: string;profileName?:string;onNavigate?:(label:string)=>void }) {
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [testResult,setTestResult]=useState<Server|null>(null)
  const [editing, setEditing] = useState(false)
  const [transport, setTransport] = useState('stdio')
  const drafts=useRef({name:'',stdio:{command:'',args:''},http:{command:'',args:''}})
  function switchTransport(next:string,event:SceneAction){drafts.current.name=event.fields['Nome da conexão']??drafts.current.name;drafts.current[transport as 'stdio'|'http']={command:event.fields.Comando??'',args:event.fields.Argumentos??''};setTestResult(null);setError('');setTransport(next)}
  const [advanced,setAdvanced]=useState(false)
  async function refresh() {
    setBusy('refresh'); setError('')
    try { setInventory(await request(threadId ? `?threadId=${encodeURIComponent(threadId)}` : '')) } catch (err) { setError((err as Error).message) } finally { setBusy('') }
  }
  useEffect(() => { void refresh() }, [threadId])
  async function act(name: string, method: string, test = false, enabled?: boolean) {
    setBusy(name); setError('')
    try {
      const result = await request(`/connections/${encodeURIComponent(name)}${test ? '/test' : ''}`, { method, headers: { 'Content-Type': 'application/json' }, ...(enabled !== undefined ? { body: JSON.stringify({ enabled }) } : {}) })
      if (test) {setTestResult(result);setInventory(current => current && ({ ...current, connections: current.connections.map(item => item.name === name ? { ...item, test: result } : item) }))}
      else await refresh()
    } catch (err) { setError((err as Error).message) } finally { setBusy('') }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('save'); setError('')
    const data = new FormData(event.currentTarget)
    try {
      const body = { name: data.get('name'), transport, enabled: false, ...(transport === 'stdio' ? { command: data.get('command'), args: JSON.parse(String(data.get('args') || '[]')) } : { url: data.get('url'), headers: JSON.parse(String(data.get('headers') || '{}')) }) }
      await request('/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setEditing(false); await refresh()
    } catch (err) { setError((err as Error).message) } finally { setBusy('') }
  }
  const identity:Record<string,CanvasBinding>={'Pedro — nome na navegação':{text:profileName||'Seu perfil'},'Pedro — nome':{text:profileName||'Seu perfil'},'Pedro — iniciais na navegação':{text:(profileName||'P').slice(0,2)},'Pedro — iniciais':{text:(profileName||'P').slice(0,2)}}
  async function saveCanvas(event:SceneAction,test=false){setBusy('save');setError('');try{const name=event.fields['Nome da conexão']?.trim();if(!name)throw Error('Informe o nome da conexão.');const body={name,transport,enabled:false,...(transport==='stdio'?{command:event.fields.Comando,args:JSON.parse(event.fields.Argumentos||'[]')}:{url:event.fields.Comando,headers:JSON.parse(event.fields.Argumentos||'{}')})};await request('/connections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(test){await act(name,'POST',true)}else{setEditing(false);await refresh()}}catch(err){setError((err as Error).message)}finally{setBusy('')}}
  if(editing)return <section className="waddle-scene-page pencil-connections"><CanvasScene id="KDiS5" crop={false} values={{'Nome da conexão':drafts.current.name,Comando:drafts.current[transport as 'stdio'|'http'].command,Argumentos:drafts.current[transport as 'stdio'|'http'].args}} bindings={{...identity,'Servidor local — selecionado':{style:{left:transport==='stdio'?'236px':'502px'}},'Servidor local — opção':{action:'Transporte local'},'Servidor remoto — opção':{action:'Transporte remoto'},'Comando — rótulo':{text:transport==='stdio'?'Comando':'URL HTTPS'},'Comando — valor':{text:transport==='stdio'?'node':'https://servidor.exemplo/mcp'},'Argumentos — rótulo':{text:transport==='stdio'?'Argumentos · lista JSON':'Cabeçalhos privados · objeto JSON'},'Argumentos — valor':{text:transport==='stdio'?'["mcp"]':'{}'},'Variáveis de ambiente — texto':{text:'Opções avançadas',action:'Opções avançadas'},'Estado do teste — texto':{text:busy==='refresh'?'Aguardando teste':busy==='save'?'Salvando conexão…':busy?'Testando conexão…':error?'Teste não concluído':testResult?(labels[testResult.status]??testResult.status)+' · '+testResult.tools.length+' ferramentas':'Aguardando teste'},'Informações — texto':{text:'Salve e teste a conexão antes de ativar para os agentes.'}}} onAction={event=>{if(event.label==='Cancelar'||/Voltar/.test(event.label)){setEditing(false);return}if(event.label==='Transporte local'){switchTransport('stdio',event);return}if(event.label==='Transporte remoto'){switchTransport('http',event);return}if(event.label==='Conectar'){void saveCanvas(event);return}if(event.label==='Testar conexão'){void saveCanvas(event,true);return}if(event.label==='Opções avançadas'){setEditing(false);setAdvanced(true);return}onNavigate(event.label)}}/>{error&&<div className="pencil-connection-status" role="alert">{error}</div>}{busy&&<div className="pencil-connection-status" role="status">{busy==='refresh'?'Carregando conexões…':busy==='save'?'Salvando conexão…':'Aguardando teste…'}</div>}</section>
  if(!advanced)return <section className="waddle-scene-page pencil-connections"><CanvasScene id="QATq3" crop={false} bindings={{...identity,'Salvar alterações — texto':{text:'Ver conexões',action:'Ver conexões'},'Revisar — texto':{action:'Permissões'},...Object.fromEntries(['GitHub','Google Drive','Google Agenda'].map(name=>{const matches=inventory?.servers.flatMap(server=>server.tools).filter(tool=>tool.name.toLowerCase().includes(name==='GitHub'?'github':name==='Google Drive'?'google_drive':'google_calendar'));return [name+' — descrição',{text:!inventory?'Consultando conexões…':matches?.length?matches.length+' ferramentas disponíveis para a equipe.':'Configure o acesso ao serviço nas conexões.'}]}))}} decorate={root=>{root.querySelectorAll<HTMLElement>('[data-pencil-name="Conectar — texto"]').forEach((node,index)=>{node.dataset.label='service:'+index;node.dataset.actionName='connection-service';node.setAttribute('role','button');node.setAttribute('aria-label','Ver conexão '+['GitHub','Google Drive','Google Agenda'][index]);node.tabIndex=0;node.style.cursor='pointer'})}} decorationKey={JSON.stringify(inventory?.servers.map(server=>[server.name,server.status,server.tools.length]))} onAction={event=>{if(event.label==='Adicionar'){drafts.current={name:'',stdio:{command:'',args:''},http:{command:'',args:''}};setTestResult(null);setError('');setEditing(true);return}if(event.label==='Ver conexões'||event.label.startsWith('service:')){setAdvanced(true);return}if(event.label==='Cancelar'){onNavigate('Voltar às conversas');return}onNavigate(event.label)}}/>{error&&<div className="pencil-connection-status" role="alert">{error}</div>}</section>
  return <section className="connections-page">
    <header className="connections-heading"><div><h1><Cable size={23} /> Conexões</h1><p>Ferramentas descobertas pelo Codex e servidores MCP locais.</p></div><div className="connections-actions"><button onClick={()=>setAdvanced(false)}>Voltar</button><button disabled={!!busy} onClick={() => void refresh()}><RefreshCw size={15} /> Atualizar</button><button onClick={() => setEditing(true)}><Plus size={15} /> Adicionar conexão</button></div></header>
    {error && <p className="connections-error" role="alert">{error}</p>}
    {inventory?.errors.map(message => <p className="connections-notice" key={message}>{message}</p>)}
    {!inventory && !error && <p role="status">Consultando o Codex…</p>}
    <OperationsConnection/>
    <h2>Seus servidores MCP</h2><p className="connections-note">Salvar não executa o servidor. Testar inicia a conexão; ativar disponibiliza suas ferramentas em novas conversas. Credenciais são armazenadas apenas no backend local.</p>
    {inventory && !inventory.connections.length && <div className="connections-empty"><Plug size={27} /><p>Nenhum servidor configurado aqui.</p><button onClick={() => setEditing(true)}>Configurar servidor MCP</button></div>}
    <PamEmailConnection/><SteamConnection/><FigmaLocalConnection/><div className="connections-grid">{inventory?.connections.map(connection => <article className="connection-card" key={connection.name}><h3><Plug size={18} /> {connection.name}</h3><span className="connection-status">{connection.enabled ? 'Ativo para novas conversas' : 'Desativado'} · {connection.transport === 'http' ? 'HTTPS' : 'Processo local'}</span><p className="connection-endpoint">{connection.url || connection.command}</p>{connection.headerNames.length > 0 && <p>Credenciais: {connection.headerNames.join(', ')} (valores ocultos)</p>}<div className="connections-actions"><button disabled={!!busy} onClick={() => void act(connection.name, 'POST', true)}><Play size={14} /> Testar</button><button disabled={!!busy} onClick={() => void act(connection.name, 'PATCH', false, !connection.enabled)}><Power size={14} /> {connection.enabled ? 'Desativar' : 'Ativar'}</button><button disabled={!!busy} aria-label={`Remover ${connection.name}`} onClick={() => void act(connection.name, 'DELETE')}><Trash2 size={14} /></button></div>{busy === connection.name && <p role="status">Aguardando servidor…</p>}{connection.test && <ServerDetails server={connection.test} />}</article>)}</div>
    <h2>Ferramentas acessíveis no Codex</h2><p className="connections-note">O inventário vem do app-server desta instalação. Um plugin instalado pode exigir autenticação antes de oferecer ferramentas.</p>
    <div className="connections-grid">{inventory?.servers.map(server => <article className="connection-card" key={server.name}><h3><Wrench size={18} /> {server.name}</h3><ServerDetails server={server} /></article>)}</div>
    {inventory && !inventory.servers.length && <p className="connections-note">Nenhuma ferramenta MCP descoberta nesta sessão.</p>}
    {!!inventory?.plugins.length && <><h2>Plugins instalados</h2><div className="connections-installed">{inventory.plugins.map(plugin => <span key={plugin.id}><Plug size={14} />{plugin.name} · {plugin.enabled ? 'Ativo' : 'Desativado'}</span>)}</div></>}
    {editing && <div className="connections-overlay"><form className="connections-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title" onSubmit={save}><header><h2 id="connection-title">Adicionar conexão MCP</h2><button type="button" aria-label="Fechar" onClick={() => setEditing(false)}><X size={18} /></button></header><label>Nome<input name="name" required pattern="[a-zA-Z][a-zA-Z0-9_-]{0,63}" placeholder="meu-servidor" /></label><label>Transporte<select value={transport} onChange={event => setTransport(event.target.value)}><option value="http">HTTPS</option><option value="stdio">Processo local (stdio)</option></select></label>{transport === 'stdio' ? <><label>Executável<input name="command" required placeholder="node" /></label><label>Argumentos (lista JSON)<textarea name="args" defaultValue={'[]'} spellCheck={false} /></label><p>Use o executável e os argumentos fornecidos pelo servidor MCP. Não use um shell.</p></> : <><label>URL HTTPS<input name="url" type="url" required placeholder="https://servidor.exemplo/mcp" /></label><label>Cabeçalhos privados (objeto JSON)<textarea name="headers" defaultValue={'{}'} spellCheck={false} autoComplete="off" /></label></>}<p>A conexão é salva desativada. Teste antes de ativar.</p>{error && <p role="alert" className="connections-error">{error}</p>}<footer><button type="button" onClick={() => setEditing(false)}>Cancelar</button><button type="submit" disabled={!!busy}>Salvar conexão</button></footer></form></div>}
  </section>
}
function ServerDetails({ server }: { server: Server }) {
  return <div className="connection-details"><p>{labels[server.status] || server.status} · Autenticação: {server.authStatus}</p>{server.error && <p className="connections-error">{server.error}</p>}<details><summary>{server.tools.length} ferramentas descobertas</summary><ul>{server.tools.map(tool => <li key={tool.name}><strong>{tool.name}</strong>{tool.description && <p>{tool.description}</p>}</li>)}</ul></details></div>
}
