import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Run only when the person at the Windows computer can accept its UAC prompt.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if(process.platform!=='win32')throw new Error('Este instalador é para Windows.')
const installer=path.join(root,'.artifacts/setup/wsl.3.0.1.0.x64.msi')
const script=`$ErrorActionPreference='Stop'
$installer='${installer.replaceAll("'","''")}'
if((Get-AuthenticodeSignature -LiteralPath $installer).Status -ne 'Valid'){throw 'Assinatura do instalador inválida.'}
$installation=Start-Process -FilePath msiexec.exe -ArgumentList @('/i',('"'+$installer+'"'),'/passive','/norestart') -Verb RunAs -WindowStyle Hidden -Wait -PassThru
if($installation.ExitCode -notin @(0,3010)){throw ('A instalação retornou '+$installation.ExitCode)}
Write-Output ('WSL instalado. Código: '+$installation.ExitCode)
Start-Process -FilePath wsl.exe -ArgumentList @('--install','--web-download','--no-launch','-d','Ubuntu') -Verb RunAs -WindowStyle Hidden -Wait
wsl.exe --status
Write-Output 'Se o Windows indicar reinicialização, reinicie manualmente. Depois abra Ubuntu para criar seu usuário Linux.'`
// PowerShell 7's inherited module paths can prevent Windows PowerShell from
// loading its own signature-verification module.
const env={...process.env,PSModulePath:path.join(process.env.WINDIR||'C:/Windows','System32/WindowsPowerShell/v1.0/Modules')}
const result=spawnSync('powershell.exe',['-NoProfile','-Command',script],{stdio:'inherit',windowsHide:true,env})
process.exitCode=result.status??1
