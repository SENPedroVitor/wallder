import {spawn} from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
// Only needed while authorizing Google on this computer. No public port is opened.
const child=spawn('ssh',['-N','-T','-i',path.join(os.homedir(),'.ssh','wendler_work_server'),'-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-L','127.0.0.1:15274:127.0.0.1:5274','faux@100.110.182.64'],{stdio:'inherit',windowsHide:true})
child.on('error',()=>{console.error('Não foi possível abrir a ponte do Gmail. Confira o Tailscale e o acesso ao servidor.');process.exitCode=1})
child.on('exit',code=>{process.exitCode=code||0})
process.on('SIGINT',()=>child.kill())
console.log('Ponte local do Gmail ativa enquanto este processo estiver aberto. Feche após autorizar a conta.')
