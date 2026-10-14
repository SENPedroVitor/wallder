# Ilha dos agentes no Windows

Primeira versão funcional da ilha desenhada no Pencil. A janela é um aplicativo desktop com Electron: transparente, sem moldura, centralizada no topo e sobre os outros aplicativos. O restante da área transparente deixa os cliques passarem. O backend continua no servidor Linux; fechar a ilha não interrompe os agentes.

## Abrir

Na raiz do projeto, com as dependências principais já instaladas:

```powershell
pnpm --dir desktop install --ignore-workspace
pnpm --dir desktop run setup
pnpm island:build
pnpm island
```

A ilha precisa do Tailscale conectado para acessar o servidor configurado em `desktop/main.cjs`. Não há credenciais de modelo no cliente Windows. Esta versão usa a instalação de desenvolvimento; ainda não inclui instalador distribuível.

- **Ctrl + Alt + Espaço** abre ou recolhe o painel.
- Passe o cursor sobre a ilha ou clique para expandir; Escape recolhe.
- O ícone na bandeja permite mostrar, ocultar, abrir o painel web, acompanhar o Firefox do servidor e sair.
- Iniciar com o Windows é opcional e vem desativado.

## Conectado nesta etapa

- Atividade real dos agentes, execução paralela, tempo decorrido e resposta concluída, interrompida ou com erro.
- Interromper tarefas em andamento usando o cancelamento existente no servidor.
- Consultar os detalhes e responder às autorizações existentes.
- Abrir a conversa correta no painel web e acessar a visualização do computador do servidor.
- Mostrar o widget Pix quando o executor efetivamente emitir um QR; copiar o código quando disponível e recente. A ilha não gera cobranças nem efetua pagamentos.
- CPU e memória deste Windows, além do tempo de resposta do servidor.
- Mascotes originais, olhos acompanhando o cursor, piscadas, transições de expansão e indicação de atividade sem porcentagem inventada.

As atividades observadas são transitórias e começam quando esta versão do backend é iniciada. A ilha não reconstrói tarefas antigas. Respostas de conversas privadas e seus widgets não aparecem nela. Acesso remoto continua dependendo da rede privada configurada.

## Limites atuais

A pausa e a retomada de tarefas, temperatura, GPU e ações automáticas de otimização do PC ainda não estão conectadas. Os desenhos desses estados não são apresentados como recursos operacionais. A voz também não faz parte desta etapa.

## Validação

Compilação web e desktop, testes de atividade, decisões, cancelamento, privacidade, abertura da conversa correta e renderização dos principais estados. Teste adicional na janela nativa confirmou expansão, ausência de erros no renderer e permanência sobre outras janelas. Uma mensagem real ao Ash atravessou o backend e apareceu como atividade em execução e depois como resposta concluída. Nenhuma compra foi iniciada para estes testes.

![Ilha nativa em execução no Windows](screenshots/windows-ilha-expandida.png)
