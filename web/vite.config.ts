import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const api = `http://127.0.0.1:${process.env.WENDLER_PORT || '5174'}`
const tailscaleHost = process.env.WENDLER_TAILSCALE_HOST
const proxy = { '/api': { target: api, changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WENDLER_UI_PORT || 5173),
    strictPort: true,
    allowedHosts: tailscaleHost ? [tailscaleHost] : [],
    proxy,
    ...(tailscaleHost ? { hmr: { protocol: 'wss', host: tailscaleHost, clientPort: 443 } } : {}),
  },
  preview: { allowedHosts: tailscaleHost ? [tailscaleHost] : [], proxy },
})
