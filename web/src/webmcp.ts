type ModelContext = { registerTool: (tool: { name: string; description: string; inputSchema: object; execute: (input: unknown) => unknown; title?: string; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean } }, options?: { signal: AbortSignal }) => void | Promise<void> }
export function registerWorkspaceTools() {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext
  if (!context?.registerTool) return () => {}
  const lifecycle = new AbortController()
  void Promise.resolve(context.registerTool({
    name: 'wendler_read_conversation', title: 'Ler conversa do Wendler', description: 'Lê até 20 mensagens de uma conversa salva no espaço atual. Não envia mensagens nem executa tarefas.',
    inputSchema: { type: 'object', properties: { conversationId: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute(input) {
      const id = (input as { conversationId?: unknown })?.conversationId
      if (id !== undefined && typeof id !== 'string') throw new Error('Identificador inválido.')
      const data = JSON.parse(localStorage.getItem('wendler:frontend:v1') || '{}') as { selected?: string; chats?: { id: string; title: string; messages: { sender: string; text: string }[] }[] }
      const chat = data.chats?.find(item => item.id === (id || data.selected))
      return chat ? { id: chat.id, title: chat.title, messages: chat.messages.slice(-20).map(message => ({ sender: message.sender, text: message.text.slice(0, 8000) })) } : { error: 'Conversa não encontrada.' }
    },
  }, { signal: lifecycle.signal })).catch(() => {})
  return () => lifecycle.abort()
}
