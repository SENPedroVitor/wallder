import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import App from './App'
import { initializeStores, refreshStores } from './syncedStore'
import { registerWorkspaceTools } from './webmcp'
import { installAppViewport } from './viewport'
export default function StoreGate() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => installAppViewport(), [])
  useEffect(() => ready ? registerWorkspaceTools() : undefined, [ready])
  useEffect(() => {
    let current = true
    const start = () => void initializeStores().then(() => { if (current) { setReady(true); setError('') } }).catch(() => { if (current) setError('Não foi possível carregar seu histórico. Vamos tentar novamente.') })
    start()
    const timer = setInterval(() => { if (!ready) start(); else void refreshStores().catch(() => {}) }, 5000)
    return () => { current = false; clearInterval(timer) }
  }, [ready])
  if (!ready) return <div className="welcome-simple"><div className="welcome-center" role="status"><h1>Wendler</h1><p>{error || 'Carregando seu espaço…'}</p>{error && <button className="outline-button" onClick={() => { void initializeStores().then(() => { setReady(true); setError('') }).catch(() => {}) }}><RefreshCw size={16} /> Tentar agora</button>}</div></div>
  return <App />
}
