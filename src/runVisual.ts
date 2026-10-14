import type { LiveRun } from './runtime'
import type { MascotState } from './components/Mascot'

export function runVisual(run?: Pick<LiveRun, 'text' | 'activity' | 'approval'>): { state: MascotState; label: string } {
  if (!run) return { state: 'idle', label: 'Disponível' }
  if (run.approval) return { state: 'waiting', label: 'Aguardando autorização' }
  if (/pesquis|search|buscando|consultando|web/i.test(run.activity)) return { state: 'searching', label: 'Pesquisando' }
  if (/revis|verific|testando|analis/i.test(run.activity)) return { state: 'reviewing', label: 'Verificando' }
  if (run.text || /escrevendo|alterando|executando/i.test(run.activity)) return { state: 'writing', label: 'Trabalhando' }
  return { state: 'thinking', label: 'Pensando' }
}
