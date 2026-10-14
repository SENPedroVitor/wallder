# Wendler no computador e no celular

## Configuração atual — servidor Linux, 13/10/2026

O aplicativo atual está em https://faux-poweredge-t110-ii.tail212b91.ts.net/, acessível pela VPN Tailscale. Interface, backend e Firefox persistente executam no servidor do trabalho. Docker e Tailscale estão habilitados no boot; os três containers Wendler usam `restart: unless-stopped`. Não é necessário manter Termius ou o computador Windows aberto. O início automático antigo no Windows foi removido para evitar dois executores.

Para disponibilizar a tela do Firefox permanentemente, execute uma vez no servidor:

```sh
sudo tailscale serve --bg --yes --https=8443 3012
```

Depois, use https://faux-poweredge-t110-ii.tail212b91.ts.net:8443/. `127.0.0.1:3012` no Windows dependia de um túnel SSH temporário. O acesso HTTPS do aplicativo já está ativo; a porta 8443 ainda depende da execução administrativa acima. Ambos ficam restritos à rede Tailscale.

O backend encerra a sessão compartilhada WebDriver BiDi durante seu desligamento, incluindo conexões usadas pela Steam. Páginas de iframe não são selecionadas como abas principais. Foram verificados abertura real da Steam, autenticação preservada e reconexão após reiniciar o runtime.

O painel lateral do chat acompanha o Firefox compartilhado do servidor, incluindo a conexão Steam da Pam. A captura se atualiza a cada dois segundos enquanto o painel está aberto; clique na prévia para ampliar. Essa captura usa o próprio backend e não depende de liberar a porta 8443. Formulários do processador Pix e senhas preenchidas não aparecem nas capturas da Steam. O QR continua disponível pelo widget específico.

Os botões nativos `addToCart` e `addBundleToCart` da Steam são reconhecidos como ações do carrinho. Não são tratados como URLs de navegação; outros scripts e destinos fora dos domínios autorizados continuam rejeitados.

As seções seguintes documentam a implantação Windows anterior.

O Windows inicia o supervisor automaticamente ao entrar na conta do usuário. Não é necessário abrir o terminal. A tarefa agendada `Wendler` roda na sessão interativa, sem privilégios administrativos, e chama um launcher JavaScript oculto. O supervisor inicia os serviços ausentes, grava logs limitados e verifica recuperação a cada 15 segundos.

## Serviços locais

- Interface compilada: http://127.0.0.1:5173.
- Agentes Codex: http://127.0.0.1:5174, usando a sessão ChatGPT já autenticada.
- Conector remoto: faz requisições HTTPS de saída ao Site privado; nenhuma porta do roteador é aberta.
- O Codex desktop é iniciado com janela oculta quando o executável detectado durante a instalação estiver disponível. Computer Use depende dessa aplicação e da sessão Windows aberta. Depois de uma atualização do Codex que altere o caminho do aplicativo, execute novamente o instalador.

Conversas, perfis, personalidades, tarefas e mini-chats ficam em armazenamento persistente do Sites (D1 guarda versões e metadados; R2 guarda conteúdo e anexos). A interface migra os dados já existentes neste navegador quando abre pela primeira vez. Escritas usam controle de versão para preservar alterações de outros dispositivos. O navegador mantém uma cópia; alterações sem confirmação de salvamento são identificadas como pendentes.

O painel privado exige entrar na conta ChatGPT proprietária. O computador usa uma credencial de serviço do Site e um segredo adicional, ambos guardados somente em `.wendler/remote.json`, fora de Git e com acesso restrito à conta Windows. O Worker tem apenas a impressão SHA-256 do segredo adicional. A sessão Codex não é enviada ao Site. Acesso a ferramentas e ações no computador continuam passando pelas autorizações existentes.

Quando o PC está desligado, suspenso, sem Internet ou sem sessão iniciada, o histórico permanece acessível pelo Site, mas os agentes não executam tarefas. Um PC ligado sem login no Windows não disponibiliza Computer Use. O sistema não altera suspensão nem políticas de energia.

## Comandos

```powershell
node scripts/autostart.mjs
node scripts/autostart.mjs --remove
```

Logs: `.wendler/logs/supervisor.log`, `backend.log`, `interface.log` e `remote.log`. A remoção desativa o próximo início automático; não apaga conversas nem credenciais. Não publique `.wendler`.

O código de hospedagem fica em `cloud/`. `scripts/prepare-site.mjs` prepara uma cópia sanitizada do painel para Sites, sem dados locais ou autenticação Codex. O checkout publicado é `sites/wendler`, com identidade em `.openai/hosting.json` dentro desse checkout. O repositório GitHub não é usado para publicar.


O acesso privado pelo Tailscale usa armazenamento no computador local. A configuração antiga do Site é preservada, mas a ponte fica desligada por padrão. Ativar a ponte pública requer iniciar explicitamente com WENDLER_SITE_BRIDGE=1; esta opção também altera a origem do armazenamento de conversas. Os dados atuais foram preservados em .wendler/frontend.json.
