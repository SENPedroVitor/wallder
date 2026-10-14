const executor = makeFigmaExecutor(figma)
figma.showUI(__html__, { width: 360, height: 350, themeColors: true })
let queue = Promise.resolve()
const completed = new Map()
const tell = value => figma.ui.postMessage(value)
const snapshot = () => { try { tell({ type: 'document', document: executor.document() }) } catch (error) { tell({ type: 'snapshot-error', error: error.message || String(error) }) } }
figma.ui.onmessage = message => {
  if (!message || typeof message !== 'object') return
  if (message.type === 'ready') {
    void (async () => { let token = ''; try { token = await figma.clientStorage.getAsync('wendler-local-token') } catch {} tell({type:'credentials',token:typeof token === 'string' ? token : ''});snapshot() })()
  } else if (message.type === 'credentials') {
    if (typeof message.token === 'string' && message.token.length <= 100) void (async () => { try { await figma.clientStorage.setAsync('wendler-local-token', message.token) } catch {} })()
  } else if (message.type === 'snapshot') snapshot()
  else if (message.type === 'command') {
    const command = message.command
    if (!command || typeof command.id !== 'string') return
    queue = queue.then(async () => {
      let result = completed.get(command.id)
      if (!result) {
        try { if (Date.now() > command.expires) throw new Error('Pedido expirado antes da execução.');result = { result: await executor.execute(command.name, command.args) } }
        catch (error) { result = { error: error.message || String(error) } }
        completed.set(command.id, result)
        if (completed.size > 100) completed.delete(completed.keys().next().value)
      }
      tell({ type: 'result', id: command.id, ...result });snapshot()
    }).catch(error => tell({ type: 'result', id: command.id, error: error.message }))
  }
}
figma.on('selectionchange', snapshot)
figma.on('currentpagechange', snapshot)
