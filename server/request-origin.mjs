export function isAuthorizedOrigin(origin, { port, uiPort, remoteOrigin }) {
  if (typeof origin !== 'string') return false
  let parsed
  try { parsed = new URL(origin) } catch { return false }
  // Origin headers contain only a scheme, host and optional port.
  if (parsed.origin !== origin) return false
  if (parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) && [port, uiPort].includes(Number(parsed.port))) return true
  if (!remoteOrigin || origin !== remoteOrigin) return false
  return parsed.protocol === 'https:'
}
