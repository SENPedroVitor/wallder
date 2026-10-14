type IdCrypto = Pick<Crypto, 'getRandomValues'> & Partial<Pick<Crypto, 'randomUUID'>>

// getRandomValues also works in browsers that do not expose randomUUID.
export function createId(source: IdCrypto = globalThis.crypto): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID()
  const bytes = new Uint8Array(16)
  source.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
