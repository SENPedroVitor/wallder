# Executor independente no servidor

Instalado em `/home/faux/wendler-runtime`. Docker `wendler-runtime`, Node 24 e Codex CLI 0.162.1, executado como usuário sem root. Backend e interface só escutam em loopback, portas 5274 e 5273. Reinício automático `unless-stopped`; limite 2800 MiB, sem swap extra. Firefox existente usa o perfil autenticado do contêiner `wendler-browser`.

Dados persistentes em `data/`; cache de autenticação do Codex em `codex/`, com permissões restritas. Cofre de CPF e e-mail usa AES-256-GCM, chave fora dos dados em `secrets/vault.key`, montada somente para leitura. Administradores do host têm acesso ao ambiente; essa proteção não é isolamento contra root.

Preparação realizada: histórico do frontend, widgets, rotinas e personalidades copiados. Threads locais do executor Windows não foram reutilizados; conversas continuam pelo contexto enviado pelo frontend. Plugins com executáveis Windows não são válidos no Linux; o MCP de bolsa foi configurado para Node Linux. Figma local e Computer Use nativo do Windows não ficam disponíveis com o PC desligado.

Testes realizados com backend Windows parado: conversa real com Ash no servidor, autenticação ChatGPT, Steam autenticada e conexão AgentMail. A inicialização automática do backend Windows foi removida para evitar dois executores concorrentes.

No Termius, liberar o app privado:

```bash
sudo tailscale serve --bg --yes 5273
```

Endereço: `https://faux-poweredge-t110-ii.tail212b91.ts.net/`.

Opcionalmente liberar a tela do Firefox remoto:

```bash
sudo tailscale serve --bg --yes --https=8443 3012
```

Endereço: `https://faux-poweredge-t110-ii.tail212b91.ts.net:8443/`. Somente membros autorizados da rede Tailscale conseguem acessar; não é Funnel público. As permissões da rede Tailscale devem restringir os dispositivos que podem acessar esse computador pessoal dos agentes.

Atualização no servidor:

```bash
cd ~/wendler-runtime
docker compose up -d --build
```

Preserve dados, codex, secrets e os perfis em `~/wendler-agents`. Não apagar esses diretórios na recuperação. A interface nova usa outro endereço/origem; o histórico copiado está no backend, mas preferências armazenadas apenas no navegador podem precisar ser ajustadas.
