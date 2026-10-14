import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = path.join(root, 'desktop/node_modules/electron/dist/electron.exe')
if (!existsSync(executable)) throw Error('Instale a ilha: pnpm --dir desktop install --ignore-workspace e execute node desktop/node_modules/electron/install.js.')
if (!existsSync(path.join(root, 'desktop/dist/index.html'))) {
  const build = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'desktop/vite.config.mjs'], { cwd: root, stdio: 'inherit', windowsHide: true })
  const code = await new Promise(resolve => build.once('exit', resolve))
  if (code !== 0) process.exit(code || 1)
}
const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE
const child = spawn(executable, [path.join(root, 'desktop')], { cwd: root, env: environment, detached: true, stdio: 'ignore', windowsHide: true })
child.on('error', error => { console.error('Não foi possível abrir a ilha: ' + error.message); process.exitCode = 1 })
child.unref()
console.log('Ilha iniciada. Abra ou oculte com Ctrl+Alt+Espaço ou pelo ícone na bandeja do Windows.')
