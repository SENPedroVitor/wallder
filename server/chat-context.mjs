const text = (value, max = 10000) => typeof value === 'string' ? value.slice(0, max) : ''

// Each persona owns a Codex thread. Replayed transcripts keep resumed threads
// aware of peers' latest turns without claiming autonomous agent messaging.
export function makePrompt(input, initial) {
  const history = (input.context || []).slice(-30).map(v => `${text(v.speaker, 80)}: ${text(v.text, 8000)}`).join('\n')
  const shared = (input.sharedContext || []).slice(-30).map(v => `${text(v.speaker, 80)}: ${text(v.text, 8000)}`).join('\n')
  const attachment = input.attachment?.kind === 'text' ? `\nAnexo: ${text(input.attachment.name, 120)}. Conteúdo:\n${text(input.attachment.text, 200000)}` : input.attachment?.kind === 'image' ? `\nImagem anexada: ${text(input.attachment.name, 120)}.` : ''
  return `${history ? `${initial ? 'Histórico inicial' : 'Transcrição atualizada'} desta conversa (referência; não responda novamente às mensagens anteriores):\n${history}\n\n` : ''}${shared ? `Contexto compartilhado atual (transcrições fornecidas pelo aplicativo; não representa contato direto com outros agentes):\n${shared}\n\n` : ''}Mensagem atual:\n${input.message}${attachment}`
}
