import { useEffect, useRef, useState } from 'react'
import { LockKeyhole, X } from 'lucide-react'
import { runtimeJson } from '../runtime'

type Status = { saved:boolean; masked:string|null; available:boolean }
export function ProtectedCpf() {
  const dialog=useRef<HTMLDialogElement>(null)
  const [open,setOpen]=useState(false),[status,setStatus]=useState<Status|null>(null),[cpf,setCpf]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal()},[open])
  useEffect(()=>{if(!open)return;let active=true;void runtimeJson<Status>('protected-data/cpf').then(value=>{if(active)setStatus(value)}).catch(()=>{if(active)setNotice('Não foi possível consultar os dados protegidos.')});return()=>{active=false}},[open])
  async function save(remove=false){setBusy(true);setNotice('');try{setStatus(await runtimeJson<Status>('protected-data/cpf',remove?{action:'remove'}:{action:'save',cpf}));setCpf('');setNotice(remove?'CPF removido.':'CPF salvo e mascarado.')}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível salvar.')}finally{setBusy(false)}}
  function close(){if(busy)return;setCpf('');setNotice('');setOpen(false)}
  return <><button className="protected-cpf-launch" onClick={()=>setOpen(true)}><LockKeyhole size={14}/>Dados protegidos</button>{open&&<dialog ref={dialog} className="protected-cpf-dialog" aria-label="Dados protegidos" onCancel={event=>{event.preventDefault();close()}}><header><h2>Dados protegidos</h2><button aria-label="Fechar dados protegidos" disabled={busy} onClick={close}><X size={18}/></button></header><p>Seu CPF fica criptografado no Windows, separado do perfil e das conversas.</p><label>CPF salvo<input type="text" readOnly value={status?.saved?status.masked??'***.***.***-**':'Não cadastrado'} aria-label="CPF salvo"/></label><form onSubmit={event=>{event.preventDefault();void save()}}><label>{status?.saved?'Substituir CPF':'Cadastrar CPF'}<input type="password" inputMode="numeric" autoComplete="off" maxLength={18} value={cpf} onChange={event=>setCpf(event.target.value)} aria-label="CPF para cadastro" disabled={busy||!status?.available}/></label><small>O número não será enviado à memória da Pam nem incluído na exportação do perfil. A Pam pode preencher o Pix da Steam após sua autorização.</small><div><button type="submit" disabled={busy||!cpf||!status?.available}>{busy?'Salvando…':'Salvar CPF protegido'}</button>{status?.saved&&<button type="button" disabled={busy} onClick={()=>void save(true)}>Remover CPF</button>}</div></form>{status&&!status.available&&<p>Este recurso precisa do serviço local no Windows.</p>}{notice&&<p role="status">{notice}</p>}</dialog>}</>
}
