const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, shell, clipboard, globalShortcut } = require('electron')
const path = require('node:path')
const os = require('node:os')
const { pathToFileURL } = require('node:url')
const { pointInSurface } = require('./geometry.cjs')
const server = 'https://faux-poweredge-t110-ii.tail212b91.ts.net'
let window, tray, online = false, latest = { ready: false, agents: [], tasks: [] }, lastSuccess = 0, latency = null
let cpu = sampleCpu(), cpuPercent = 0, visible = true, pollTimer, cursorTimer, ignoring = true
let surface = { x: 260, y: 22, width: 200, height: 44, radius: 22 }
// Read only the primary mouse button, so a click outside also works when the
// non-activating overlay never received keyboard focus. No keyboard hook.
const mouseButton = process.platform === 'win32' ? require('koffi').load('user32.dll').func('short __stdcall GetAsyncKeyState(int vKey)') : null
let mouseWasDown = false
function updatePointer() {
  if (!window || window.isDestroyed() || !visible) return
  const ignore = !pointInSurface(screen.getCursorScreenPoint(), window.getBounds(), surface)
  const down = mouseButton ? (mouseButton(1) & 0x8000) !== 0 : false
  if (down && !mouseWasDown && ignore) window.webContents.send('island:collapse')
  mouseWasDown = down
  if (ignore !== ignoring) { ignoring = ignore; window.setIgnoreMouseEvents(ignore, { forward: true }); window.setAlwaysOnTop(true, 'pop-up-menu') }
}
function sampleCpu() { return os.cpus().reduce((total, cpu) => ({ idle: total.idle + cpu.times.idle, total: total.total + Object.values(cpu.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 }) }
function trusted(event) { if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw Error('Janela não autorizada.') }
async function request(route, body) {
  const response = await fetch(server + route, { ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(10000) })
  const result = await response.json(); if (!response.ok) throw Error(result.error || 'O servidor não respondeu.'); return result
}
async function poll() {
  const started = Date.now()
  try { const data = await request('/api/island/status'); if (data.version !== 1 || !Array.isArray(data.tasks) || !Array.isArray(data.agents)) throw Error('Resposta incompatível.'); latest = data; lastSuccess = Date.now(); latency = lastSuccess - started; online = true }
  catch { online = false }
  const next = sampleCpu(), total = next.total - cpu.total; cpuPercent = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - (next.idle - cpu.idle) / total) * 100))) : 0; cpu = next
  pollTimer = setTimeout(poll, online && latest.tasks.some(task => task.status === 'running') ? 1000 : online ? 2500 : 8000)
}
function position() {
  if (!window) return
  const display = screen.getPrimaryDisplay().workArea
  const width = Math.min(720, display.width - 16), height = Math.min(500, display.height - 24)
  window.setBounds({ width, height, x: Math.round(display.x + (display.width - width) / 2), y: display.y + 12 })
}
function toggle() { visible = !visible; if (visible) { position(); window.showInactive() } else window.hide() }
async function boot() {
  app.setAppUserModelId('com.wendler.island')
  window = new BrowserWindow({ title: 'Wendler · Ilha dos agentes', width: 720, height: 500, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, maximizable: false, minimizable: false, hasShadow: false, skipTaskbar: true, alwaysOnTop: true, show: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged } })
  window.setAlwaysOnTop(true, 'floating'); window.setIgnoreMouseEvents(true, { forward: true }); position()
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', event => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  window.on('blur', () => window.webContents.send('island:collapse'))
  window.on('show', () => window.setAlwaysOnTop(true, 'pop-up-menu'))
  window.webContents.on('did-finish-load', () => { window.showInactive(); window.setAlwaysOnTop(true, 'pop-up-menu') })
  await window.loadFile(path.join(__dirname, 'dist/index.html'))
  const icon = nativeImage.createFromPath(path.join(__dirname, 'tray.png'))
  tray = new Tray(icon); tray.setToolTip('Wendler · Ilha dos agentes')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Mostrar / ocultar ilha', click: toggle },
    { label: 'Abrir Wendler', click: () => shell.openExternal(server) },
    { label: 'Ver Firefox do servidor', click: () => shell.openExternal(server + '/computer/') },
    { label: 'Iniciar com o Windows', type: 'checkbox', checked: app.getLoginItemSettings({ path: process.execPath, args: app.isPackaged ? [] : [__dirname] }).openAtLogin, click: item => app.setLoginItemSettings({ openAtLogin: item.checked, path: process.execPath, args: app.isPackaged ? [] : [__dirname] }) },
    { type: 'separator' }, { label: 'Sair da ilha', click: () => app.quit() },
  ]))
  tray.on('double-click', toggle)
  globalShortcut.register('CommandOrControl+Alt+Space', () => { if (!visible) toggle(); window.focus(); window.webContents.send('island:toggle') })
  screen.on('display-metrics-changed', position); screen.on('display-removed', position)
  poll()
  cursorTimer = setInterval(updatePointer, 16)
}
ipcMain.handle('island:snapshot', event => { trusted(event); return { ...latest, online, lastSuccess, latency, pc: { cpuPercent, memoryUsed: os.totalmem() - os.freemem(), memoryTotal: os.totalmem(), uptime: os.uptime(), host: os.hostname(), platform: process.platform } } })
ipcMain.on('island:pointer', event => { trusted(event); updatePointer() })
ipcMain.on('island:surface', (event, bounds) => {
  trusted(event)
  if (!bounds || !['x','y','width','height','radius'].every(key => Number.isFinite(bounds[key]))) return
  const area = window.getBounds()
  if (bounds.x < 0 || bounds.y < 0 || bounds.width < 40 || bounds.height < 20 || bounds.x + bounds.width > area.width + 1 || bounds.y + bounds.height > area.height + 1) return
  surface = bounds; updatePointer()
})
ipcMain.on('island:hide', event => { trusted(event); if (visible) toggle() })
ipcMain.handle('island:action', async (event, input) => { trusted(event); const { validateAction } = await import(pathToFileURL(path.join(__dirname, 'model.mjs')).href); const action = validateAction(input); const current = latest.tasks.find(task => input.type === 'approval' ? task.approval?.id === input.id : task.id === input.id && task.status === 'running'); if (!online || !current) throw Error('A tarefa mudou. Aguarde a atualização.'); return request(action.path, action.body) })
ipcMain.handle('island:open', (event, input) => { trusted(event); if (input?.type === 'browser') return shell.openExternal(server + '/computer/'); const id = typeof input?.conversationId === 'string' && /^[\w:-]{1,100}$/.test(input.conversationId) ? input.conversationId : ''; return shell.openExternal(server + (id ? '/?conversation=' + encodeURIComponent(id) : '/')) })
ipcMain.handle('island:dismiss',async(event,id)=>{trusted(event);if(typeof id!=='string'||!latest.tasks.some(task=>task.id===id&&task.status!=='running'))throw Error('Notificação indisponível.');const result=await request('/api/island/acknowledge',{id});latest={...latest,tasks:latest.tasks.filter(task=>task.id!==id)};return result})
ipcMain.handle('island:unfollow', async (event, id) => { trusted(event); if (!latest.sports?.some(game=>game.id===id)) throw Error('Partida não encontrada.'); const result=await request('/api/sports/follow',{action:'unfollow',eventId:id});latest={...latest,sports:latest.sports.filter(game=>game.id!==id)};return result })
ipcMain.handle('island:copy-pix', (event, id) => { trusted(event); const task = latest.tasks.find(task => task.id === id); if (!online || !task?.pix?.code || Date.now() - task.updatedAt > 5 * 60 * 1000) throw Error('Atualize o pedido no painel antes de copiar.'); clipboard.writeText(task.pix.code); return true })
if (!app.requestSingleInstanceLock()) app.quit()
else { app.on('second-instance', () => { if (!visible) toggle() }); app.whenReady().then(boot).catch(error => { console.error(error); app.quit() }) }
app.on('will-quit', () => { clearTimeout(pollTimer); clearInterval(cursorTimer); globalShortcut.unregisterAll() })
app.on('window-all-closed', () => app.quit())
