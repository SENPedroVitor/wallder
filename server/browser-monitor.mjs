// Keep the preview's conversation after a run releases its exclusive control lease.
// A newer browser claim invalidates older previews, even across the shared Firefox.
let sequence = 0
export function claimBrowserPreview(source, conversationId = null) {
  source.previewClaim = { conversationId, sequence: ++sequence }
}
export async function conversationBrowserPreview(sources, conversationId) {
  const inactive = { active: false, conversationId: conversationId || null }
  if (!conversationId) return inactive
  const latest = () => sources.filter(source => source.previewClaim).sort((a, b) => b.previewClaim.sequence - a.previewClaim.sequence)[0]
  const source = latest(), claim = source?.previewClaim
  if (!source?.page || claim?.conversationId !== conversationId) return inactive
  const frame = await source.preview()
  // Navigation/ownership can change while a screenshot is being captured.
  if (latest() !== source || source.previewClaim !== claim || !source.page) return inactive
  return { ...frame, conversationId }
}
