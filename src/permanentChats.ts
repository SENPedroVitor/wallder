type Message = { id: string; at: number }
type Chat = { id: string; title: string; agent: string; messages: Message[]; updated: number; members?: string[] }

export function rememberContact<T extends string>(contacts: T[], agent: T, group: boolean): T[] {
  return group || contacts.includes(agent) ? contacts : [...contacts, agent]
}

// One individual transcript per contact. Project groups remain separate.
export function permanentChats<T extends Chat>(chats: T[], agents: { id: T['agent']; name: string }[]) {
  const mapping: Record<string, string> = {}
  const individuals = agents.map(agent => {
    const previous = chats.filter(chat => !chat.members && chat.agent === agent.id).sort((a, b) => a.updated - b.updated)
    const first = previous[0]
    const chatId = first?.id ?? `individual:${agent.id}`
    previous.forEach(chat => { mapping[chat.id] = chatId })
    const seen = new Set<string>()
    const messages = previous.flatMap(chat => chat.messages).filter(message => {
      if (seen.has(message.id)) return false
      seen.add(message.id)
      return true
    }).sort((a, b) => a.at - b.at)
    return { ...first, id: chatId, title: agent.name, agent: agent.id, messages, updated: Math.max(0, ...previous.map(chat => chat.updated)) } as T
  })
  return { chats: [...individuals, ...chats.filter(chat => chat.members)], mapping }
}
