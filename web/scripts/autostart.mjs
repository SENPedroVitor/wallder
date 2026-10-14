import { spawnSync } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'win32') throw new Error('Este instalador de inicialização automática é para Windows.')
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = path.join(project, '.wendler')
await mkdir(data, { recursive: true })
const launcher = path.join(data, 'startup-launcher.js')
const supervisor = path.join(project, 'scripts', 'background.mjs')
const quote = value => `'${value.replaceAll("'", "''")}'`
const command = `"${process.execPath}" "${supervisor}"`
// Windows Script Host JScript: launch Node without opening a console window.
await writeFile(launcher, `var shell = new ActiveXObject("WScript.Shell");\nshell.CurrentDirectory = ${JSON.stringify(project)};\nWScript.Quit(shell.Run(${JSON.stringify(command)}, 0, true));\n`)
const action = `"${path.join(process.env.WINDIR, 'System32', 'wscript.exe')}" "${launcher}"`
const remove = process.argv.includes('--remove')
const script = remove ? `
$ErrorActionPreference = 'Stop'
$existing = Get-ScheduledTask -TaskName 'Wendler' -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -eq ${quote(`"${launcher}"`)}) { Unregister-ScheduledTask -TaskName 'Wendler' -Confirm:$false }
$run = (Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue).Wendler
if ($run -eq ${quote(action)}) { Remove-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'Wendler' }
Write-Output 'Inicialização automática removida.'
` : `
$ErrorActionPreference = 'Stop'
$existing = Get-ScheduledTask -TaskName 'Wendler' -ErrorAction SilentlyContinue
if ($existing -and $existing.Actions.Arguments -ne ${quote(`"${launcher}"`)}) { throw 'Já existe uma tarefa Wendler de outro projeto.' }
$run = (Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -ErrorAction SilentlyContinue).Wendler
if ($run -and $run -ne ${quote(action)}) { throw 'Já existe uma inicialização Wendler de outro projeto.' }
try {
  $account = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $taskAction = New-ScheduledTaskAction -Execute ${quote(path.join(process.env.WINDIR, 'System32', 'wscript.exe'))} -Argument ${quote(`"${launcher}"`)} -WorkingDirectory ${quote(project)}
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $account
  $principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName 'Wendler' -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
  if ($run -eq ${quote(action)}) { Remove-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'Wendler' }
  Start-ScheduledTask -TaskName 'Wendler'
  Write-Output 'Wendler inicia automaticamente ao entrar no Windows (tarefa agendada).'
} catch {
  if ($_.Exception.Message -notmatch 'Access is denied|Acesso negado|0x80070005') { throw }
  New-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'Wendler' -Value ${quote(action)} -PropertyType String -Force | Out-Null
  Start-Process -FilePath ${quote(path.join(process.env.WINDIR, 'System32', 'wscript.exe'))} -ArgumentList ${quote(`"${launcher}"`)} -WindowStyle Hidden
  Write-Output 'Wendler inicia automaticamente ao entrar no Windows (inicialização do usuário).'
}
`
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true })
process.stdout.write(result.stdout || '')
if (result.status !== 0) { process.stderr.write(result.stderr || 'Não foi possível configurar a inicialização.'); process.exit(result.status || 1) }
const desktop = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Get-CimInstance Win32_Process -Filter \"Name='ChatGPT.exe'\" | Where-Object { $_.ExecutablePath -like '*OpenAI.Codex*' } | Select-Object -First 1 -ExpandProperty ExecutablePath"], { encoding: 'utf8', windowsHide: true }).stdout.trim()
await writeFile(path.join(data, 'autostart.json'), JSON.stringify({ enabled: !remove, launcher, node: process.execPath, desktopExecutable: desktop || undefined, installed: new Date().toISOString() }, null, 2))
if (!remove) await readFile(path.join(project, 'dist', 'index.html')).catch(() => { console.error('Compile a interface com npm run build antes de reiniciar o computador.'); process.exitCode = 1 })
