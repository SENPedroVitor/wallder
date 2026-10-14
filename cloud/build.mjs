import { mkdir, cp } from 'node:fs/promises'
await mkdir('dist/server', { recursive: true })
await cp('cloud/worker.mjs', 'dist/server/index.js')
await mkdir('dist/.openai', { recursive: true })
await cp('.openai/hosting.json', 'dist/.openai/hosting.json')
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true })
