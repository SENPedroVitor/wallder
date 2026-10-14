# Ambiente remoto Wendler

Ambiente Linux em contêineres, não uma VM com kernel próprio. Instalado em `~/wendler-agents` no servidor Mint. Os serviços existentes não são modificados.

- `wendler-browser`: Firefox geral dos agentes, perfil em `browser/`.
- `wendler-steam`: Firefox de compras da Pam, perfil em `steam/`.
- Dois proxies de protocolo com 64 MiB cada.
- Limites combinados abaixo de 6 GiB, sem swap adicional; 1,5 CPU por Firefox.
- Portas apenas no loopback do servidor. Acesso através de SSH com verificação de chave e Tailscale, sem portas públicas.
- Sem Docker socket, diretórios da empresa ou modo privilegiado dentro dos contêineres.
- `restart: unless-stopped` reinicia após reboot; perfis ficam no disco do host. Isso não substitui backups fora do servidor.
- Imagens fixadas pelo digest utilizado e testado. Atualizações devem ser aplicadas de forma deliberada.

No PC, `.wendler/remote-browser.json` seleciona o servidor e a chave SSH. Desativar `enabled` restaura o Firefox local depois de parar a sessão e iniciar novamente. A chave privada nunca entra no repositório nem no contêiner.

O backend abre os túneis sob demanda. Firefox geral: `http://127.0.0.1:3012/`; Steam: `http://127.0.0.1:3013/`. Esses links funcionam no computador que executa o backend. O perfil remoto exige login inicial próprio; não copia senhas ou cookies do Windows. Desconectar o Wendler não fecha o Firefox remoto.

Recriação, no Termius:

```bash
cd ~/wendler-agents
docker compose up -d
```

Preserve `browser/`, `steam/` e `compose.yaml` para recuperação. Não use `docker compose down -v` nem apague os perfis. Recriar contêineres mantém os diretórios, mas sites ainda podem expirar sessões.

O acesso nativo ao Windows continua no computador local. Esta conexão disponibiliza o navegador remoto, não anuncia um MCP de desktop Linux que ainda não foi implementado.

## Sessão compartilhada

Com `steamUseGeneral: true` na configuração local, a Pam usa o perfil de `wendler-browser` já autenticado. Seu link passa a ser também `http://127.0.0.1:3012/`. O backend compartilha a conexão de protocolo, conta os consumidores e impede duas tarefas de agentes de controlarem simultaneamente esse navegador. O contêiner antigo `wendler-steam` não é utilizado nesse modo; seus dados permanecem preservados.

O status da Steam verifica todas as abas reais da loja e não apenas a antiga aba de login. Ao recuperar um backend que terminou abruptamente, uma sessão de controle órfã pode exigir reiniciar apenas o contêiner do Firefox correspondente. O perfil não é apagado; abas não salvas podem se perder nessa recuperação.
