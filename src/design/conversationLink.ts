export function conversationFromLink(chats: { id: string; archived?: boolean }[], search: string): string | null {
  const id = new URLSearchParams(search).get('conversation')
  if (!id || !/^[\w:-]{1,100}$/.test(id)) return null
  return chats.some(chat => chat.id === id && !chat.archived) ? id : null
}
