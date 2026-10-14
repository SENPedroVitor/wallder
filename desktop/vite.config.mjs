import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
export default defineConfig({ root: fileURLToPath(new URL('.', import.meta.url)), base: './', plugins: [react()], publicDir: false, build: { outDir: 'dist', emptyOutDir: true }, server: { host: '127.0.0.1', port: 5285, strictPort: true, proxy: { '/api': { target: 'https://faux-poweredge-t110-ii.tail212b91.ts.net', changeOrigin: true, headers: { Origin: 'https://faux-poweredge-t110-ii.tail212b91.ts.net' } } } } })
